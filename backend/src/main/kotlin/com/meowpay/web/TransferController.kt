package com.meowpay.web

import com.meowpay.dto.ExecuteTransferRequest
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
@RequestMapping("/api/transfers")
class TransferController(
    private val transferService: TransferService,
) {
    @PostMapping("/execute")
    fun execute(
        @AuthenticationPrincipal jwt: Jwt,
        @RequestBody request: ExecuteTransferRequest,
    ): ResponseEntity<TransferResponse> {
        val humanId = parseHumanId(jwt.subject)
        val response = transferService.execute(humanId, request)
        val status = if (response.status == "failed") {
            HttpStatus.UNPROCESSABLE_ENTITY
        } else {
            HttpStatus.OK
        }

        return ResponseEntity.status(status).body(response)
    }

    private fun parseHumanId(subject: String): UUID =
        try {
            UUID.fromString(subject)
        } catch (exception: IllegalArgumentException) {
            throw BadRequestException("invalid_subject", "JWT subject must be a UUID.")
        }
}
