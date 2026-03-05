# Testing Patterns

**Analysis Date:** 2026-03-05

## Test Framework

### TypeScript/JavaScript

**Runner:** Vitest 4.0.18

- Config: `apps/frontend/vite.config.ts` (test section)
- Uses Vite for fast HMR and test execution

**Assertion Library:** Vitest built-in expect

- Chai-like assertions via Vitest

**Testing Library:** @testing-library/react 16.3.2

- React component testing
- DOM testing utilities

**Run Commands:**

```bash
pnpm test                           # Run all tests via nx
nx run frontend:test               # Run frontend tests
nx run-many -t test                # Run all project tests
pnpm exec vitest run               # Direct vitest run
pnpm exec vitest run --coverage    # With coverage
```

### Go

**Runner:** Go's built-in testing package

- Uses `testing.T` from standard library

**Run Commands:**

```bash
go test ./...                      # Run all Go tests
go test -v ./internal/auth/        # Verbose output
go test -cover ./...               # With coverage
```

### E2E Testing

**Framework:** Playwright 1.58.2

- Config: `apps/frontend-e2e/playwright.config.ts`, `apps/api-e2e/playwright.config.ts`

**Run Commands:**

```bash
pnpm test:e2e:frontend            # Run frontend E2E tests
pnpm test:e2e:backend             # Run backend E2E tests
pnpm test:e2e:frontend:ci         # Run with CI configuration
```

## Test File Organization

### Location

**TypeScript:**

- Co-located with source files
- Same directory as implementation
- Examples:
  - `apps/frontend/src/stores/auth.store.spec.ts` alongside `auth.store.ts`
  - `apps/frontend/src/pages/Login.spec.tsx` alongside `Login.tsx`
  - `libs/ui-shared/src/lib/Button.spec.tsx` alongside `Button.tsx`

**Go:**

- Same package, `_test.go` suffix
- Examples:
  - `apps/api-go/internal/auth/middleware_test.go` alongside `middleware.go`
  - `apps/api-go/main_test.go` alongside `main.go`

### Naming

**TypeScript:**

- `{filename}.spec.{ts,tsx}` pattern
- Examples: `auth.store.spec.ts`, `Login.spec.tsx`, `api.spec.ts`

**Go:**

- `{filename}_test.go` pattern
- Examples: `middleware_test.go`, `main_test.go`

### Structure

**TypeScript Unit Tests:**

```
src/
├── stores/
│   ├── auth.store.ts
│   └── auth.store.spec.ts         # Tests for auth store
├── pages/
│   ├── Login.tsx
│   └── Login.spec.tsx            # Component tests
├── lib/
│   ├── api.ts
│   └── api.spec.ts               # API client tests
└── components/
    ├── Button.tsx
    └── Button.spec.tsx           # Shared component tests
```

**Go Tests:**

```
internal/
├── auth/
│   ├── middleware.go
│   └── middleware_test.go        # Auth middleware tests
└── main.go
  └── main_test.go               # Main package tests
```

## Test Structure

### TypeScript Component Tests

**Suite Organization:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // Reset state before each test
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
});

