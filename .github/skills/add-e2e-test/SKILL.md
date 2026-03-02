---
name: add-e2e-test
description: Add or update Playwright E2E tests for backend APIs or frontend UI in this monorepo. Use when asked for end-to-end verification, cross-service test coverage, or deterministic integration tests.
---

# Add E2E Test

Use this skill when changing tests under `apps/api-e2e` or `apps/frontend-e2e`.

## 1) Pick the correct E2E suite

- Backend/API flows: `apps/api-e2e`
- Frontend browser flows: `apps/frontend-e2e`

## 2) Keep tests black-box and deterministic

- Provision fixtures through public APIs.
- Do not insert test data via direct SQL in E2E tests.
- Use unique test data per run (tenant/email suffixes, etc.).

## 3) Respect endpoint isolation variables

Use E2E endpoint variables (`E2E_GO_API_URL`, `E2E_JAVA_API_URL`, etc.) instead of app runtime vars.

For backend stack control during debugging:

- `API_E2E_SKIP_STACK=1`
- `API_E2E_KEEP_STACK=1`

## 4) Cover cross-service intent explicitly

When behavior spans services (example: ingest in Go, assert dashboard in Java), create a dedicated cross-service test case and assert both sides of behavior.

## 5) Validate locally

- `npm run test:e2e:backend`
- `npm run test:e2e:frontend`

For focused local debugging:

- `pnpm playwright test apps/api-e2e/src/<spec>.ts --config=apps/api-e2e/playwright.config.ts`
