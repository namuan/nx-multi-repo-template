# Local Development Guide

Everything runs through `npm run <command>`. You never need to call `docker`, `pnpm`, `go`, or `mvn` directly.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |
| Go | 1.23+ | [go.dev/dl](https://go.dev/dl) |
| Java JDK | **21+** (required) | [adoptium.net](https://adoptium.net) or `sdk install java 21-tem` via [SDKMAN](https://sdkman.io) |
| Docker Desktop | Latest | [docker.com](https://www.docker.com/products/docker-desktop) |
| pnpm | 10+ | `npm install -g pnpm@10` |
| tmux | 3.2+ | `brew install tmux` (optional, for Option B) |

Run `npm run check` at any time to verify your environment.

---

## Option A — Full stack in Docker (recommended for demos)

The fastest path. Every service runs in a container; no local runtimes needed beyond Docker.

**1. First-time setup — install Node dependencies**

```sh
npm run setup
```

Verifies prerequisites, installs Node deps, and generates `pnpm-lock.yaml`. Required once after cloning, and again after `package.json` changes.

**2. Copy environment variables**

```sh
cp .env.example .env
```

**3. Start everything**

```sh
npm run dev:up
```

Builds all images and starts PostgreSQL, the Go API, the Java API, and the React frontend.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:9100 |
| Go API | http://localhost:9101 |
| Java API | http://localhost:9102 |
| PostgreSQL | localhost:5432 |

**4. (Optional) Start with the device simulator**

```sh
npm run dev:up:demo
```

Adds a simulator container that sends live GPS telemetry for all 8 demo devices, so the map moves in real time without any manual steps.

**5. Stop everything**

```sh
npm run dev:down
```

Stops all containers and kills the tmux session (if one is running).

---

## Option B — tmux (recommended for active development)

One command opens a single terminal window split into four panes — database, Go API, Java API, and frontend — all starting in the right order automatically. A second window runs the device simulator.

**1. Copy environment variables (first time only)**

```sh
cp .env.example .env
```

**2. Launch the session**

```sh
npm run dev:tmux
```

tmux will:

1. Verify prerequisites (exits with an error if anything is missing)
2. Start PostgreSQL in Docker and wait until it is healthy
3. Signal the other panes, which then each start their service
4. Open a second window (`simulator`) with the GPS device simulator

**Pane layout**

```
┌──────────────────┬──────────────────┐
│  🗄 PostgreSQL   │  🐹 Go API       │
│    (+ DB logs)   │    :9101         │
├──────────────────┼──────────────────┤
│  ⚛  Frontend    │  ☕ Java API      │
│    :9100         │    :9102         │
└──────────────────┴──────────────────┘
  window 1: dev          (Ctrl-b 1)

┌────────────────────────────────────┐
│  GPS device simulator (8 devices) │
└────────────────────────────────────┘
  window 2: simulator    (Ctrl-b 2)
```

**Useful tmux keys**

| Key | Action |
|-----|--------|
| `Ctrl-b 1` / `Ctrl-b 2` | Switch between dev and simulator windows |
| `Ctrl-b ←↑→↓` | Move between panes |
| `Ctrl-b z` | Zoom the focused pane to full screen (again to unzoom) |
| `Ctrl-b d` | Detach (session keeps running in background) |
| `tmux attach -t fleet-dev` | Reattach after detaching |

**Tear down**

```sh
npm run dev:down
```

Stops all Docker containers and kills the `fleet-dev` tmux session.

---

## Option C — Local processes (manual)

Same as Option B but without tmux — useful if you prefer separate terminal tabs or a GUI terminal.

### Step 1 — First-time setup

```sh
npm run setup
```

Verifies prerequisites, installs Node dependencies, downloads Go module dependencies, and syncs the Go workspace. Run once after cloning, and again after changes to `package.json` or `go.mod`.

### Step 2 — Start the database

```sh
npm run dev:db:up
```

Starts only PostgreSQL in Docker (with the seed data already loaded). The other services run locally and connect to it.

### Step 3 — Start services

Open three terminal tabs and run one command in each:

```sh
# Tab 1 — React frontend (http://localhost:9100, hot reload)
npm run dev:frontend

# Tab 2 — Go API (http://localhost:9101, telemetry + WebSocket)
npm run dev:go

# Tab 3 — Java API (http://localhost:9102, fleet REST)
npm run dev:java
```

Or start all three at once (output is multiplexed):

```sh
npm run dev:all
```

### Step 4 — (Optional) Run the device simulator locally

```sh
npm run dev:simulate
```

Sends telemetry for all 8 demo devices to the local Go API. Keep it running in a separate tab to see the map update live.

---

## Environment variables

Copy `.env.example` to `.env` and adjust values as needed.

```sh
cp .env.example .env
```

The defaults work out of the box for both Docker and local-process setups. Key variables:

| Variable | Default | Used by |
|----------|---------|---------|
| `VITE_API_GO_URL` | `http://localhost:9101` | Frontend → Go API |
| `VITE_API_JAVA_URL` | `http://localhost:9102` | Frontend → Java API |
| `DATABASE_URL` | `postgres://fleet_user:fleet_password@localhost:5432/fleet_db` | Go API |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/fleet_db` | Java API |
| `JWT_SECRET` | `fleet-super-secret-jwt-key-…` | Both APIs (must match) |
| `INTERVAL_MS` | `3000` | Simulator (ms between telemetry events per device) |

> **Production note** — change `JWT_SECRET` to a random 64-character string before deploying.

---

## Demo accounts

All passwords are case-sensitive.

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Platform admin | `admin@fleetpilot.io` | `Admin123!` | All tenants, admin portal |
| Fleet admin (Acme) | `alice@acme.com` | `Demo123!` | Acme Logistics fleet |
| Dispatcher (Acme) | `bob@acme.com` | `Demo123!` | Acme Logistics (limited) |
| Fleet admin (SwiftFleet) | `diana@swiftfleet.io` | `Demo123!` | SwiftFleet fleet |
| Fleet admin (Urban) | `frank@urbandel.co` | `Demo123!` | Urban Delivery Co fleet |

Each tenant's fleet is fully isolated — logging in as `alice@acme.com` shows only Acme's devices, alerts, and geofences.

---

## All npm commands

### Setup & validation

| Command | What it does |
|---------|-------------|
| `npm run check` | Verify all prerequisites are installed at the correct version |
| `npm run setup` | Run `check`, install Node deps, tidy Go modules, sync Go workspace |
| `npm run go:tidy` | Run `go mod tidy` in `apps/api-go` |
| `npm run go:sync` | Run `go work sync` at the workspace root |

### Docker (full stack)

| Command | What it does |
|---------|-------------|
| `npm run dev:up` | Build images and start all services (foreground) |
| `npm run dev:up:demo` | Same, plus the device simulator |
| `npm run dev:up:detached` | Same as `dev:up` but runs in background |
| `npm run dev:down` | Stop containers and kill the tmux session |
| `npm run dev:docker:build` | Build images without starting containers |

### Database

| Command | What it does |
|---------|-------------|
| `npm run dev:db:up` | Start PostgreSQL and wait until healthy |
| `npm run dev:db:down` | Stop PostgreSQL (data preserved) |
| `npm run dev:db:reset` | Destroy all data and re-run the seed script |
| `npm run dev:db:logs` | Tail PostgreSQL logs |

### Local development

| Command | What it does |
|---------|-------------|
| `npm run dev:tmux` | **One command** — opens a tmux session with all services in split panes |
| `npm run dev:frontend` | Start Vite dev server (port 9100, hot reload) |
| `npm run dev:go` | Start Go API (port 9101) |
| `npm run dev:java` | Start Spring Boot (port 9102) |
| `npm run dev:all` | Start all three services in parallel (no tmux) |
| `npm run dev:simulate` | Run the GPS device simulator against the local Go API |

### Logs (Docker mode)

| Command | What it does |
|---------|-------------|
| `npm run dev:logs:go` | Tail Go API logs |
| `npm run dev:logs:java` | Tail Java API logs |
| `npm run dev:logs:frontend` | Tail nginx logs |

### Quality

| Command | What it does |
|---------|-------------|
| `npm run lint` | Lint all projects (Nx affected) |
| `npm run test` | Run all test suites |
| `npm run build` | Production build for all projects |
| `npm run format` | Auto-format all files with Prettier |

---

## Resetting demo data

```sh
npm run dev:db:reset
```

Removes the Docker volume (all data), recreates the container, and re-runs `db/init.sql` automatically.

---

## Troubleshooting

**Docker build fails — `pnpm-lock.yaml not compatible`**

The lockfile was generated with a different major version of pnpm. Regenerate it:

```sh
npm run setup
```

Then rebuild:

```sh
npm run dev:docker:build
```

**Database container exits immediately (exit code 3)**

The postgres volume might contain data from a previously failed init. Wipe it and start fresh:

```sh
npm run dev:db:reset
```

**Port already in use**

```sh
npm run dev:down
```

Then check for other processes on ports 9100, 9101, 9102, or 5432.

**Go dependencies missing after a pull**

```sh
npm run go:tidy
```

**Java won't start (context load failure)**

Make sure the database is running first:

```sh
npm run dev:db:up
npm run dev:java
```

**Map shows no devices**

Run the simulator to push live telemetry:

```sh
npm run dev:simulate
```

Or start the full stack with the demo profile:

```sh
npm run dev:up:demo
```

**`api-java:serve` fails — `release version 21 not supported`**

Your active Java is older than 21. Check the version:

```sh
java -version
```

Install Java 21 and set it as active. With SDKMAN:

```sh
sdk install java 21-tem
sdk use java 21-tem
```

Or with Homebrew:

```sh
brew install --cask temurin@21
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

Add the `JAVA_HOME` export to your shell profile (`~/.zshrc` or `~/.bashrc`) to make it permanent. The Docker build is not affected — it always uses `eclipse-temurin:21`.

**Frontend shows auth errors**

Verify `VITE_API_JAVA_URL` in your `.env` points to the running Java API, then restart `npm run dev:frontend`.
