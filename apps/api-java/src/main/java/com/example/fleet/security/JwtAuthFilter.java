package com.example.fleet.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_ROLES =
            Set.of("fleet_admin", "dispatcher", "driver", "viewer");

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7);
                if (jwtUtil.isValid(token)) {
                    Claims claims = jwtUtil.parse(token);

                    String userIdClaim = claims.getSubject();
                    String tenantIdClaim = claims.get("tenant_id", String.class);
                    String role = claims.get("role", String.class);

                    if (userIdClaim == null || tenantIdClaim == null || role == null) {
                        throw new IllegalArgumentException("Missing required JWT claims");
                    }
                    String normalizedRole = role.toLowerCase(Locale.ROOT);
                    if (!ALLOWED_ROLES.contains(normalizedRole)) {
                        throw new IllegalArgumentException("Unsupported role claim");
                    }

                    UUID userId = UUID.fromString(userIdClaim);
                    UUID tenantId = UUID.fromString(tenantIdClaim);
                    boolean isPlatformAdmin =
                            Boolean.TRUE.equals(claims.get("is_platform_admin", Boolean.class));

                    TenantContext.set(userId, tenantId, normalizedRole, isPlatformAdmin);

                    var auth =
                            new UsernamePasswordAuthenticationToken(
                                    userId.toString(),
                                    null,
                                    List.of(
                                            new SimpleGrantedAuthority(
                                                    "ROLE_"
                                                            + normalizedRole.toUpperCase(
                                                                    Locale.ROOT))));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        } catch (JwtException | IllegalArgumentException ignored) {
            // Invalid token — leave SecurityContext unauthenticated
        }

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }
}
