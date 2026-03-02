import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Devices from './Devices';
import { devices as deviceApi, alerts } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  devices: { list: vi.fn(), create: vi.fn(), delete: vi.fn() },
  alerts: { count: vi.fn() },
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

const mockDevices = [
  {
    id: 'd1',
    name: 'Truck Alpha',
    type: 'truck',
    status: 'online',
    tenantId: 't1',
    apiKey: 'apikey12345678',
    driverName: 'Bob Smith',
    lastSpeed: 55.5,
    lastSeen: new Date().toISOString(),
    createdAt: '2024-01-01',
  },
  {
    id: 'd2',
    name: 'Van Beta',
    type: 'van',
    status: 'offline',
    tenantId: 't1',
    apiKey: 'apikey87654321',
    createdAt: '2024-01-01',
  },
];

function renderDevices() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/devices']}>
        <Routes>
          <Route path="/devices" element={<Devices />} />
          <Route path="/devices/:id" element={<div>Device Detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
  vi.mocked(deviceApi.list).mockResolvedValue({ data: [] } as any);
  vi.mocked(alerts.count).mockResolvedValue({ data: { count: 0 } } as any);
});

describe('Devices', () => {
  it('renders page header', async () => {
    renderDevices();
    await waitFor(() => expect(screen.getByText('Fleet Devices')).toBeTruthy());
  });

  it('shows Add device button', async () => {
    renderDevices();
    await waitFor(() => expect(screen.getByText('Add device')).toBeTruthy());
  });

  it('shows device count in header', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({ data: mockDevices } as any);
    renderDevices();
    await waitFor(() => expect(screen.getByText('(2)')).toBeTruthy());
  });

  it('renders device rows with name, type, and status', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({ data: mockDevices } as any);
    renderDevices();
    await waitFor(() => {
      expect(screen.getByText('Truck Alpha')).toBeTruthy();
      expect(screen.getByText('Van Beta')).toBeTruthy();
      expect(screen.getByText('truck')).toBeTruthy();
      expect(screen.getByText('online')).toBeTruthy();
      expect(screen.getByText('offline')).toBeTruthy();
    });
  });

  it('shows driver name when present', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({ data: mockDevices } as any);
    renderDevices();
    await waitFor(() => expect(screen.getByText('Bob Smith')).toBeTruthy());
  });

  it('shows speed formatted with one decimal', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({ data: mockDevices } as any);
    renderDevices();
    await waitFor(() => expect(screen.getByText('55.5 km/h')).toBeTruthy());
  });

  it('shows dashes for missing optional fields', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({ data: mockDevices } as any);
    renderDevices();
    await waitFor(() => {
      // Van Beta has no driver, speed, or lastSeen
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  it('shows truncated API key', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({ data: mockDevices } as any);
    renderDevices();
    // 'apikey12345678'.slice(0, 12) = 'apikey123456'
    await waitFor(() => expect(screen.getByText('apikey123456…')).toBeTruthy());
  });

  it('shows empty state when no devices exist', async () => {
    renderDevices();
    await waitFor(() => expect(screen.getByText('No devices yet.')).toBeTruthy());
  });

  it('opens CreateDeviceModal when Add device is clicked', async () => {
    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Add device')));
    expect(screen.getByText('Add new device')).toBeTruthy();
  });

  it('closes modal when Cancel is clicked', async () => {
    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Add device')));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Add new device')).toBeNull();
  });

  it('disables Create device button when name is empty', async () => {
    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Add device')));
    const btn = screen.getByRole('button', { name: 'Create device' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('enables Create device button once name is filled in', async () => {
    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Add device')));
    fireEvent.change(screen.getByPlaceholderText('Truck Alpha-7'), {
      target: { value: 'My Truck' },
    });
    const btn = screen.getByRole('button', { name: 'Create device' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('renders device type selector in create modal', async () => {
    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Add device')));
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByText('truck')).toBeTruthy();
    expect(screen.getByText('van')).toBeTruthy();
  });

  it('calls deviceApi.create and closes modal on successful creation', async () => {
    vi.mocked(deviceApi.create).mockResolvedValue({ data: mockDevices[0] } as any);
    vi.mocked(deviceApi.list)
      .mockResolvedValueOnce({ data: [] } as any)
      .mockResolvedValue({ data: mockDevices } as any);

    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Add device')));
    fireEvent.change(screen.getByPlaceholderText('Truck Alpha-7'), {
      target: { value: 'New Truck' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));
    await waitFor(() => expect(deviceApi.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Add new device')).toBeNull());
  });

  it('shows error in modal on failed device creation', async () => {
    vi.mocked(deviceApi.create).mockRejectedValue({
      response: { data: { message: 'Device limit reached' } },
    });
    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Add device')));
    fireEvent.change(screen.getByPlaceholderText('Truck Alpha-7'), {
      target: { value: 'New Truck' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }));
    await waitFor(() => expect(screen.getByText('Device limit reached')).toBeTruthy());
  });

  it('navigates to device detail when device name is clicked', async () => {
    vi.mocked(deviceApi.list).mockResolvedValue({ data: mockDevices } as any);
    renderDevices();
    await waitFor(() => fireEvent.click(screen.getByText('Truck Alpha')));
    expect(screen.getByText('Device Detail')).toBeTruthy();
  });
});
