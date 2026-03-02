package com.example.fleet.service;

import com.example.fleet.domain.entity.AuditLog;
import com.example.fleet.repository.AuditLogRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final AuditLogRepository repo;

    public AuditLogService(AuditLogRepository repo) {
        this.repo = repo;
    }

    public void record(
            UUID tenantId,
            UUID actorId,
            String actorEmail,
            String action,
            String resourceType,
            String resourceId,
            Map<String, Object> details,
            String ipAddress) {
        AuditLog log = new AuditLog();
        log.setTenantId(tenantId);
        log.setActorId(actorId);
        log.setActorEmail(actorEmail);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        log.setDetails(details != null ? details : Map.of());
        log.setIpAddress(ipAddress);
        repo.save(log);
    }

    public Page<AuditLog> getAuditLogs(UUID tenantId, Pageable pageable) {
        return repo.findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
    }
}
