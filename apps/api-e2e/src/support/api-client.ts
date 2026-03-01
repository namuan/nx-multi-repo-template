import { APIRequestContext, request } from '@playwright/test';
import { JAVA_API_URL } from './env';

interface RegisterResponse {
  token: string;
  tenantId: string;
  email: string;
}

export interface Device {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  status: string;
  apiKey: string;
  createdAt: string;
}

export async function newJavaApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: JAVA_API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
}

export async function registerTenantAndGetToken(api: APIRequestContext): Promise<RegisterResponse> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const subdomain = `e2e-${suffix}`;
  const email = `e2e-${suffix}@example.test`;

  const response = await api.post('/api/auth/register', {
    data: {
      tenantName: `E2E Tenant ${suffix}`,
      subdomain,
      adminEmail: email,
      adminPassword: 'Demo123!',
      adminName: `E2E Admin ${suffix}`,
      primaryColor: '#3B82F6',
    },
  });

  if (!response.ok()) {
    throw new Error(`Register failed with status ${response.status()}`);
  }

  const body = (await response.json()) as RegisterResponse;
  return body;
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
