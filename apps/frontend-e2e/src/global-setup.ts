import { APIRequestContext, request } from '@playwright/test';
import { GO_API_URL, JAVA_API_URL } from './support/env';
import { startStack } from './support/stack';

async function waitForHealth(apiRequest: APIRequestContext, url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await apiRequest.get(url, { timeout: 2_000 });
      if (response.ok()) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export default async function globalSetup(): Promise<void> {
  startStack();

  const apiRequest = await request.newContext();
  try {
    await waitForHealth(apiRequest, `${GO_API_URL}/health`, 120_000);
    await waitForHealth(apiRequest, `${JAVA_API_URL}/actuator/health`, 120_000);
  } finally {
    await apiRequest.dispose();
  }
}