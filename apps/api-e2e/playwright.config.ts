import { defineConfig } from '@playwright/test';

const javaApiUrl = process.env['JAVA_API_URL'] ?? 'http://127.0.0.1:19102';
const goApiUrl = process.env['GO_API_URL'] ?? 'http://127.0.0.1:19101';

export default defineConfig({
  testDir: './src',
  timeout: 60_000,
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? '50%' : undefined,
  use: {
    trace: 'on-first-retry',
  },
  globalSetup: './src/global-setup.ts',
  globalTeardown: './src/global-teardown.ts',
  outputDir: '../../dist/.playwright/apps/api-e2e/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../dist/.playwright/apps/api-e2e/report', open: 'never' }],
  ],
  projects: [
    {
      name: 'java-api',
      testMatch: ['**/*.java-api.spec.ts'],
      use: { baseURL: javaApiUrl },
    },
    {
      name: 'go-api',
      testMatch: ['**/*.go-api.spec.ts'],
      use: { baseURL: goApiUrl },
    },
    {
      name: 'cross-service',
      testMatch: ['**/*.cross-service.spec.ts'],
    },
  ],
});
