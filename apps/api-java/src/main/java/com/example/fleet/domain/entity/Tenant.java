package com.example.fleet.domain.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Data
@NoArgsConstructor
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String subdomain;

    private String logoUrl;

    @Column(nullable = false)
    private String primaryColor = "#3B82F6";

    @Column(nullable = false)
    private String plan = "free";

    @Column(nullable = false)
    private String status = "active";

    @Column(nullable = false)
    private Integer maxDevices = 10;

    @Column(nullable = false)
    private Integer retentionDays = 30;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
