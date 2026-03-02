package com.example.fleet.security;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.fleet.FleetApplication;
import com.example.fleet.domain.entity.Tenant;
import com.example.fleet.domain.entity.User;
import com.example.fleet.repository.TenantRepository;
import com.example.fleet.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = FleetApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthorizationCoverageIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtUtil jwtUtil;

    @Test
    void anonymousRequestToProtectedEndpointIsDenied() throws Exception {
        mockMvc.perform(get("/api/devices")).andExpect(status().isForbidden());
    }

    @Test
    void viewerCannotCreateDevice() throws Exception {
        Tenant tenant = createTenant();
        User viewer = createUser(tenant, "viewer", false);

        mockMvc.perform(
                        post("/api/devices")
                                .header("Authorization", bearerToken(viewer))
                                .contentType(APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Van-01"}
                                        """))
                .andExpect(status().isForbidden());
    }

    @Test
    void dispatcherCanCreateDevice() throws Exception {
        Tenant tenant = createTenant();
        User dispatcher = createUser(tenant, "dispatcher", false);

        mockMvc.perform(
                        post("/api/devices")
                                .header("Authorization", bearerToken(dispatcher))
                                .contentType(APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Truck-07"}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Truck-07"));
    }

    @Test
    void viewerCannotListUsers() throws Exception {
        Tenant tenant = createTenant();
        User viewer = createUser(tenant, "viewer", false);

        mockMvc.perform(get("/api/users").header("Authorization", bearerToken(viewer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void fleetAdminCanListUsers() throws Exception {
        Tenant tenant = createTenant();
        User admin = createUser(tenant, "fleet_admin", false);

        mockMvc.perform(get("/api/users").header("Authorization", bearerToken(admin)))
                .andExpect(status().isOk());
    }

    @Test
    void nonPlatformAdminCannotListAllTenants() throws Exception {
        Tenant tenant = createTenant();
        User admin = createUser(tenant, "fleet_admin", false);

        mockMvc.perform(get("/api/admin/tenants").header("Authorization", bearerToken(admin)))
                .andExpect(status().isForbidden());
    }

    @Test
    void platformAdminCanListAllTenants() throws Exception {
        Tenant tenant = createTenant();
        User platformAdmin = createUser(tenant, "fleet_admin", true);

        mockMvc.perform(
                        get("/api/admin/tenants")
                                .header("Authorization", bearerToken(platformAdmin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void tokenWithUnsupportedRoleIsDenied() throws Exception {
        Tenant tenant = createTenant();
        User user = createUser(tenant, "fleet_admin", false);

        String token = jwtUtil.generate(user.getId(), tenant.getId(), "malicious", false);

        mockMvc.perform(get("/api/devices").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void actuatorExposesHealthButProtectsInfo() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());

        mockMvc.perform(get("/actuator/info")).andExpect(status().isForbidden());
    }

    private Tenant createTenant() {
        Tenant tenant = new Tenant();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        tenant.setName("Tenant-" + suffix);
        tenant.setSubdomain("tenant-" + suffix);
        return tenantRepository.save(tenant);
    }

    private User createUser(Tenant tenant, String role, boolean isPlatformAdmin) {
        User user = new User();
        user.setTenantId(tenant.getId());
        user.setEmail(role + "+" + UUID.randomUUID() + "@example.com");
        user.setPasswordHash("unused");
        user.setFullName("Test User");
        user.setRole(role);
        user.setPlatformAdmin(isPlatformAdmin);
        return userRepository.save(user);
    }

    private String bearerToken(User user) {
        String token =
                jwtUtil.generate(
                        user.getId(), user.getTenantId(), user.getRole(), user.isPlatformAdmin());
        return "Bearer " + token;
    }
}
