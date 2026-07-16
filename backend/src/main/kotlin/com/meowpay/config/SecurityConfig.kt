package com.meowpay.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import java.nio.charset.StandardCharsets
import javax.crypto.spec.SecretKeySpec

@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(JwtProperties::class)
class SecurityConfig(
    @Value("\${app.cors.allowed-origin}") private val allowedOrigin: String,
    private val jwtProperties: JwtProperties,
) {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain =
        http
            .csrf { it.disable() }
            .cors(Customizer.withDefaults())
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers("/api/**").authenticated()
                    .anyRequest().permitAll()
            }
            .oauth2ResourceServer { it.jwt(Customizer.withDefaults()) }
            .build()

    @Bean
    fun jwtDecoder(): JwtDecoder {
        if (jwtProperties.jwkSetUri.isNotBlank()) {
            // Supabase's asymmetric signing keys are RS256 or ES256; NimbusJwtDecoder otherwise
            // defaults to trusting RS256 only and rejects a JWKS-published ES256 key outright.
            return NimbusJwtDecoder.withJwkSetUri(jwtProperties.jwkSetUri)
                .jwsAlgorithms { algorithms ->
                    algorithms.add(SignatureAlgorithm.RS256)
                    algorithms.add(SignatureAlgorithm.ES256)
                }
                .build()
        }

        if (jwtProperties.secret.isNotBlank()) {
            val key = SecretKeySpec(
                jwtProperties.secret.toByteArray(StandardCharsets.UTF_8),
                "HmacSHA256",
            )
            return NimbusJwtDecoder.withSecretKey(key).build()
        }

        error("Set SUPABASE_JWT_SECRET or SUPABASE_JWT_JWK_SET_URI for JWT validation.")
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins = listOf(allowedOrigin)
            allowedMethods = listOf("GET", "POST", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type")
            exposedHeaders = emptyList()
            allowCredentials = false
            maxAge = 3600
        }

        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/api/**", config)
        }
    }
}

@ConfigurationProperties(prefix = "app.security.jwt")
class JwtProperties {
    var secret: String = ""
    var jwkSetUri: String = ""
}
