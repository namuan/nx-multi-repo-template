package com.example.fleet.config;

import com.example.fleet.security.JwtAuthFilter;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@SuppressFBWarnings(
        value = {"EI_EXPOSE_REP2", "SPRING_CSRF_PROTECTION_DISABLED"},
        justification =
                "Dependencies are Spring-managed singletons and CSRF is intentionally disabled for stateless JWT API endpoints.")
public class SecurityConfig {

    private static final String ROLE_FLEET_ADMIN = "FLEET_ADMIN";
    private static final String ROLE_DISPATCHER = "DISPATCHER";
    private static final String[] ADMIN_AND_DISPATCHER = {ROLE_FLEET_ADMIN, ROLE_DISPATCHER};

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http.cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/auth/login")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/auth/register")
                                        .permitAll()
                                        .requestMatchers("/actuator/health", "/actuator/prometheus")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET, "/api/users", "/api/audit-logs")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .requestMatchers(HttpMethod.PUT, "/api/tenants/me")
                                        .hasRole(ROLE_FLEET_ADMIN)
                                        .requestMatchers(HttpMethod.POST, "/api/devices")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .requestMatchers(HttpMethod.PUT, "/api/devices/**")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .requestMatchers(HttpMethod.DELETE, "/api/devices/**")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .requestMatchers(
                                                HttpMethod.POST, "/api/alerts/*/acknowledge")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .requestMatchers(HttpMethod.POST, "/api/alert-rules")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .requestMatchers(HttpMethod.PATCH, "/api/alert-rules/**")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .requestMatchers(HttpMethod.DELETE, "/api/alert-rules/**")
                                        .hasAnyRole(ADMIN_AND_DISPATCHER)
                                        .anyRequest()
                                        .authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
