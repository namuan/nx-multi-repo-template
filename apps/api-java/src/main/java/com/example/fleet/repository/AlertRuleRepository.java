package com.example.fleet.repository;

import com.example.fleet.domain.entity.AlertRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlertRuleRepository extends JpaRepository<AlertRule, UUID> {
    List<AlertRule> findAllByTenantId(UUID tenantId);
    Optional<AlertRule> findByIdAndTenantId(UUID id, UUID tenantId);
    List<AlertRule> findAllByTenantIdAndActiveTrue(UUID tenantId);
}
