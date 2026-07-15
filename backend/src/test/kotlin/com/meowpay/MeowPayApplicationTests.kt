package com.meowpay

import com.meowpay.config.DatabaseConnectionVerifier
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.ApplicationContext

@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
        "app.security.jwt.secret=01234567890123456789012345678901",
    ],
)
class MeowPayApplicationTests {
    @Autowired
    lateinit var applicationContext: ApplicationContext

    @Test
    fun contextLoads() {
    }

    @Test
    fun `database verifier is skipped when no datasource is configured`() {
        assertThat(applicationContext.getBeansOfType(DatabaseConnectionVerifier::class.java)).isEmpty()
    }
}
