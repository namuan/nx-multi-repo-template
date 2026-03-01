package com.example.fleet.dto.response;

public record LoginResponse(
        String token,
        String userId,
        String email,
        String fullName,
        String role,
        boolean isPlatformAdmin,
        String tenantId,
        String tenantName,
        String primaryColor,
        String logoUrl
) {}
