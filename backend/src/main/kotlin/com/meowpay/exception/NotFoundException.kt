package com.meowpay.exception

class NotFoundException(
    val code: String,
    override val message: String,
) : RuntimeException(message)
