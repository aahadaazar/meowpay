package com.meowpay.web

import com.meowpay.dto.CatRosterResponse
import com.meowpay.dto.CatSummaryResponse
import com.meowpay.dto.CreateCatRequest
import com.meowpay.exception.BadRequestException
import com.meowpay.service.CatService
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/cats")
class CatController(
    private val catService: CatService,
) {
    @GetMapping
    fun roster(): List<CatRosterResponse> = catService.roster()

    @PostMapping
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthenticationPrincipal jwt: Jwt,
        @RequestBody request: CreateCatRequest,
    ): CatSummaryResponse = catService.create(parseHumanId(jwt.subject), request)

    private fun parseHumanId(subject: String): UUID =
        try {
            UUID.fromString(subject)
        } catch (exception: IllegalArgumentException) {
            throw BadRequestException("invalid_subject", "JWT subject must be a UUID.")
        }
}
