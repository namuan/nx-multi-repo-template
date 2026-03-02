package com.example.fleet.domain.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "telemetry_events")
@IdClass(TelemetryEventId.class)
@Getter
@Setter
@NoArgsConstructor
public class TelemetryEvent {

    // Composite PK: (id, recorded_at) — required by the partitioned table
    @Id private UUID id;

    @Id
    @Column(nullable = false)
    private Instant recordedAt;

    @Column(nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private UUID deviceId;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    @Column(nullable = false)
    private Double speed = 0.0;

    @Column(nullable = false)
    private Double heading = 0.0;

    @Column(nullable = false)
    private Double altitude = 0.0;

    private Double fuelLevel;
    private Double engineTemp;
    private Double odometer;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;
}
