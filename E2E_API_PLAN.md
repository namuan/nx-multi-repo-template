### 1. Recommended Tool: Playwright (via `@nx/playwright`)

Playwright is still the best choice even for **pure API testing**:
- Built-in `APIRequestContext` for clean HTTP testing (no browser overhead)
- Same framework you’ll use later for UI tests → zero context switching
- Excellent TypeScript support, fixtures, tracing, retries, parallelization
- Nx gives you full task orchestration, caching, affected runs, and Nx Cloud Atomizer for free

```bash
nx add @nx/playwright
```

### 2. Project Structure (simplified)

```
apps/
├── api-e2e/           # ← NEW: Backend-APIs-only E2E tests
libs/
└── test-utils/        # Shared test helpers (optional but recommended)
```

Generate the API E2E project:
```bash
nx g @nx/playwright:configuration \
  --projectName=api-e2e \
  --e2eTestRunner=playwright \
  --skipFormat
```

### 3. Backend-APIs-Only E2E (`api-e2e`)

This suite tests real HTTP flows between Java API ↔ Go API (and any DBs) in a black-box way.

**Recommended `apps/api-e2e/playwright.config.ts`** (API-only config):
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,
  use: {
    baseURL: 'http://localhost:8080', // default, can be overridden per project
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'java-api',
      use: { baseURL: 'http://localhost:8080' },
    },
    {
      name: 'go-api',
      use: { baseURL: 'http://localhost:3001' },
    },
  ],
});
```

**Example test** (`apps/api-e2e/src/cross-service.spec.ts`):
```ts
import { test, expect } from '@playwright/test';

test('user created in Java API is visible via Go API', async ({ request }) => {
  // Create via Java API
  const createRes = await request.post('/users', { data: { name: 'Test User' } });
  expect(createRes.ok()).toBeTruthy();
  const { id } = await createRes.json();

  // Verify via Go API
  const getRes = await request.get(`/api/users/${id}`);
  expect(getRes.ok()).toBeTruthy();
  expect((await getRes.json()).name).toBe('Test User');
});
```

### 4. Orchestration (Docker Compose – the gold standard)

For reliable, reproducible backend E2E runs, **always** spin up the full stack with Docker Compose.

`apps/api-e2e/docker-compose.e2e.yml` (or at repo root):
```yaml
services:
  java-api:
    build: ../java-api
    ports: ["8080:8080"]
    environment:
      - SPRING_PROFILES_ACTIVE=test
      - DB_URL=jdbc:postgresql://postgres:5432/test
    depends_on:
      - postgres

  go-api:
    build: ../go-api
    ports: ["3001:3001"]
    environment:
      - DB_URL=postgres://postgres:5432/test
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
```

Update `apps/api-e2e/project.json`:
```json
{
  "name": "api-e2e",
  "targets": {
    "e2e": {
      "executor": "@nx/playwright:playwright",
      "dependsOn": ["^build"],   // ensures Java & Go are built
      "options": {
        "playwrightConfig": "apps/api-e2e/playwright.config.ts"
      },
      "configurations": {
        "ci": {
          "command": "docker compose -f apps/api-e2e/docker-compose.e2e.yml up --build -d && npx playwright test && docker compose down"
        }
      }
    }
  }
}
```

### 5. Additional Best Practices (Nx + Polyglot)

| Area               | Recommendation |
|--------------------|----------------|
| **Task Graph**     | `api-e2e:e2e` depends on `java-api:build` + `go-api:build` |
| **CI**             | `nx affected -t e2e` → only runs when Java/Go change<br>Nx Cloud + Atomizer auto-splits tests across machines |
| **Contract Testing** | Add **Pact** (Java + Go + TS libs) as a lighter complement to catch breaking changes early |
| **Shared Code**    | `libs/test-utils` → auth tokens, factories, cleanup helpers, Pact contracts |
| **Test Data**      | Use dedicated test DB + UUIDs or factories. Clean up with `afterEach` or `test.afterAll` |
| **Local DX**       | `nx run api-e2e:e2e --ui` (Playwright UI mode)<br>`docker compose -f apps/api-e2e/docker-compose.e2e.yml up` for manual testing |
| **Flakiness**      | Traces + videos on failure, `expect.poll()`, retries, Nx Cloud flakiness dashboard |

### Quick Start Commands (now much simpler)

```bash
nx g @nx/playwright:configuration --projectName=api-e2e
nx run api-e2e:e2e          # local run
nx run api-e2e:e2e --configuration=ci   # CI-style with Docker
nx affected -t e2e          # in PR/CI
```
