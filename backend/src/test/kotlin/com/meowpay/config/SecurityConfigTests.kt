package com.meowpay.config

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
        "app.security.jwt.secret=01234567890123456789012345678901",
    ],
)
@AutoConfigureMockMvc
class SecurityConfigTests {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `api routes reject unauthenticated requests`() {
        mockMvc.get("/api/health")
            .andExpect {
                status { isUnauthorized() }
            }
    }
}
