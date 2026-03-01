package com.example.fleet.repository;

import com.example.fleet.domain.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GeofenceRepository extends JpaRepository<Geofence, UUID> {
    List<Geofence> findAllByTenantId(UUID tenantId);
    Optional<Geofence> findByIdAndTenantId(UUID id, UUID tenantId);
}
