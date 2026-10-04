package com.ggbank.config;

import com.ggbank.security.FirebaseAuthFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    @Autowired
    private FirebaseAuthFilter firebaseAuthFilter;

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Explicitly bind CORS to Spring Security filter chain
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Allow all CORS preflight OPTIONS requests before auth evaluation
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Public authentication & health check endpoints
                        .requestMatchers("/api/users/register", "/api/users/login", "/api/auth/login", "/api/health", "/api/system_health").permitAll()
                        // Strict Admin Operations (Audit trails, Customer approvals, Global ledger)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // Authenticated Customer & Admin Banking APIs
                        .requestMatchers("/api/**").hasAnyRole("CUSTOMER", "ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

