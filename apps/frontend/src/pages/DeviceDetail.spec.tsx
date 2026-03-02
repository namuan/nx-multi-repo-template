import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeviceDetail from './DeviceDetail';
import { devices as deviceApi, alerts } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  devices: { get: vi.fn(), telemetry: vi.fn() },
  alerts: { count: vi.fn() },
}));

// Recharts uses ResizeObserver which isn't in jsdom — provide a stub
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockUser = {
  userId: 'u1',
  email: 'alice@acme.com',
  fullName: 'Alice',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 't1',
  tenantName: 'Acme',
  primaryColor: '#3B82F6',
};

const mockDevice = {
  id: 'd1',
  name: 'Truck Alpha',
  type: 'truck',
  status: 'online',
  tenantId: 't1',
  apiKey: 'key1',
  driverName: 'Bob Smith',
  licensePlate: 'CA-123-456',
  vin: '1HGCM82633A123456',
  lastSpeed: 65.3,
  lastLat: 37.7749,
  lastLng: -122.4194,
  createdAt: '2024-01-01',
};

const mockTelemetry = [
  {
    id: 'tel1',
    deviceId: 'd1',
    lat: 37.77,
    lng: -122.42,
    speed: 60,
    heading: 90,
    altitude: 10,
    fuelLevel: 75,
    engineTemp: 90,
    recordedAt: new Date().toISOString(),
  },
  {
    id: 'tel2',
    deviceId: 'd1',
    lat: 37.78,
    lng: -122.43,
    speed: 55,
    heading: 180,
    altitude: 12,
    fuelLevel: 70,
    engineTemp: 92,
    recordedAt: new Date(Date.now() - 60000).toISOString(),
  },
];

function renderDeviceDetail(deviceId = 'd1') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/devices/${deviceId}`]}>
        <Routes>
          <Route path="/devices/:id" element={<DeviceDetail />} />
          <Route path="/devices" element={<div>Devices List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
  vi.mocked(deviceApi.get).mockResolvedValue({ data: mockDevice } as any);
  vi.mocked(deviceApi.telemetry).mockResolvedValue({ data: [] } as any);
  vi.mocked(alerts.count).mockResolvedValue({ data: { count: 0 } } as any);
});

describe('DeviceDetail', () => {
  it('renders device name as page title', async () => {
    renderDeviceDetail();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Truck Alpha' })).toBeTruthy());
  });

  it('renders Back to devices link', async () => {
    renderDeviceDetail();
    await waitFor(() => expect(screen.getByRole('link', { name: /Back to devices/ })).toBeTruthy());
  });

  it('navigates to devices list when back link is clicked', async () => {
    renderDeviceDetail();
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Back to devices/ });
      link.click();
    });
    await waitFor(() => expect(screen.getByText('Devices List')).toBeTruthy());
  });

  it('shows device status in stat cards and device info', async () => {
    renderDeviceDetail();
    // 'Status' appears in stat card label and device info row label
    await waitFor(() => {
      expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('online').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows device speed in stat cards', async () => {
    renderDeviceDetail();
    await waitFor(() => {
      expect(screen.getByText('Speed')).toBeTruthy();
      expect(screen.getByText('65.3 km/h')).toBeTruthy();
    });
  });

  it('shows device location in stat cards', async () => {
    renderDeviceDetail();
    await waitFor(() => {
      expect(screen.getByText('Location')).toBeTruthy();
      expect(screen.getByText('37.7749, -122.4194')).toBeTruthy();
    });
  });

  it('shows Device info panel with correct fields', async () => {
    renderDeviceDetail();
    await waitFor(() => {
      expect(screen.getByText('Device info')).toBeTruthy();
      expect(screen.getByText('ID')).toBeTruthy();
      expect(screen.getByText('Type')).toBeTruthy();
      expect(screen.getByText('Driver')).toBeTruthy();
      expect(screen.getByText('Licence plate')).toBeTruthy();
      expect(screen.getByText('VIN')).toBeTruthy();
    });
  });

  it('shows device-specific values in Device info', async () => {
    renderDeviceDetail();
    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeTruthy();
      expect(screen.getByText('CA-123-456')).toBeTruthy();
      expect(screen.getByText('1HGCM82633A123456')).toBeTruthy();
    });
  });

  it('shows "No telemetry data yet" when telemetry is empty', async () => {
    renderDeviceDetail();
    await waitFor(() => expect(screen.getByText('No telemetry data yet')).toBeTruthy());
  });

  it('renders telemetry chart section heading', async () => {
    renderDeviceDetail();
    await waitFor(() => expect(screen.getByText(/Telemetry History/)).toBeTruthy());
  });

  it('renders chart when telemetry data is available', async () => {
    vi.mocked(deviceApi.telemetry).mockResolvedValue({ data: mockTelemetry } as any);
    renderDeviceDetail();
    await waitFor(() => expect(screen.queryByText('No telemetry data yet')).toBeNull());
  });

  it('calls deviceApi.get with the route param id', async () => {
    renderDeviceDetail('d1');
    await waitFor(() => expect(deviceApi.get).toHaveBeenCalledWith('d1'));
  });

  it('calls deviceApi.telemetry with the route param id', async () => {
    renderDeviceDetail('d1');
    await waitFor(() => expect(deviceApi.telemetry).toHaveBeenCalledWith('d1'));
  });

  it('shows "Device not found" when device is null', async () => {
    vi.mocked(deviceApi.get).mockResolvedValue({ data: null } as any);
    renderDeviceDetail();
    await waitFor(() => expect(screen.getByText('Device not found')).toBeTruthy());
  });

  it('shows "Unknown" location when device has no coordinates', async () => {
    vi.mocked(deviceApi.get).mockResolvedValue({
      data: { ...mockDevice, lastLat: undefined, lastLng: undefined },
    } as any);
    renderDeviceDetail();
    await waitFor(() => expect(screen.getByText('Unknown')).toBeTruthy());
  });
});
