# Operational Runbook

## Deploy

```bash
helm upgrade --install frontend charts/frontend
helm upgrade --install api-go charts/api-go
helm upgrade --install api-java charts/api-java
```

For environment-specific values:

```bash
helm upgrade --install api-go charts/api-go -f charts/api-go/values-production.yaml
```

## Rollback

```bash
helm history api-go
helm rollback api-go <REVISION>
```

## Health Checks

- Frontend: `GET /`
- Go API: `GET /health`
- Java API: `GET /actuator/health`

## Debugging

```bash
kubectl get pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

## Local Stack

```bash
docker compose up --build
```

```bash
curl http://localhost:9101/health
curl http://localhost:9102/actuator/health
```
