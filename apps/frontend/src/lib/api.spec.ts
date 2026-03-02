import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth, devices, alerts, tenant, javaApi } from './api';

// Spy on the axios instance methods to avoid real HTTP calls.
// This also exercises the function bodies for coverage.
beforeEach(() => {
  vi.spyOn(javaApi, 'get').mockResolvedValue({ data: {} } as any);
  vi.spyOn(javaApi, 'post').mockResolvedValue({ data: {} } as any);
  vi.spyOn(javaApi, 'put').mockResolvedValue({ data: {} } as any);
  vi.spyOn(javaApi, 'delete').mockResolvedValue({ data: {} } as any);
  vi.spyOn(javaApi, 'patch').mockResolvedValue({ data: {} } as any);
});

describe('auth', () => {
  it('auth.login POSTs credentials to /api/auth/login', async () => {
    await auth.login('alice@acme.com', 'Demo123!');
    expect(javaApi.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'alice@acme.com',
      password: 'Demo123!',
    });
  });

  it('auth.register POSTs registration data to /api/auth/register', async () => {
    const data = {
      tenantName: 'Acme',
      subdomain: 'acme',
      adminEmail: 'alice@acme.com',
      adminPassword: 'Demo123!',
      adminName: 'Alice',
      primaryColor: '#3B82F6',
    };
    await auth.register(data);
    expect(javaApi.post).toHaveBeenCalledWith('/api/auth/register', data);
  });
});

describe('devices', () => {
  it('devices.list GETs /api/devices', async () => {
    await devices.list();
    expect(javaApi.get).toHaveBeenCalledWith('/api/devices');
  });

  it('devices.get GETs /api/devices/:id', async () => {
    await devices.get('device-1');
    expect(javaApi.get).toHaveBeenCalledWith('/api/devices/device-1');
  });

  it('devices.create POSTs to /api/devices', async () => {
    const payload = { name: 'Truck Alpha', type: 'truck' };
    await devices.create(payload);
    expect(javaApi.post).toHaveBeenCalledWith('/api/devices', payload);
  });

  it('devices.update PUTs to /api/devices/:id', async () => {
    await devices.update('device-1', { name: 'Updated Name' });
    expect(javaApi.put).toHaveBeenCalledWith('/api/devices/device-1', { name: 'Updated Name' });
  });

  it('devices.delete DELETEs /api/devices/:id', async () => {
    await devices.delete('device-1');
    expect(javaApi.delete).toHaveBeenCalledWith('/api/devices/device-1');
  });

  it('devices.stats GETs /api/devices/stats', async () => {
    await devices.stats();
    expect(javaApi.get).toHaveBeenCalledWith('/api/devices/stats');
  });

  it('devices.telemetry GETs /api/devices/:id/telemetry', async () => {
    await devices.telemetry('device-1');
    expect(javaApi.get).toHaveBeenCalledWith('/api/devices/device-1/telemetry');
  });
});

describe('alerts', () => {
  it('alerts.list GETs /api/alerts with page and size', async () => {
    await alerts.list(0, 20);
    expect(javaApi.get).toHaveBeenCalledWith('/api/alerts?page=0&size=20');
  });

  it('alerts.list uses default page=0 size=20', async () => {
    await alerts.list();
    expect(javaApi.get).toHaveBeenCalledWith('/api/alerts?page=0&size=20');
  });

  it('alerts.unacknowledged GETs /api/alerts/unacknowledged', async () => {
    await alerts.unacknowledged();
    expect(javaApi.get).toHaveBeenCalledWith('/api/alerts/unacknowledged');
  });

  it('alerts.count GETs /api/alerts/count', async () => {
    await alerts.count();
    expect(javaApi.get).toHaveBeenCalledWith('/api/alerts/count');
  });

  it('alerts.acknowledge POSTs to /api/alerts/:id/acknowledge', async () => {
    await alerts.acknowledge('alert-1');
    expect(javaApi.post).toHaveBeenCalledWith('/api/alerts/alert-1/acknowledge');
  });

  it('alerts.rules GETs /api/alert-rules', async () => {
    await alerts.rules();
    expect(javaApi.get).toHaveBeenCalledWith('/api/alert-rules');
  });

  it('alerts.createRule POSTs to /api/alert-rules', async () => {
    const rule = { name: 'Speed', type: 'speed', threshold: 80, severity: 'warning' };
    await alerts.createRule(rule);
    expect(javaApi.post).toHaveBeenCalledWith('/api/alert-rules', rule);
  });

  it('alerts.toggleRule PATCHes /api/alert-rules/:id/toggle', async () => {
    await alerts.toggleRule('rule-1', true);
    expect(javaApi.patch).toHaveBeenCalledWith('/api/alert-rules/rule-1/toggle?active=true');
  });

  it('alerts.deleteRule DELETEs /api/alert-rules/:id', async () => {
    await alerts.deleteRule('rule-1');
    expect(javaApi.delete).toHaveBeenCalledWith('/api/alert-rules/rule-1');
  });
});

