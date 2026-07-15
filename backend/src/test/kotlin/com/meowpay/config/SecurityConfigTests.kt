package com.meowpay.config

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
    ],
)
@AutoConfigureMockMvc
class SecurityConfigTests {
    @Autowired
    lateinit var mockMvc: MockMvc

    @MockBean
    lateinit var jwtDecoder: JwtDecoder

    @Test
    fun `api routes reject unauthenticated requests`() {
        mockMvc.get("/api/health")
            .andExpect {
                status { isUnauthorized() }
            }
    }
}
