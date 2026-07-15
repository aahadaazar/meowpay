package com.meowpay.dto

import java.time.OffsetDateTime
import java.util.UUID

data class CatSummaryResponse(
    val id: UUID,
    val name: String,
    val balance: Long,
    val createdAt: OffsetDateTime,
)

data class CatRosterResponse(
    val id: UUID,
    val name: String,
)

data class MeResponse(
    val id: UUID,
    val email: String?,
    val displayName: String,
    val cats: List<CatSummaryResponse>,
)
