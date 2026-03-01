import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env['E2E_FRONTEND_URL'] ?? 'http://localhost:9100';
const javaApiUrl = process.env['E2E_JAVA_API_URL'] ?? 'http://127.0.0.1:19102';
const goApiUrl = process.env['E2E_GO_API_URL'] ?? 'http://127.0.0.1:19101';

export default defineConfig({
  testDir: './src',
  timeout: 60_000,
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? '50%' : undefined,
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  globalSetup: './src/global-setup.ts',
  globalTeardown: './src/global-teardown.ts',
  outputDir: '../../dist/.playwright/apps/frontend-e2e/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../dist/.playwright/apps/frontend-e2e/report', open: 'never' }],
  ],
  webServer: {
    command: `VITE_API_GO_URL=${goApiUrl} VITE_API_JAVA_URL=${javaApiUrl} pnpm nx run frontend:serve`,
    url: frontendUrl,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testMatch: ['**/*.ui.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});