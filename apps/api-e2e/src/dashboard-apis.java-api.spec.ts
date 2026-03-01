import { expect, test } from '@playwright/test';
import { getDevices, loginAndGetToken, newJavaApiContext } from './support/api-client';

test('dashboard-backed Java APIs return tenant data', async () => {
  const api = await newJavaApiContext();

  try {
    const token = await loginAndGetToken(api);
    const devices = await getDevices(api, token);

    expect(devices.length).toBeGreaterThan(0);

    const alertsResponse = await api.get('/api/alerts/unacknowledged', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(alertsResponse.ok()).toBeTruthy();

    const statsResponse = await api.get('/api/devices/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(statsResponse.ok()).toBeTruthy();

    const stats = (await statsResponse.json()) as { total: number; online: number; offline: number };
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.online + stats.offline).toBe(stats.total);
  } finally {
    await api.dispose();
  }
});
