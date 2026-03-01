# Operational Runbook

This runbook is for staging/production-style cluster operations.

For local development and Docker/tmux workflows, use `LOCAL_DEV.md`.

## Deploy

```bash
helm upgrade --install frontend charts/frontend
helm upgrade --install api-go charts/api-go
helm upgrade --install api-java charts/api-java
```

For environment-specific values:

```bash
helm upgrade --install frontend charts/frontend -f charts/frontend/values-production.yaml
helm upgrade --install api-go charts/api-go -f charts/api-go/values-production.yaml
helm upgrade --install api-java charts/api-java -f charts/api-java/values-production.yaml
```

## Rollback

```bash
helm history api-go
helm rollback api-go <REVISION>
```

## Health Checks

- Frontend service: `GET /`
- Go API service: `GET /health`
- Java API service: `GET /actuator/health`

Use service-level checks plus pod readiness:

```bash
kubectl get pods -n <namespace>
kubectl get deploy -n <namespace>
```

## Debugging

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```
