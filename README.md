# Nx Polyglot Monorepo

**Nx + React (Vite + TS) + Go + Java (Spring Boot + Maven)**

A production-ready polyglot monorepo with shared Postgres, migration-first database bootstrap, Docker/Helm deployment paths, and Nx orchestration across stacks.

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
# Validate prerequisites + install dependencies
npm run setup

# Copy env file
cp .env.example .env

# Start full local stack (db + APIs + frontend)
npm run dev:up

# Run backend and frontend E2E suites
npm run test:e2e:backend
npm run test:e2e:frontend
```

For full local workflows (Docker, tmux, local processes, troubleshooting), see `LOCAL_DEV.md`.

## Common Commands

```bash
# Build, lint, test all projects
npm run build
npm run lint
npm run test

# Migration-first database commands
npm run db:migrate
npm run db:seed

# Change-based CI-style execution
./node_modules/.bin/nx affected -t lint test build --base=origin/main
```

## Documentation Map

- Local development: `LOCAL_DEV.md`
- Contribution workflow: `CONTRIBUTING.md`
- Operational runbook (deploy/rollback/debug): `docs/runbook.md`
- System architecture: `docs/polyglot-architecture.md`
- Backend E2E architecture: `docs/e2e-architecture.md`
- Database migration conventions: `docs/db-migrations.md`
- ADRs: `docs/adr/`
- OpenAPI specs:
  - `docs/openapi/api-go.yaml`
  - `docs/openapi/api-java.yaml`

## Repository Layout

- `apps/` deployable services and test applications
- `libs/` shared libraries
- `charts/` per-service Helm charts
- `docs/` architecture, operations, and API documentation
- `tools/` simulator and developer automation scripts
