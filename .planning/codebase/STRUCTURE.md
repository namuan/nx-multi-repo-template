# Codebase Structure

**Analysis Date:** 2026-03-05

## Directory Layout

```
nx-polyglot-monorepo/
├── apps/                    # Application projects
│   ├── api-go/             # Go telemetry & WebSocket API
│   ├── api-java/           # Java Spring Boot REST API
│   ├── frontend/           # React SPA dashboard
│   ├── api-e2e/           # Backend E2E tests
│   └── frontend-e2e/      # Frontend E2E tests
├── libs/                   # Shared libraries
│   └── ui-shared/         # Shared React UI components
├── db/                     # Database migrations & seeds
│   ├── migrations/        # SQL migrations (000001_*.sql)
│   └── seeds/            # Demo data seeds (demo.sql)
├── config/                 # Configuration files
│   └── env/              # Environment-specific configs
├── charts/                # Helm charts
│   ├── api-go/           # Go API Helm chart
│   ├── api-java/        # Java API Helm chart
│   └── frontend/        # Frontend Helm chart
├── tools/                 # Development tools
│   └── simulator/       # Device simulator (Go)
├── .github/              # GitHub workflows
├── package.json          # Root package.json (NX workspace)
├── nx.json              # NX workspace configuration
├── pnpm-workspace.yaml  # PNPM workspace config
├── docker-compose.yml   # Local development stack
└── go.work              # Go workspace file
```

## Directory Purposes

### apps/api-go/

- **Purpose:** Go telemetry ingestion and WebSocket service
- **Contains:** Go source code, Dockerfile
- **Key files:**
  - `main.go` - Entry point, HTTP server setup
  - `go.mod`, `go.sum` - Go dependencies
  - `internal/auth/` - JWT and API key middleware
  - `internal/telemetry/` - Telemetry handler
  - `internal/ws/` - WebSocket hub and client
  - `internal/db/` - PostgreSQL connection
  - `internal/ratelimit/` - Tenant rate limiter
  - `internal/config/` - Configuration loader
  - `scripts/` - Utility scripts
  - `project.json` - NX project configuration

### apps/api-java/

- **Purpose:** Java Spring Boot REST API
- **Contains:** Java source code, Maven pom.xml, Dockerfile
- **Key files:**
  - `src/main/java/com/example/fleet/FleetApplication.java` - Spring Boot entry
  - `src/main/java/com/example/fleet/controller/` - REST controllers
  - `src/main/java/com/example/fleet/service/` - Business logic
  - `src/main/java/com/example/fleet/repository/` - Spring Data JPA
  - `src/main/java/com/example/fleet/domain/` - JPA entities
  - `src/main/java/com/example/fleet/dto/` - Request/Response DTOs
  - `src/main/java/com/example/fleet/security/` - Tenant context, auth
  - `src/main/java/com/example/fleet/exception/` - Exception handlers
  - `src/main/java/com/example/fleet/config/` - Spring config
  - `pom.xml` - Maven dependencies
  - `Dockerfile` - Container build

### apps/frontend/

- **Purpose:** React single-page application
- **Contains:** React/TypeScript source, Vite config
- **Key files:**
  - `src/main.tsx` - React entry point
  - `src/App.tsx` - Router setup with routes
  - `src/pages/` - Page components (Dashboard, Devices, Alerts, etc.)
  - `src/components/` - Shared components (Layout, ProtectedRoute)
  - `src/stores/` - Zustand state stores (auth.store.ts)
  - `src/lib/` - API client (api.ts), WebSocket client (ws.ts)
  - `src/styles.css` - Global styles
  - `package.json` - Frontend dependencies
  - `vite.config.ts` - Vite configuration
  - `project.json` - NX project configuration

### libs/ui-shared/

- **Purpose:** Shared React UI components
- **Contains:** Reusable component library
- **Key files:**
  - `src/lib/Button.tsx` - Example shared component
  - `package.json` - Library dependencies
  - `project.json` - NX project configuration

### apps/api-e2e/

- **Purpose:** Backend end-to-end tests
- **Contains:** Playwright test suite
- **Key files:**
  - `src/support/` - Test utilities
  - `project.json` - NX project configuration

### apps/frontend-e2e/

- **Purpose:** Frontend end-to-end tests
- **Contains:** Playwright test suite
- **Key files:**
  - `src/support/` - Test utilities
  - `project.json` - NX project configuration

### db/

- **Purpose:** Database schema and seeds
- **Contains:** SQL migrations and demo data
- **Key files:**
  - `migrations/000001_initial_schema.up.sql` - Schema creation
  - `migrations/000001_initial_schema.down.sql` - Schema rollback
  - `seeds/demo.sql` - Demo data

### config/

- **Purpose:** Environment configurations
- **Contains:** Environment-specific .env files
- **Key files:**
  - `env/dev.env` - Development config
  - `env/qa.env` - QA config
  - `env/prod.env` - Production config

