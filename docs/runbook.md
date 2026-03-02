# Operational Runbook

This runbook is for staging/production-style cluster operations.

For local development and Docker/tmux workflows, use `LOCAL_DEV.md`.

For credential lifecycle procedures, use `docs/secret-rotation-playbook.md`.

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
- Go API metrics: `GET /metrics`
- Java API metrics: `GET /actuator/prometheus`

Use service-level checks plus pod readiness:

```bash
kubectl get pods -n <namespace>
kubectl get deploy -n <namespace>
```

## Metrics Collection (Prometheus Operator)

Both API Helm charts support optional monitoring configuration.

Enable ServiceMonitor resources during deploy:

```bash
helm upgrade --install api-go charts/api-go \
	--set monitoring.serviceMonitor.enabled=true

helm upgrade --install api-java charts/api-java \
	--set monitoring.serviceMonitor.enabled=true
```

If your Prometheus stack selects ServiceMonitors by label, pass additional labels:

```bash
helm upgrade --install api-go charts/api-go \
	--set monitoring.serviceMonitor.enabled=true \
	--set monitoring.serviceMonitor.additionalLabels.release=prometheus
```

Optional scrape annotations are also supported through `monitoring.serviceAnnotations` and `monitoring.podAnnotations` in each chart values file.

## Debugging

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```
