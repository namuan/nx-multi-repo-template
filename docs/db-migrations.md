# Database Migration Authoring Guide

This guide defines how to author schema migrations in this repository so changes stay predictable across Go API, Java API, and E2E stacks.

## Location and File Format

- Store all schema migrations in `db/migrations`.
- Create files as **paired** migrations:
  - `NNNNNN_description.up.sql`
  - `NNNNNN_description.down.sql`
- Keep demo data out of migrations; use `db/seeds/demo.sql` for local-only seed content.

## Naming and Versioning Conventions

- Use a 6-digit, zero-padded, strictly increasing version prefix.
  - Example: `000002_add_device_vin_index.up.sql`
- Use lowercase snake_case for the description segment.
- Reserve one version number per logical change.
- Never edit an existing committed migration file.
  - If a migration is wrong, add a new migration that corrects it.

## Authoring Rules

- Make `up` migrations deterministic and safe to run once.
- Prefer additive changes first (new columns/tables/indexes), then cleanup in later migrations.
- For destructive operations (drop/rename/type changes), use phased changes to avoid breaking running services.
- Keep each migration focused and short; avoid bundling unrelated schema work.

## Rollback Policy

- Every `up` migration must have a matching `down` migration when technically feasible.
- `down` migrations must reverse objects in dependency-safe order (children before parents).
- Rollback is intended for pre-merge/local validation and emergency recovery windows.
- For shared environments with live data, prefer a forward-fix migration over destructive rollback.
- If a migration cannot be safely reversed, document that explicitly at the top of the `down` file.

## Validation Checklist (Before PR)

- Add both `up` and `down` files with the same version prefix.
- Start from a clean DB and confirm bootstrap succeeds:
  - `npm run db:migrate`
- Confirm demo workflow still works:
  - `npm run db:seed`
- Confirm E2E stack still boots with migrations:
  - `npm run test:e2e:backend`

## Ownership

Schema changes affect multiple services in a shared Postgres database. Treat migration reviews as cross-service changes and include API/service owners when tables used by both backends are modified.
