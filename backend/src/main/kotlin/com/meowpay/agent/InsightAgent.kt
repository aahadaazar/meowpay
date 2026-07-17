package com.meowpay.agent

import com.meowpay.service.InsightService
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class InsightAgent(
    private val insightService: InsightService,
    private val modelClient: InsightModelClient,
) {
    fun summary(humanId: UUID): String {
        // The forced tool call can select only a bounded time window. Row selection remains in
        // InsightService, which scopes every query from this JWT-resolved human id.
        val transactions = insightService.recentTransactions(humanId, modelClient.chooseWindow())
        return modelClient.summarize(transactions)
    }
}
