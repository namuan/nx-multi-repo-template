# Architecture

**Analysis Date:** 2026-03-05

## Pattern Overview

**Overall:** Polyglot Monorepo with NX Workspace

This is an NX-managed monorepo containing multiple backend services (Go, Java) and a React frontend, sharing a PostgreSQL database. The architecture follows a multi-service pattern where each API handles different responsibilities.

**Key Characteristics:**

- **Multi-backend services**: Go API handles telemetry ingestion and WebSocket, Java API handles CRUD operations and business logic
- **Tenant isolation**: Both APIs implement multi-tenant architecture with tenant ID propagation
- **Event-driven**: Telemetry events trigger alerts and broadcast to WebSocket clients
- **Shared database**: Single PostgreSQL instance with migrations in `db/migrations/`

## Layers

### API-Go (Telemetry & Real-time)

**Go API Service:**

- Location: `apps/api-go/`
- Entry point: `apps/api-go/main.go`
- Purpose: High-throughput telemetry ingestion and WebSocket connections

**Handler Layer:**

- Location: `apps/api-go/internal/telemetry/`
- Contains: `handler.go` - HTTP handler for device telemetry
- Responsibilities: Validate incoming telemetry, store events, update device state, generate alerts, broadcast to WebSocket

**Auth Layer:**

- Location: `apps/api-go/internal/auth/`
- Contains: `middleware.go` - JWT and device API key authentication
- Responsibilities: Extract and validate tenant ID, device ID from auth context

**WebSocket Layer:**

- Location: `apps/api-go/internal/ws/`
- Contains: `hub.go`, `client.go` - WebSocket hub and client management
- Responsibilities: Maintain tenant-based WebSocket connections, broadcast events

**Database Layer:**

- Location: `apps/api-go/internal/db/`
- Contains: `db.go` - Database connection using `lib/pq`
- Responsibilities: PostgreSQL connection management

**Rate Limiting Layer:**

- Location: `apps/api-go/internal/ratelimit/`
- Contains: Token bucket rate limiter per tenant
- Responsibilities: Enforce 100 events/sec, burst 200 per tenant

### API-Java (CRUD & Business Logic)

**Java API Service:**

- Location: `apps/api-java/`
- Entry point: `apps/api-java/src/main/java/com/example/fleet/FleetApplication.java`
- Purpose: REST API for device/tenant/alert management with Spring Boot

**Controller Layer:**

- Location: `apps/api-java/src/main/java/com/example/fleet/controller/`
- Contains: `DeviceController.java`, `AlertController.java`, `TenantController.java`, `AuthController.java`
- Responsibilities: HTTP request handling, request validation, response formatting

**Service Layer:**

- Location: `apps/api-java/src/main/java/com/example/fleet/service/`
- Contains: `DeviceService.java`, `AlertService.java`, `TenantService.java`, `AuthService.java`, `AuditLogService.java`
- Responsibilities: Business logic, device limits, audit logging, authentication

**Repository Layer:**

- Location: `apps/api-java/src/main/java/com/example/fleet/repository/`
- Contains: Spring Data JPA repositories
- Responsibilities: Data access, database queries

**Domain Layer:**

- Location: `apps/api-java/src/main/java/com/example/fleet/domain/`
- Contains: JPA entities
- Responsibilities: Domain model representation

**DTO Layer:**

- Location: `apps/api-java/src/main/java/com/example/fleet/dto/`
- Contains: Request/Response DTOs
- Responsibilities: API request/response transformation

**Security Layer:**

- Location: `apps/api-java/src/main/java/com/example/fleet/security/`
- Contains: `TenantContext.java` - Thread-local tenant context
- Responsibilities: Tenant context management, security annotations

### Frontend

**React SPA:**

- Location: `apps/frontend/`
- Entry point: `apps/frontend/src/main.tsx`
- Purpose: Fleet management dashboard

**Page Layer:**

- Location: `apps/frontend/src/pages/`
- Contains: `Dashboard.tsx`, `Devices.tsx`, `Alerts.tsx`, `Settings.tsx`, `Login.tsx`, `Register.tsx`, `Admin.tsx`
- Responsibilities: Page components, UI rendering

