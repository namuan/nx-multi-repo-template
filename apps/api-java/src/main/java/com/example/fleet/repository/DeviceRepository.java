package com.example.fleet.repository;

import com.example.fleet.domain.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceRepository extends JpaRepository<Device, UUID> {
    List<Device> findAllByTenantId(UUID tenantId);
    Optional<Device> findByIdAndTenantId(UUID id, UUID tenantId);
    boolean existsByApiKeyAndTenantId(String apiKey, UUID tenantId);

    @Query("SELECT COUNT(d) FROM Device d WHERE d.tenantId = :tenantId")
    long countByTenantId(UUID tenantId);

    @Query("SELECT COUNT(d) FROM Device d WHERE d.tenantId = :tenantId AND d.status = 'online'")
    long countOnlineByTenantId(UUID tenantId);
}
