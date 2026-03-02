---
applyTo: 'apps/frontend/**/*.{ts,tsx,css},libs/ui-shared/**/*.{ts,tsx,css},apps/frontend/index.html'
---

# Frontend Instructions

- Use functional React components and hooks; follow existing Vite + TypeScript patterns in `apps/frontend/src`.
- Reuse shared UI primitives from `libs/ui-shared` before adding app-specific components.
- Keep service boundaries: frontend uses Java REST for auth/fleet/dashboard data and Go for telemetry/WebSocket flows.
- Avoid hardcoded API origins; use existing environment/config plumbing.
- When frontend behavior changes due to API contract updates, adjust `apps/frontend-e2e` specs in the same PR.
