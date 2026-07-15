package com.meowpay

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.security.oauth2.jwt.JwtDecoder

@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
    ],
)
class MeowPayApplicationTests {
    @MockBean
    lateinit var jwtDecoder: JwtDecoder

    @Test
    fun contextLoads() {
    }
}
