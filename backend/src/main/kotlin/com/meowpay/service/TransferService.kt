package com.meowpay.service

import com.meowpay.dto.ExecuteTransferRequest
import com.meowpay.dto.TransferResponse
import com.meowpay.exception.BadRequestException
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
) {
    fun execute(humanId: UUID, request: ExecuteTransferRequest): TransferResponse {
        val source = normalizeClientSource(request.source)
        ownershipGuard.requireOwnedSender(humanId, request.senderCatId)
        ownershipGuard.requireNonSystemRecipient(request.receiverCatId)

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
            .param("idempotencyKey", request.idempotencyKey)
            .param("senderCatId", request.senderCatId)
            .param("receiverCatId", request.receiverCatId)
            .param("amount", request.amount)
            .param("note", request.note?.trim()?.ifBlank { null })
            .param("source", source)
            .param("initiatedBy", humanId)
            .query(transferMapper)
            .single()
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
