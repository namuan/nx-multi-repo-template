---
applyTo: 'apps/api-java/src/main/**/*.java,apps/api-java/src/test/**/*.java'
---

# Java API Instructions

- Follow Spring patterns already used in `apps/api-java`: thin `@RestController` endpoints with domain logic in service classes.
- Keep security behavior aligned with `SecurityConfig` and auth controllers (`/api/auth/login`, `/api/auth/register`).
- Maintain tenant-scoped access rules for fleet/device/dashboard data paths.
- Keep health endpoint compatibility (`/actuator/health`) for compose readiness and E2E startup probes.
- If API contracts change, update `docs/openapi/api-java.yaml` and matching E2E tests in the same PR.
