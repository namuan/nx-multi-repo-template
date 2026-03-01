import { expect, test } from '@playwright/test';
import { getDevices, newJavaApiContext, registerTenantAndGetToken } from './support/api-client';

type Device = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  apiKey: string;
  status: 'online' | 'offline' | 'maintenance';
  createdAt: string;
};

type Alert = {
  id: string;
  deviceId: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
  createdAt: string;
};

async function createDevice(api: Awaited<ReturnType<typeof newJavaApiContext>>, token: string, name: string, type = 'truck') {
  const response = await api.post('/api/devices', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      type,
      driverName: `${name} Driver`,
      licensePlate: `${name.replace(/\s+/g, '-').toUpperCase()}-PLATE`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('dashboard-backed Java APIs', () => {
  test('returns well-formed device data', async () => {
    const api = await newJavaApiContext();

    try {
      const { token, tenantId } = await registerTenantAndGetToken(api);

      await createDevice(api, token, 'E2E Device One', 'truck');
      await createDevice(api, token, 'E2E Device Two', 'van');
      await createDevice(api, token, 'E2E Device Three', 'car');

      const devices = (await getDevices(api, token)) as Device[];

      expect(devices.length).toBe(3);

      const ids = new Set(devices.map((device) => device.id));
      expect(ids.size).toBe(devices.length);

      const tenantIds = new Set(devices.map((device) => device.tenantId));
      expect(tenantIds.size).toBe(1);
      expect(tenantIds.has(tenantId)).toBeTruthy();

      for (const device of devices) {
        expect(device.id).toMatch(/^[0-9a-fA-F-]{36}$/);
        expect(device.tenantId).toMatch(/^[0-9a-fA-F-]{36}$/);
        expect(device.name.trim().length).toBeGreaterThan(0);
        expect(device.type.trim().length).toBeGreaterThan(0);
        expect(device.apiKey.trim().length).toBeGreaterThan(0);
        expect(['online', 'offline', 'maintenance']).toContain(device.status);
        expect(Number.isNaN(Date.parse(device.createdAt))).toBeFalsy();
      }

      const statsResponse = await api.get('/api/devices/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(statsResponse.ok()).toBeTruthy();

      const stats = (await statsResponse.json()) as { total: number; online: number; offline: number };
      expect(stats.total).toBe(devices.length);
      expect(stats.online + stats.offline).toBe(stats.total);
    } finally {
      await api.dispose();
    }
  });

  test('returns well-formed unacknowledged alerts', async () => {
    const api = await newJavaApiContext();

    try {
      const { token } = await registerTenantAndGetToken(api);

      const alertsResponse = await api.get('/api/alerts/unacknowledged', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(alertsResponse.ok()).toBeTruthy();

      const alerts = (await alertsResponse.json()) as Alert[];
      expect(Array.isArray(alerts)).toBeTruthy();
      expect(alerts.length).toBe(0);

      for (const alert of alerts) {
        expect(alert.id).toMatch(/^[0-9a-fA-F-]{36}$/);
        expect(alert.deviceId).toMatch(/^[0-9a-fA-F-]{36}$/);
        expect(alert.type.trim().length).toBeGreaterThan(0);
        expect(alert.message.trim().length).toBeGreaterThan(0);
        expect(['info', 'warning', 'critical']).toContain(alert.severity);
        expect(alert.acknowledged).toBeFalsy();
        expect(Number.isNaN(Date.parse(alert.createdAt))).toBeFalsy();
      }
    } finally {
      await api.dispose();
    }
  });

  test('unacknowledged alert count matches alert list size', async () => {
    const api = await newJavaApiContext();

    try {
      const { token } = await registerTenantAndGetToken(api);

      const alertsResponse = await api.get('/api/alerts/unacknowledged', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(alertsResponse.ok()).toBeTruthy();
      const alerts = (await alertsResponse.json()) as Alert[];

      const countResponse = await api.get('/api/alerts/count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(countResponse.ok()).toBeTruthy();
      const countBody = (await countResponse.json()) as { count: number };

      expect(countBody.count).toBe(alerts.length);
    } finally {
      await api.dispose();
    }
  });
});
