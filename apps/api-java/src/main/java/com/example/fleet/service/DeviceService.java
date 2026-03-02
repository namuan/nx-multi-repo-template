package com.example.fleet.service;

import com.example.fleet.domain.entity.Device;
import com.example.fleet.domain.entity.Tenant;
import com.example.fleet.dto.request.CreateDeviceRequest;
import com.example.fleet.repository.DeviceRepository;
import com.example.fleet.repository.TenantRepository;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DeviceService {

    private static final SecureRandom API_KEY_RANDOM = new SecureRandom();

    private final DeviceRepository deviceRepo;
    private final TenantRepository tenantRepo;
    private final AuditLogService auditLog;

    public DeviceService(
            DeviceRepository deviceRepo, TenantRepository tenantRepo, AuditLogService auditLog) {
        this.deviceRepo = deviceRepo;
        this.tenantRepo = tenantRepo;
        this.auditLog = auditLog;
    }

    public List<Device> getDevices(UUID tenantId) {
        return deviceRepo.findAllByTenantId(tenantId);
    }

    public Device getDevice(UUID tenantId, UUID deviceId) {
        return deviceRepo
                .findByIdAndTenantId(deviceId, tenantId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Device not found"));
    }

    public Device createDevice(
            UUID tenantId, CreateDeviceRequest req, UUID actorId, String actorEmail) {
        long count = deviceRepo.countByTenantId(tenantId);
        int maxDevices = tenantRepo.findById(tenantId).map(Tenant::getMaxDevices).orElse(10);

        if (count >= maxDevices) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED,
                    "Device limit reached for your plan (" + maxDevices + " devices)");
        }

        Device device = new Device();
        device.setTenantId(tenantId);
        device.setName(req.name());
        device.setType(req.type() != null ? req.type() : "truck");
        device.setApiKey(generateApiKey());
        device.setDriverName(req.driverName());
        device.setLicensePlate(req.licensePlate());
        device.setVin(req.vin());
        device = deviceRepo.save(device);

        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "DEVICE_CREATED",
                "device",
                device.getId().toString(),
                null,
                null);
        return device;
    }

    public Device updateDevice(
            UUID tenantId,
            UUID deviceId,
            CreateDeviceRequest req,
            UUID actorId,
            String actorEmail) {
        Device device = getDevice(tenantId, deviceId);
        device.setName(req.name());
        if (req.type() != null) device.setType(req.type());
        if (req.driverName() != null) device.setDriverName(req.driverName());
        if (req.licensePlate() != null) device.setLicensePlate(req.licensePlate());
        if (req.vin() != null) device.setVin(req.vin());
        device = deviceRepo.save(device);
        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "DEVICE_UPDATED",
                "device",
                deviceId.toString(),
                null,
                null);
        return device;
    }

    public void deleteDevice(UUID tenantId, UUID deviceId, UUID actorId, String actorEmail) {
        Device device = getDevice(tenantId, deviceId);
        deviceRepo.delete(device);
        auditLog.record(
                tenantId,
                actorId,
                actorEmail,
                "DEVICE_DELETED",
                "device",
                deviceId.toString(),
                null,
                null);
    }

    public DashboardStats getDashboardStats(UUID tenantId) {
        long total = deviceRepo.countByTenantId(tenantId);
        long online = deviceRepo.countOnlineByTenantId(tenantId);
        return new DashboardStats(total, online, total - online);
    }

    private String generateApiKey() {
        byte[] bytes = new byte[32];
        API_KEY_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public record DashboardStats(long total, long online, long offline) {}
}
