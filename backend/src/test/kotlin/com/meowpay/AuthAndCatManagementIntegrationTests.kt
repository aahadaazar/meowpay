package com.meowpay

import com.meowpay.dto.CreateCatRequest
import com.meowpay.service.CatService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.jdbc.datasource.DriverManagerDataSource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import java.nio.file.Files
import java.nio.file.Path
import java.sql.Connection
import java.util.UUID
import javax.sql.DataSource

@Testcontainers
class AuthAndCatManagementIntegrationTests {
    private lateinit var dataSource: DataSource
    private lateinit var jdbcClient: JdbcClient
    private lateinit var catService: CatService

    @BeforeEach
    fun setUpDatabase() {
        dataSource = DriverManagerDataSource(postgres.jdbcUrl, postgres.username, postgres.password)
        jdbcClient = JdbcClient.create(dataSource)

        dataSource.connection.use { connection ->
            connection.createStatement().use { statement ->
                statement.execute("CREATE SCHEMA IF NOT EXISTS auth")
                statement.execute("DROP TABLE IF EXISTS auth.users CASCADE")
                statement.execute(
                    """
                    CREATE TABLE auth.users (
                        id uuid PRIMARY KEY,
                        email text,
                        raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
                    )
                    """.trimIndent(),
                )
                statement.execute(
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                            CREATE ROLE anon;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                            CREATE ROLE authenticated;
                        END IF;
                    END;
                    $$
                    """.trimIndent(),
                )
                statement.execute(
                    """
                    CREATE OR REPLACE FUNCTION auth.uid()
                    RETURNS uuid
                    LANGUAGE sql
                    STABLE
                    AS $$
                        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
                    $$
                    """.trimIndent(),
                )
                statement.execute("GRANT USAGE ON SCHEMA auth TO authenticated")
                statement.execute("DROP SCHEMA IF EXISTS public CASCADE")
                statement.execute("CREATE SCHEMA public")
                migrationFiles().forEach { migration -> statement.execute(Files.readString(migration)) }
            }
        }

        catService = CatService(jdbcClient)
    }

    @Test
    fun `me contains only the authenticated humans cats and welcome balances`() {
        val alice = createAuthUser("alice@example.test", "Alice")
        val bob = createAuthUser("bob@example.test", "Bob")
        catService.create(alice, CreateCatRequest("Milo"))
        catService.create(bob, CreateCatRequest("Nori"))

        val me = catService.me(alice)

        assertThat(me.displayName).isEqualTo("Alice")
        assertThat(me.cats).singleElement().satisfies { cat ->
            assertThat(cat.name).isEqualTo("Milo")
            assertThat(cat.balance).isEqualTo(500)
        }
    }

    @Test
    fun `global roster excludes the treasury`() {
        val alice = createAuthUser("alice@example.test", "Alice")
        val bob = createAuthUser("bob@example.test", "Bob")
        catService.create(alice, CreateCatRequest("Milo"))
        catService.create(bob, CreateCatRequest("Nori"))

        assertThat(catService.roster().map { it.name })
            .containsExactly("Milo", "Nori")
            .doesNotContain("MeowPay Treasury")
    }

    @Test
    fun `rls hides another humans wallets ledger entries and transfers`() {
        val alice = createAuthUser("alice@example.test", "Alice")
        val bob = createAuthUser("bob@example.test", "Bob")
        val aliceCat = catService.create(alice, CreateCatRequest("Milo"))
        val bobCat = catService.create(bob, CreateCatRequest("Nori"))

        assertThat(queryAsAuthenticated(alice, "SELECT count(*) FROM public.wallets WHERE cat_id = '${bobCat.id}'"))
            .isZero()
        assertThat(queryAsAuthenticated(alice, "SELECT count(*) FROM public.ledger_entries WHERE wallet_cat_id = '${bobCat.id}'"))
            .isZero()
        assertThat(queryAsAuthenticated(alice, "SELECT count(*) FROM public.transfers WHERE sender_cat_id = '${bobCat.id}'"))
            .isZero()
        assertThat(queryAsAuthenticated(alice, "SELECT count(*) FROM public.wallets WHERE cat_id = '${aliceCat.id}'"))
            .isEqualTo(1)
    }

    private fun createAuthUser(email: String, displayName: String): UUID {
        val id = UUID.randomUUID()
        jdbcClient.sql(
            """
            INSERT INTO auth.users (id, email, raw_user_meta_data)
            VALUES (:id, :email, jsonb_build_object('display_name', :displayName))
            """.trimIndent(),
        )
            .param("id", id)
            .param("email", email)
            .param("displayName", displayName)
            .update()
        return id
    }

    private fun queryAsAuthenticated(humanId: UUID, sql: String): Int =
        dataSource.connection.use { connection ->
            connection.autoCommit = false
            try {
                connection.createStatement().use { it.execute("SET ROLE authenticated") }
                connection.prepareStatement("SELECT set_config('request.jwt.claim.sub', ?, true)").use { statement ->
                    statement.setString(1, humanId.toString())
                    statement.executeQuery().close()
                }
                val count = connection.createStatement().use { statement ->
                    statement.executeQuery(sql).use { resultSet ->
                        resultSet.next()
                        resultSet.getInt(1)
                    }
                }
                connection.commit()
                count
            } finally {
                connection.rollback()
                connection.createStatement().use { statement -> statement.execute("RESET ROLE") }
            }
        }

    private fun migrationFiles(): List<Path> =
        Files.list(Path.of("../supabase/migrations")).use { stream ->
            stream.filter { it.fileName.toString().endsWith(".sql") }.sorted().toList()
        }

    private companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer<Nothing>("postgres:16-alpine")
    }
}
