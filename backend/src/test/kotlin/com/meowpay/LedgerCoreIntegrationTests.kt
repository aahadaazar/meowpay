package com.meowpay

import com.meowpay.dto.ExecuteTransferRequest
import com.meowpay.exception.BadRequestException
import com.meowpay.exception.ForbiddenException
import com.meowpay.service.OwnershipGuard
import com.meowpay.service.TransferService
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.nio.file.Files
import java.nio.file.Path
import java.sql.ResultSet
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.sql.DataSource

@Testcontainers
class LedgerCoreIntegrationTests {
    private lateinit var dataSource: DataSource
    private lateinit var jdbcClient: JdbcClient
    private lateinit var transferService: TransferService

    @BeforeEach
    fun setUpDatabase() {
        dataSource = DriverManagerDataSource(postgres.jdbcUrl, postgres.username, postgres.password)
        jdbcClient = JdbcClient.create(dataSource)
        transferService = TransferService(jdbcClient, OwnershipGuard(jdbcClient))

        dataSource.connection.use { connection ->
            connection.createStatement().use { statement ->
                statement.execute("DROP SCHEMA public CASCADE")
                statement.execute("CREATE SCHEMA public")
            }

            migrationFiles().forEach { migration ->
                connection.createStatement().use { statement ->
                    statement.execute(Files.readString(migration))
                }
            }
        }
    }

    @Test
    fun `happy path moves balances and writes two ledger rows`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val sender = createCat(alice, "Milo")
        val receiver = createCat(bob, "Nori")

        val transfer = executeRaw(sender, receiver, 125, initiatedBy = alice)

        assertThat(transfer.status).isEqualTo("completed")
        assertThat(transfer.failureReason).isNull()
        assertThat(balance(sender)).isEqualTo(375)
        assertThat(balance(receiver)).isEqualTo(625)
        assertThat(ledgerCount(transfer.id)).isEqualTo(2)
        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `insufficient balance inserts failed row and leaves balances alone`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val sender = createCat(alice, "Milo")
        val receiver = createCat(bob, "Nori")

        val transfer = executeRaw(sender, receiver, 501, initiatedBy = alice)

        assertThat(transfer.status).isEqualTo("failed")
        assertThat(transfer.failureReason).isEqualTo("insufficient_funds")
        assertThat(balance(sender)).isEqualTo(500)
        assertThat(balance(receiver)).isEqualTo(500)
        assertThat(ledgerCount(transfer.id)).isEqualTo(0)
        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `self transfer inserts failed row`() {
        val alice = createHuman("Alice")
        val sender = createCat(alice, "Milo")

        val transfer = executeRaw(sender, sender, 10, initiatedBy = alice)

        assertThat(transfer.status).isEqualTo("failed")
        assertThat(transfer.failureReason).isEqualTo("self_transfer")
        assertThat(balance(sender)).isEqualTo(500)
        assertThat(ledgerCount(transfer.id)).isEqualTo(0)
        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `idempotency replay returns the original row without double charge`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val sender = createCat(alice, "Milo")
        val receiver = createCat(bob, "Nori")
        val idempotencyKey = UUID.randomUUID()

        val original = executeRaw(sender, receiver, 75, idempotencyKey, "first", alice)
        val replay = executeRaw(sender, receiver, 300, idempotencyKey, "replay", alice)

        assertThat(replay.id).isEqualTo(original.id)
        assertThat(replay.amount).isEqualTo(75)
        assertThat(replay.note).isEqualTo("first")
        assertThat(balance(sender)).isEqualTo(425)
        assertThat(balance(receiver)).isEqualTo(575)
        assertThat(ledgerCount(original.id)).isEqualTo(2)
    }

    @Test
    fun `reconciliation and global conservation hold across grants transfers and failures`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val sender = createCat(alice, "Milo")
        val receiver = createCat(bob, "Nori")
        val third = createCat(alice, "Pip")

