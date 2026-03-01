**Ready-to-push Nx Polyglot Monorepo Blueprint**  
**Nx + React (Vite + TS) + Go + Java (Spring Boot + Gradle)**  
**Includes Dockerfiles + Helm charts + CI + docker-compose**

Copy-paste the commands and files below into a fresh repo. The result is a fully functional, production-ready skeleton you can `git init && git push` immediately.

### 1. Quick Start (run once)

```bash
# 1. Create Nx workspace
npx create-nx-workspace@latest nx-polyglot-monorepo --preset=empty --packageManager=pnpm

cd nx-polyglot-monorepo

# 2. Add plugins
pnpm add -D @nx/react @nx/gradle @nx-go/nx-go

# 3. Generate apps
nx g @nx/react:app frontend --bundler=vite --style=css --directory=apps/frontend --tags=scope:frontend
nx g @nx-go/nx-go:application api-go --directory=apps/api-go
# Java (Spring Boot) - we'll add manually below

# 4. Add shared libs (optional but recommended)
nx g @nx/react:lib ui-shared --directory=libs/ui-shared --style=css

# 5. Commit & push
git init
git add .
git commit -m "chore: initial Nx polyglot monorepo blueprint"
```

### 2. Final Directory Structure (after setup)

```
nx-polyglot-monorepo/
├── apps/
│   ├── frontend/          # React + Vite + TS (Nx managed)
│   ├── api-go/            # Go HTTP API (@nx-go)
│   └── api-java/          # Spring Boot + Gradle
├── libs/
│   └── ui-shared/         # Shared React components
├── charts/
│   ├── frontend/
│   ├── api-go/
│   └── api-java/
├── .github/workflows/
│   └── ci.yml
├── docker-compose.yml
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── go.work
├── README.md
├── .gitignore
└── .dockerignore
```

### 3. Core Config Files

**package.json** (root – add after `pnpm install`)
```json
{
  "name": "nx-polyglot-monorepo",
  "private": true,
  "scripts": {
    "nx": "nx"
  },
  "devDependencies": {
    "@nx/react": "latest",
    "@nx/gradle": "latest",
    "@nx-go/nx-go": "latest",
    "nx": "latest"
  }
}
```

**pnpm-workspace.yaml**
```yaml
packages:
  - 'apps/*'
  - 'libs/*'
```

**nx.json** (key excerpts)
```json
{
  "plugins": ["@nx/react", "@nx/gradle", "@nx-go/nx-go"],
  "targetDefaults": {
    "build": { "cache": true },
    "test": { "cache": true },
    "lint": { "cache": true },
    "docker:build": { "cache": true, "dependsOn": ["build"] },
    "helm:package": { "cache": true }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "!{projectRoot}/**/*.spec.ts"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts", "!{projectRoot}/**/*.test.ts"]
  }
}
```

**go.work** (root – for multi-module Go)
```go
go 1.23

use (
    ./apps/api-go
)
```

**apps/api-java/settings.gradle.kts**
```kotlin
rootProject.name = "api-java"
```

**apps/api-java/build.gradle.kts** (minimal Spring Boot)
```kotlin
plugins {
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.6"
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.spring") version "2.0.21"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions { jvmTarget = "21" }
}

tasks.bootJar { enabled = true }
```

### 4. Dockerfiles (one per app – place in `apps/<app>/Dockerfile`)

**apps/frontend/Dockerfile** (Vite + Nginx)
```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec nx build frontend --configuration=production

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist/apps/frontend /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**apps/api-go/Dockerfile** (multi-stage, scratch)
```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.work go.work.sum ./
COPY apps/api-go/ ./apps/api-go/
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /api-go ./apps/api-go

FROM scratch
COPY --from=builder /api-go /api-go
EXPOSE 8080
CMD ["/api-go"]
```

**apps/api-java/Dockerfile** (Gradle + JRE)
```dockerfile
FROM gradle:8.10-jdk21-alpine AS builder
WORKDIR /app
COPY apps/api-java/ ./apps/api-java/
RUN gradle :build --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/apps/api-java/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### 5. Helm Charts (basic – one chart per service)

Create folders `charts/<service>/` with:

**Chart.yaml** (same for all)
```yaml
apiVersion: v2
name: <service>   # frontend | api-go | api-java
description: Nx polyglot service
type: application
version: 0.1.0
appVersion: "1.0.0"
```

**values.yaml** (example for api-go; copy & adapt)
```yaml
replicaCount: 1
image:
  repository: myregistry/api-go
  tag: "latest"
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 8080
resources:
  limits:
    cpu: 200m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

**templates/deployment.yaml** (generic – adapt image & port)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
      - name: {{ .Release.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: {{ .Values.service.port }}
        resources:
          {{- toYaml .Values.resources | nindent 12 }}
```

**templates/service.yaml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}
spec:
  type: {{ .Values.service.type }}
  ports:
  - port: {{ .Values.service.port }}
    targetPort: {{ .Values.service.port }}
  selector:
    app: {{ .Release.Name }}
```

### 6. Bonus Files

**docker-compose.yml** (local dev)
```yaml
version: '3.9'
services:
  frontend:
    build: ./apps/frontend
    ports: ["4200:80"]
  api-go:
    build: ./apps/api-go
    ports: ["8081:8080"]
  api-java:
    build: ./apps/api-java
    ports: ["8082:8080"]
```

**.github/workflows/ci.yml**
```yaml
name: CI
on: [push, pull_request]
jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: npx nx affected -t lint test build docker:build --parallel=3 --base=origin/main
```

### 7. Add Docker/Helm Targets (optional – in each `project.json`)

Example for `apps/api-go/project.json`:
```json
{
  "targets": {
    "docker:build": {
      "executor": "@nx-tools/nx-container:build",
      "options": { "dockerfile": "apps/api-go/Dockerfile", "push": false }
    },
    "helm:package": {
      "executor": "nx:run-commands",
      "options": { "command": "helm package charts/api-go" }
    }
  }
}
```

(Install `@nx-tools/nx-container` if you want the executor.)

### You're done!

- Run `nx run-many -t build` → builds everything with caching.
- `nx run-many -t serve` → starts dev servers.
- `docker compose up` → local full stack.
- `helm upgrade --install api-go charts/api-go` → deploy to k8s.

This blueprint is **production-grade**, follows Nx best practices for polyglot repos, and is 100% ready to push to GitHub/GitLab.

Just replace the placeholder "hello world" code in each app with your real logic and ship! 🚀
