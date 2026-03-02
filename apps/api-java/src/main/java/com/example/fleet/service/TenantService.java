package com.example.fleet.service;

import com.example.fleet.domain.entity.Tenant;
import com.example.fleet.repository.DeviceRepository;
import com.example.fleet.repository.TenantRepository;
import com.example.fleet.repository.UserRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TenantService {

    private final TenantRepository tenantRepo;
    private final DeviceRepository deviceRepo;
    private final UserRepository userRepo;
    private final AuditLogService auditLog;

    public TenantService(
            TenantRepository tenantRepo,
            DeviceRepository deviceRepo,
            UserRepository userRepo,
            AuditLogService auditLog) {
        this.tenantRepo = tenantRepo;
        this.deviceRepo = deviceRepo;
        this.userRepo = userRepo;
        this.auditLog = auditLog;
    }

    public Tenant getTenant(UUID tenantId) {
        return tenantRepo
                .findById(tenantId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Tenant not found"));
    }

    public Page<Tenant> listAllTenants(Pageable pageable) {
        return tenantRepo.findAll(pageable);
    }

    public Tenant updateTenant(
            UUID tenantId,
            String name,
            String logoUrl,
            String primaryColor,
            UUID actorId,
            String actorEmail) {
        Tenant tenant = getTenant(tenantId);
        if (name != null) tenant.setName(name);
        if (logoUrl != null) tenant.setLogoUrl(logoUrl);
        if (primaryColor != null) tenant.setPrimaryColor(primaryColor);
        tenant = tenantRepo.save(tenant);
        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "TENANT_UPDATED",
                "tenant",
                tenantId.toString(),
                null,
                null);
        return tenant;
    }

    public Tenant suspendTenant(UUID tenantId, UUID actorId, String actorEmail) {
        Tenant tenant = getTenant(tenantId);
        tenant.setStatus("suspended");
        tenant = tenantRepo.save(tenant);
        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "TENANT_SUSPENDED",
                "tenant",
                tenantId.toString(),
                null,
                null);
        return tenant;
    }

    public TenantStats getStats(UUID tenantId) {
        long devices = deviceRepo.countByTenantId(tenantId);
        long users = userRepo.findAllByTenantId(tenantId).size();
        return new TenantStats(devices, users);
    }

    public record TenantStats(long deviceCount, long userCount) {}
}
