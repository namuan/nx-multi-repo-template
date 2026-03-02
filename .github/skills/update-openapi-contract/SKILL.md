---
name: update-openapi-contract
description: Update and validate OpenAPI specs when backend API contracts change. Use when adding/changing endpoints, DTOs, response schemas, or auth requirements in api-go or api-java.
---

# Update OpenAPI Contract

Use this skill whenever API request/response behavior changes.

## 1) Update the correct spec file

- Java API changes → `docs/openapi/api-java.yaml`
- Go API changes → `docs/openapi/api-go.yaml`

## 2) Keep spec aligned with implementation

Synchronize:

- path and method
- request body schema and required fields
- response status codes and payload schemas
- auth requirements (Bearer JWT, device key, etc.)

## 3) Ensure tests reflect contract updates

- Service-level tests for changed behavior.
- E2E tests where contract changes affect cross-service or user-visible flows.

## 4) Validate after changes

At minimum run relevant service/test commands:

- `pnpm nx run api-java:test` or `pnpm nx run api-go:test`
- `npm run test:e2e:backend` if endpoints are used in integrated flows

## 5) Keep docs coherent

If endpoint purpose or usage changed significantly, update related docs (`README.md`, `docs/polyglot-architecture.md`, or focused runbooks) in the same change.
