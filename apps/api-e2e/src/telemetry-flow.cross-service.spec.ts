import { expect, test } from '@playwright/test';
import {
  getDevices,
  latestRecordedAtEpoch,
  loginAndGetToken,
  newJavaApiContext,
  selectSimulatorDevice,
} from './support/api-client';

test('simulator events are visible through Java telemetry API used by UI', async () => {
  const api = await newJavaApiContext();

  try {
    const token = await loginAndGetToken(api);
    const devices = await getDevices(api, token);
    const selectedDevice = selectSimulatorDevice(devices);

    const baselineResponse = await api.get(`/api/devices/${selectedDevice.id}/telemetry`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(baselineResponse.ok()).toBeTruthy();

    const baselineEvents = (await baselineResponse.json()) as Array<{ recordedAt?: string }>;
    const baselineEpoch = latestRecordedAtEpoch(baselineEvents);

    await expect
      .poll(
        async () => {
          const telemetryResponse = await api.get(`/api/devices/${selectedDevice.id}/telemetry`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!telemetryResponse.ok()) {
            return 0;
          }

          const events = (await telemetryResponse.json()) as Array<{ recordedAt?: string }>;
          return latestRecordedAtEpoch(events);
        },
        {
          timeout: 75_000,
          intervals: [2_000, 2_000, 3_000, 3_000, 5_000],
        }
      )
      .toBeGreaterThan(baselineEpoch);
  } finally {
    await api.dispose();
  }
});
