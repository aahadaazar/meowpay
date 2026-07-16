package com.meowpay.service

import com.meowpay.dto.ExecuteTransferRequest
import com.meowpay.dto.TopupRequest
import com.meowpay.dto.TransferResponse
import com.meowpay.exception.BadRequestException
import org.springframework.beans.factory.annotation.Value
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import java.sql.ResultSet
import java.time.OffsetDateTime
import java.util.Locale
import java.util.UUID

@Service
class TransferService(
    private val jdbcClient: JdbcClient,
    private val ownershipGuard: OwnershipGuard,
    @Value("\${app.topup.max:1000}") private val topupMax: Long = 1000,
) {
    fun execute(humanId: UUID, request: ExecuteTransferRequest): TransferResponse {
        val source = normalizeClientSource(request.source)
        ownershipGuard.requireOwnedSender(humanId, request.senderCatId)
        ownershipGuard.requireNonSystemRecipient(request.receiverCatId)

        return executeTransfer(
            idempotencyKey = request.idempotencyKey,
            senderCatId = request.senderCatId,
            receiverCatId = request.receiverCatId,
            amount = request.amount,
            note = request.note,
            source = source,
            initiatedBy = humanId,
        )
    }

    fun topUp(humanId: UUID, request: TopupRequest): TransferResponse {
        ownershipGuard.requireOwnedCat(humanId, request.catId)
        validateTopupAmount(request.amount)

        return executeTransfer(
            idempotencyKey = request.idempotencyKey,
            senderCatId = treasuryCatId,
            receiverCatId = request.catId,
            amount = request.amount,
            note = null,
            source = "topup",
            initiatedBy = humanId,
        )
    }

    private fun executeTransfer(
        idempotencyKey: UUID,
        senderCatId: UUID,
        receiverCatId: UUID,
        amount: Long,
        note: String?,
        source: String,
        initiatedBy: UUID,
    ): TransferResponse {

        return jdbcClient.sql(
            """
            SELECT *
            FROM public.execute_transfer(
                :idempotencyKey,
                :senderCatId,
                :receiverCatId,
                :amount,
                :note,
                :source,
                :initiatedBy
            )
            """.trimIndent(),
        )
            .param("idempotencyKey", idempotencyKey)
            .param("senderCatId", senderCatId)
            .param("receiverCatId", receiverCatId)
            .param("amount", amount)
            .param("note", note?.trim()?.ifBlank { null })
            .param("source", source)
            .param("initiatedBy", initiatedBy)
            .query(transferMapper)
            .single()
    }

    private fun validateTopupAmount(amount: Long) {
        if (amount !in topupAmounts) {
            throw BadRequestException(
                "topup_amount_not_allowed",
                "amount must be one of: ${topupAmounts.sorted().joinToString()}.",
            )
        }

        if (amount > topupMax) {
            throw BadRequestException(
                "topup_cap_exceeded",
                "amount exceeds the server-side top-up cap.",
            )
        }
    }

    private fun normalizeClientSource(rawSource: String?): String {
        val source = rawSource
            ?.trim()
            ?.lowercase(Locale.US)
            ?.ifBlank { null }
            ?: "manual"

        if (source in serverOnlySources) {
            throw BadRequestException(
                "server_only_source",
                "source '$source' can only be used by server-side flows.",
            )
        }

        if (source !in clientSources) {
            throw BadRequestException(
                "invalid_source",
                "source must be one of: ${clientSources.joinToString()}.",
            )
        }

        return source
    }

    private companion object {
        val clientSources = setOf("manual", "agent")
        val serverOnlySources = setOf("topup", "welcome_grant")
        val topupAmounts = setOf(100L, 500L, 1000L)
        val treasuryCatId: UUID = UUID.fromString("00000000-0000-4000-8000-000000000001")

        val transferMapper = RowMapper { rs: ResultSet, _: Int ->
            TransferResponse(
                id = rs.getObject("id", UUID::class.java),
                idempotencyKey = rs.getObject("idempotency_key", UUID::class.java),
                senderCatId = rs.getObject("sender_cat_id", UUID::class.java),
                receiverCatId = rs.getObject("receiver_cat_id", UUID::class.java),
                amount = rs.getLong("amount"),
                note = rs.getString("note"),
                source = rs.getString("source"),
                initiatedBy = rs.getObject("initiated_by", UUID::class.java),
                status = rs.getString("status"),
                failureReason = rs.getString("failure_reason"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java),
            )
        }
    }
}
