---
name: add-database-migration
description: Author, validate, and document Postgres schema migrations in this monorepo. Use when asked to add tables/columns/indexes, modify schema, or prepare rollback-safe DB changes.
---

# Add Database Migration

Use this skill for all schema changes in `db/migrations`.

## 1) Treat migrations as cross-service changes

This repo uses a shared Postgres schema used by both APIs.

- Go API and Java API are both impacted by schema changes.
- Prefer additive, phased changes to keep compatibility during rollout.

## 2) Create migration files with strict naming

Create **paired** files in `db/migrations`:

- `NNNNNN_description.up.sql`
- `NNNNNN_description.down.sql`

Rules:

- 6-digit zero-padded increasing prefix
- lowercase snake_case description
- never edit already committed migrations; create a new corrective migration instead

Reference: `docs/db-migrations.md`

## 3) Write safe SQL

- Keep each migration focused on one logical change.
- Prefer additive changes first (columns, tables, indexes).
- For destructive changes, split into phased migrations where possible.
- Ensure `down` migration reverses dependency order (children before parents) when feasible.

## 4) Update dependent code/contracts when needed

If schema changes affect API payloads or behavior:

- update owning service code (Java/Go)
- update OpenAPI files (`docs/openapi/api-java.yaml` or `docs/openapi/api-go.yaml`)
- update related E2E tests in same change

## 5) Validate locally

Run migration and seed flow from repo root:

- `npm run db:migrate`
- `npm run db:seed`

Then run relevant tests:

- `npm run test:e2e:backend` for cross-service confidence
- targeted service tests/lint as needed

## 6) Keep demo/test data separation

- Put schema changes in migrations only.
- Put demo data in `db/seeds/demo.sql` (or other seed files), not migration files.
