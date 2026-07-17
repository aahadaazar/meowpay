package com.meowpay

import com.meowpay.dto.ExecuteTransferRequest
import com.meowpay.dto.TopupRequest
import com.meowpay.agent.InsightModelClient
import com.meowpay.agent.InsightWindow
import com.meowpay.agent.InsightAgent
import com.meowpay.exception.BadRequestException
import com.meowpay.exception.ForbiddenException
import com.meowpay.service.InsightService
import com.meowpay.service.RecentTransaction
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
                statement.execute("CREATE SCHEMA IF NOT EXISTS auth")
                statement.execute("CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb)")
                statement.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF; END; $$")
                statement.execute("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$")
                statement.execute("GRANT USAGE ON SCHEMA auth TO authenticated")
                statement.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF; END; $$")
                statement.execute("DROP SCHEMA public CASCADE")
                statement.execute("CREATE SCHEMA public")
            }
            migrationFiles().forEach { migration -> connection.createStatement().use { it.execute(Files.readString(migration)) } }
        }
    }

    @Test
    fun `treasury human cat and cat hop preserve reconciliation and global conservation`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val milo = createCat(alice.id, "Milo")
        val nori = createCat(bob.id, "Nori")

        assertThat(executeRaw(treasuryWalletId, alice.walletId, 700, "topup", alice.id).status).isEqualTo("completed")
        assertThat(executeRaw(alice.walletId, milo.walletId, 300, "manual", alice.id).status).isEqualTo("completed")
        assertThat(executeRaw(milo.walletId, nori.walletId, 125, "manual", alice.id).status).isEqualTo("completed")

        assertThat(balance(treasuryWalletId)).isEqualTo(-700)
        assertThat(balance(alice.walletId)).isEqualTo(400)
        assertThat(balance(milo.walletId)).isEqualTo(175)
        assertThat(balance(nori.walletId)).isEqualTo(125)
        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `route table permits only treasury human human cat and cat cat`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val milo = createCat(alice.id, "Milo")
        val nori = createCat(bob.id, "Nori")

        assertThat(executeRaw(treasuryWalletId, alice.walletId, 100, "topup", alice.id).status).isEqualTo("completed")
        assertThat(executeRaw(alice.walletId, milo.walletId, 50, "manual", alice.id).status).isEqualTo("completed")
        assertThat(executeRaw(milo.walletId, nori.walletId, 25, "manual", alice.id).status).isEqualTo("completed")

        listOf(
            executeRaw(milo.walletId, alice.walletId, 1, "manual", alice.id),
            executeRaw(milo.walletId, treasuryWalletId, 1, "manual", alice.id),
            executeRaw(alice.walletId, bob.walletId, 1, "manual", alice.id),
            executeRaw(treasuryWalletId, milo.walletId, 1, "topup", alice.id),
        ).forEach { transfer ->
            assertThat(transfer.status).isEqualTo("failed")
            assertThat(transfer.failureReason).isEqualTo("unsupported_route")
        }
        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `top up resolves the callers wallet and applies only positive capped amounts`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val treasuryBefore = balance(treasuryWalletId)

        val transfer = transferService.topUp(alice.id, TopupRequest(UUID.randomUUID(), 700))

        assertThat(transfer.status).isEqualTo("completed")
        assertThat(transfer.receiverWalletId).isEqualTo(alice.walletId)
        assertThat(balance(alice.walletId)).isEqualTo(700)
        assertThat(balance(bob.walletId)).isZero()
        assertThat(balance(treasuryWalletId)).isEqualTo(treasuryBefore - 700)
        assertThatThrownBy { transferService.topUp(alice.id, TopupRequest(UUID.randomUUID(), 0)) }
            .isInstanceOf(BadRequestException::class.java).hasMessageContaining("greater than zero")
        assertThatThrownBy { transferService.topUp(alice.id, TopupRequest(UUID.randomUUID(), 1001)) }
            .isInstanceOf(BadRequestException::class.java).hasMessageContaining("top-up cap")
    }

    @Test
    fun `client supplied sender wallet must be owned and cannot name treasury`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val aliceCat = createCat(alice.id, "Milo")
        val bobCat = createCat(bob.id, "Nori")

        listOf(bob.walletId, bobCat.walletId, treasuryWalletId).forEach { senderWalletId ->
            assertThatThrownBy {
                transferService.execute(alice.id, transferRequest(senderWalletId, aliceCat.walletId, 10))
            }.isInstanceOf(ForbiddenException::class.java).hasMessageContaining("senderWalletId is not owned")
        }
        assertThatThrownBy {
            transferService.execute(alice.id, transferRequest(alice.walletId, bobCat.walletId, 10, "topup"))
        }.isInstanceOf(BadRequestException::class.java).hasMessageContaining("server-side flows")
    }

    @Test
    fun `idempotency concurrency and insufficient funds retain their guarantees`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val milo = createCat(alice.id, "Milo")
        val nori = createCat(bob.id, "Nori")
        val pip = createCat(bob.id, "Pip")
        executeRaw(treasuryWalletId, alice.walletId, 500, "topup", alice.id)
        executeRaw(alice.walletId, milo.walletId, 500, "manual", alice.id)
        val key = UUID.randomUUID()
        val original = executeRaw(milo.walletId, nori.walletId, 75, "manual", alice.id, key, "first")
        val replay = executeRaw(milo.walletId, nori.walletId, 300, "manual", alice.id, key, "replay")
        assertThat(replay.id).isEqualTo(original.id)
        assertThat(replay.amount).isEqualTo(75)

        val ready = CountDownLatch(2)
        val start = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)
        try {
            val outcomes = listOf(nori, pip).map { receiver -> executor.submit(Callable {
                ready.countDown(); start.await(10, TimeUnit.SECONDS)
                executeRaw(milo.walletId, receiver.walletId, 300, "manual", alice.id).status
            }) }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue()
            start.countDown()
            assertThat(outcomes.map { it.get(10, TimeUnit.SECONDS) }).containsExactlyInAnyOrder("completed", "failed")
        } finally { executor.shutdownNow() }

        assertWalletReconciliation()
        assertGlobalConservation()
    }

    @Test
    fun `create cat creates a zero wallet with no ledger row`() {
        val alice = createHuman("Alice")
        val cat = createCat(alice.id, "Milo")

        assertThat(balance(cat.walletId)).isZero()
        assertThat(jdbcClient.sql("SELECT count(*) FROM public.ledger_entries WHERE wallet_id = :walletId").param("walletId", cat.walletId).query(Int::class.java).single()).isZero()
        assertWalletReconciliation()
    }

    @Test
    fun `insight rows ignore a model injected foreign cat id and summarize caller activity`() {
        val alice = createHuman("Alice")
        val bob = createHuman("Bob")
        val milo = createCat(alice.id, "Milo")
        val nori = createCat(bob.id, "Nori")
        executeRaw(treasuryWalletId, alice.walletId, 100, "topup", alice.id)
        executeRaw(alice.walletId, milo.walletId, 100, "manual", alice.id)
        executeRaw(milo.walletId, nori.walletId, 25, "manual", alice.id)

        val model = object : InsightModelClient {
            override fun chooseWindow() = InsightWindow(days = 30, limit = 10)
            override fun summarize(transactions: List<RecentTransaction>) = "${transactions.size} recent cat transactions."
        }
        val insightService = InsightService(jdbcClient)
        val insightAgent = InsightAgent(insightService, model)
        val baseline = insightService.recentTransactions(alice.id, InsightWindow(days = 30, limit = 10))
        // cat_id is present in this malicious model payload but is deliberately discarded.
        val afterInjection = insightService.recentTransactionsForTool(alice.id, mapOf("cat_id" to nori.id.toString(), "days" to 30, "limit" to 10))

        assertThat(afterInjection).isEqualTo(baseline)
        assertThat(afterInjection).isNotEmpty
        assertThat(afterInjection).allMatch { it.catName == "Milo" }
        assertThat(insightAgent.summary(alice.id)).isNotBlank()
    }

    private fun createHuman(displayName: String): HumanWallet {
        val humanId = UUID.randomUUID()
        jdbcClient.sql("INSERT INTO public.humans (id, email, display_name) VALUES (:id, :email, :displayName)")
            .param("id", humanId).param("email", "${displayName.lowercase()}@example.test").param("displayName", displayName).update()
        val walletId = jdbcClient.sql("INSERT INTO public.wallets (kind, human_id) VALUES ('human', :humanId) RETURNING id")
            .param("humanId", humanId).query(UUID::class.java).single()
        return HumanWallet(humanId, walletId)
    }

    private fun createCat(humanId: UUID, name: String): CatWallet {
        val catId = jdbcClient.sql("SELECT id FROM public.create_cat(:humanId, :name)").param("humanId", humanId).param("name", name).query(UUID::class.java).single()
        val walletId = jdbcClient.sql("SELECT id FROM public.wallets WHERE cat_id = :catId").param("catId", catId).query(UUID::class.java).single()
        return CatWallet(catId, walletId)
    }

    private fun executeRaw(sender: UUID, receiver: UUID, amount: Long, source: String, initiatedBy: UUID, idempotencyKey: UUID = UUID.randomUUID(), note: String = "snack"): TransferRecord =
        jdbcClient.sql("SELECT * FROM public.execute_transfer(:idempotencyKey, :sender, :receiver, :amount, :note, :source, :initiatedBy)")
            .param("idempotencyKey", idempotencyKey).param("sender", sender).param("receiver", receiver).param("amount", amount).param("note", note).param("source", source).param("initiatedBy", initiatedBy)
            .query(transferRecordMapper).single()

    private fun transferRequest(sender: UUID, receiver: UUID, amount: Long, source: String = "manual") = ExecuteTransferRequest(UUID.randomUUID(), sender, receiver, amount, "snack", source)
    private fun balance(walletId: UUID): Long = jdbcClient.sql("SELECT balance FROM public.wallets WHERE id = :walletId").param("walletId", walletId).query(Long::class.java).single()
    private fun assertWalletReconciliation() {
        val unreconciled = jdbcClient.sql("SELECT count(*) FROM public.wallets w WHERE w.balance <> (SELECT COALESCE(SUM(CASE le.direction WHEN 'credit' THEN le.amount ELSE -le.amount END), 0) FROM public.ledger_entries le WHERE le.wallet_id = w.id)").query(Int::class.java).single()
        assertThat(unreconciled).isZero()
    }
    private fun assertGlobalConservation() {
        val signedTotal = jdbcClient.sql("SELECT COALESCE(SUM(CASE direction WHEN 'credit' THEN amount ELSE -amount END), 0) FROM public.ledger_entries").query(Long::class.java).single()
        assertThat(signedTotal).isZero()
    }
    private fun migrationFiles(): List<Path> = Files.list(Path.of("../supabase/migrations")).use { it.filter { path -> path.fileName.toString().endsWith(".sql") }.sorted().toList() }
    private data class HumanWallet(val id: UUID, val walletId: UUID)
    private data class CatWallet(val id: UUID, val walletId: UUID)
    private data class TransferRecord(val id: UUID, val amount: Long, val note: String?, val status: String, val failureReason: String?)
    private companion object {
        val treasuryWalletId: UUID = UUID.fromString("00000000-0000-4000-8000-000000000001")
        @Container @JvmStatic val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine")
        val transferRecordMapper = RowMapper { rs: ResultSet, _: Int -> TransferRecord(rs.getObject("id", UUID::class.java), rs.getLong("amount"), rs.getString("note"), rs.getString("status"), rs.getString("failure_reason")) }
    }
}
