package com.example.fleet.controller;

import com.example.fleet.domain.entity.Device;
import com.example.fleet.domain.entity.TelemetryEvent;
import com.example.fleet.dto.request.CreateDeviceRequest;
import com.example.fleet.repository.TelemetryEventRepository;
import com.example.fleet.security.TenantContext;
import com.example.fleet.service.DeviceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceService deviceService;
    private final TelemetryEventRepository telemetryRepo;

    public DeviceController(DeviceService deviceService, TelemetryEventRepository telemetryRepo) {
        this.deviceService = deviceService;
        this.telemetryRepo = telemetryRepo;
    }

    @GetMapping
    public ResponseEntity<List<Device>> list() {
        return ResponseEntity.ok(deviceService.getDevices(currentTenantId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Device> get(@PathVariable UUID id) {
        return ResponseEntity.ok(deviceService.getDevice(currentTenantId(), id));
    }

    @PostMapping
    public ResponseEntity<Device> create(@Valid @RequestBody CreateDeviceRequest req) {
        TenantContext ctx = TenantContext.get();
        Device device = deviceService.createDevice(ctx.tenantId(), req, ctx.userId(), null);
        return ResponseEntity.status(201).body(device);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Device> update(
            @PathVariable UUID id, @Valid @RequestBody CreateDeviceRequest req) {
        TenantContext ctx = TenantContext.get();
        return ResponseEntity.ok(
                deviceService.updateDevice(ctx.tenantId(), id, req, ctx.userId(), null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        TenantContext ctx = TenantContext.get();
        deviceService.deleteDevice(ctx.tenantId(), id, ctx.userId(), null);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/telemetry")
    public ResponseEntity<List<TelemetryEvent>> telemetryHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(
                telemetryRepo.findTop100ByDeviceIdAndTenantIdOrderByRecordedAtDesc(
                        id, currentTenantId()));
    }

    @GetMapping("/stats")
    public ResponseEntity<DeviceService.DashboardStats> stats() {
        return ResponseEntity.ok(deviceService.getDashboardStats(currentTenantId()));
    }

    private UUID currentTenantId() {
        return TenantContext.get().tenantId();
    }
}
