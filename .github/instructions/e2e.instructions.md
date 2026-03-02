---
applyTo: 'apps/api-e2e/**/*.{ts,tsx},apps/frontend-e2e/**/*.{ts,tsx}'
---

# E2E Instructions

- Keep tests black-box and deterministic: provision fixtures through public APIs, not direct SQL inserts.
- Use isolated endpoint variables `E2E_GO_API_URL` and `E2E_JAVA_API_URL` via existing env helpers.
- Maintain tenant isolation in test data; avoid assumptions based on demo seeds.
- Preserve health-gated stack lifecycle patterns in global setup/teardown for reproducible CI behavior.
- If API response contracts change, update specs and support clients in the same PR.
