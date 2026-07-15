package com.meowpay.exception

open class ApiException(
    val code: String,
    override val message: String,
) : RuntimeException(message)

class BadRequestException(
    code: String,
    message: String,
) : ApiException(code, message)

class ForbiddenException(
    code: String,
    message: String,
) : ApiException(code, message)
