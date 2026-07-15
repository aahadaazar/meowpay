package com.meowpay

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
        "app.security.jwt.secret=01234567890123456789012345678901",
    ],
)
class MeowPayApplicationTests {
    @Test
    fun contextLoads() {
    }
}
