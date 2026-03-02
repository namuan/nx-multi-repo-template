---
applyTo: 'apps/api-go/**/*.go,tools/simulator/**/*.go'
---

# Go API Instructions

- Follow current routing and middleware composition in `apps/api-go/main.go` (`http.ServeMux`, auth middleware wrapping handlers).
- Keep auth model consistent: telemetry ingestion uses `X-Device-Key`; WebSocket access uses JWT tenant context.
- Use Go API for device-originated telemetry ingest and real-time stream paths; avoid adding user-facing fleet/auth CRUD endpoints here.
- Preserve tenant-scoped behavior and telemetry rate limiting when modifying ingestion or query paths.
- Keep operational endpoints stable (`/health`, `/metrics`) because local orchestration and tests depend on them.
- If request/response contracts change, update `docs/openapi/api-go.yaml` and related E2E specs.
