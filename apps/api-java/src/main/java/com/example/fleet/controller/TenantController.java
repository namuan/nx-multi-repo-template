package com.example.fleet.controller;

import com.example.fleet.domain.entity.Tenant;
import com.example.fleet.domain.entity.User;
import com.example.fleet.repository.UserRepository;
import com.example.fleet.security.TenantContext;
import com.example.fleet.service.AuditLogService;
import com.example.fleet.service.TenantService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class TenantController {

    private final TenantService tenantService;
    private final UserRepository userRepo;
    private final AuditLogService auditLog;

    public TenantController(TenantService tenantService, UserRepository userRepo, AuditLogService auditLog) {
        this.tenantService = tenantService;
        this.userRepo = userRepo;
        this.auditLog = auditLog;
    }

    /** Current tenant profile — all authenticated users */
    @GetMapping("/tenants/me")
    public ResponseEntity<TenantProfile> me() {
        TenantContext ctx = TenantContext.get();
        Tenant t = tenantService.getTenant(ctx.tenantId());
        TenantService.TenantStats stats = tenantService.getStats(ctx.tenantId());
        return ResponseEntity.ok(new TenantProfile(t, stats));
    }

    @PutMapping("/tenants/me")
    public ResponseEntity<Tenant> updateMe(@RequestBody UpdateTenantRequest req) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(tenantService.updateTenant(
                ctx.tenantId(), req.name(), req.logoUrl(), req.primaryColor(),
                ctx.userId(), null));
    }

    /** Team members in current tenant */
    @GetMapping("/users")
    public ResponseEntity<List<User>> listUsers() {
        return ResponseEntity.ok(userRepo.findAllByTenantId(TenantContext.get().tenantId()));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<?> auditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(
                auditLog.getAuditLogs(TenantContext.get().tenantId(), PageRequest.of(page, size)));
    }

    // ── Platform Admin endpoints ──────────────────────────────────────────────

    @GetMapping("/admin/tenants")
    public ResponseEntity<Page<Tenant>> listTenants(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        requirePlatformAdmin();
        return ResponseEntity.ok(tenantService.listAllTenants(PageRequest.of(page, size)));
    }

    @PostMapping("/admin/tenants/{id}/suspend")
    public ResponseEntity<Tenant> suspend(@PathVariable UUID id) {
        requirePlatformAdmin();
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(tenantService.suspendTenant(id, ctx.userId(), null));
    }

    private void requirePlatformAdmin() {
        if (!TenantContext.get().isPlatformAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Platform admin access required");
        }
    }

    record TenantProfile(Tenant tenant, TenantService.TenantStats stats) {}
    record UpdateTenantRequest(String name, String logoUrl, String primaryColor) {}
}
