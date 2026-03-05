# External Integrations

**Analysis Date:** 2026-03-05

## APIs & External Services

**No external SaaS APIs detected.** This is a self-contained fleet management system with all services running locally or in the same infrastructure.

**Internal Service Communication:**

- Frontend (`http://localhost:9100`) → Go API (`http://localhost:9101`)
- Frontend (`http://localhost:9100`) → Java API (`http://localhost:9102`)
- Go API ↔ Java API via REST (no direct integration)
- WebSocket connections to Go API for real-time telemetry

## Data Storage

**Databases:**

- **PostgreSQL** 16-alpine
  - Connection (Go): `postgres://fleet_user:fleet_password@db:5432/fleet_db?sslmode=disable`
  - Connection (Java): `jdbc:postgresql://db:5432/fleet_db`
  - Environment vars: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
  - ORM (Java): Spring Data JPA with Hibernate
  - Driver (Go): `lib/pq`
  - Migrations: `db/migrations/` using `migrate/migrate:v4.17.1`
  - Seeds: `db/seeds/demo.sql`

**File Storage:**

- Local filesystem only (no S3, GCS, etc.)
- Database blob storage for any binary data

**Caching:**

- None detected (no Redis, Memcached)

## Authentication & Identity

**Auth Provider:** Custom JWT-based authentication

**Implementation:**

- **Go API:** `github.com/golang-jwt/jwt/v5`
- **Java API:** `io.jsonwebtoken (jjwt 0.12.6)`
- JWT secret: `JWT_SECRET` environment variable
- JWT expiration: `JWT_EXPIRATION_MS` (default 86400000ms = 24h)
- Token-based stateless authentication with middleware validation
- Multi-tenant support with tenant context extraction from JWT claims

**Demo Credentials (seeded):**

- Platform admin: `admin@fleetpilot.io` / `Admin123!`
- Tenant users: various demo tenants with `Demo123!` password

## Monitoring & Observability

**Metrics:**

- **Prometheus** (via `prometheus/client_golang` for Go, `micrometer-registry-prometheus` for Java)
- Endpoint: `/metrics` on both APIs
- Scraped by Prometheus container

**Logs:**

- Docker Compose logs: `docker compose logs -f [service]`
- No centralized logging service (ELK, Loki, etc.)

**Visualization:**

- **Grafana** 10.4.3
  - Dashboards for API health metrics
  - Provisioned dashboards: `tools/observability/grafana/dashboards/`
  - Datasources: Prometheus (auto-provisioned)

**Health Checks:**

- Go API: `GET /health`
- Java API: `GET /actuator/health`

## CI/CD & Deployment

**Hosting:**

- **Docker** - Local development and containerization
- **Kubernetes** - Production via Helm charts (`charts/api-go`, `charts/api-java`, `charts/frontend`)
- **GitHub Actions** - CI/CD pipeline (`.github/workflows/ci.yml`)

**CI Pipeline:**

- **GitHub Actions** workflow triggers:
  - Push to `main`, `develop` branches
  - Pull requests to `main`
- Jobs:
  1. **Main job:** Lint, test, coverage gates, build, Docker build (main branch only)
  2. **API E2E:** Backend API integration tests (Playwright)
  3. **Frontend E2E:** UI tests (Playwright)
- Vulnerability scanning:
  - `pnpm audit` (Node.js)
  - `govulncheck` (Go)
  - `dependency-check-maven` (Java/OWASP)

**Container Registry:**

- Not specified (builds locally for development)

## Environment Configuration

**Required env vars:**
| Variable | Purpose | Default |
|----------|---------|---------|
| `POSTGRES_DB` | Database name | `fleet_db` |
| `POSTGRES_USER` | Database user | `fleet_user` |
| `POSTGRES_PASSWORD` | Database password | `fleet_password` |
| `DATABASE_URL` | PostgreSQL connection string (Go) | - |
| `SPRING_DATASOURCE_URL` | JDBC connection (Java) | - |
| `JWT_SECRET` | JWT signing key | (insecure default) |
| `JWT_EXPIRATION_MS` | Token lifetime | `86400000` |
| `ALLOWED_ORIGIN` | CORS origin | `http://localhost:9100` |
| `VITE_API_GO_URL` | Frontend → Go API | `http://localhost:9101` |
| `VITE_API_JAVA_URL` | Frontend → Java API | `http://localhost:9102` |

**Secrets location:**

- `.env` file (not committed)
- `.env.example` template committed
- Environment-specific configs in `config/env/`

## Webhooks & Callbacks

**Incoming:**

- None detected (no webhook receivers)

**Outgoing:**

- None detected (no outbound webhooks)

## Development Tools

**Database Migrations:**

- Tool: `migrate/migrate:v4.17.1`
- Direction: Up only (via docker-compose `db-migrate` service)
- Migration files: `db/migrations/`

**Demo Data Seeding:**

- Auto-seeded on startup via `db-seed` container
- Seed file: `db/seeds/demo.sql`

**Device Simulator:**

- Go-based simulator (`tools/simulator/`)
- Sends synthetic telemetry events to Go API
- Configurable interval: `INTERVAL_MS`
- Demo profile in Docker Compose

---

_Integration audit: 2026-03-05_
