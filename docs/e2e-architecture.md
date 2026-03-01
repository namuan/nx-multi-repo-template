# Backend API E2E Architecture

## Purpose

This document describes the architecture of backend API end-to-end (E2E) tests in this repository.

Goals:

- Validate real integration between PostgreSQL, Go API, and Java API.
- Keep tests deterministic and independent from demo seed data.
- Run the same flow locally and in CI with Nx + Playwright.

## Scope

Current backend E2E scope focuses on:

- Java dashboard APIs (`/api/devices`, `/api/devices/stats`, `/api/alerts/*`)
- Go API health (`/health`)

UI rendering is intentionally excluded.

## System Components

### 1) Test Runner (`apps/api-e2e`)

- Framework: Playwright (API testing only)
- Orchestration: Nx target `api-e2e:e2e`
- Config: `apps/api-e2e/playwright.config.ts`

Playwright projects:

- `java-api`: tests matching `*.java-api.spec.ts`
- `go-api`: tests matching `*.go-api.spec.ts`
- `cross-service`: reserved project for `*.cross-service.spec.ts` when needed

### 2) Ephemeral Test Stack

Defined in `apps/api-e2e/docker-compose.e2e.yml`:

- `db` (Postgres 16)
- `api-go`
- `api-java`

Ports exposed to host:

- Go API: `19101`
- Java API: `19102`

### 3) Database Bootstrap

- Uses versioned schema migrations from `db/migrations`
- Runs a dedicated `db-migrate` service before APIs start
- Does **not** apply demo seed data for E2E

This avoids hidden coupling to local demo users, devices, and alerts.

### 4) Test Data Provisioning

Tests provision their own fixtures through public APIs:

1. Register tenant/admin via `/api/auth/register`
2. Create devices via `/api/devices`
3. Query dashboard endpoints and assert payload correctness

This pattern is implemented in:

- `apps/api-e2e/src/support/api-client.ts`
- `apps/api-e2e/src/dashboard-apis.java-api.spec.ts`

## Runtime Lifecycle

Global setup/teardown is implemented in:

- `apps/api-e2e/src/global-setup.ts`
- `apps/api-e2e/src/global-teardown.ts`
- `apps/api-e2e/src/support/stack.ts`

Flow:

1. `globalSetup` starts Docker stack (`docker compose ... up --build -d --wait`)
2. Health probes wait for:
   - Go: `/health`
   - Java: `/actuator/health`
3. Playwright executes API specs
4. `globalTeardown` stops stack (`docker compose ... down --volumes --remove-orphans`)

Optional control flags:

- `API_E2E_SKIP_STACK=1` → do not start/stop stack (use an already running environment)
- `API_E2E_KEEP_STACK=1` → keep stack running after tests (debugging)

## Environment and Isolation

E2E endpoints use dedicated variables:

- `E2E_GO_API_URL` (default `http://127.0.0.1:19101`)
- `E2E_JAVA_API_URL` (default `http://127.0.0.1:19102`)

Reason:

- Prevent collisions with app-level variables such as `GO_API_URL` used by simulator/local dev flows.

## CI Architecture

GitHub Actions workflow `.github/workflows/ci.yml` includes a dedicated `api-e2e` job:

1. Install dependencies
2. Run backend E2E: `pnpm run test:e2e:backend:ci`
3. Upload Playwright artifacts from `dist/.playwright/apps/api-e2e/*`
4. Publish sticky PR comment with status + run link

This keeps integration coverage visible and debuggable from pull requests.

## Reliability Principles

1. **No seeded assumptions**
   - Every test creates its own tenant and resources.
2. **Health-gated startup**
   - Tests run only after both APIs report healthy.
3. **Black-box API assertions**
   - Validate HTTP behavior and response contracts rather than internal implementation details.
4. **Artifact-first debugging**
   - HTML report and traces are preserved in CI.

## Typical Commands

Local backend E2E:

```bash
pnpm nx run api-e2e:e2e
```

NPM aliases:

```bash
npm run test:e2e:backend
npm run test:e2e:backend:ci
```

Debug against pre-running stack:

```bash
API_E2E_SKIP_STACK=1 API_E2E_KEEP_STACK=1 pnpm playwright test --config=apps/api-e2e/playwright.config.ts
```

## Future Extensions

If scope grows beyond dashboard APIs, follow the same pattern:

- Add focused spec files under `apps/api-e2e/src`
- Provision data through APIs (not SQL inserts)
- Keep assertions deterministic and tenant-isolated
- Reuse `E2E_*` endpoint variables for environment safety