        executeRaw(sender, receiver, 40, initiatedBy = alice)
        executeRaw(receiver, third, 20, initiatedBy = bob)
        executeRaw(sender, third, 999, initiatedBy = alice)

        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `concurrent double send races cleanly`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val sender = createCat(alice, "Milo")
        val receiverOne = createCat(bob, "Nori")
        val receiverTwo = createCat(bob, "Pip")
        val ready = CountDownLatch(2)
        val start = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)

        try {
            val futures = listOf(receiverOne, receiverTwo).map { receiver ->
                executor.submit(
                    Callable {
                        ready.countDown()
                        start.await(10, TimeUnit.SECONDS)
                        executeRaw(sender, receiver, 400, initiatedBy = alice)
                    },
                )
            }

            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue()
            start.countDown()

            val outcomes = futures.map { it.get(10, TimeUnit.SECONDS).status }

            assertThat(outcomes).containsExactlyInAnyOrder("completed", "failed")
            assertThat(balance(sender)).isEqualTo(100)
            assertThat(balance(receiverOne) + balance(receiverTwo)).isEqualTo(1400)
            assertWalletReconciliation()
            assertGlobalConservation()
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun `treasury may go negative but normal wallets may not`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val sender = createCat(alice, "Milo")
        val receiver = createCat(bob, "Nori")

        assertThat(balance(treasuryCatId)).isEqualTo(-1000)

        val transfer = executeRaw(sender, receiver, 501, initiatedBy = alice)

        assertThat(transfer.status).isEqualTo("failed")
        assertThat(balance(sender)).isEqualTo(500)
        assertThat(balance(treasuryCatId)).isEqualTo(-1000)
        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `service rejects unowned sender server-only source values and system recipients`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val aliceCat = createCat(alice, "Milo")
        val bobCat = createCat(bob, "Nori")

        assertThatThrownBy {
            transferService.execute(alice, transferRequest(bobCat, aliceCat, 10))
        }.isInstanceOf(ForbiddenException::class.java)
            .hasMessageContaining("senderCatId is not owned")

        assertThatThrownBy {
            transferService.execute(alice, transferRequest(aliceCat, bobCat, 10, source = "topup"))
        }.isInstanceOf(BadRequestException::class.java)
            .hasMessageContaining("server-side flows")

        assertThatThrownBy {
            transferService.execute(alice, transferRequest(aliceCat, bobCat, 10, source = "welcome_grant"))
        }.isInstanceOf(BadRequestException::class.java)
            .hasMessageContaining("server-side flows")

        assertThatThrownBy {
            transferService.execute(alice, transferRequest(aliceCat, treasuryCatId, 10))
        }.isInstanceOf(BadRequestException::class.java)
            .hasMessageContaining("non-system cat")
    }

    @Test
    fun `create cat is atomic and welcome grant reconciles`() {
        val alice = createHuman("Alice")

        val cat = createCat(alice, "Milo")

        assertThat(balance(cat)).isEqualTo(500)
        assertThat(
            jdbcClient.sql(
                """
                SELECT count(*)
                FROM public.transfers
                WHERE receiver_cat_id = :catId
                  AND source = 'welcome_grant'
                  AND status = 'completed'
                """.trimIndent(),
            )
                .param("catId", cat)
                .query(Int::class.java)
                .single(),
        ).isEqualTo(1)
        assertWalletReconciliation()
        assertGlobalConservation()
    }

    private fun createHuman(displayName: String): UUID {
        val humanId = UUID.randomUUID()
        jdbcClient.sql(
            """
            INSERT INTO public.humans (id, email, display_name)
            VALUES (:id, :email, :displayName)
            """.trimIndent(),
        )
            .param("id", humanId)
            .param("email", "${displayName.lowercase()}@example.test")
            .param("displayName", displayName)
            .update()
        return humanId
    }

    private fun createCat(humanId: UUID, name: String): UUID =
        jdbcClient.sql(
            """
            SELECT id
            FROM public.create_cat(:humanId, :name)
            """.trimIndent(),
        )
            .param("humanId", humanId)
            .param("name", name)
            .query(UUID::class.java)
            .single()

    private fun executeRaw(
        sender: UUID,
        receiver: UUID,
        amount: Long,
        idempotencyKey: UUID = UUID.randomUUID(),
        note: String = "snack",
        initiatedBy: UUID,
    ): TransferRecord =
        jdbcClient.sql(
            """
            SELECT *
            FROM public.execute_transfer(
                :idempotencyKey,
                :sender,
                :receiver,
                :amount,
                :note,
                'manual',
                :initiatedBy
            )
            """.trimIndent(),
        )
            .param("idempotencyKey", idempotencyKey)
            .param("sender", sender)
            .param("receiver", receiver)
            .param("amount", amount)
            .param("note", note)
            .param("initiatedBy", initiatedBy)
            .query(transferRecordMapper)
            .single()

    private fun transferRequest(
        sender: UUID,
        receiver: UUID,
        amount: Long,
        source: String = "manual",
    ) = ExecuteTransferRequest(
        idempotencyKey = UUID.randomUUID(),
        senderCatId = sender,
        receiverCatId = receiver,
        amount = amount,
        note = "snack",
        source = source,
    )

    private fun balance(catId: UUID): Long =
        jdbcClient.sql("SELECT balance FROM public.wallets WHERE cat_id = :catId")
            .param("catId", catId)
            .query(Long::class.java)
            .single()

    private fun ledgerCount(transferId: UUID): Int =
        jdbcClient.sql("SELECT count(*) FROM public.ledger_entries WHERE transfer_id = :transferId")
            .param("transferId", transferId)
            .query(Int::class.java)
            .single()

    private fun assertWalletReconciliation() {
        val unreconciledWallets = jdbcClient.sql(
            """
            SELECT count(*)
            FROM public.wallets w
            WHERE w.balance <> (
                SELECT COALESCE(
                    SUM(
                        CASE le.direction
                            WHEN 'credit' THEN le.amount
                            ELSE -le.amount
                        END
                    ),
                    0
                )
                FROM public.ledger_entries le
                WHERE le.wallet_cat_id = w.cat_id
            )
            """.trimIndent(),
        )
            .query(Int::class.java)
            .single()

        assertThat(unreconciledWallets).isZero()
    }

    private fun assertGlobalConservation() {
        val signedTotal = jdbcClient.sql(
            """
            SELECT COALESCE(
                SUM(
                    CASE direction
                        WHEN 'credit' THEN amount
                        ELSE -amount
                    END
                ),
                0
            )
            FROM public.ledger_entries
            """.trimIndent(),
        )
            .query(Long::class.java)
            .single()

        assertThat(signedTotal).isZero()
    }

    private fun migrationFiles(): List<Path> =
        Files.list(Path.of("../supabase/migrations")).use { stream ->
            stream
                .filter { it.fileName.toString().endsWith(".sql") }
                .sorted()
                .toList()
        }

    private data class TransferRecord(
        val id: UUID,
        val amount: Long,
        val note: String?,
        val status: String,
        val failureReason: String?,
    )

    private companion object {
        val treasuryCatId: UUID = UUID.fromString("00000000-0000-4000-8000-000000000001")

        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine")

        val transferRecordMapper = RowMapper { rs: ResultSet, _: Int ->
            TransferRecord(
                id = rs.getObject("id", UUID::class.java),
                amount = rs.getLong("amount"),
                note = rs.getString("note"),
                status = rs.getString("status"),
                failureReason = rs.getString("failure_reason"),
            )
        }
    }
}
