import axios from 'axios';

const GO_URL = import.meta.env.VITE_API_GO_URL ?? 'http://localhost:8081';
const JAVA_URL = import.meta.env.VITE_API_JAVA_URL ?? 'http://localhost:8082';

function makeClient(baseURL: string) {
  const client = axios.create({ baseURL, timeout: 10_000 });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('fleet_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('fleet_token');
        localStorage.removeItem('fleet_user');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
  );

  return client;
}

export const goApi = makeClient(GO_URL);
export const javaApi = makeClient(JAVA_URL);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isPlatformAdmin: boolean;
  tenantId: string;
  tenantName: string;
  primaryColor: string;
  logoUrl?: string;
}

export interface Device {
  id: string;
  tenantId: string;
  name: string;
  type: 'truck' | 'van' | 'motorcycle' | 'car' | 'drone';
  apiKey: string;
  status: 'online' | 'offline' | 'maintenance';
  lastLat?: number;
  lastLng?: number;
  lastSpeed?: number;
  lastHeading?: number;
  lastSeen?: string;
  driverName?: string;
  licensePlate?: string;
  vin?: string;
  createdAt: string;
}

export interface TelemetryEvent {
  id: string;
  deviceId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  fuelLevel?: number;
  engineTemp?: number;
  odometer?: number;
  recordedAt: string;
}

export interface Alert {
  id: string;
  deviceId: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: string;
  threshold?: number;
  geofenceId?: string;
  severity: string;
  active: boolean;
  createdAt: string;
}

export interface Geofence {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  color: string;
  active: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  primaryColor: string;
  logoUrl?: string;
  plan: string;
  status: string;
  maxDevices: number;
  retentionDays: number;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    javaApi.post<LoginResponse>('/api/auth/login', { email, password }),
  register: (data: {
    tenantName: string; subdomain: string;
    adminEmail: string; adminPassword: string; adminName: string; primaryColor?: string;
  }) => javaApi.post<LoginResponse>('/api/auth/register', data),
};

// ── Devices ───────────────────────────────────────────────────────────────────
export const devices = {
  list: () => javaApi.get<Device[]>('/api/devices'),
  get: (id: string) => javaApi.get<Device>(`/api/devices/${id}`),
  create: (data: { name: string; type?: string; driverName?: string; licensePlate?: string; vin?: string }) =>
    javaApi.post<Device>('/api/devices', data),
  update: (id: string, data: object) => javaApi.put<Device>(`/api/devices/${id}`, data),
  delete: (id: string) => javaApi.delete(`/api/devices/${id}`),
  stats: () => javaApi.get<{ total: number; online: number; offline: number }>('/api/devices/stats'),
  telemetry: (id: string) => javaApi.get<TelemetryEvent[]>(`/api/devices/${id}/telemetry`),
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alerts = {
  list: (page = 0, size = 20) => javaApi.get<PageResponse<Alert>>(`/api/alerts?page=${page}&size=${size}`),
  unacknowledged: () => javaApi.get<Alert[]>('/api/alerts/unacknowledged'),
  count: () => javaApi.get<{ count: number }>('/api/alerts/count'),
  acknowledge: (id: string) => javaApi.post<Alert>(`/api/alerts/${id}/acknowledge`),
  rules: () => javaApi.get<AlertRule[]>('/api/alert-rules'),
  createRule: (data: object) => javaApi.post<AlertRule>('/api/alert-rules', data),
  toggleRule: (id: string, active: boolean) =>
    javaApi.patch<AlertRule>(`/api/alert-rules/${id}/toggle?active=${active}`),
  deleteRule: (id: string) => javaApi.delete(`/api/alert-rules/${id}`),
};

// ── Geofences ─────────────────────────────────────────────────────────────────
export const geofences = {
  list: () => javaApi.get<Geofence[]>('/api/geofences'),
  create: (data: object) => javaApi.post<Geofence>('/api/geofences', data),
  update: (id: string, data: object) => javaApi.put<Geofence>(`/api/geofences/${id}`, data),
  delete: (id: string) => javaApi.delete(`/api/geofences/${id}`),
};

// ── Tenant ────────────────────────────────────────────────────────────────────
export const tenant = {
  me: () => javaApi.get<{ tenant: Tenant; stats: { deviceCount: number; userCount: number } }>('/api/tenants/me'),
  update: (data: { name?: string; logoUrl?: string; primaryColor?: string }) =>
    javaApi.put<Tenant>('/api/tenants/me', data),
  users: () => javaApi.get('/api/users'),
  auditLogs: (page = 0) => javaApi.get(`/api/audit-logs?page=${page}`),
  // Platform admin
  allTenants: (page = 0) => javaApi.get<PageResponse<Tenant>>(`/api/admin/tenants?page=${page}`),
  suspend: (id: string) => javaApi.post(`/api/admin/tenants/${id}/suspend`),
};
