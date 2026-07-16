package com.meowpay.web

import com.meowpay.dto.ExecuteTransferRequest
import com.meowpay.exception.ForbiddenException
import com.meowpay.exception.GlobalExceptionHandler
import com.meowpay.service.TransferService
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.mock
import org.springframework.http.HttpStatus
import org.springframework.security.oauth2.jwt.Jwt
import java.util.UUID

class TransferControllerTests {
    private val transferService = mock(TransferService::class.java)
    private val controller = TransferController(transferService)

    @Test
    fun `execute endpoint rejects a sender cat the JWT human does not own`() {
        val humanId = UUID.randomUUID()
        val request = ExecuteTransferRequest(
            idempotencyKey = UUID.randomUUID(),
            senderCatId = UUID.randomUUID(),
            receiverCatId = UUID.randomUUID(),
            amount = 10,
            note = "A snack",
        )
        val forbidden = ForbiddenException(
            "sender_not_owned",
            "senderCatId is not owned by the authenticated human.",
        )
        doThrow(forbidden).`when`(transferService).execute(humanId, request)

        assertThatThrownBy { controller.execute(jwtFor(humanId), request) }
            .isSameAs(forbidden)

        val response = GlobalExceptionHandler().forbidden(forbidden)
        assertThat(response.statusCode).isEqualTo(HttpStatus.FORBIDDEN)
        assertThat(response.body?.code).isEqualTo("sender_not_owned")
    }

    private fun jwtFor(humanId: UUID): Jwt =
        Jwt.withTokenValue("test-token")
            .header("alg", "none")
            .subject(humanId.toString())
            .build()
}
