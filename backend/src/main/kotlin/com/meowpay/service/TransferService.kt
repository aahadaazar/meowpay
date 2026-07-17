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
        ownershipGuard.requireOwnedSender(humanId, request.senderWalletId)
        ownershipGuard.requireCatRecipient(request.receiverWalletId)

        return executeTransfer(
            idempotencyKey = request.idempotencyKey,
            senderWalletId = request.senderWalletId,
            receiverWalletId = request.receiverWalletId,
            amount = request.amount,
            note = request.note,
            source = source,
            initiatedBy = humanId,
        )
    }

    fun topUp(humanId: UUID, request: TopupRequest): TransferResponse {
        validateTopupAmount(request.amount)
        val humanWalletId = jdbcClient.sql(
            """
            SELECT id
            FROM public.wallets
            WHERE kind = 'human'
              AND human_id = :humanId
            """.trimIndent(),
        )
            .param("humanId", humanId)
            .query(UUID::class.java)
            .optional()
            .orElseThrow { BadRequestException("human_wallet_not_found", "The authenticated human has no wallet.") }

        return executeTransfer(
            idempotencyKey = request.idempotencyKey,
            senderWalletId = treasuryWalletId,
            receiverWalletId = humanWalletId,
            amount = request.amount,
            note = null,
            source = "topup",
            initiatedBy = humanId,
        )
    }

    private fun executeTransfer(
        idempotencyKey: UUID,
        senderWalletId: UUID,
        receiverWalletId: UUID,
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
                :senderWalletId,
                :receiverWalletId,
                :amount,
                :note,
                :source,
                :initiatedBy
            )
            """.trimIndent(),
        )
            .param("idempotencyKey", idempotencyKey)
            .param("senderWalletId", senderWalletId)
            .param("receiverWalletId", receiverWalletId)
            .param("amount", amount)
            .param("note", note?.trim()?.ifBlank { null })
            .param("source", source)
            .param("initiatedBy", initiatedBy)
            .query(transferMapper)
            .single()
    }

    private fun validateTopupAmount(amount: Long) {
        if (amount <= 0) {
            throw BadRequestException(
                "invalid_amount",
                "amount must be greater than zero.",
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
        val serverOnlySources = setOf("topup")
        val treasuryWalletId: UUID = UUID.fromString("00000000-0000-4000-8000-000000000001")

        val transferMapper = RowMapper { rs: ResultSet, _: Int ->
            TransferResponse(
                id = rs.getObject("id", UUID::class.java),
                idempotencyKey = rs.getObject("idempotency_key", UUID::class.java),
                senderWalletId = rs.getObject("sender_wallet_id", UUID::class.java),
                receiverWalletId = rs.getObject("receiver_wallet_id", UUID::class.java),
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
