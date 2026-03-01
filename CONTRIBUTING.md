# Contributing

## Branch Naming

- Feature: `feature/<short-description>`
- Fix: `fix/<short-description>`
- Chore: `chore/<short-description>`

## Commit Message Style

Follow conventional commits:

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`

## Local Validation

Run before opening a PR:

```bash
pnpm exec nx run-many -t lint
pnpm exec nx run-many -t test
pnpm exec nx run-many -t build
```

Use JDK 21 for Java tasks:

```bash
sdk use java 21.0.3-tem
```

## Release Flow

- Merge to `main` after review and green CI.
- Build artifacts and container images are produced in CI.
- Helm values should use explicit image tags (no `latest`).
