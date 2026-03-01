package com.example.fleet.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateAlertRuleRequest(
        @NotBlank String name,
        @NotBlank String type,
        Double threshold,
        UUID geofenceId,
        String severity
) {}
