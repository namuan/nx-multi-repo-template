---
name: debug-ci-failure
description: Diagnose and fix failing CI checks in this Nx polyglot monorepo. Use when asked to investigate GitHub Actions failures, pre-push issues, or failing affected lint/test/build targets.
---

# Debug CI Failure

Use this skill when CI or hook checks fail.

## 1) Identify failing stage quickly

Main workflow lives in `.github/workflows/ci.yml`.

Typical stages:

- affected lint/test/build
- coverage gates
- backend/frontend E2E jobs

## 2) Reproduce locally with matching commands

- `pnpm nx affected -t lint --base=<base> --head=HEAD`
- `pnpm nx affected -t test --base=<base> --head=HEAD`
- `pnpm nx affected -t build --base=<base> --head=HEAD`

Hook parity:

- `npm run hooks:run:pre-commit`
- `npm run hooks:run:pre-push`

## 3) Prefer targeted fixes first

- Re-run only the failing project target to iterate quickly.
- Avoid unrelated cleanup while stabilizing CI.

## 4) Validate root-cause resolution

- Re-run the previously failing target directly.
- Re-run the parent command (affected or hook) after fix.
- Confirm no new failures introduced.

## 5) Keep outputs actionable

- Include exact failed command, root cause, and the confirming command that now passes.
