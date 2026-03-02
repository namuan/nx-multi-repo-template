**Integration Plan: golangci-lint in an Nx Polyglot Monorepo (Go Projects)**

### Objective

Fully integrate the industry-standard Go linter `golangci-lint` (v2+) into your Nx workspace so that:

- Every Go project (apps/libs) uses the same high-quality linting rules.
- `nx lint`, `nx affected -t lint`, and `nx run-many -t lint` work out of the box.
- Caching, affected-only runs, and polyglot consistency are preserved.
- Formatting, security scanning, and pre-commit hooks are included.
- Zero friction for developers and CI.

### Benefits

- Fast parallel linting (Staticcheck + Revive + Gosec + modernize + more).
- Nx cache hits = near-instant subsequent runs.
- Single source of truth (root `.golangci.yml`).
- Enforces Go best practices across the entire monorepo.

### Scope & Assumptions

- You already have a working Nx workspace (v20+ recommended).
- Go projects were generated with `@nx-go/nx-go` (or manually added `go.mod`).
- You want a shared config (recommended for monorepos).

### Estimated Effort

1–2 hours (one-time setup).

### Risks & Mitigations

- Existing code may produce many lint errors → run with `--new-from-rev=origin/main` first.
- Plugin executor limitations → fallback to `@nx/run-commands` (included below).

---

### Step-by-Step Implementation Guide

#### Step 1: Install the Official Nx Go Plugin

```bash
nx add @nx-go/nx-go
```

(or `npm install -D @nx-go/nx-go` + `nx g @nx-go/nx-go:init` if you prefer manual).

This adds:

- Automatic task inference for any project containing `go.mod`.
- Built-in `lint` executor (we will override/extend it).

#### Step 2: Install golangci-lint

**Local development (recommended):**

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

**CI / Team consistency (pin version):**
Add to your CI or use `asdf` / `mise` / `devbox` with:

```yaml
# .tool-versions (example)
golangci-lint 2.0.2
```

Verify:

```bash
golangci-lint --version
```

#### Step 3: Create Shared Configuration at Workspace Root

Create `.golangci.yml` in the root of your Nx workspace:

```yaml
version: '2'
run:
  concurrency: 4
  timeout: 5m
  allow-parallel-runners: true

linters:
  default: none
  enable:
    - staticcheck
    - revive
    - gosimple
    - govet
    - errcheck
    - gosec
    - unused
    - gci
    - gofumpt
    - modernize
    - nilaway # optional but excellent

linters-settings:
  gci:
    custom-order: true
    sections:
      - standard
      - default
      - prefix({{YOUR_MODULE_PREFIX}}) # e.g. github.com/yourorg/
  gofumpt:
    extra-rules: true
  revive:
    rules:
      - name: exported
        disabled: true # disable if too noisy

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - gosec
  max-issues-per-linter: 50
  max-same-issues: 0

output:
  formats:
    - format: colored-line-number
```

Customize `{YOUR_MODULE_PREFIX}` and tweak exclusions as needed.

#### Step 4: Configure the `lint` Target for Every Go Project

Two options — choose one.

**Option A (Recommended) – Use `@nx/run-commands` for full control**  
In each Go project’s `project.json` (or add to `nx.json` for defaults):

```json
"lint": {
  "executor": "@nx/run-commands",
  "options": {
    "command": "golangci-lint run ./... --config {workspaceRoot}/.golangci.yml",
    "cwd": "{projectRoot}"
  },
  "cache": true,
  "inputs": [
    "{projectRoot}/**/*.go",
    "{workspaceRoot}/.golangci.yml",
    "!{projectRoot}/**/*_test.go"
  ],
  "outputs": []
}
```

**Option B – Use the plugin’s built-in executor** (simpler if you like defaults):

```json
"lint": {
  "executor": "@nx-go/nx-go:lint",
  "options": {
    "linter": "golangci-lint",
    "args": ["run", "--config", "../../.golangci.yml"]
  }
}
```

Add a separate `format` target if you want `nx format` support:

```json
"format": {
  "executor": "@nx/run-commands",
  "options": {
    "command": "golangci-lint fmt ./..."
  }
}
```

#### Step 5: (Optional but Recommended) Add Security Scan Target

```json
"govulncheck": {
  "executor": "@nx/run-commands",
  "options": {
    "command": "govulncheck ./..."
  }
}
```

#### Step 6: Pre-commit Hooks with Lefthook (Polyglot-Friendly)

Install Lefthook (Go binary, works everywhere):

```bash
go install github.com/evilmartians/lefthook@latest
lefthook install
```

Create `lefthook.yml` at root:

```yaml
pre-commit:
  jobs:
    - name: Go lint & format
      run: nx affected -t lint --base=origin/main --head=HEAD --parallel=4
      glob: '*.go'
```

#### Step 7: Update CI/CD Pipeline

Example GitHub Actions snippet:

```yaml
- name: Lint Go projects
  run: |
    nx affected -t lint --base=origin/main --head=HEAD
    nx affected -t govulncheck --base=origin/main --head=HEAD
```

Nx will automatically cache and skip unchanged projects.

#### Step 8: IDE Integration

**VS Code** (`settings.json`):

```json
{
  "go.lintTool": "golangci-lint",
  "go.lintFlags": ["--config", "${workspaceFolder}/.golangci.yml"]
}
```

**GoLand / IntelliJ**:  
Preferences → Go → Linters → Enable golangci-lint and point to the root config.

#### Step 9: Test the Integration

```bash
# Lint everything
nx run-many -t lint

# Only changed projects
nx affected -t lint

# Fix formatting automatically
nx affected -t format --fix
```

If you see lint errors on existing code:

```bash
golangci-lint run --new-from-rev=origin/main ./...
```

#### Step 10: Commit & Share

1. Commit `.golangci.yml`, updated `project.json` files, `lefthook.yml`.
2. Update your team’s onboarding doc / CONTRIBUTING.md with the new workflow.
3. (Optional) Add to `nx.json` `targetDefaults` for even less per-project config.

---
