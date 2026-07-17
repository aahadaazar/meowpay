package com.meowpay.agent

import com.meowpay.service.RecentTransaction

data class InsightWindow(
    val days: Int? = null,
    val limit: Int? = null,
)

interface InsightModelClient {
    /** The first completion is forced to request the recent-transaction tool. */
    fun chooseWindow(): InsightWindow

    /** The second completion receives only rows selected by the backend. */
    fun summarize(transactions: List<RecentTransaction>): String
}
