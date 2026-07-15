package com.meowpay.dto

import java.util.UUID

data class ExecuteTransferRequest(
    val idempotencyKey: UUID,
    val senderCatId: UUID,
    val receiverCatId: UUID,
    val amount: Long,
    val note: String? = null,
    val source: String? = "manual",
)
