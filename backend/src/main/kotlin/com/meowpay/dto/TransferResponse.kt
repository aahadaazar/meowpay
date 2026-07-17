package com.meowpay.dto

import java.time.OffsetDateTime
import java.util.UUID

data class TransferResponse(
    val id: UUID,
    val idempotencyKey: UUID,
    val senderWalletId: UUID,
    val receiverWalletId: UUID,
    val amount: Long,
    val note: String?,
    val source: String,
    val initiatedBy: UUID,
    val status: String,
    val failureReason: String?,
    val createdAt: OffsetDateTime,
)
