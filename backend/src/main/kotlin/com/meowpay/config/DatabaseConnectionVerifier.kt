package com.meowpay.config

import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component

@Component
@ConditionalOnBean(JdbcClient::class)
class DatabaseConnectionVerifier(
    private val jdbcClient: JdbcClient,
) : ApplicationRunner {
    override fun run(args: ApplicationArguments) {
        try {
            jdbcClient.sql("SELECT 1").query(Int::class.java).single()
            logger.info("Supabase database connection verified.")
        } catch (exception: Exception) {
            throw IllegalStateException(
                "Unable to connect to Supabase. Check SUPABASE_DB_URL uses the Session Pooler on port 5432.",
                exception,
            )
        }
    }

    private companion object {
        val logger = LoggerFactory.getLogger(DatabaseConnectionVerifier::class.java)
    }
}
