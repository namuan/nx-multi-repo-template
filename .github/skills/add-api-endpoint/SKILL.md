---
name: add-api-endpoint
description: Add or update a backend API endpoint in this polyglot monorepo. Use when asked to create REST endpoints, handlers/controllers, request or response DTOs, service logic, routes, OpenAPI updates, and matching tests.
---

# Add API Endpoint (Polyglot)

Use this skill when implementing a new backend endpoint or changing an existing one.

## 1) Choose the correct backend service first

Use `docs/polyglot-architecture.md` Feature Routing Guide:

- Use **Java API** (`apps/api-java`) for auth, tenant/fleet CRUD, dashboard/user-facing REST.
- Use **Go API** (`apps/api-go`) for telemetry ingestion, WebSocket, and real-time streaming paths.

Do not split a single endpoint across both services.

## 2) Implement in the owning service using local conventions

### If endpoint belongs to Java API

- Keep controllers thin (`@RestController`) and move business logic to service classes.
- Keep tenant-scoped behavior consistent with existing patterns.
- Follow security behavior from `SecurityConfig` and existing auth flows.

Typical files:

- `apps/api-java/src/main/java/.../controller/*`
- `apps/api-java/src/main/java/.../service/*`
- `apps/api-java/src/main/java/.../dto/*`
- `apps/api-java/src/main/java/.../repository/*` (if needed)

### If endpoint belongs to Go API

- Follow `http.ServeMux` routing and middleware wiring in `apps/api-go/main.go`.
- Keep auth model consistent (`X-Device-Key` for telemetry; JWT tenant context for user paths).
- Preserve `/health` and `/metrics` behavior.

Typical files:

- `apps/api-go/main.go`
- `apps/api-go/internal/...`

## 3) Update API contract docs in the same change

If request/response contract changes, update:

- `docs/openapi/api-java.yaml` for Java endpoints
- `docs/openapi/api-go.yaml` for Go endpoints

## 4) Add or update tests in the owning layer

- Unit/integration tests in the changed service.
- For cross-service behavior, add/update E2E tests:
  - `apps/api-e2e` for backend/API flows
  - `apps/frontend-e2e` if frontend behavior is affected

Use black-box E2E setup via public APIs (no direct SQL fixtures in tests).

## 5) Validate before handoff

Prefer workspace commands and targeted Nx tasks:

- `pnpm nx run api-java:test` or `pnpm nx run api-go:test`
- `pnpm nx run api-java:lint` or `pnpm nx run api-go:lint`
- `npm run test:e2e:backend` for backend cross-service verification (when needed)

If hooks are required by workflow, run:

- `npm run hooks:run:pre-commit`
- `npm run hooks:run:pre-push`

## 6) Keep scope minimal and explicit

- Change only the owning app/lib unless the feature explicitly requires cross-service updates.
- If behavior changed, update docs that users and contributors rely on (`README.md`, `LOCAL_DEV.md`, focused docs under `docs/`).
