package com.meowpay.agent

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.meowpay.service.RecentTransaction
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

@Component
class GroqInsightClient(
    private val objectMapper: ObjectMapper,
    @Value("\${app.groq.api-key:}") private val apiKey: String,
    @Value("\${app.groq.insight-model:llama-3.3-70b-versatile}") private val model: String,
) : InsightModelClient {
    private val client = RestClient.builder().baseUrl("https://api.groq.com/openai/v1").build()

    override fun chooseWindow(): InsightWindow {
        val body = request(
            mapOf(
                "model" to model,
                "messages" to listOf(mapOf("role" to "system", "content" to "Choose a bounded recent-activity window for a wallet summary.")),
                "tools" to listOf(mapOf(
                    "type" to "function",
                    "function" to mapOf(
                        "name" to "get_recent_transactions",
                        "description" to "Retrieve recent activity for the already authenticated account.",
                        "parameters" to mapOf("type" to "object", "properties" to mapOf(
                            "days" to mapOf("type" to "integer"),
                            "limit" to mapOf("type" to "integer"),
                        )),
                    ),
                )),
                "tool_choice" to mapOf("type" to "function", "function" to mapOf("name" to "get_recent_transactions")),
            ),
        )
        val arguments = body.at("/choices/0/message/tool_calls/0/function/arguments").asText("{}")
        val node = objectMapper.readTree(arguments)
        val days = node.path("days")
        val limit = node.path("limit")
        return InsightWindow(if (days.isInt) days.asInt() else null, if (limit.isInt) limit.asInt() else null)
    }

    override fun summarize(transactions: List<RecentTransaction>): String {
        val rows = objectMapper.writeValueAsString(transactions)
        val body = request(
            mapOf(
                "model" to model,
                "messages" to listOf(
                    mapOf("role" to "system", "content" to "Summarize this authenticated user's cat activity in two concise, factual sentences. Do not invent transactions."),
                    mapOf("role" to "user", "content" to rows),
                ),
            ),
        )
        return body.at("/choices/0/message/content").asText().trim()
    }

    private fun request(payload: Any): JsonNode {
        check(apiKey.isNotBlank()) { "GROQ_API_KEY must be configured to generate activity insights." }
        val response = client.post().uri("/chat/completions")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $apiKey")
            .contentType(MediaType.APPLICATION_JSON)
            .body(payload)
            .retrieve()
            .body(String::class.java)
            ?: error("Groq returned an empty response.")
        return objectMapper.readTree(response)
    }
}
