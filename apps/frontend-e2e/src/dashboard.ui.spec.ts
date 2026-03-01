import { expect, test } from '@playwright/test';
import { GO_API_URL, JAVA_API_URL } from './support/env';

type RegisterResponse = {
  token: string;
  email: string;
  tenantName: string;
  tenantId: string;
};

type DeviceResponse = {
  id: string;
  tenantId: string;
  name: string;
  apiKey: string;
};

async function registerTenantAndGetAuth(request: Parameters<typeof test>[0]['request']): Promise<{
  token: string;
  email: string;
  password: string;
  tenantName: string;
  tenantId: string;
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
    tenantId: body.tenantId,
  };
}

async function createDevice(
  request: Parameters<typeof test>[0]['request'],
  token: string,
  name: string,
  type: 'truck' | 'van' | 'car'
): Promise<DeviceResponse> {
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
  return (await response.json()) as DeviceResponse;
}

async function createSpeedRule(
  request: Parameters<typeof test>[0]['request'],
  token: string,
  threshold: number
): Promise<void> {
  const response = await request.post(`${JAVA_API_URL}/api/alert-rules`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `Speed limit ${threshold} km/h`,
      type: 'speed',
      threshold,
      severity: 'critical',
    },
  });

  expect(response.status()).toBe(201);
}

async function sendTelemetryEvent(
  request: Parameters<typeof test>[0]['request'],
  deviceApiKey: string,
  speed: number
): Promise<void> {
  const response = await request.post(`${GO_API_URL}/api/devices/telemetry`, {
    headers: { 'X-Device-Key': deviceApiKey },
    data: {
      lat: 37.7749,
      lng: -122.4194,
      speed,
      heading: 90,
      altitude: 12,
      recorded_at: new Date().toISOString(),
      metadata: { source: 'frontend-e2e' },
    },
  });

  expect(response.status()).toBe(202);
}

async function getUnacknowledgedAlerts(
  request: Parameters<typeof test>[0]['request'],
  token: string
): Promise<Array<{ id: string; message: string }>> {
  const response = await request.get(`${JAVA_API_URL}/api/alerts/unacknowledged`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Array<{ id: string; message: string }>;
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

test('dashboard shows incoming unacknowledged alerts', async ({ page, request }) => {
  const auth = await registerTenantAndGetAuth(request);
  const device = await createDevice(request, auth.token, 'Frontend E2E Alert Device', 'truck');
  const threshold = 80;
  const observedSpeed = 95;

  await createSpeedRule(request, auth.token, threshold);
  await sendTelemetryEvent(request, device.apiKey, observedSpeed);

  const expectedAlertMessage = `${device.name} exceeded ${threshold} km/h (recorded: ${observedSpeed} km/h)`;

  await expect
    .poll(
      async () => {
        const alerts = await getUnacknowledgedAlerts(request, auth.token);
        return alerts.length;
      },
      { timeout: 20_000, intervals: [500, 1_000, 1_000, 2_000] }
    )
    .toBe(1);

  const unacknowledgedAlerts = await getUnacknowledgedAlerts(request, auth.token);
  expect(unacknowledgedAlerts[0]?.message).toBe(expectedAlertMessage);

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(auth.email);
  await page.locator('input[type="password"]').fill(auth.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  const dashboardAlertCount = page.locator('.stat-card', { hasText: 'Open alerts' }).locator('.stat-value');
  await expect(dashboardAlertCount).toHaveText('1');
  await expect(page.locator('.alert-item')).toHaveCount(1);
  await expect(page.getByText(expectedAlertMessage)).toBeVisible();
});