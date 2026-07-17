package com.meowpay.dto

import java.util.UUID

data class TopupRequest(
    val idempotencyKey: UUID,
    val amount: Long,
)
