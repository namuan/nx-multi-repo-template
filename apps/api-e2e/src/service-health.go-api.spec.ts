import { expect, test } from '@playwright/test';
import { GO_API_URL } from './support/env';

test('go api is healthy', async ({ request }) => {
  const response = await request.get(`${GO_API_URL}/health`);
  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as { status: string; service: string };
  expect(body.status).toBe('ok');
  expect(body.service).toBe('api-go');
});
