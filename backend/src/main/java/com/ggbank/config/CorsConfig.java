package com.ggbank.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:https://ggbank.vercel.app,http://localhost:3000,http://localhost:5173,http://localhost:5500,http://127.0.0.1:5500,http://127.0.0.1:3000,http://localhost:8080}")
    private String allowedOriginsProperty;

    @Bean
    public CorsConfiguration corsConfiguration() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = new ArrayList<>();
        if (allowedOriginsProperty != null && !allowedOriginsProperty.trim().isEmpty()) {
            for (String origin : allowedOriginsProperty.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty() && !origins.contains(trimmed)) {
                    origins.add(trimmed);
                }
            }
        }

        // Guaranteed baseline origins
        List<String> defaults = Arrays.asList(
                "https://ggbank.vercel.app",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://127.0.0.1:3000",
                "http://localhost:8080"
        );
        for (String def : defaults) {
            if (!origins.contains(def)) {
                origins.add(def);
            }
        }

        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList(
                "Origin", "Content-Type", "Accept", "Authorization",
                "X-Requested-With", "Access-Control-Request-Method", "Access-Control-Request-Headers"
        ));
        config.setExposedHeaders(Arrays.asList(
                "Origin", "Content-Type", "Accept", "Authorization"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L); // 1 hour preflight cache

        return config;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration());
        return source;
    }

    @Bean
    public CorsFilter corsFilter() {
        return new CorsFilter(corsConfigurationSource());
    }
}

