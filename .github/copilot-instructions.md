# Copilot Instructions

## Repository context

- This is an Nx polyglot monorepo: React frontend (`apps/frontend`), Go ingestion API (`apps/api-go`), Java Spring API (`apps/api-java`), shared Postgres schema (`db/`), and shared UI lib (`libs/ui-shared`).
- Respect service boundaries from `docs/polyglot-architecture.md`: frontend calls Java REST for auth/fleet data and Go for telemetry/WebSocket.
- Use path-specific instruction files under `.github/instructions/*.instructions.md` for component-level rules.

## Execution and validation

- Prefer workspace scripts in `package.json` over ad-hoc commands (`npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e:backend`).
- For scope-limited work, run targeted Nx tasks (for example `pnpm nx run api-go:test` or `pnpm nx affected -t test`).
- Keep hook behavior green before handoff: `npm run hooks:run:pre-commit` and `npm run hooks:run:pre-push` (`lefthook.yml`).

## Editing guidance for agents

- Make minimal, focused changes in the owning app/lib; avoid cross-service refactors unless requested.
- Keep docs in sync when behavior changes: update `README.md`, `LOCAL_DEV.md`, or focused docs under `docs/`.
- If API contracts change, update relevant OpenAPI spec(s) under `docs/openapi/` and matching E2E tests in the same PR.

## Path-specific files

- `.github/instructions/frontend.instructions.md`
- `.github/instructions/api-go.instructions.md`
- `.github/instructions/api-java.instructions.md`
- `.github/instructions/database.instructions.md`
- `.github/instructions/e2e.instructions.md`
