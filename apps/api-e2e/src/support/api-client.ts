import { APIRequestContext, request } from '@playwright/test';
import { E2E_EMAIL, E2E_PASSWORD, JAVA_API_URL, SIMULATOR_DEVICE_NAMES } from './env';

export interface Device {
  id: string;
  name: string;
  status: string;
  apiKey: string;
}

export async function newJavaApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: JAVA_API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
}

export async function loginAndGetToken(api: APIRequestContext): Promise<string> {
  const response = await api.post('/api/auth/login', {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });

  if (!response.ok()) {
    throw new Error(`Login failed with status ${response.status()}`);
  }

  const body = (await response.json()) as { token: string };
  return body.token;
}

export async function getDevices(api: APIRequestContext, token: string): Promise<Device[]> {
  const response = await api.get('/api/devices', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`/api/devices failed with status ${response.status()}`);
  }

  return (await response.json()) as Device[];
}

export function selectSimulatorDevice(devices: Device[]): Device {
  const preferred = devices.find((device) => SIMULATOR_DEVICE_NAMES.has(device.name));
  if (preferred) {
    return preferred;
  }

  if (devices.length === 0) {
    throw new Error('No devices found for test tenant');
  }

  return devices[0];
}

export function latestRecordedAtEpoch(events: Array<{ recordedAt?: string }>): number {
  const value = events[0]?.recordedAt;
  if (!value) {
    return 0;
  }

  return Math.floor(new Date(value).getTime() / 1000);
}