describe('ComponentName', () => {
  describe('feature or behavior group', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

**Example from `apps/frontend/src/pages/Login.spec.tsx`:**

```typescript
function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Login', () => {
  it('renders the FleetPilot heading', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'FleetPilot' })).toBeTruthy();
  });
});
```

### TypeScript Store Tests

**Example from `apps/frontend/src/stores/auth.store.spec.ts`:**

```typescript
describe('useAuthStore', () => {
  describe('initial state', () => {
    it('starts unauthenticated with null token and user', () => {
      const { token, user, isAuthenticated } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('sets token, user, and isAuthenticated to true', () => {
      useAuthStore.getState().login(mockLoginResponse);
      const state = useAuthStore.getState();
      expect(state.token).toBe('test-jwt-token');
      expect(state.isAuthenticated).toBe(true);
    });
  });
});
```

### Go Tests

**Example from `apps/api-go/internal/auth/middleware_test.go`:**

```go
func TestJWTMiddlewareMissingTokenReturnsUnauthorized(t *testing.T) {
    handler := JWTMiddleware("test-secret", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
        t.Fatal("next handler should not be called without a token")
    }))

    req := httptest.NewRequest(http.MethodGet, "/ws", nil)
    rr := httptest.NewRecorder()

    handler.ServeHTTP(rr, req)

    if rr.Code != http.StatusUnauthorized {
        t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
    }
}
```

## Mocking

### Framework: Vitest

**Mocking utilities:**

- `vi.fn()` - Create mock functions
- `vi.mock()` - Mock modules
- `vi.spyOn()` - Spy on object methods
- `vi.clearAllMocks()` - Reset mocks between tests

**Mocking External Dependencies:**

**Example - Mock WebSocket:**

```typescript
vi.mock('../lib/ws', () => ({
  fleetWs: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));
```

**Example - Mock API client:**

```typescript
vi.mock('../lib/api', () => ({
  auth: { login: vi.fn() },
}));

// Then configure the mock:
vi.mocked(auth.login).mockResolvedValue({ data: mockLoginResponse } as any);
```

**Example - Spy on axios methods:**

```typescript
beforeEach(() => {
  vi.spyOn(javaApi, 'get').mockResolvedValue({ data: {} } as any);
  vi.spyOn(javaApi, 'post').mockResolvedValue({ data: {} } as any);
});
```

### Go Mocking

- Minimal mocking - uses real implementations where possible
- `httptest.NewRequest()` and `httptest.NewRecorder()` for HTTP handler testing
- No external mocking framework - uses standard library

**Example:**

```go
req := httptest.NewRequest(http.MethodGet, "/ws", nil)
rr := httptest.NewRecorder()
handler.ServeHTTP(rr, req)
```

### What to Mock

**TypeScript:**

- External API clients (axios instances)
- WebSocket connections
- LocalStorage/sessionStorage
- Third-party libraries (React Query, Zustand when needed)

**Go:**

- Database connections (when testing handlers in isolation)
- External services

### What NOT to Mock

**TypeScript:**

- React components (test actual behavior via @testing-library)
- Pure utility functions (test directly)
- Built-in browser APIs (jsdom handles these)

**Go:**

- Standard library HTTP handlers (test with httptest)

## Fixtures and Factories

### Test Data

**Inline fixtures:**

```typescript
const mockLoginResponse = {
  token: 'test-jwt-token',
  userId: 'user-1',
  email: 'alice@acme.com',
  fullName: 'Alice Smith',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 'tenant-1',
  tenantName: 'Acme Logistics',
  primaryColor: '#3B82F6',
};
```

**Reusable fixtures at top of test file:**

```typescript
// Defined once, used across tests
const mockDevice = {
  id: 'device-1',
  tenantId: 'tenant-1',
  name: 'Truck Alpha',
  type: 'truck' as const,
  // ...
};
```

### Location

- Inline in test files (co-located)
- No separate fixtures directory - kept with tests

## Coverage

### Requirements

**Frontend (from vite.config.ts):**

- Lines: 75%
- Functions: 75%
- Statements: 75%
- Branches: 60%

**View Coverage:**

```bash
pnpm exec vitest run --coverage
# or via nx
nx run frontend:coverage
```

**Coverage Report Directory:**

- `coverage/apps/frontend/`
- `coverage/libs/ui-shared/`

### What's Tested

**High Coverage:**

- API clients (`api.spec.ts`)
- State stores (`auth.store.spec.ts`)
- Auth flow and routing

**Lower Coverage:**

- Complex UI components (Dashboard, Devices)
- Integration with third-party libraries (React Query)

## Test Types

### Unit Tests

**Scope:** Individual functions, components, stores
**Location:** `src/**/*.spec.ts`, `src/**/*.spec.tsx`
**Example:** `auth.store.spec.ts`, `api.spec.ts`, `Button.spec.tsx`

### Integration Tests

**Scope:** Component interactions, routing
**Location:** Page-level spec files
**Example:** `Login.spec.tsx` tests form + auth store + navigation

### E2E Tests

**Framework:** Playwright
**Location:**

- Frontend: `apps/frontend-e2e/src/*.spec.ts`
- Backend: `apps/api-e2e/src/*.spec.ts`

**Example test file:** `apps/frontend-e2e/src/dashboard.ui.spec.ts`

**Configuration:**

```typescript
// apps/frontend-e2e/playwright.config.ts
export default defineConfig({
  testDir: './src',
  timeout: 60_000,
  retries: process.env['CI'] ? 2 : 0,
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: ['**/*.ui.spec.ts'],
    },
  ],
});
```

## Common Patterns

### Async Testing

**Using waitFor:**

```typescript
import { waitFor } from '@testing-library/react';

// Wait for async assertions
await waitFor(() => expect(auth.login).toHaveBeenCalledWith('alice@acme.com', 'Demo123!'));
await waitFor(() => expect(screen.getByText('Dashboard Page')).toBeTruthy());
```

**Using act for state updates:**

```typescript
import { act } from 'react';

await act(async () => {
  settle({ data: mockLoginResponse });
});
```

### Error Testing

**Mock rejection:**

```typescript
it('shows error message from server on failed login', async () => {
  vi.mocked(auth.login).mockRejectedValue({
    response: { data: { message: 'Invalid credentials' } },
  });
  // ... render and assert error message appears
});
```

### Testing Protected Routes

**Example:**

```typescript
it('navigates to /dashboard on successful login', async () => {
  vi.mocked(auth.login).mockResolvedValue({ data: mockLoginResponse } as any);
  renderLogin();
  fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
    target: { value: 'alice@acme.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(screen.getByText('Dashboard Page')).toBeTruthy());
});
```

---

_Testing analysis: 2026-03-05_
