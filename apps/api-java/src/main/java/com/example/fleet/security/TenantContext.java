package com.example.fleet.security;

import java.util.UUID;

/**
 * Thread-local holder for the current authenticated user's identity.
 * Populated by JwtAuthFilter before the request reaches any controller.
 */
public final class TenantContext {

    private static final ThreadLocal<TenantContext> HOLDER = new ThreadLocal<>();

    private final UUID userId;
    private final UUID tenantId;
    private final String role;
    private final boolean platformAdmin;

    private TenantContext(UUID userId, UUID tenantId, String role, boolean platformAdmin) {
        this.userId = userId;
        this.tenantId = tenantId;
        this.role = role;
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

    public UUID userId()       { return userId; }
    public UUID tenantId()     { return tenantId; }
    public String role()       { return role; }
    public boolean isPlatformAdmin() { return platformAdmin; }
}
