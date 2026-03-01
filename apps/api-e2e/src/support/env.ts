export const E2E_STACK_FILE = 'apps/api-e2e/docker-compose.e2e.yml';

export const JAVA_API_URL = process.env['JAVA_API_URL'] ?? 'http://127.0.0.1:19102';
export const GO_API_URL = process.env['GO_API_URL'] ?? 'http://127.0.0.1:19101';

export const E2E_EMAIL = process.env['E2E_EMAIL'] ?? 'alice@acme.com';
export const E2E_PASSWORD = process.env['E2E_PASSWORD'] ?? 'Demo123!';

export const SIMULATOR_DEVICE_NAMES = new Set([
  'Truck Alpha-1',
  'Van Beta-2',
  'Truck Gamma-3',
  'Unit SW-101',
  'Unit SW-102',
  'Unit SW-103',
  'Moto NYC-1',
  'Van NYC-2',
]);
