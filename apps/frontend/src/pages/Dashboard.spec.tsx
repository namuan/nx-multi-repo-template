import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import { devices as deviceApi, alerts } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { fleetWs } from '../lib/ws';

vi.mock('../lib/ws', () => ({
  fleetWs: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  devices: { list: vi.fn() },
  alerts: { unacknowledged: vi.fn(), count: vi.fn() },
}));

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

const makeDevice = (id: string, status: 'online' | 'offline') => ({
  id,
  name: `Device ${id}`,
  type: 'truck' as const,
  status,
  tenantId: 't1',
  apiKey: `key-${id}`,
  createdAt: '2024-01-01',
});

const makeAlert = (id: string, severity: 'warning' | 'critical' | 'info', message: string) => ({
  id,
  deviceId: 'd1',
  type: 'speed',
  message,
  severity,
  acknowledged: false,
  createdAt: new Date().toISOString(),
});

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
  vi.mocked(deviceApi.list).mockResolvedValue({ data: [] } as any);
  vi.mocked(alerts.unacknowledged).mockResolvedValue({ data: [] } as any);
  vi.mocked(alerts.count).mockResolvedValue({ data: { count: 0 } } as any);
  vi.mocked(fleetWs.subscribe).mockReturnValue(() => {});
});

describe('Dashboard', () => {
  it('renders all stat card labels', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Total devices')).toBeTruthy();
      expect(screen.getByText('Online')).toBeTruthy();
      expect(screen.getByText('Offline')).toBeTruthy();
      expect(screen.getByText('Open alerts')).toBeTruthy();
    });
  });

  it('shows zero counts when no data is returned', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Total devices')).toBeTruthy());
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it('shows correct total, online, and offline device counts', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({
      data: [makeDevice('d1', 'online'), makeDevice('d2', 'online'), makeDevice('d3', 'offline')],
    } as any);
    renderDashboard();
    await waitFor(() => {
      // Total = 3, Online = 2, Offline = 1
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });
  });

  it('shows open alert count from unacknowledged alerts', async () => {
    vi.mocked(alerts.unacknowledged).mockResolvedValue({
      data: [makeAlert('a1', 'warning', 'Speed exceeded'), makeAlert('a2', 'critical', 'Low fuel')],
    } as any);
    renderDashboard();
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
  });

  it('renders alert messages in the open alerts list', async () => {
    vi.mocked(alerts.unacknowledged).mockResolvedValue({
      data: [
        makeAlert('a1', 'warning', 'Speed exceeded limit'),
        makeAlert('a2', 'critical', 'Low fuel warning'),
      ],
    } as any);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Speed exceeded limit')).toBeTruthy();
      expect(screen.getByText('Low fuel warning')).toBeTruthy();
    });
  });

  it('shows "No open alerts" when alert list is empty', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.getByText('No open alerts')).toBeTruthy());
  });

  it('shows error card when devices API fails', async () => {
    vi.mocked(deviceApi.list).mockRejectedValue(new Error('Network error'));
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Unable to load dashboard data')).toBeTruthy());
  });

  it('shows error card when alerts API fails', async () => {
    vi.mocked(alerts.unacknowledged).mockRejectedValue(new Error('Network error'));
    renderDashboard();
    await waitFor(() => expect(screen.getByText('Unable to load dashboard data')).toBeTruthy());
  });

  it('subscribes to WebSocket on mount', async () => {
    renderDashboard();
    await waitFor(() => expect(fleetWs.subscribe).toHaveBeenCalledTimes(1));
  });

  it('unsubscribes from WebSocket on unmount', async () => {
    const unsubscribe = vi.fn();
    vi.mocked(fleetWs.subscribe).mockReturnValue(unsubscribe);
    const { unmount } = renderDashboard();
    await waitFor(() => expect(fleetWs.subscribe).toHaveBeenCalled());
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('updates online device count when WebSocket telemetry arrives', async () => {
    const subscribers: Array<(msg: any) => void> = [];
    vi.mocked(fleetWs.subscribe).mockImplementation((fn) => {
      subscribers.push(fn);
      return () => {};
    });
    vi.mocked(deviceApi.list).mockResolvedValue({
      data: [makeDevice('d1', 'offline')],
    } as any);

    renderDashboard();

    // Initially 1 offline device
    await waitFor(() => expect(screen.getByText('Offline')).toBeTruthy());

    // Simulate telemetry message making d1 come online
    await act(async () => {
      subscribers.forEach((fn) =>
        fn({
          type: 'telemetry',
          device_id: 'd1',
          tenant_id: 't1',
          lat: 1,
          lng: 2,
          speed: 60,
          heading: 90,
          status: 'online',
        })
      );
    });

    await waitFor(() => {
      // After live update, d1 is online
      expect(screen.getByText('Online')).toBeTruthy();
    });
  });
});
