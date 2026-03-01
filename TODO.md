# Production Readiness TODO

Items required before this template is suitable for production workloads.

---

## CI/CD

- [ ] **Push Docker images to a registry** — CI currently builds but never pushes; add a `docker:push` step with registry credentials (DOCKER_USERNAME / DOCKER_PASSWORD) stored as GitHub secrets
- [x] **Pin Nx plugin versions** — pinned Nx and related toolchain dependencies to exact versions in `package.json`
- [ ] **Add a CD workflow** — add `.github/workflows/deploy.yml` that runs `helm upgrade --install` after images are pushed on `main`
- [ ] **Separate staging and production deploys** — parameterise the deploy workflow by environment; gate production behind a manual approval step
- [ ] **Add release tagging** — automate semver tags and a `CHANGELOG.md` (e.g. `semantic-release` or `release-please`)
- [x] **Add a PR template** — added `.github/pull_request_template.md` with validation checklist
- [x] **Add CODEOWNERS** — added `.github/CODEOWNERS` path ownership rules

---

## Security

- [x] **Restrict CORS origins** — `apps/api-go/main.go` now reads `ALLOWED_ORIGIN` with a safe default
- [ ] **Add authentication** — no auth layer exists on any service; add JWT / API-key middleware before exposing to the internet
- [x] **Create `.env.example`** — added `.env.example` with frontend, Go, Java, and deployment variables
- [x] **Add dependency vulnerability scanning** — integrated `pnpm audit`, `govulncheck`, and Maven OWASP dependency-check into CI
- [ ] **Add container image scanning** — run Trivy or Grype on built images in CI before push
- [x] **Add SAST** — enabled GitHub CodeQL workflow for TypeScript, Go, and Java/Kotlin
- [x] **Configure Kubernetes Secrets** — added `templates/secret.yaml` in all charts and wired `envFrom` secret refs
- [x] **Set `runAsNonRoot` in Helm deployments** — added pod/container `securityContext` in all chart deployments

---

## Helm / Kubernetes

- [x] **Stop using `latest` image tag** — chart defaults now use explicit non-latest tags
- [x] **Add Ingress resources** — added `templates/ingress.yaml` and `ingress` values for each chart
- [x] **Add HorizontalPodAutoscaler** — added `templates/hpa.yaml` in each chart
- [x] **Add PodDisruptionBudget** — added `templates/pdb.yaml` in each chart
- [x] **Add environment-specific values files** — added staging and production values files for each chart
- [x] **Add NetworkPolicy** — added `templates/networkpolicy.yaml` in each chart
- [x] **Add ConfigMap templates** — added `templates/configmap.yaml` in each chart

---

## Observability

- [x] **Structured logging** — Go API now uses `slog` JSON logs; Java API uses structured console logging format
- [x] **Add Prometheus metrics** — Go exposes `/metrics`; Java exposes Actuator Prometheus endpoint
- [ ] **Add distributed tracing** — instrument with OpenTelemetry; configure an exporter (Jaeger / Tempo) in each service
- [ ] **Add alerting rules** — `PrometheusRule` or equivalent for error-rate and latency SLOs

---

## Testing

- [ ] **Increase frontend test coverage** — `apps/frontend/src/App.spec.tsx` exists but is minimal; add meaningful component tests
- [ ] **Add E2E tests** — set up Playwright targeting the `docker-compose` stack; add an `e2e` Nx project and a CI step
- [x] **Add Go integration tests** — expanded handler and middleware coverage in `main_test.go`
- [x] **Add Spring Boot integration tests** — added `HelloEndpointIntegrationTest` with `@SpringBootTest`
- [x] **Enforce coverage thresholds** — added frontend Vitest thresholds, Go coverage gate script, and Maven JaCoCo checks; CI now fails when thresholds are not met

---

## Local Development

- [x] **Add health checks to `docker-compose.yml`** — added healthchecks and health-aware `depends_on` conditions
- [x] **Add graceful shutdown** — implemented Go graceful shutdown and enabled Spring Boot graceful shutdown
- [x] **Add pre-commit hooks** — set up Husky + lint-staged with Prettier and `gofmt`
- [x] **Add Prettier config** — added `.prettierrc.json` and `.prettierignore`
- [x] **Set up Renovate or Dependabot** — added `.github/dependabot.yml`

---

## Documentation

- [x] **Add API documentation** — added OpenAPI specs for Go and Java APIs under `docs/openapi/`
- [x] **Document environment variables** — populated `.env.example` and documented vars in `README.md`
- [x] **Add Architecture Decision Records** — added initial ADR at `docs/adr/0001-polyglot-monorepo.md`
- [x] **Add a runbook** — added operational runbook at `docs/runbook.md`
- [x] **Document branch and release strategy** — added `CONTRIBUTING.md`
