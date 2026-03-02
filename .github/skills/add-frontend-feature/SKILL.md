---
name: add-frontend-feature
description: Implement or modify frontend features in the React app with correct service boundaries, shared UI usage, and matching tests. Use when asked to add pages, components, API integrations, or state/UI behavior in apps/frontend.
---

# Add Frontend Feature

Use this skill when building or updating UI behavior in `apps/frontend`.

## 1) Respect backend service boundaries

From `docs/polyglot-architecture.md`:

- Java API is the default for auth/fleet/dashboard REST data.
- Go API is used for telemetry ingestion/realtime WebSocket flows.

Do not introduce new API calls to the wrong service.

## 2) Reuse shared UI before adding app-local components

- Check `libs/ui-shared` first for reusable primitives.
- Keep styling aligned with existing frontend patterns and tokens.

## 3) Implement in the right layer

Typical touch points:

- Routes/layout: `apps/frontend/src/App.tsx`
- Feature pages: `apps/frontend/src/pages/*`
- Shared app components: `apps/frontend/src/components/*`
- API clients/services/hooks: existing frontend data-access modules

Keep components focused and avoid unrelated refactors.

## 4) Update tests when behavior changes

- Add/update unit tests in `apps/frontend/src/**/*.spec.tsx`.
- If flow is user-visible and cross-page, update `apps/frontend-e2e` specs.

## 5) Validate with workspace commands

- `pnpm nx run frontend:lint`
- `pnpm nx run frontend:test`
- `npm run test:e2e:frontend` (when flow spans full app behavior)

Run hooks if required by workflow:

- `npm run hooks:run:pre-commit`
- `npm run hooks:run:pre-push`
