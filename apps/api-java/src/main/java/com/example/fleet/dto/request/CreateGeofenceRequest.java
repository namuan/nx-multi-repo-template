package com.example.fleet.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateGeofenceRequest(
        @NotBlank String name,
        @NotNull Double centerLat,
        @NotNull Double centerLng,
        @NotNull Double radiusM,
        String color
) {}
