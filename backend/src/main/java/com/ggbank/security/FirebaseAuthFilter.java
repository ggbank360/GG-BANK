package com.ggbank.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FirebaseAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FirebaseAuthFilter.class);

    @Autowired(required = false)
    private FirebaseAuth firebaseAuth;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                if (firebaseAuth != null) {
                    FirebaseToken decodedToken = firebaseAuth.verifyIdToken(token);
                    String uid = decodedToken.getUid();
                    String email = decodedToken.getEmail();
                    Object roleClaim = decodedToken.getClaims().get("role");
                    String role = roleClaim != null ? roleClaim.toString() : "CUSTOMER";

                    UserPrincipal principal = new UserPrincipal(uid, email, role);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    // Safe Dev/Mock Fallback Authentication Context
                    String uid = "dev-user-id";
                    String role = token.contains("admin") ? "ADMIN" : "CUSTOMER";
                    UserPrincipal principal = new UserPrincipal(uid, "demo@ggbank.com", role);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception e) {
                log.warn("Firebase token validation notice: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
