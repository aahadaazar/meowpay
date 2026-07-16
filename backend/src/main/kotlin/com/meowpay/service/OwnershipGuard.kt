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
        requireOwnedCat(
            humanId = humanId,
            catId = senderCatId,
            code = "sender_not_owned",
            message = "senderCatId is not owned by the authenticated human.",
        )
    }

    fun requireOwnedCat(
        humanId: UUID,
        catId: UUID,
        code: String = "cat_not_owned",
        message: String = "catId is not owned by the authenticated human.",
    ) {
        val ownsCat = jdbcClient.sql(
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
            .param("catId", catId)
            .param("humanId", humanId)
            .query(Boolean::class.java)
            .single()

        if (!ownsCat) {
            throw ForbiddenException(code, message)
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
