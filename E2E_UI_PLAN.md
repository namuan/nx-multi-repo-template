**Here's the complete, ready-to-implement plan for your Full E2E UI Tests (UI-over-APIs) – Type 2.**  
It **perfectly complements** your existing `api-e2e` (backend-only) suite with zero overlap or duplication.

### Why this complements `api-e2e` perfectly
| Layer          | Purpose                          | Frequency (recommended) | Focus |
|----------------|----------------------------------|-------------------------|-------|
| `api-e2e`      | Backend contracts & flows        | Every PR                | HTTP only |
| `frontend-e2e` | Real user journeys through React | Main branch / nightly   | Browser + API setup |

Both use **Playwright** → same language, same fixtures, same reporting, same Nx caching.

### 1. Generate the Project

```bash
nx g @nx/playwright:configuration \
  --projectName=frontend-e2e \
  --e2eTestRunner=playwright \
  --webServerCommand="nx run react-frontend:dev" \
  --webServerAddress="http://localhost:4200" \
  --skipFormat
```

### 2. Project Structure (final)

```
apps/
├── java-api/
├── go-api/
├── react-frontend/
├── api-e2e/           # ← your existing API-only suite
├── frontend-e2e/      # ← NEW: UI-over-APIs
libs/
└── test-utils/        # ← shared by BOTH e2e projects (auth, factories, cleanup, etc.)
```

### 3. Orchestration – Two Modes

#### Local Development (best DX – Nx continuous tasks)
Nx automatically starts **Java + Go + React** before tests run.

**A. Mark backends as long-running:**
```json
// java-api/project.json and go-api/project.json
"serve": {
  ...
  "nx": {
    "continuous": true
  }
}
```

**B. Make React dev depend on backends:**
```json
// react-frontend/project.json
"dev": {   // or "serve" if that's your target name
  "dependsOn": [
    { "projects": ["java-api", "go-api"], "target": "serve" }
  ]
}
```

**C. Make frontend-e2e depend on React:**
```json
// frontend-e2e/project.json
"e2e": {
  "dependsOn": [
    { "projects": "react-frontend", "target": "dev" }
  ],
  ...
}
```

Now just run:
```bash
nx run frontend-e2e:e2e
```
→ Nx starts Java → Go → React → Playwright (browser).

#### CI / Production-like (Docker Compose – 100% reproducible)
Extend the `docker-compose.e2e.yml` you already have for `api-e2e`:

```yaml
# apps/frontend-e2e/docker-compose.e2e.yml  (or share the same file)
services:
  java-api: { ... }          # same as before
  go-api:   { ... }
  postgres: { ... }

  react-frontend:
    build:
      context: ../react-frontend
      target: production   # or whatever your Nx build uses
    command: ["nginx", "-g", "daemon off;"]
    ports: ["4200:80"]
    depends_on: [java-api, go-api]

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports: ["4200:80"]
    depends_on: [react-frontend]
```

(Use a simple nginx.conf to serve the built static files from `/dist`.)

Then update `frontend-e2e/project.json`:
```json
"configurations": {
  "ci": {
    "command": "nx build react-frontend && docker compose -f apps/frontend-e2e/docker-compose.e2e.yml up --build -d && npx playwright test && docker compose down"
  }
}
```

### 4. `frontend-e2e/playwright.config.ts` (key parts)

```ts
import { defineConfig } from '@playwright/test';
import { testUtils } from '@myorg/test-utils'; // shared lib

export default defineConfig({
  testDir: './src',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    // Re-use API base URLs from your api-e2e
    extraHTTPHeaders: { ...testUtils.commonHeaders },
  },
  webServer: {
    command: 'nx run react-frontend:dev',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // add firefox, webkit if you want
  ],
});
```

### 5. Example Test (UI + API seeding – the key pattern)

```ts
// frontend-e2e/src/user-journey.spec.ts
import { test, expect } from '@playwright/test';
import { testUtils } from '@myorg/test-utils'; // shared with api-e2e

test('user can create order and see it in dashboard', async ({ page, request }) => {
  // 1. Seed data via APIs (fast, reliable, no UI flakiness)
  const user = await testUtils.createTestUser(request);   // Java API
  const product = await testUtils.createTestProduct(request); // Go API

  // 2. Login in browser
  await page.goto('/login');
  await page.fill('#email', user.email);
  await page.click('button[type=submit]');

  // 3. UI journey
  await page.goto('/dashboard');
  await page.click('text=New Order');
  await page.selectOption('select#product', product.id);
  await page.click('button[type=submit]');

  // 4. Assert UI + final API check
  await expect(page.locator('text=Order placed')).toBeVisible();
  const order = await testUtils.getLatestOrder(request, user.id);
  expect(order.productId).toBe(product.id);
});
```

### 6. Sharing Code Between `api-e2e` & `frontend-e2e`

```bash
nx g @nx/js:lib test-utils --directory=libs --buildable=false
```
Then both projects depend on it in `tsconfig.json` and `project.json`.

Put in `libs/test-utils`:
- Auth helpers
- Test data factories
- Cleanup utilities
- Pact contract consumers (optional but recommended)

### 7. Recommended Run Strategy (Nx `affected` shines here)

```bash
# In PRs (fast)
nx affected -t e2e --projects=api-e2e

# On main / nightly (full coverage)
nx run-many -t e2e --projects=api-e2e,frontend-e2e
```

Nx Cloud Atomizer will automatically shard the heavier `frontend-e2e` suite across machines.

### Quick Start Commands

```bash
nx g @nx/playwright:configuration --projectName=frontend-e2e   # (already done)
nx run frontend-e2e:e2e                     # local (starts everything)
nx run frontend-e2e:e2e --configuration=ci  # CI-style
```

This gives you:
- Zero duplication with your `api-e2e`
- Perfect separation of concerns
- Blazing-fast local feedback
- Rock-solid CI with Docker
- Easy to maintain (one test framework, shared utils)

You now have a professional-grade, polyglot full-stack testing strategy inside Nx.

Want the exact `docker-compose.e2e.yml` (full version), `nginx.conf`, updated `project.json` snippets, or the complete `libs/test-utils` starter? Just say the word and I’ll drop the full copy-paste files!