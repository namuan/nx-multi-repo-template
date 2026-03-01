export const E2E_STACK_FILE = 'apps/api-e2e/docker-compose.e2e.yml';

export const FRONTEND_URL = process.env['E2E_FRONTEND_URL'] ?? 'http://localhost:9100';
export const JAVA_API_URL = process.env['E2E_JAVA_API_URL'] ?? 'http://127.0.0.1:19102';
export const GO_API_URL = process.env['E2E_GO_API_URL'] ?? 'http://127.0.0.1:19101';