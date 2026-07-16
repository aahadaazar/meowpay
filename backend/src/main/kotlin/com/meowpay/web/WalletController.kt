package com.meowpay.web

import com.meowpay.dto.TopupRequest
import com.meowpay.dto.TransferResponse
import com.meowpay.exception.BadRequestException
import com.meowpay.service.TransferService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/wallet")
class WalletController(
    private val transferService: TransferService,
) {
    @PostMapping("/topup")
    fun topUp(
        @AuthenticationPrincipal jwt: Jwt,
        @RequestBody request: TopupRequest,
    ): ResponseEntity<TransferResponse> {
        val response = transferService.topUp(parseHumanId(jwt.subject), request)
        val status = if (response.status == "failed") HttpStatus.UNPROCESSABLE_ENTITY else HttpStatus.OK
        return ResponseEntity.status(status).body(response)
    }

    private fun parseHumanId(subject: String): UUID =
        try {
            UUID.fromString(subject)
        } catch (exception: IllegalArgumentException) {
            throw BadRequestException("invalid_subject", "JWT subject must be a UUID.")
        }
}
