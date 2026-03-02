---
applyTo: 'db/migrations/**/*.sql,db/init.sql,db/seeds/**/*.sql'
---

# Database Instructions

- Treat schema changes as cross-service changes shared by Go and Java APIs.
- Add schema updates as paired migration files: `NNNNNN_description.up.sql` and `NNNNNN_description.down.sql`.
- Follow `docs/db-migrations.md`: 6-digit increasing versions, snake_case descriptions, never edit committed migrations.
- Prefer additive, phased changes for compatibility; avoid breaking active services with destructive one-step changes.
- Validate with `npm run db:migrate`; use `npm run db:seed` only for local/demo seed workflows.
