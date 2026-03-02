export const E2E_STACK_FILE = 'apps/api-e2e/docker-compose.e2e.yml';

export const JAVA_API_URL = process.env['E2E_JAVA_API_URL'] ?? 'http://127.0.0.1:19102';
export const GO_API_URL = process.env['E2E_GO_API_URL'] ?? 'http://127.0.0.1:19101';
export const PROMETHEUS_URL = process.env['E2E_PROMETHEUS_URL'] ?? 'http://127.0.0.1:19190';
export const GRAFANA_URL = process.env['E2E_GRAFANA_URL'] ?? 'http://127.0.0.1:19300';
export const GRAFANA_USER = process.env['E2E_GRAFANA_USER'] ?? 'admin';
export const GRAFANA_PASSWORD = process.env['E2E_GRAFANA_PASSWORD'] ?? 'admin';
