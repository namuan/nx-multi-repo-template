import { expect, test } from '@playwright/test';
import { getDevices, newGoApiContext, newJavaApiContext, registerTenantAndGetToken } from './support/api-client';

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
  ruleId?: string;
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

async function createSpeedRule(api: Awaited<ReturnType<typeof newJavaApiContext>>, token: string, threshold: number) {
  const response = await api.post('/api/alert-rules', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `Speed limit ${threshold} km/h`,
      type: 'speed',
      threshold,
      severity: 'critical',
    },
  });

  expect(response.status()).toBe(201);
  return response.json();
}

async function sendTelemetry(api: Awaited<ReturnType<typeof newGoApiContext>>, deviceApiKey: string, speed: number) {
  const response = await api.post('/api/devices/telemetry', {
    headers: { 'X-Device-Key': deviceApiKey },
    data: {
      lat: 37.7749,
      lng: -122.4194,
      speed,
      heading: 90,
      altitude: 12,
      recorded_at: new Date().toISOString(),
      metadata: { source: 'api-e2e' },
    },
  });

  expect(response.status()).toBe(202);
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

  test('generates and acknowledges alerts from speed rule + telemetry', async () => {
    const javaApi = await newJavaApiContext();
    const goApi = await newGoApiContext();

    try {
      const { token } = await registerTenantAndGetToken(javaApi);
      const device = (await createDevice(javaApi, token, 'E2E Alert Device', 'truck')) as Device;

      const threshold = 80;
      const observedSpeed = 95;
      const rule = (await createSpeedRule(javaApi, token, threshold)) as { id: string };

      await sendTelemetry(goApi, device.apiKey, observedSpeed);

      await expect
        .poll(
          async () => {
            const alertsResponse = await javaApi.get('/api/alerts/unacknowledged', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!alertsResponse.ok()) {
              return 0;
            }

            const alerts = (await alertsResponse.json()) as Alert[];
            return alerts.length;
          },
          { timeout: 20_000, intervals: [500, 1_000, 1_000, 2_000] }
        )
        .toBe(1);

      const alertsResponse = await javaApi.get('/api/alerts/unacknowledged', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(alertsResponse.ok()).toBeTruthy();
      const alerts = (await alertsResponse.json()) as Alert[];

      expect(alerts.length).toBe(1);
      expect(alerts[0]?.ruleId).toBe(rule.id);
      expect(alerts[0]?.deviceId).toBe(device.id);
      expect(alerts[0]?.type).toBe('speed');
      expect(alerts[0]?.severity).toBe('critical');

      const expectedMessage = `${device.name} exceeded ${threshold} km/h (recorded: ${observedSpeed} km/h)`;
      expect(alerts[0]?.message).toBe(expectedMessage);

      const countResponse = await javaApi.get('/api/alerts/count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(countResponse.ok()).toBeTruthy();
      const countBody = (await countResponse.json()) as { count: number };
      expect(countBody.count).toBe(1);

      const acknowledgeResponse = await javaApi.post(`/api/alerts/${alerts[0]?.id}/acknowledge`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(acknowledgeResponse.ok()).toBeTruthy();

      await expect
        .poll(
          async () => {
            const response = await javaApi.get('/api/alerts/count', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok()) {
              return -1;
            }
            const body = (await response.json()) as { count: number };
            return body.count;
          },
          { timeout: 10_000, intervals: [300, 500, 1_000] }
        )
        .toBe(0);
    } finally {
      await goApi.dispose();
      await javaApi.dispose();
    }
  });
});
