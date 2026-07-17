package com.meowpay.service

import com.meowpay.agent.InsightWindow
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import java.sql.ResultSet
import java.time.OffsetDateTime
import java.util.UUID

data class RecentTransaction(
    val catName: String,
    val direction: String,
    val amount: Long,
    val counterpartyName: String,
    val note: String?,
    val createdAt: OffsetDateTime,
)

@Service
class InsightService(
    private val jdbcClient: JdbcClient,
) {
    /**
     * Model arguments cannot select cats. This method intentionally accepts only a human id and
     * bounded window values; a model-injected `cat_id` has no path to this query.
     */
    fun recentTransactions(humanId: UUID, window: InsightWindow): List<RecentTransaction> {
        val days = (window.days ?: defaultDays).coerceIn(minDays, maxDays)
        val limit = (window.limit ?: defaultLimit).coerceIn(minLimit, maxLimit)
        return jdbcClient.sql(
            """
            SELECT c.name AS cat_name, le.direction, le.amount, le.counterparty_name, le.note, le.created_at
            FROM public.ledger_entries le
            JOIN public.wallets w ON w.id = le.wallet_id AND w.kind = 'cat'
            JOIN public.cats c ON c.id = w.cat_id
            WHERE c.human_id = :humanId
              AND le.created_at >= now() - (:days * interval '1 day')
            ORDER BY le.created_at DESC, le.id DESC
            LIMIT :limit
            """.trimIndent(),
        )
            .param("humanId", humanId)
            .param("days", days)
            .param("limit", limit)
            .query(transactionMapper)
            .list()
    }

    /**
     * Boundary for tool-call arguments. Only window controls are read; notably, `cat_id` is
     * discarded rather than validated, so it can never influence row selection.
     */
    fun recentTransactionsForTool(humanId: UUID, toolArguments: Map<String, Any?>): List<RecentTransaction> =
        recentTransactions(
            humanId,
            InsightWindow(
                days = (toolArguments["days"] as? Number)?.toInt(),
                limit = (toolArguments["limit"] as? Number)?.toInt(),
            ),
        )

    private companion object {
        const val defaultDays = 30
        const val defaultLimit = 50
        const val minDays = 1
        const val maxDays = 90
        const val minLimit = 1
        const val maxLimit = 100
        val transactionMapper = RowMapper { rs: ResultSet, _: Int ->
            RecentTransaction(rs.getString("cat_name"), rs.getString("direction"), rs.getLong("amount"), rs.getString("counterparty_name"), rs.getString("note"), rs.getObject("created_at", OffsetDateTime::class.java))
        }
    }
}
