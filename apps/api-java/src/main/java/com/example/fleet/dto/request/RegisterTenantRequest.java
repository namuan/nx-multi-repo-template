package com.example.fleet.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterTenantRequest(
        @NotBlank String tenantName,
        @NotBlank @Pattern(regexp = "^[a-z0-9-]+$", message = "Subdomain must be lowercase alphanumeric with hyphens")
        String subdomain,
        @NotBlank @Email String adminEmail,
        @NotBlank @Size(min = 8) String adminPassword,
        @NotBlank String adminName,
        String primaryColor
) {}
