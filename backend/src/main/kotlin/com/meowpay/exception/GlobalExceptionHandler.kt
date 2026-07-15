package com.meowpay.exception

import com.meowpay.dto.ApiError
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(BadRequestException::class)
    fun badRequest(exception: BadRequestException): ResponseEntity<ApiError> =
        ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiError(exception.code, exception.message))

    @ExceptionHandler(ForbiddenException::class)
    fun forbidden(exception: ForbiddenException): ResponseEntity<ApiError> =
        ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(ApiError(exception.code, exception.message))

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun unreadableBody(): ResponseEntity<ApiError> =
        ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiError("invalid_request", "Request body is missing or malformed."))

    @ExceptionHandler(DataAccessException::class)
    fun dataAccess(exception: DataAccessException): ResponseEntity<ApiError> {
        logger.error("Database operation failed.", exception)
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiError("database_error", "The database could not complete the request."))
    }

    private companion object {
        val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)
    }
}