**Component Layer:**

- Location: `apps/frontend/src/components/`
- Contains: `Layout.tsx`, `ProtectedRoute.tsx`
- Responsibilities: Layout, route protection

**Store Layer:**

- Location: `apps/frontend/src/stores/`
- Contains: `auth.store.ts` - Zustand store for authentication
- Responsibilities: Client-side state management

**API Layer:**

- Location: `apps/frontend/src/lib/`
- Contains: `api.ts` - HTTP client, `ws.ts` - WebSocket client
- Responsibilities: Backend communication

**Shared UI Library:**

- Location: `libs/ui-shared/`
- Contains: Reusable React components (e.g., `Button.tsx`)
- Responsibilities: Shared UI components across projects

## Data Flow

**Telemetry Ingestion Flow:**

1. Device sends POST to `/api/devices/telemetry` with device API key
2. Auth middleware validates API key, extracts tenant_id and device_id
3. Rate limiter checks tenant limit (100 events/sec)
4. Telemetry handler validates payload (coordinates, JSON)
5. Event stored in `telemetry_events` table
6. Device `last_*` fields updated in `devices` table
7. Alert rules evaluated, triggered alerts inserted
8. Event broadcast to tenant's WebSocket room
9. Response returned to device (202 Accepted)

**WebSocket Connection Flow:**

1. Client connects to `/ws` with JWT in Authorization header
2. JWT middleware validates token, extracts tenant_id
3. WebSocket hub registers client in tenant room
4. Real-time telemetry events broadcast to room
5. Connection managed with ping/pong, graceful disconnect

**REST API Flow (Java):**

1. Client sends authenticated request (JWT)
2. Spring Security validates JWT, sets TenantContext
3. Controller receives request, delegates to Service
4. Service executes business logic (device limits, audit logs)
5. Repository performs database operations
6. Response returned to client

## Key Abstractions

**TenantContext (Java):**

- Purpose: Thread-local tenant ID storage
- Location: `apps/api-java/src/main/java/com/example/fleet/security/TenantContext.java`
- Pattern: ThreadLocal holder for current tenant/user

**Hub (Go):**

- Purpose: WebSocket connection manager
- Location: `apps/api-go/internal/ws/hub.go`
- Pattern: Publish-subscribe with tenant-based rooms

**Handler (Go):**

- Purpose: HTTP handler implementing http.Handler
- Location: `apps/api-go/internal/telemetry/handler.go`
- Pattern: HTTP handler with dependency injection

## Entry Points

**Go API:**

- Location: `apps/api-go/main.go`
- Triggers: Docker container start, `go run main.go`
- Responsibilities: Initialize database, create hub, register routes, start HTTP server

**Java API:**

- Location: `apps/api-java/src/main/java/com/example/fleet/FleetApplication.java`
- Triggers: Docker container start, Maven spring-boot:run
- Responsibilities: Spring Boot application entry point

**Frontend:**

- Location: `apps/frontend/src/main.tsx`
- Triggers: Browser load, Vite dev server
- Responsibilities: React app bootstrap, QueryClient setup

## Error Handling

**Go API:**

- Strategy: Return HTTP status codes with JSON error payloads
- Patterns: `http.Error()` with status codes, structured error logging via `slog`

**Java API:**

- Strategy: Spring exception handling, `@ResponseStatus` exceptions
- Patterns: `ResponseStatusException` for HTTP errors, global exception handler

**Frontend:**

- Strategy: React Query error states, try/catch in async handlers
- Patterns: Error boundaries, toast notifications for user feedback

## Cross-Cutting Concerns

**Logging:**

- Go: `slog` with JSON handler to stdout
- Java: Spring Boot default (SLF4J)
- Frontend: Console logging in development

**Validation:**

- Go: Manual validation in handlers
- Java: Jakarta Validation (`@Valid`) on request DTOs

**Authentication:**

- Go: JWT (user sessions), API key (device auth)
- Java: JWT Bearer tokens via Spring Security

**Rate Limiting:**

- Go: Token bucket in `ratelimit` package
- Java: Not implemented (delegated to Go API for high-throughput)

---

_Architecture analysis: 2026-03-05_
