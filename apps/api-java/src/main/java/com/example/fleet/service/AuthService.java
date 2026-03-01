package com.example.fleet.service;

import com.example.fleet.domain.entity.Tenant;
import com.example.fleet.domain.entity.User;
import com.example.fleet.dto.request.LoginRequest;
import com.example.fleet.dto.request.RegisterTenantRequest;
import com.example.fleet.dto.response.LoginResponse;
import com.example.fleet.repository.TenantRepository;
import com.example.fleet.repository.UserRepository;
import com.example.fleet.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final TenantRepository tenantRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuditLogService auditLog;

    public AuthService(UserRepository userRepo, TenantRepository tenantRepo,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil,
                       AuditLogService auditLog) {
        this.userRepo = userRepo;
        this.tenantRepo = tenantRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.auditLog = auditLog;
    }

    public LoginResponse login(LoginRequest req, String ipAddress) {
        User user = userRepo.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        Tenant tenant = tenantRepo.findById(user.getTenantId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Tenant not found"));

        if (!"active".equals(tenant.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tenant account is suspended");
        }

        user.setLastLogin(Instant.now());
        userRepo.save(user);

        String token = jwtUtil.generate(user.getId(), user.getTenantId(), user.getRole(), user.isPlatformAdmin());

        auditLog.record(user.getTenantId(), user.getId(), user.getEmail(),
                "AUTH_LOGIN", "user", user.getId().toString(), null, ipAddress);

        return new LoginResponse(
                token,
                user.getId().toString(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isPlatformAdmin(),
                tenant.getId().toString(),
                tenant.getName(),
                tenant.getPrimaryColor(),
                tenant.getLogoUrl()
        );
    }

    @Transactional
    public LoginResponse registerTenant(RegisterTenantRequest req, String ipAddress) {
        if (tenantRepo.existsBySubdomain(req.subdomain())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Subdomain already taken");
        }
        if (userRepo.existsByEmail(req.adminEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        Tenant tenant = new Tenant();
        tenant.setName(req.tenantName());
        tenant.setSubdomain(req.subdomain());
        tenant.setPrimaryColor(req.primaryColor() != null ? req.primaryColor() : "#3B82F6");
        tenant = tenantRepo.save(tenant);

        User admin = new User();
        admin.setTenantId(tenant.getId());
        admin.setEmail(req.adminEmail());
        admin.setPasswordHash(passwordEncoder.encode(req.adminPassword()));
        admin.setFullName(req.adminName());
        admin.setRole("fleet_admin");
        admin = userRepo.save(admin);

        String token = jwtUtil.generate(admin.getId(), tenant.getId(), admin.getRole(), false);

        auditLog.record(tenant.getId(), admin.getId(), admin.getEmail(),
                "TENANT_REGISTERED", "tenant", tenant.getId().toString(), null, ipAddress);

        return new LoginResponse(
                token,
                admin.getId().toString(),
                admin.getEmail(),
                admin.getFullName(),
                admin.getRole(),
                false,
                tenant.getId().toString(),
                tenant.getName(),
                tenant.getPrimaryColor(),
                tenant.getLogoUrl()
        );
    }
}
