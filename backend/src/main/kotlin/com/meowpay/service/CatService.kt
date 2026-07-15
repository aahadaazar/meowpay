package com.meowpay.service

import com.meowpay.dto.CatRosterResponse
import com.meowpay.dto.CatSummaryResponse
import com.meowpay.dto.CreateCatRequest
import com.meowpay.dto.MeResponse
import com.meowpay.exception.BadRequestException
import com.meowpay.exception.NotFoundException
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import java.sql.ResultSet
import java.time.OffsetDateTime
import java.util.UUID

@Service
class CatService(
    private val jdbcClient: JdbcClient,
) {
    fun me(humanId: UUID): MeResponse {
        val human = jdbcClient.sql(
            """
            SELECT id, email, display_name
            FROM public.humans
            WHERE id = :humanId
            """.trimIndent(),
        )
            .param("humanId", humanId)
            .query(humanMapper)
            .optional()
            .orElseThrow {
                NotFoundException("human_not_found", "No human profile exists for the authenticated user.")
            }

        val cats = jdbcClient.sql(
            """
            SELECT c.id, c.name, w.balance, c.created_at
            FROM public.cats c
            JOIN public.wallets w ON w.cat_id = c.id
            WHERE c.human_id = :humanId
              AND NOT c.is_system
            ORDER BY c.created_at ASC
            """.trimIndent(),
        )
            .param("humanId", humanId)
            .query(catSummaryMapper)
            .list()

        return MeResponse(human.id, human.email, human.displayName, cats)
    }

    fun roster(): List<CatRosterResponse> =
        jdbcClient.sql(
            """
            SELECT id, name
            FROM public.cats
            WHERE NOT is_system
            ORDER BY name ASC, id ASC
            """.trimIndent(),
        )
            .query(catRosterMapper)
            .list()

    fun create(humanId: UUID, request: CreateCatRequest): CatSummaryResponse {
        val name = request.name?.trim().orEmpty()
        if (name.isBlank()) {
            throw BadRequestException("invalid_cat_name", "name must not be blank.")
        }

        return jdbcClient.sql(
            """
            SELECT c.id, c.name, w.balance, c.created_at
            FROM public.create_cat(:humanId, :name) c
            JOIN public.wallets w ON w.cat_id = c.id
            """.trimIndent(),
        )
            .param("humanId", humanId)
            .param("name", name)
            .query(catSummaryMapper)
            .single()
    }

    private data class HumanRecord(
        val id: UUID,
        val email: String?,
        val displayName: String,
    )

    private companion object {
        val humanMapper = RowMapper { rs: ResultSet, _: Int ->
            HumanRecord(
                id = rs.getObject("id", UUID::class.java),
                email = rs.getString("email"),
                displayName = rs.getString("display_name"),
            )
        }

        val catSummaryMapper = RowMapper { rs: ResultSet, _: Int ->
            CatSummaryResponse(
                id = rs.getObject("id", UUID::class.java),
                name = rs.getString("name"),
                balance = rs.getLong("balance"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java),
            )
        }

        val catRosterMapper = RowMapper { rs: ResultSet, _: Int ->
            CatRosterResponse(
                id = rs.getObject("id", UUID::class.java),
                name = rs.getString("name"),
            )
        }
    }
}
