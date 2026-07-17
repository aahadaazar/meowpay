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
    fun requireOwnedSender(humanId: UUID, walletId: UUID) {
        val ownsWallet = jdbcClient.sql(
            """
            SELECT EXISTS (
                SELECT 1
                FROM public.wallets w
                LEFT JOIN public.cats c ON c.id = w.cat_id
                WHERE w.id = :walletId
                  AND (w.human_id = :humanId OR c.human_id = :humanId)
            )
            """.trimIndent(),
        )
            .param("walletId", walletId)
            .param("humanId", humanId)
            .query(Boolean::class.java)
            .single()

        if (!ownsWallet) {
            throw ForbiddenException("sender_not_owned", "senderWalletId is not owned by the authenticated human.")
        }
    }

    fun requireCatRecipient(receiverWalletId: UUID) {
        val catRecipient = jdbcClient.sql(
            """
            SELECT EXISTS (
                SELECT 1
                FROM public.wallets
                WHERE id = :walletId
                  AND kind = 'cat'
            )
            """.trimIndent(),
        )
            .param("walletId", receiverWalletId)
            .query(Boolean::class.java)
            .single()

        if (!catRecipient) {
            throw BadRequestException(
                "invalid_receiver",
                "receiverWalletId must identify a cat wallet.",
            )
        }
    }
}
