# Nx Polyglot Monorepo

**Nx + React (Vite + TS) + Go + Java (Spring Boot + Maven)**

A production-ready polyglot monorepo blueprint with Dockerfiles, Helm charts, CI pipeline, and docker-compose.

`apps/api-java` requires JDK 21.

## Stack

| App | Technology |
|-----|-----------|
| `apps/frontend` | React 19, Vite, TypeScript |
| `apps/api-go` | Go 1.23, net/http |
| `apps/api-java` | Spring Boot 3.4, Java 21, Maven |
| `libs/ui-shared` | Shared React components |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all apps
./node_modules/.bin/nx run-many -t build

# Serve all dev servers
./node_modules/.bin/nx run-many -t serve

# Run all tests
./node_modules/.bin/nx run-many -t test

# Lint all projects
./node_modules/.bin/nx run-many -t lint
```

## Docker

```bash
# Start full stack locally
docker compose up

# Build a specific image
docker build -f apps/api-go/Dockerfile -t api-go .
```

## Environment Variables

Use `.env.example` as the baseline for local development.

| Variable | Service | Default | Purpose |
|---|---|---|---|
| `PORT` | `api-go` | `8080` | Go API listen port |
| `ALLOWED_ORIGIN` | `api-go` | `https://frontend.example.com` | CORS allowed origin |
| `SERVER_PORT` | `api-java` | `8080` | Java API listen port |
| `VITE_API_GO_URL` | `frontend` | `http://localhost:9101` | Frontend URL for Go API |
| `VITE_API_JAVA_URL` | `frontend` | `http://localhost:9102` | Frontend URL for Java API |

Copy and adapt as needed:

```bash
cp .env.example .env
```

## Kubernetes (Helm)

```bash
# Deploy api-go
helm upgrade --install api-go charts/api-go

# Deploy all services
helm upgrade --install frontend charts/frontend
helm upgrade --install api-go charts/api-go
helm upgrade --install api-java charts/api-java

# Deploy with environment-specific values
helm upgrade --install api-go charts/api-go -f charts/api-go/values-staging.yaml
helm upgrade --install api-go charts/api-go -f charts/api-go/values-production.yaml
```

## API Specs

- Go API OpenAPI spec: `docs/openapi/api-go.yaml`
- Java API OpenAPI spec: `docs/openapi/api-java.yaml`
- Database migration guide: `docs/db-migrations.md`

## Nx Affected (CI)

```bash
# Only build/test/lint changed projects
./node_modules/.bin/nx affected -t lint test build --base=origin/main
```

## Project Structure

```
nx-polyglot-monorepo/
├── apps/
│   ├── frontend/          # React + Vite + TS
│   ├── api-go/            # Go HTTP API
│   └── api-java/          # Spring Boot + Java
├── libs/
│   └── ui-shared/         # Shared React components
├── charts/
│   ├── frontend/          # Helm chart
│   ├── api-go/            # Helm chart
│   └── api-java/          # Helm chart
├── .github/workflows/
│   └── ci.yml
├── docker-compose.yml
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── go.work
└── README.md
```
