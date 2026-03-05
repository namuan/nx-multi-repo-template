# Codebase Concerns

**Analysis Date:** 2026-03-05

## Security Considerations

**Hardcoded Secrets in Environment:**

- Risk: Production JWT secret and database credentials are hardcoded in `.env`
- Files: `.env`, `apps/api-go/internal/config/config.go`, `docker-compose.yml`
- Current mitigation: None - secrets use fallback defaults
- Recommendations:
  - Use a secrets manager (HashiCorp Vault, AWS Secrets Manager)
  - Require secrets via environment variables with no fallback defaults
  - Remove hardcoded credentials from `config.go` fallback values

**Hardcoded JWT Secret in Source Code:**

- Risk: Weak JWT signing key allows token forgery
- Files: `apps/api-go/internal/config/config.go` (line 19), `docker-compose.yml` (line 65)
- Current mitigation: Comment warns "change-in-production"
- Recommendations: Enforce strong secret validation at startup (minimum 256-bit key)

**Credentials in Docker Compose Fallbacks:**

- Risk: Default docker-compose values contain credentials
- Files: `docker-compose.yml` (lines 8, 15, 28, 39, 64-65)
- Current mitigation: Uses `${VAR:-fallback}` pattern
- Recommendations: Require all credentials via environment file, fail startup if missing

**CORS Allows Credentials:**

- Risk: `Access-Control-Allow-Credentials: true` with dynamic origin could allow cross-site attacks
- Files: `apps/api-go/main.go` (line 112)
- Current mitigation: Origin is configured but static
- Recommendations: Validate origin against allowlist before setting credentials header

**Token Stored in LocalStorage:**

- Risk: XSS attacks can steal tokens from localStorage
- Files: `apps/frontend/src/stores/auth.store.ts` (lines 22, 29, 43)
- Current mitigation: None
- Recommendations: Consider httpOnly cookies for token storage; if localStorage required, implement token rotation

---

## Tech Debt

**Missing CI/CD Pipeline:**

- Issue: No automated deployment workflow exists
- Files: Missing `.github/workflows/deploy.yml`
- Impact: Manual deployments required; error-prone and not reproducible
- Fix approach: Create Helm-based deploy workflow with staging/production separation and manual approval gates

**No Container Image Scanning:**

- Issue: Dependency scanning exists but Docker image vulnerability scanning is not enforced
- Files: Missing from CI workflows in `.github/workflows/`
- Impact: Known CVEs may be deployed to production
- Fix approach: Add Trivy or Grype scan step in CI pipeline; fail builds on high/critical findings

**Missing Distributed Tracing:**

- Issue: No OpenTelemetry instrumentation across services
- Files: `apps/api-go/`, `apps/api-java/`
- Impact: Cannot debug cross-service request flows; difficult to diagnose production issues
- Fix approach: Add OpenTelemetry SDK to both APIs; configure exporter to backend (Jaeger/Zipkin)

**No SLO Alerting:**

- Issue: No alerting rules defined for error rate, latency, or availability
- Files: Missing in `charts/` or `tools/observability/`
- Impact: Team unaware of service degradation until users report
- Fix approach: Define Prometheus alerting rules; integrate with PagerDuty/Slack

**Missing Backup/Restore Process:**

- Issue: No documented or tested backup restoration procedure for PostgreSQL
- Files: `db/`
- Impact: Data loss risk; no confidence in recovery capability
- Fix approach: Document backup strategy; implement periodic restore drills

**No Contract Testing Between Services:**

- Issue: Java and Go APIs may drift in payload schemas without detection
- Files: `apps/api-java/`, `apps/api-go/`
- Impact: Integration failures in production
- Fix approach: Implement Pact or OpenAPI contract tests

---

## Known Issues

**Port Conflict in Environment Configuration:**

- Issue: Both Go and Java APIs default to PORT 8080 in `.env`
- Files: `.env` (lines 6, 12)
- Impact: Services fail to start if both configured with defaults
- Current workaround: Different ports in docker-compose (9101, 9102)
- Fix approach: Use distinct env var names per service (GO_PORT, JAVA_PORT)

**WebSocket Hub Potential Race Condition:**

- Issue: `hub.go` releases RLock before iterating over room clients
- Files: `apps/api-go/internal/ws/hub.go` (lines 62-66)
- Impact: Concurrent unregister could cause nil pointer during broadcast
- Current mitigation: Drop message for slow clients prevents blocking
- Fix approach: Copy room map under read lock before iteration

**Go Version Mismatch:**

- Issue: `go.work` requires Go >= 1.25.7 but running 1.25.5
- Files: `apps/api-go/go.mod`, `go.work`
- Impact: Build failures in local environment
- Fix approach: Upgrade Go installation or adjust go.work version requirement

