package com.example.fleet.repository;

import com.example.fleet.domain.entity.Alert;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AlertRepository extends JpaRepository<Alert, UUID> {
    Page<Alert> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    List<Alert> findAllByTenantIdAndAcknowledgedFalseOrderByCreatedAtDesc(UUID tenantId);

    Optional<Alert> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT COUNT(a) FROM Alert a WHERE a.tenantId = :tenantId AND a.acknowledged = false")
    long countUnacknowledgedByTenantId(UUID tenantId);
}
