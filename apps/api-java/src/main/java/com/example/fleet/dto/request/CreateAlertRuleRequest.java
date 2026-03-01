package com.example.fleet.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateAlertRuleRequest(
        @NotBlank String name,
        @NotBlank String type,
        Double threshold,
        String severity
) {}
