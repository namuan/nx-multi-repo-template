# Coding Conventions

**Analysis Date:** 2026-03-05

## Naming Patterns

### Files

**TypeScript/React:**

- PascalCase for components: `Login.tsx`, `Dashboard.tsx`, `Button.tsx`
- PascalCase for stores: `auth.store.ts`
- Lowercase with dots for specs: `auth.store.spec.ts`, `api.spec.ts`
- Lowercase for utilities: `api.ts`, `ws.ts`

**Go:**

- Lowercase with underscores: `middleware.go`, `handler.go`, `limiter.go`
- Test files with `_test.go` suffix: `middleware_test.go`

### Functions

**TypeScript:**

- camelCase for functions and variables
- Descriptive verb prefixes: `getDevices()`, `login()`, `subscribe()`

**Go:**

- PascalCase for exported functions: `JWTMiddleware()`, `Connect()`
- camelCase for unexported: `writeError()`, `getClaims()`

### Variables

**TypeScript:**

- camelCase: `const deviceList = []`, `const isAuthenticated`
- Interface/Type names: PascalCase: `interface Device`, `type LoginResponse`

**Go:**

- camelCase: `var allowedRoles`, `const ClaimsKey`
- Struct names: PascalCase: `type Claims struct{}`

### Types

**TypeScript:**

- PascalCase for interfaces and types: `interface Device`, `type Alert`
- Export interfaces alongside implementations

## Code Style

### Formatting

**Tool:** Prettier

- Single quotes for strings: `'string'`
- Semicolons: enabled
- Trailing commas: `es5` style
- Print width: 100 characters

**Config:** `.prettierrc.json`

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Linting

**TypeScript:**

- ESLint with `@typescript-eslint/parser`
- Config: `eslint.config.mjs`
- Minimal rules currently enforced (empty rules object)

**Go:**

- golangci-lint configuration in `.golangci.yml`
- Enabled linters: staticcheck, revive, govet, errcheck, gosec, unused, modernize
- Formatters: gci (custom order), gofumpt (extra rules)

**Run commands:**

```bash
pnpm format         # Prettier write
pnpm lint           # ESLint via nx
go run ./tools/...  # Go formatting/linting
```

### TypeScript Configuration

**Config:** `tsconfig.base.json`

- Target: ES2022
- Module: ESNext
- ModuleResolution: bundler
- Path aliases: `@nx-polyglot/ui-shared` maps to `libs/ui-shared/src/index.ts`

## Import Organization

### TypeScript

**Order (enforced by gci for Go, convention for TS):**

1. Standard library imports
2. External packages (react, axios, etc.)
3. Internal packages (@nx-polyglot/\*)
4. Relative imports (../, ./)

**Example:**

```typescript
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { devices as deviceApi, alerts } from '../lib/api';
import { fleetWs, type TelemetryMessage } from '../lib/ws';
```

### Path Aliases

- Use `@nx-polyglot/ui-shared` for shared UI components
- Use relative paths for local project files: `../components/`, `./lib/`

## Error Handling

### TypeScript

**Frontend API:**

- Axios interceptors for global error handling
- 401 responses trigger logout and redirect to `/login`
- Return `Promise.reject(err)` to propagate errors

**Example from `apps/frontend/src/lib/api.ts`:**

```typescript
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fleet_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

### React Components

- Error boundaries not currently implemented
- Query errors displayed inline with retry functionality
- Example from `Dashboard.tsx`: shows error card with "Retry now" button

### Go

**HTTP Handlers:**

- JSON error responses with `{"error": "message"}`
- `writeError()` helper in `auth/middleware.go`
- Uses appropriate HTTP status codes

**Example:**

```go
func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": msg}); err != nil {
		http.Error(w, "failed to write error response", http.StatusInternalServerError)
	}
}
```

## Logging

### TypeScript

**Framework:** console (no external logger)

- Use inline styles for console in development only

### Go

**Framework:** slog (structured logging)

- JSON handler to stdout
- Log levels: slog.Error, slog.Info
- Include context keys: "error", "port", etc.

**Example from `main.go`:**

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
slog.SetDefault(logger)
slog.Info("database connected")
slog.Error("database connection failed", "error", err)
```

## Comments

### When to Comment

- Package-level documentation: Required for main packages
- Exported functions: Brief purpose description
- Complex logic: Explain "why" not "what"
- TODO comments for future work

### JSDoc/TSDoc

- Not heavily used in this codebase
- Interface definitions include field descriptions inline
- Example in `api.ts` uses inline comments for section headers

### Section Headers

Use comment blocks to organize code sections:

```typescript
// ── Types ─────────────────────────────────────────────────────────────────────

export interface Device { ... }

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = { ... };
```

## Function Design

### Size

- Keep functions focused on single responsibility
- No hard limits enforced, but recommend under 50 lines
- Extract complex logic into custom hooks or utilities

### Parameters

**TypeScript:**

- Use explicit types for function parameters
- Optional parameters with defaults at end
- Use object destructuring for many parameters

**Example:**

```typescript
const create = (data: {
  name: string;
  type?: string;
  driverName?: string;
  licensePlate?: string;
  vin?: string;
}) => javaApi.post<Device>('/api/devices', data);
```

### Return Values

- Always type return values explicitly
- Use async/await for promise-based functions
- Return typed responses from API wrappers

## Module Design

### Exports

**TypeScript:**

- Named exports preferred
- Barrel files in libraries (`libs/ui-shared/src/index.ts`)
- Re-export from index for public API

**Example:**

```typescript
// libs/ui-shared/src/index.ts
export { Button } from './lib/Button';
export type { ButtonProps } from './lib/Button';
```

### React Components

- Default export for page components
- Named exports for reusable components
- Props interface colocated with component

**Example:**

```typescript
// Page component - default export
export default function Dashboard() {}

// Reusable component - named export
export function ProtectedRoute({ children }: { children: React.ReactNode }) {}
```

### Barrel Files

- Used in shared library (`libs/ui-shared/src/index.ts`)
- Not used in app-level code (each file imported directly)

### State Management

- Zustand for global state: `apps/frontend/src/stores/auth.store.ts`
- React Query (TanStack Query) for server state
- Local useState for component-specific state

---

_Convention analysis: 2026-03-05_
