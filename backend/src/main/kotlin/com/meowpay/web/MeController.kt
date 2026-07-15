package com.meowpay.web

import com.meowpay.dto.MeResponse
import com.meowpay.exception.BadRequestException
import com.meowpay.service.CatService
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/me")
class MeController(
    private val catService: CatService,
) {
    @GetMapping
    fun me(@AuthenticationPrincipal jwt: Jwt): MeResponse = catService.me(parseHumanId(jwt.subject))

    private fun parseHumanId(subject: String): UUID =
        try {
            UUID.fromString(subject)
        } catch (exception: IllegalArgumentException) {
            throw BadRequestException("invalid_subject", "JWT subject must be a UUID.")
        }
}
