package com.example.fleet.domain.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "devices")
@Getter
@Setter
@NoArgsConstructor
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type = "truck";

    @Column(unique = true, nullable = false)
    private String apiKey;

    @Column(nullable = false)
    private String status = "offline";

    private Double lastLat;
    private Double lastLng;
    private Double lastSpeed;
    private Double lastHeading;
    private Instant lastSeen;

    private String driverName;
    private String licensePlate;
    private String vin;

    @CreationTimestamp private Instant createdAt;

    @UpdateTimestamp private Instant updatedAt;
}
