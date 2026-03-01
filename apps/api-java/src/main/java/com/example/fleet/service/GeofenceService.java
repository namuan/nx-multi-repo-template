package com.example.fleet.service;

import com.example.fleet.domain.entity.Geofence;
import com.example.fleet.dto.request.CreateGeofenceRequest;
import com.example.fleet.repository.GeofenceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class GeofenceService {

    private final GeofenceRepository repo;
    private final AuditLogService auditLog;

    public GeofenceService(GeofenceRepository repo, AuditLogService auditLog) {
        this.repo = repo;
        this.auditLog = auditLog;
    }

    public List<Geofence> getGeofences(UUID tenantId) {
        return repo.findAllByTenantId(tenantId);
    }

    public Geofence createGeofence(UUID tenantId, CreateGeofenceRequest req, UUID actorId, String actorEmail) {
        Geofence g = new Geofence();
        g.setTenantId(tenantId);
        g.setName(req.name());
        g.setCenterLat(req.centerLat());
        g.setCenterLng(req.centerLng());
        g.setRadiusM(req.radiusM());
        g.setColor(req.color() != null ? req.color() : "#EF4444");
        g = repo.save(g);
        auditLog.record(tenantId, actorId, actorEmail, "GEOFENCE_CREATED",
                "geofence", g.getId().toString(), null, null);
        return g;
    }

    public Geofence updateGeofence(UUID tenantId, UUID id, CreateGeofenceRequest req,
                                   UUID actorId, String actorEmail) {
        Geofence g = repo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Geofence not found"));
        g.setName(req.name());
        g.setCenterLat(req.centerLat());
        g.setCenterLng(req.centerLng());
        g.setRadiusM(req.radiusM());
        if (req.color() != null) g.setColor(req.color());
        g = repo.save(g);
        auditLog.record(tenantId, actorId, actorEmail, "GEOFENCE_UPDATED",
                "geofence", id.toString(), null, null);
        return g;
    }

    public void deleteGeofence(UUID tenantId, UUID id, UUID actorId, String actorEmail) {
        Geofence g = repo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Geofence not found"));
        repo.delete(g);
        auditLog.record(tenantId, actorId, actorEmail, "GEOFENCE_DELETED",
                "geofence", id.toString(), null, null);
    }
}
