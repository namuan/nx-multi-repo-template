# Technology Stack

**Analysis Date:** 2026-03-05

## Languages

**Primary:**

- **Go** 1.25.7 - API service (`apps/api-go`) - Telemetry ingestion, WebSocket server
- **Java** 21 - API service (`apps/api-java`) - Fleet management REST API, Spring Boot
- **TypeScript** ~5.7.0 - Frontend and shared UI library

**Secondary:**

- **JavaScript** - E2E tests (Playwright)
- **Shell** - Scripts and tooling

## Runtime

**Environment:**

- **Node.js** 22 - Development, CI/CD, build tooling
- **pnpm** - Package manager (workspace-based monorepo)
  - Lockfile: `pnpm-lock.yaml` (present)
- **Maven** - Java dependency management and build
- **Go modules** - Go dependency management

## Frameworks

**Frontend:**

- **React** 19.0.0 - UI framework
- **Vite** 7.3.1 - Build tool and dev server
- **React Router** 7.1.1 - Client-side routing

**Backend (Go):**

- Standard library + external packages for HTTP, WebSocket, DB

**Backend (Java):**

- **Spring Boot** 3.4.0 - Application framework
- **Spring Security** - Authentication/authorization
- **Spring Data JPA** - Database access

**Testing:**

- **Vitest** 4.0.18 - Frontend unit testing
- **Playwright** 1.58.2 - E2E testing
- **Go testing** - Backend unit testing
- **JUnit (Spring Boot Test)** - Java backend testing

**Build/Dev:**

- **Nx** 22.5.3 - Monorepo orchestration
- **lefthook** 2.1.2 - Git hooks
- **ESLint** 9.0.0 - Linting
- **Prettier** 3.6.2 - Code formatting

## Key Dependencies

**Frontend:**
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.0.0 | UI framework |
| react-dom | ^19.0.0 | React DOM renderer |
| react-router-dom | ^7.1.1 | Routing |
| zustand | ^5.0.2 | State management |
| @tanstack/react-query | ^5.62.16 | Server state management |
| axios | ^1.7.9 | HTTP client |
| recharts | ^2.14.1 | Charts/data visualization |
| leaflet | ^1.9.4 | Maps |
| react-leaflet | ^4.2.1 | React map components |
| lucide-react | ^0.469.0 | Icons |
| date-fns | ^4.1.0 | Date utilities |
| @nx-polyglot/ui-shared | workspace:\* | Shared UI components |

**Backend (Go):**
| Package | Version | Purpose |
|---------|---------|---------|
| gorilla/websocket | v1.5.3 | WebSocket support |
| lib/pq | v1.11.2 | PostgreSQL driver |
| golang-jwt/jwt/v5 | v5.3.1 | JWT authentication |
| google/uuid | v1.6.0 | UUID generation |
| prometheus/client_golang | v1.23.2 | Prometheus metrics |

**Backend (Java):**
| Package | Version | Purpose |
|---------|---------|---------|
| spring-boot-starter-web | 3.4.0 | REST API |
| spring-boot-starter-security | 3.4.0 | Security |
| spring-boot-starter-data-jpa | 3.4.0 | Database ORM |
| spring-boot-starter-validation | 3.4.0 | Request validation |
| spring-boot-starter-actuator | 3.4.0 | Health/monitoring |
| postgresql | runtime | PostgreSQL driver |
| jjwt | 0.12.6 | JWT tokens |
| lombok | (from parent) | Boilerplate reduction |
| micrometer-registry-prometheus | (from parent) | Prometheus metrics |

## Configuration

**Environment:**

- `.env` file for local development
- Environment-specific configs in `config/env/` (dev.env, qa.env, prod.env)
- Docker Compose uses environment variables from `.env`

**Build:**

- `nx.json` - Nx workspace configuration
- `tsconfig.base.json` - TypeScript base config
- `.golangci.yml` - Go linting
- `eslint.config.mjs` - ESLint configuration
- `.prettierrc.json` - Prettier configuration

**Docker:**

- `docker-compose.yml` - Local development orchestration
- `apps/*/Dockerfile` - Service-specific Dockerfiles
- `charts/*/` - Helm charts for Kubernetes deployment

## Platform Requirements

**Development:**

- Node.js 22+
- Go 1.25.7+
- Java 21+
- Docker & Docker Compose
- pnpm

**Production:**

- Containerized via Docker
- Kubernetes (via Helm charts)
- PostgreSQL 16

---

_Stack analysis: 2026-03-05_