### charts/

- **Purpose:** Kubernetes Helm charts
- **Contains:** Chart templates for each service

### tools/

- **Purpose:** Development utilities
- **Contains:** Simulator, scripts, tmux setup
- **Key files:**
  - `simulator/main.go` - Device telemetry simulator

## Key File Locations

### Entry Points

- **Go API:** `apps/api-go/main.go` - HTTP server initialization, route registration
- **Java API:** `apps/api-java/src/main/java/com/example/fleet/FleetApplication.java` - Spring Boot start
- **Frontend:** `apps/frontend/src/main.tsx` - React app bootstrap, QueryClient setup
- **E2E Tests:** `apps/api-e2e/src/e2e/`, `apps/frontend-e2e/src/e2e/`

### Configuration

- **Root NX:** `nx.json` - NX workspace configuration
- **Go workspace:** `go.work` - Go module workspace
- **Package manager:** `package.json` - Root dependencies, `pnpm-workspace.yaml`
- **Linting:** `eslint.config.mjs` - ESLint configuration
- **Formatting:** `.prettierrc.json` - Prettier configuration
- **Git hooks:** `lefthook.yml` - Lefthook hook configuration

### Database

- **Migrations:** `db/migrations/` - SQL migration files
- **Seeds:** `db/seeds/demo.sql` - Demo data

### Docker

- **Compose:** `docker-compose.yml` - Full stack orchestration
- **Go Dockerfile:** `apps/api-go/Dockerfile`
- **Java Dockerfile:** `apps/api-java/Dockerfile`
- **Frontend Dockerfile:** `apps/frontend/Dockerfile`

## Naming Conventions

### Files

- **Go:** `lowercase_underscore.go` (e.g., `handler.go`, `middleware.go`)
- **Java:** `PascalCase.java` (e.g., `DeviceController.java`, `DeviceService.java`)
- **TypeScript/React:** `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Tests:** `*.test.ts`, `*.spec.ts`, `*.spec.tsx`

### Directories

- **Go:** `lowercase_underscore/` (e.g., `internal/telemetry/`)
- **Java:** `lowercase/` (e.g., `controller/`, `service/`)
- **Frontend:** `camelCase/` (e.g., `pages/`, `components/`, `stores/`)

### Package Names

- **Go:** `github.com/nx-polyglot/api-go/internal/...`
- **Java:** `com.example.fleet.controller`, `com.example.fleet.service`
- **TypeScript:** No namespace, relative imports

## Where to Add New Code

### New Feature (Backend)

- **Go API:**
  - HTTP handler: `apps/api-go/internal/telemetry/handler.go`
  - New module: `apps/api-go/internal/<module>/`
- **Java API:**
  - Controller: `apps/api-java/src/main/java/com/example/fleet/controller/`
  - Service: `apps/api-java/src/main/java/com/example/fleet/service/`
  - Repository: `apps/api-java/src/main/java/com/example/fleet/repository/`
  - DTO: `apps/api-java/src/main/java/com/example/fleet/dto/request/`, `dto/response/`
  - Entity: `apps/api-java/src/main/java/com/example/fleet/domain/entity/`

### New Feature (Frontend)

- **New page:** `apps/frontend/src/pages/NewFeature.tsx`
- **New component:** `apps/frontend/src/components/NewComponent.tsx`
- **New store:** `apps/frontend/src/stores/feature.store.ts`
- **API client:** `apps/frontend/src/lib/api.ts` (extend existing)
- **WebSocket handler:** `apps/frontend/src/lib/ws.ts` (extend existing)

### New Shared Component

- **UI component:** `libs/ui-shared/src/lib/ComponentName.tsx`
- **Export from:** `libs/ui-shared/src/index.ts`

### New Database Schema

- **Migration:** `db/migrations/000002_<description>.up.sql`
- **Rollback:** `db/migrations/000002_<description>.down.sql`
- **Seed data:** `db/seeds/`

### New Test

- **Unit tests:** Co-located with source (`handler_test.go`, `DeviceServiceTest.java`)
- **E2E tests:** `apps/api-e2e/src/e2e/` or `apps/frontend-e2e/src/e2e/`

### New Helm Chart

- **Chart:** `charts/<service>/`

## Special Directories

### node_modules/

- **Purpose:** npm/pnpm dependencies
- **Generated:** Yes
- **Committed:** No

### apps/api-java/target/

- **Purpose:** Maven build output
- **Generated:** Yes
- **Committed:** No

### .nx/

- **Purpose:** NX cache and workspace data
- **Generated:** Yes
- **Committed:** No

### db/migrations/

- **Purpose:** Database schema migrations
- **Generated:** No (committed)
- **Committed:** Yes

---

_Structure analysis: 2026-03-05_
