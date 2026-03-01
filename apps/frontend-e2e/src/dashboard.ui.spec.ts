import { expect, test } from '@playwright/test';
import { JAVA_API_URL } from './support/env';

type RegisterResponse = {
  token: string;
  email: string;
  tenantName: string;
};

async function registerTenantAndGetAuth(request: Parameters<typeof test>[0]['request']): Promise<{
  token: string;
  email: string;
  password: string;
  tenantName: string;
}> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  const password = 'Demo123!';

  const response = await request.post(`${JAVA_API_URL}/api/auth/register`, {
    data: {
      tenantName: `Frontend E2E Tenant ${suffix}`,
      subdomain: `frontend-e2e-${suffix}`,
      adminEmail: `frontend-e2e-${suffix}@example.test`,
      adminPassword: password,
      adminName: `Frontend E2E Admin ${suffix}`,
      primaryColor: '#3B82F6',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as RegisterResponse;

  return {
    token: body.token,
    email: body.email,
    password,
    tenantName: body.tenantName,
  };
}

async function createDevice(
  request: Parameters<typeof test>[0]['request'],
  token: string,
  name: string,
  type: 'truck' | 'van' | 'car'
): Promise<void> {
  const response = await request.post(`${JAVA_API_URL}/api/devices`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      type,
      driverName: `${name} Driver`,
      licensePlate: `${name.replace(/\s+/g, '-').toUpperCase()}-PLATE`,
    },
  });

  expect(response.ok()).toBeTruthy();
}

test('redirects unauthenticated dashboard access to login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'FleetPilot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('registered user can sign in and see dashboard stats', async ({ page, request }) => {
  const auth = await registerTenantAndGetAuth(request);
  await createDevice(request, auth.token, 'Frontend E2E Device One', 'truck');
  await createDevice(request, auth.token, 'Frontend E2E Device Two', 'van');

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(auth.email);
  await page.locator('input[type="password"]').fill(auth.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('.stat-card', { hasText: 'Total devices' }).locator('.stat-value')).toHaveText('2');
  await expect(page.locator('.stat-card', { hasText: 'Open alerts' }).locator('.stat-value')).toHaveText('0');
  await expect(page.locator('.tenant-chip')).toContainText(auth.tenantName);
});