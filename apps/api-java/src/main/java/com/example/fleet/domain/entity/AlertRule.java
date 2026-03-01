package com.example.fleet.domain.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alert_rules")
@Data
@NoArgsConstructor
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    private Double threshold;

    @Column(nullable = false)
    private String severity = "warning";

    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    private Instant createdAt;
}
