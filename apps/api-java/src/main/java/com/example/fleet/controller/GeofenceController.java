package com.example.fleet.controller;

import com.example.fleet.domain.entity.Geofence;
import com.example.fleet.dto.request.CreateGeofenceRequest;
import com.example.fleet.security.TenantContext;
import com.example.fleet.service.GeofenceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/geofences")
public class GeofenceController {

    private final GeofenceService geofenceService;

    public GeofenceController(GeofenceService geofenceService) {
        this.geofenceService = geofenceService;
    }

    @GetMapping
    public ResponseEntity<List<Geofence>> list() {
        return ResponseEntity.ok(geofenceService.getGeofences(TenantContext.get().tenantId()));
    }

    @PostMapping
    public ResponseEntity<Geofence> create(@Valid @RequestBody CreateGeofenceRequest req) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.status(201).body(
                geofenceService.createGeofence(ctx.tenantId(), req, ctx.userId(), null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Geofence> update(@PathVariable UUID id,
                                            @Valid @RequestBody CreateGeofenceRequest req) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(geofenceService.updateGeofence(ctx.tenantId(), id, req, ctx.userId(), null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        TenantContext ctx = TenantContext.get();
        geofenceService.deleteGeofence(ctx.tenantId(), id, ctx.userId(), null);
        return ResponseEntity.noContent().build();
    }
}