**Java Entity/Service Mismatch (Critical):**

- Issue: AuthService and AuditLogService reference methods that don't exist on entity classes
- Files: `apps/api-java/src/main/java/com/example/fleet/service/AuthService.java`, `apps/api-java/src/main/java/com/example/fleet/service/AuditLogService.java`
- Impact: Application will not compile/run; runtime errors
- Fix approach: Add missing getter/setter methods to User, Tenant, and AuditLog entities

**Vite Configuration Type Error:**

- Issue: Test configuration in vite.config.ts uses incorrect type
- Files: `apps/frontend/vite.config.ts` (line 26)
- Impact: TypeScript errors; may affect test execution
- Fix approach: Fix type for test configuration

---

## Performance Bottlenecks

**Database Connection Pool Too Small:**

- Issue: Go API uses fixed 25 max open connections
- Files: `apps/api-go/internal/db/db.go` (line 20)
- Impact: Request throttling under high load
- Improvement path: Make configurable; scale based on expected concurrency

**WebSocket Broadcast Drops Messages:**

- Issue: Slow clients cause message drops without notification
- Files: `apps/api-go/internal/ws/hub.go` (lines 68-72)
- Impact: Clients may miss telemetry updates
- Improvement path: Implement backpressure mechanism or queue per-client

**No Request Rate Limiting on Java API:**

- Issue: Rate limiting only implemented in Go API
- Files: `apps/api-go/internal/ratelimit/`, missing in `apps/api-java/`
- Impact: Java API vulnerable to DoS
- Improvement path: Add Bucket4j or similar to Java API

---

## Fragile Areas

**Go API Device Authentication Middleware:**

- Files: `apps/api-go/internal/auth/middleware.go`
- Why fragile: Depends on database lookup for each request; no caching
- Safe modification: Add Redis caching layer for API keys
- Test coverage: Has basic test but edge cases unclear

**Tenant Isolation in WebSocket Hub:**

- Files: `apps/api-go/internal/ws/hub.go`
- Why fragile: In-memory only; tenant rooms lost on restart; no reconnection logic
- Safe modification: Implement client-side reconnection with state recovery
- Test coverage: No dedicated tests for tenant isolation

**JWT Token Refresh:**

- Files: `apps/frontend/src/stores/auth.store.ts`, `apps/api-java/src/main/java/com/example/fleet/security/JwtUtil.java`
- Why fragile: No token refresh mechanism; users logged out after expiration
- Safe modification: Add refresh token endpoint and auto-refresh logic
- Test coverage: Not tested in frontend

---

## Dependencies at Risk

**Outdated React Version:**

- Risk: Using React 19 which is very recent; potential compatibility issues
- Impact: Third-party component library incompatibilities
- Migration plan: Monitor ecosystem for stable 19.x releases; test thoroughly before upgrades

**NX Monorepo Version:**

- Risk: Using NX 22.5.3; need to track breaking changes
- Impact: Build configuration may break on major upgrades
- Migration plan: Review NX release notes; test upgrade path before production use

---

## Test Coverage Gaps

**Go API Missing Unit Tests:**

- What's not tested: Telemetry handler, rate limiter, most auth paths
- Files: `apps/api-go/internal/telemetry/`, `apps/api-go/internal/ratelimit/`, `apps/api-go/internal/auth/`
- Risk: Logic errors undetected; regressions in telemetry ingestion
- Priority: High

**Java API Limited Test Coverage:**

- What's not tested: Most service layer, controller integration
- Files: `apps/api-java/src/main/java/com/example/fleet/service/`, `apps/api-java/src/main/java/com/example/fleet/controller/`
- Risk: Business logic bugs; broken REST contracts
- Priority: High

**No Performance/Load Tests:**

- What's not tested: API behavior under load, WebSocket scalability
- Files: No dedicated performance tests
- Risk: Production performance issues; WebSocket connection limits
- Priority: Medium

**E2E Test Gaps:**

- What's not tested: Real-time telemetry flow end-to-end, multi-tenant isolation
- Files: `apps/api-e2e/src/`, `apps/frontend-e2e/src/`
- Risk: Integration issues between services
- Priority: Medium

---

## Missing Critical Features

**No API Versioning:**

- Problem: No mechanism to version APIs; breaking changes impact all clients
- Blocks: Safe evolution of REST contracts

**No Request Tracing:**

- Problem: No correlation ID propagation across services
- Blocks: Debugging production issues across Java/Go/Frontend

**No Database Migrations Tool:**

- Problem: Manual SQL scripts in `db/migrations/`
- Blocks: Reproducible deployments; rollback capability

**No Health Check for Database in Java API:**

- Problem: Spring Boot actuator health doesn't include database
- Blocks: Container orchestration cannot detect unhealthy API

---

_Concerns audit: 2026-03-05_
