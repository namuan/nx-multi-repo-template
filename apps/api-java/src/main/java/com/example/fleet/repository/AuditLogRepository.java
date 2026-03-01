package com.example.fleet.repository;

import com.example.fleet.domain.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    Page<AuditLog> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
