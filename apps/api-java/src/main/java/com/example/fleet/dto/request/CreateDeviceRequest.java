package com.example.fleet.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateDeviceRequest(
        @NotBlank String name,
        String type,
        String driverName,
        String licensePlate,
        String vin
) {}
