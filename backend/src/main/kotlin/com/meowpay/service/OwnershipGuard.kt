package com.meowpay.service

import com.meowpay.exception.BadRequestException
import com.meowpay.exception.ForbiddenException
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class OwnershipGuard(
    private val jdbcClient: JdbcClient,
) {
    fun requireOwnedSender(humanId: UUID, senderCatId: UUID) {
        val ownsSender = jdbcClient.sql(
            """
            SELECT EXISTS (
                SELECT 1
                FROM public.cats
                WHERE id = :catId
                  AND human_id = :humanId
                  AND NOT is_system
            )
            """.trimIndent(),
        )
            .param("catId", senderCatId)
            .param("humanId", humanId)
            .query(Boolean::class.java)
            .single()

        if (!ownsSender) {
            throw ForbiddenException(
                "sender_not_owned",
                "senderCatId is not owned by the authenticated human.",
            )
        }
    }

    fun requireNonSystemRecipient(receiverCatId: UUID) {
        val nonSystemRecipient = jdbcClient.sql(
            """
            SELECT EXISTS (
                SELECT 1
                FROM public.cats
                WHERE id = :catId
                  AND NOT is_system
            )
            """.trimIndent(),
        )
            .param("catId", receiverCatId)
            .query(Boolean::class.java)
            .single()

        if (!nonSystemRecipient) {
            throw BadRequestException(
                "invalid_receiver",
                "receiverCatId must identify a non-system cat.",
            )
        }
    }
}