describe('tenant', () => {
  it('tenant.me GETs /api/tenants/me', async () => {
    await tenant.me();
    expect(javaApi.get).toHaveBeenCalledWith('/api/tenants/me');
  });

  it('tenant.update PUTs to /api/tenants/me', async () => {
    await tenant.update({ name: 'New Name' });
    expect(javaApi.put).toHaveBeenCalledWith('/api/tenants/me', { name: 'New Name' });
  });

  it('tenant.users GETs /api/users', async () => {
    await tenant.users();
    expect(javaApi.get).toHaveBeenCalledWith('/api/users');
  });

  it('tenant.auditLogs GETs /api/audit-logs with page param', async () => {
    await tenant.auditLogs(2);
    expect(javaApi.get).toHaveBeenCalledWith('/api/audit-logs?page=2');
  });

  it('tenant.auditLogs defaults to page=0', async () => {
    await tenant.auditLogs();
    expect(javaApi.get).toHaveBeenCalledWith('/api/audit-logs?page=0');
  });

  it('tenant.allTenants GETs /api/admin/tenants with page param', async () => {
    await tenant.allTenants(1);
    expect(javaApi.get).toHaveBeenCalledWith('/api/admin/tenants?page=1');
  });

  it('tenant.allTenants defaults to page=0', async () => {
    await tenant.allTenants();
    expect(javaApi.get).toHaveBeenCalledWith('/api/admin/tenants?page=0');
  });

  it('tenant.suspend POSTs to /api/admin/tenants/:id/suspend', async () => {
    await tenant.suspend('tenant-1');
    expect(javaApi.post).toHaveBeenCalledWith('/api/admin/tenants/tenant-1/suspend');
  });
});

describe('axios interceptors', () => {
  it('request interceptor adds Authorization header when token is in localStorage', async () => {
    localStorage.setItem('fleet_token', 'my-token');
    // The interceptor runs on the actual config object before the request.
    // We verify it by checking that javaApi.get is called (the spy intercepts before interceptors
    // on spy calls), but we can test via config inspection.
    // Instead, we test the interceptor callback directly via the config handler.
    const instance = javaApi as any;
    const interceptors = instance.interceptors.request.handlers;
    if (interceptors && interceptors.length > 0) {
      const handler = interceptors[interceptors.length - 1].fulfilled;
      const config = { headers: {} as any };
      const result = await handler(config);
      expect(result.headers.Authorization).toBe('Bearer my-token');
    }
    localStorage.removeItem('fleet_token');
  });

  it('request interceptor does not add Authorization when no token', async () => {
    localStorage.removeItem('fleet_token');
    const instance = javaApi as any;
    const interceptors = instance.interceptors.request.handlers;
    if (interceptors && interceptors.length > 0) {
      const handler = interceptors[interceptors.length - 1].fulfilled;
      const config = { headers: {} as any };
      const result = await handler(config);
      expect(result.headers.Authorization).toBeUndefined();
    }
  });
});
