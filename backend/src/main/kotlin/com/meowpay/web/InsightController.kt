package com.meowpay.web

import com.meowpay.dto.InsightResponse
import com.meowpay.agent.InsightAgent
import com.meowpay.exception.BadRequestException
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/insights")
class InsightController(private val insightAgent: InsightAgent) {
    @GetMapping("/summary")
    fun summary(@AuthenticationPrincipal jwt: Jwt): InsightResponse = InsightResponse(insightAgent.summary(parseHumanId(jwt.subject)))

    private fun parseHumanId(subject: String): UUID = try {
        UUID.fromString(subject)
    } catch (_: IllegalArgumentException) {
        throw BadRequestException("invalid_subject", "JWT subject must be a UUID.")
    }
}
