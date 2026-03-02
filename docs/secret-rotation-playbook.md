# Secret Rotation Playbook

This playbook defines rotation cadence, procedures, validation, and rollback for production secrets used by backend services.

## Scope

This document covers:

- `JWT_SECRET` used by `apps/api-go` and `apps/api-java`
- Database credentials used by:
  - `DATABASE_URL` (`apps/api-go`)
  - `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` (`apps/api-java`)

## Ownership and Change Control

- **Primary owner:** Platform/DevOps on-call
- **Approver:** Backend tech lead or incident commander (emergency)
- **Execution window:** Prefer low-traffic maintenance window for JWT rotation
- **Tracking:** Open a ticket and link the deployment run + verification evidence

## Rotation Cadence

- **Scheduled rotation (all covered secrets):** every 90 days
- **Emergency rotation:** immediately (target start within 1 hour) after suspected leak, unauthorized access, or compromised CI/runtime credentials
- **Post-incident follow-up:** perform a second rotation within 24 hours after containment

## Preconditions

1. Confirm access to secret manager (or deployment secret source) and cluster namespace.
2. Confirm deploy permissions for `api-go` and `api-java`.
3. Confirm DB admin access for credential rotation.
4. Notify stakeholders of expected impact:
   - JWT rotation invalidates active sessions (users must sign in again).
   - DB credential rotation should be near-zero downtime when done in order below.

## Procedure A — Rotate JWT Secret (`JWT_SECRET`)

### Impact

- Current tokens become invalid after rollout completes.
- Users and API clients must obtain new tokens.

### Steps

1. Generate a new random secret (minimum 64 characters, high entropy).
2. Update secret source for both services with the **same** new `JWT_SECRET` value.
3. Deploy `api-go` and `api-java` in one maintenance window:
   - `helm upgrade --install api-go charts/api-go -f charts/api-go/values-production.yaml`
   - `helm upgrade --install api-java charts/api-java -f charts/api-java/values-production.yaml`
4. Wait for rollout readiness:
   - `kubectl rollout status deploy/api-go -n <namespace>`
   - `kubectl rollout status deploy/api-java -n <namespace>`
5. Validate:
   - `GET /health` (Go) and `GET /actuator/health` (Java)
   - Login flow (`POST /api/auth/login`) returns a new token
   - New token is accepted by Java protected endpoints and Go WebSocket auth path

## Procedure B — Rotate Database Credentials

### Recommended approach

Rotate password for existing DB user (for example `fleet_user`) first; rotate username only if required by policy.

### Steps

1. Generate a new DB password.
2. Apply DB-side change:
   - `ALTER ROLE fleet_user WITH PASSWORD '<new-password>';`
3. Update deployment secret source:
   - Go: update password inside `DATABASE_URL`
   - Java: update `SPRING_DATASOURCE_PASSWORD` (and `SPRING_DATASOURCE_USERNAME` if user changed)
4. Redeploy backends:
   - `helm upgrade --install api-go charts/api-go -f charts/api-go/values-production.yaml`
   - `helm upgrade --install api-java charts/api-java -f charts/api-java/values-production.yaml`
5. Validate connectivity:
   - Service health checks are green
   - Java login endpoint works
   - Go telemetry ingest endpoint accepts valid device-key requests

## Verification Checklist

- Rollouts completed successfully for both backend deployments.
- Health endpoints green for 5+ minutes.
- No authentication spikes (401/403) beyond expected JWT re-login window.
- No DB authentication errors in service logs.
- E2E smoke checks pass (`npm run test:e2e:backend` if needed for confidence).

## Rollback

If failures occur after rotation:

1. Restore previous secret values in secret source.
2. Re-run Helm deploys for `api-go` and `api-java`.
3. Confirm health endpoints and login flow recover.
4. Open incident record and schedule a corrected retry.

## Security Hygiene Notes

- Never commit real secret values into Git (`.env`, `config/env/*.env`, charts values).
- Keep local demo/test values separate from staging/production secrets.
- Rotate secrets immediately when team members with secret access leave or change roles.
