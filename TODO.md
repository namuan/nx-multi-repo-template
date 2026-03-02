# Active Production Readiness TODO

Last refreshed: 2026-03-01

This file tracks active, not-yet-completed work only. Completed items are removed to keep this list actionable.

---

## AI

- [ ] **Add Instruction files for different tech stack**
- [ ] **Add Skills for common tasks** (e.g., "How to add a new API endpoint?", "How to add a new database migration?")

---

## CI/CD and Release

- [ ] **Push Docker images to a registry** — CI currently builds but does not publish images
- [ ] **Add CD workflow** — create `.github/workflows/deploy.yml` for Helm deploys after successful image publish
- [ ] **Separate staging and production deploys** — parameterize by environment and require manual approval for production
- [ ] **Automate release tagging and changelog** — add semantic versioning and changelog generation

---

## Security

- [ ] **Harden authentication and authorization coverage** — ensure all externally exposed endpoints enforce appropriate authN/authZ
- [ ] **Add container image scanning in CI** — integrate Trivy/Grype gates before image publish
- [ ] **Define secret rotation playbook** — document rotation cadence and procedures for JWT and DB credentials

---

## Observability and Reliability

- [ ] **Add distributed tracing** — instrument services with OpenTelemetry and configure exporter backend
- [ ] **Add alerting rules for SLOs** — define error-rate, latency, and availability alerts
- [ ] **Define backup and restore drill process** — run periodic restore verification for Postgres

---

## Testing and Quality

- [ ] **Increase frontend test coverage** — expand component and state-management tests beyond baseline smoke tests
- [ ] **Add contract checks between Java and Go APIs** — detect payload/behavior drift across services

---

## Documentation and Governance

- [ ] **Add migration PR checklist to CONTRIBUTING** — enforce migration naming/versioning/rollback review steps
- [ ] **Create docs index page under `docs/`** — centralize architecture, runbook, E2E, and migration guidance links
