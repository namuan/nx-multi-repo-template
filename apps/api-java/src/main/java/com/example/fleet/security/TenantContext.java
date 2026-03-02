package com.example.fleet.security;

import java.util.UUID;

/**
 * Thread-local holder for the current authenticated user's identity. Populated by JwtAuthFilter
 * before the request reaches any controller.
 */
public final class TenantContext {

    private static final ThreadLocal<TenantContext> HOLDER = new ThreadLocal<>();

    private final UUID currentUserId;
    private final UUID currentTenantId;
    private final String currentRole;
    private final boolean platformAdmin;

    private TenantContext(UUID userId, UUID tenantId, String role, boolean platformAdmin) {
        this.currentUserId = userId;
        this.currentTenantId = tenantId;
        this.currentRole = role;
        this.platformAdmin = platformAdmin;
    }

    public static void set(UUID userId, UUID tenantId, String role, boolean platformAdmin) {
        HOLDER.set(new TenantContext(userId, tenantId, role, platformAdmin));
    }

    public static TenantContext get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }

    public UUID userId() {
        return currentUserId;
    }

    public UUID tenantId() {
        return currentTenantId;
    }

    public String role() {
        return currentRole;
    }

    public boolean isPlatformAdmin() {
        return platformAdmin;
    }
}
