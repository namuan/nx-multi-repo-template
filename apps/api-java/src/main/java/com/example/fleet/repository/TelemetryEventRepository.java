package com.example.fleet.repository;

import com.example.fleet.domain.entity.TelemetryEvent;
import com.example.fleet.domain.entity.TelemetryEventId;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TelemetryEventRepository extends JpaRepository<TelemetryEvent, TelemetryEventId> {

    Page<TelemetryEvent> findByDeviceIdAndTenantIdOrderByRecordedAtDesc(
            UUID deviceId, UUID tenantId, Pageable pageable);

    List<TelemetryEvent> findTop100ByDeviceIdAndTenantIdOrderByRecordedAtDesc(
            UUID deviceId, UUID tenantId);

    List<TelemetryEvent> findByDeviceIdAndTenantIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            UUID deviceId, UUID tenantId, Instant from, Instant to);
}
