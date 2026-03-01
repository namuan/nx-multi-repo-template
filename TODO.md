# Production Readiness TODO

Items required before this template is suitable for production workloads.

---

## CI/CD

- [ ] **Push Docker images to a registry** — CI currently builds but never pushes; add a `docker:push` step with registry credentials (DOCKER_USERNAME / DOCKER_PASSWORD) stored as GitHub secrets
- [ ] **Pin Nx plugin versions** — `package.json` uses `"latest"` for `@nx/react`, `@nx/gradle`, `@nx-go/nx-go`; pin to exact versions for reproducible builds
- [ ] **Add a CD workflow** — add `.github/workflows/deploy.yml` that runs `helm upgrade --install` after images are pushed on `main`
- [ ] **Separate staging and production deploys** — parameterise the deploy workflow by environment; gate production behind a manual approval step
- [ ] **Add release tagging** — automate semver tags and a `CHANGELOG.md` (e.g. `semantic-release` or `release-please`)
- [ ] **Add a PR template** — `.github/pull_request_template.md` with checklist (tests, docs, migration notes)
- [ ] **Add CODEOWNERS** — `.github/CODEOWNERS` to enforce required reviewers per path

---

## Security

- [ ] **Restrict CORS origins** — `apps/api-go/main.go` uses `Access-Control-Allow-Origin: *`; make the allowed origin(s) configurable via an env var and default to a specific domain
- [ ] **Add authentication** — no auth layer exists on any service; add JWT / API-key middleware before exposing to the internet
- [ ] **Create `.env.example`** — `.gitignore` references `.env.example` but the file is absent; add it documenting all required env vars for local dev
- [ ] **Add dependency vulnerability scanning** — integrate `pnpm audit`, `govulncheck`, and `gradle dependencyCheckAnalyze` (OWASP) into CI
- [ ] **Add container image scanning** — run Trivy or Grype on built images in CI before push
- [ ] **Add SAST** — enable GitHub's CodeQL analysis for TypeScript, Go, and Kotlin/Java
- [ ] **Configure Kubernetes Secrets** — add `templates/secret.yaml` to each Helm chart and mount secrets as env vars rather than hardcoding values in `values.yaml`
- [ ] **Set `runAsNonRoot` in Helm deployments** — add a `securityContext` block to each `templates/deployment.yaml`

---

## Helm / Kubernetes

- [ ] **Stop using `latest` image tag** — `values.yaml` for every chart defaults `image.tag: "latest"`; replace with a CI-injected semver tag or Git SHA
- [ ] **Add Ingress resources** — add `templates/ingress.yaml` and `ingress:` section in `values.yaml` for each chart; currently there is no way to route external traffic
- [ ] **Add HorizontalPodAutoscaler** — `templates/hpa.yaml` per service so pods scale under load
- [ ] **Add PodDisruptionBudget** — ensure rolling upgrades don't take all replicas offline simultaneously
- [ ] **Add environment-specific values files** — `charts/<service>/values-staging.yaml` and `values-production.yaml` so resource limits, replica counts, and image tags differ per environment
- [ ] **Add NetworkPolicy** — restrict inter-service and ingress traffic to the minimum required
- [ ] **Add ConfigMap templates** — externalise non-secret runtime config from container images

---

## Observability

- [ ] **Structured logging** — Go API uses `log.Printf`; switch to `slog` (stdlib) or `zap` with JSON output; add a logging library to the Spring Boot app
- [ ] **Add Prometheus metrics** — expose `/metrics` on each service; add annotations or a `ServiceMonitor` CRD in the Helm charts
- [ ] **Add distributed tracing** — instrument with OpenTelemetry; configure an exporter (Jaeger / Tempo) in each service
- [ ] **Add alerting rules** — `PrometheusRule` or equivalent for error-rate and latency SLOs

---

## Testing

- [ ] **Increase frontend test coverage** — `apps/frontend/src/App.spec.tsx` exists but is minimal; add meaningful component tests
- [ ] **Add E2E tests** — set up Playwright targeting the `docker-compose` stack; add an `e2e` Nx project and a CI step
- [ ] **Add Go integration tests** — `main_test.go` exists; expand with HTTP handler tests using `net/http/httptest`
- [ ] **Add Spring Boot integration tests** — add `@SpringBootTest` tests for the REST layer
- [ ] **Enforce coverage thresholds** — configure minimum coverage in `vite.config.ts` (Vitest), `go test -cover`, and Gradle's JaCoCo plugin; fail CI if thresholds are not met

---

## Local Development

- [ ] **Add health checks to `docker-compose.yml`** — services have no `healthcheck:` blocks, so `depends_on` ordering is unreliable
- [ ] **Add graceful shutdown** — Go API has no signal handling; add `os/signal` listener and a shutdown timeout; verify Spring Boot's `server.shutdown=graceful` is set
- [ ] **Add pre-commit hooks** — set up `husky` + `lint-staged` for TypeScript formatting/linting, `gofmt`/`golangci-lint` for Go, and `ktfmt` for Kotlin
- [ ] **Add Prettier config** — `apps/frontend/` has no `.prettierrc`; add one and wire it into `lint-staged`
- [ ] **Set up Renovate or Dependabot** — automate dependency update PRs for npm, Go modules, Gradle dependencies, and GitHub Actions

---

## Documentation

- [ ] **Add API documentation** — add OpenAPI/Swagger specs for both APIs (Swagger annotations for Spring Boot, `swaggo/swag` or a hand-written spec for Go)
- [ ] **Document environment variables** — populate `.env.example` with all required vars and their descriptions
- [ ] **Add Architecture Decision Records** — create `docs/adr/` with an initial ADR capturing the polyglot stack choice
- [ ] **Add a runbook** — document how to deploy, roll back, and debug each service in production
- [ ] **Document branch and release strategy** — add a `CONTRIBUTING.md` covering branch naming, commit conventions, and the release process
