package com.example.fleet.dto.response;

import com.example.fleet.domain.entity.Tenant;
import com.example.fleet.domain.entity.User;

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
        String logoUrl) {

    /** Shared construction mechanic for building a session response from an authenticated user. */
    public static LoginResponse of(String token, User user, Tenant tenant) {
        return new LoginResponse(
                token,
                user.getId().toString(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isPlatformAdmin(),
                tenant.getId().toString(),
                tenant.getName(),
                tenant.getPrimaryColor(),
                tenant.getLogoUrl());
    }
}
