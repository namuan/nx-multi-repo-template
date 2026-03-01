# Local Development Guide

Everything runs through `npm run <command>`. You never need to call `docker`, `pnpm`, `go`, or `mvn` directly.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org) |
| Go | 1.23+ | [go.dev/dl](https://go.dev/dl) |
| Java JDK | 21 | [adoptium.net](https://adoptium.net) |
| Docker Desktop | Latest | [docker.com](https://www.docker.com/products/docker-desktop) |
| pnpm | 9+ | `npm install -g pnpm` |
| tmux | 3.2+ | `brew install tmux` (optional, for Option B) |

---

## Option A — Full stack in Docker (recommended for demos)

The fastest path. Every service runs in a container; no local runtimes needed beyond Docker.

**1. Copy environment variables**

```sh
cp .env.example .env
```

**2. Start everything**

```sh
npm run up
```

This builds all images and starts PostgreSQL, the Go API, the Java API, and the React frontend.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Go API | http://localhost:8081 |
| Java API | http://localhost:8082 |
| PostgreSQL | localhost:5432 |

**3. (Optional) Start with the device simulator**

```sh
npm run up:demo
```

Adds a simulator container that sends live GPS telemetry for all 8 demo devices, so the map moves in real time without any manual steps.

**4. Stop everything**

```sh
npm run down
```

---

## Option B — tmux (recommended for active development)

One command opens a single terminal window split into four panes — database, Go API, Java API, and frontend — all starting in the right order automatically. A fifth tab runs the device simulator.

**1. Copy environment variables (first time only)**

```sh
cp .env.example .env
```

**2. Launch the session**

```sh
npm run dev:tmux
```

That's it. tmux will:

1. Start PostgreSQL in Docker and wait until it is healthy
2. Signal the other panes, which then each start their service
3. Open a second tab (`simulator`) with the GPS device simulator

**Pane layout**

```
┌──────────────────┬──────────────────┐
│  🗄 PostgreSQL   │  🐹 Go API       │
│    (+ DB logs)   │    :8081         │
├──────────────────┼──────────────────┤
│  ⚛  Frontend    │  ☕ Java API      │
│    :4200         │    :8082         │
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
| `Ctrl-b $` | Rename session |
| `tmux attach -t fleet-dev` | Reattach after detaching |

**Tear down**

Exiting tmux (`Ctrl-b d`, then close the terminal) leaves services running. To stop everything:

```sh
npm run down   # stops Docker containers
```

---

## Option C — Local processes (manual)

Same as Option B but without tmux — useful if you prefer separate terminal tabs or a GUI terminal.

### Step 1 — First-time setup

```sh
npm run setup
```

This installs all Node dependencies, downloads Go module dependencies, and syncs the Go workspace. Run it once after cloning, and again after pulling changes that modify `package.json` or `go.mod`.

### Step 2 — Start the database

```sh
npm run db:up
```

Starts only PostgreSQL in Docker (with the seed data already loaded). The other services run locally and connect to it.

### Step 3 — Start services

Open three terminal tabs and run one command in each:

```sh
# Tab 1 — React frontend (http://localhost:4200, hot reload)
npm run dev:frontend

# Tab 2 — Go API (http://localhost:8081, telemetry + WebSocket)
npm run dev:go

# Tab 3 — Java API (http://localhost:8082, fleet REST)
npm run dev:java
```

Or start all three at once (output is multiplexed):

```sh
npm run dev:all
```

### Step 4 — (Optional) Run the device simulator locally

```sh
npm run simulate
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
| `VITE_API_GO_URL` | `http://localhost:8081` | Frontend → Go API |
| `VITE_API_JAVA_URL` | `http://localhost:8082` | Frontend → Java API |
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

### Setup & dependencies

| Command | What it does |
|---------|-------------|
| `npm run setup` | Install Node deps, tidy Go modules, sync Go workspace |
| `npm run go:tidy` | Run `go mod tidy` in `apps/api-go` |
| `npm run go:sync` | Run `go work sync` at the workspace root |

### Docker (full stack)

| Command | What it does |
|---------|-------------|
| `npm run up` | Build images and start all services (foreground) |
| `npm run up:demo` | Same, plus the device simulator |
| `npm run up:detached` | Same as `up` but runs in background |
| `npm run down` | Stop and remove containers |
| `npm run docker:build` | Build images without starting containers |

### Database

| Command | What it does |
|---------|-------------|
| `npm run db:up` | Start PostgreSQL and wait until healthy |
| `npm run db:down` | Stop PostgreSQL (data preserved) |
| `npm run db:reset` | Destroy all data and re-run the seed script |
| `npm run db:logs` | Tail PostgreSQL logs |

### Local development

| Command | What it does |
|---------|-------------|
| `npm run dev:tmux` | **One command** — opens a tmux session with all services in split panes |
| `npm run dev:frontend` | Start Vite dev server (port 4200, hot reload) |
| `npm run dev:go` | Start Go API (port 8081) |
| `npm run dev:java` | Start Spring Boot (port 8082) |
| `npm run dev:all` | Start all three services in parallel (no tmux) |
| `npm run simulate` | Run the GPS device simulator against the local Go API |

### Quality

| Command | What it does |
|---------|-------------|
| `npm run lint` | Lint all projects (Nx affected) |
| `npm run test` | Run all test suites |
| `npm run build` | Production build for all projects |
| `npm run format` | Auto-format all files with Prettier |

### Logs (Docker mode)

| Command | What it does |
|---------|-------------|
| `npm run logs:go` | Tail Go API logs |
| `npm run logs:java` | Tail Java API logs |
| `npm run logs:frontend` | Tail nginx logs |

---

## Resetting demo data

If you want a clean slate with the original seed data:

```sh
npm run db:reset
```

This removes the Docker volume (all data), recreates the container, and re-runs `db/init.sql` automatically.

---

## Troubleshooting

**Port already in use**

```sh
npm run down   # stop any running containers first
```

Then check for other processes on ports 4200, 8081, 8082, or 5432.

**Go dependencies missing after a pull**

```sh
npm run go:tidy
```

**Java won't start (context load failure)**

Make sure the database is running first:

```sh
npm run db:up
npm run dev:java
```

**Map shows no devices**

Run the simulator to push live telemetry:

```sh
npm run simulate
```

Or start the full stack with the demo profile:

```sh
npm run up:demo
```

**Frontend shows auth errors**

Verify `VITE_API_JAVA_URL` in your `.env` points to the running Java API, then restart `npm run dev:frontend`.
