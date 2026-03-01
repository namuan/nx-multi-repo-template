# ADR-0001: Polyglot Monorepo with Nx

## Status

Accepted

## Context

The repository hosts multiple services and stacks:

- React frontend
- Go backend API
- Java Spring Boot backend API
- Shared UI library
- Helm charts and CI workflows

We need a single workflow for build, test, and lint while preserving language-specific tooling.

## Decision

Use an Nx-managed monorepo as the orchestration layer, with each service retaining native tooling:

- Frontend/UI: Vite + Vitest + ESLint
- Go API: `go` toolchain
- Java API: Maven + JDK 21

Deployment manifests are managed via Helm per service.

## Consequences

### Positive

- One command surface for lint/test/build across projects.
- Better change impact analysis and incremental CI via `nx affected`.
- Shared standards for CI, security scanning, and deployment templates.

### Trade-offs

- Requires maintaining multiple language toolchains.
- Cross-language conventions must be documented and enforced.
