import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Settings from './Settings';
import { tenant as tenantApi, alerts } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  tenant: { me: vi.fn(), update: vi.fn(), users: vi.fn(), auditLogs: vi.fn() },
  alerts: { count: vi.fn() },
}));

const mockUser = {
  userId: 'u1',
  email: 'alice@acme.com',
  fullName: 'Alice',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 't1',
  tenantName: 'Acme Logistics',
  primaryColor: '#3B82F6',
};

const mockProfile = {
  tenant: {
    id: 't1',
    name: 'Acme Logistics',
    subdomain: 'acme',
    primaryColor: '#3B82F6',
    logoUrl: 'https://example.com/logo.png',
    plan: 'pro',
    status: 'active',
    maxDevices: 50,
    retentionDays: 90,
    createdAt: '2024-01-01',
  },
  stats: { deviceCount: 8, userCount: 3 },
};

const mockUsers = [
  {
    id: 'u1',
    fullName: 'Alice Smith',
    email: 'alice@acme.com',
    role: 'fleet_admin',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'u2',
    fullName: 'Bob Jones',
    email: 'bob@acme.com',
    role: 'dispatcher',
    lastLogin: null,
  },
];

const mockAuditLogs = {
  content: [
    {
      id: 'log1',
      action: 'DEVICE_CREATED',
      actorEmail: 'alice@acme.com',
      resourceType: 'Device',
      resourceId: 'device-uuid-123',
      createdAt: new Date().toISOString(),
    },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
};

function renderSettings() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
  vi.mocked(tenantApi.me).mockResolvedValue({ data: mockProfile } as any);
  vi.mocked(tenantApi.users).mockResolvedValue({ data: mockUsers } as any);
  vi.mocked(tenantApi.auditLogs).mockResolvedValue({ data: mockAuditLogs } as any);
  vi.mocked(tenantApi.update).mockResolvedValue({ data: mockProfile.tenant } as any);
  vi.mocked(alerts.count).mockResolvedValue({ data: { count: 0 } } as any);
});

describe('Settings', () => {
  it('renders tab buttons: Branding, Team, Audit log', async () => {
    renderSettings();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Branding/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Team/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Audit log/ })).toBeTruthy();
    });
  });

  it('shows Branding tab by default', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByText('Tenant branding')).toBeTruthy());
  });

  it('shows tenant name in branding form', async () => {
    renderSettings();
    await waitFor(() => {
      const input = screen.getByDisplayValue('Acme Logistics') as HTMLInputElement;
      expect(input).toBeTruthy();
    });
  });

  it('shows tenant device and user stats in branding tab', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByText(/8 devices/)).toBeTruthy());
    expect(screen.getByText(/3 users/)).toBeTruthy();
  });

  it('shows tenant plan in branding tab', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByText(/pro plan/)).toBeTruthy());
  });

  it('renders Save changes button', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByRole('button', { name: /Save changes/ })).toBeTruthy());
  });

  it('calls tenantApi.update when Save changes is clicked', async () => {
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Save changes/ })));
    expect(tenantApi.update).toHaveBeenCalledTimes(1);
  });

  it('switches to Team tab when clicked', async () => {
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Team/ })));
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeTruthy();
      expect(screen.getByText('Bob Jones')).toBeTruthy();
    });
  });

  it('shows user email in Team tab', async () => {
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Team/ })));
    await waitFor(() => {
      expect(screen.getByText('alice@acme.com')).toBeTruthy();
    });
  });

  it('shows user roles in Team tab', async () => {
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Team/ })));
    await waitFor(() => {
      expect(screen.getByText('fleet_admin')).toBeTruthy();
      expect(screen.getByText('dispatcher')).toBeTruthy();
    });
  });

  it('shows "Never" for users with no last login', async () => {
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Team/ })));
    await waitFor(() => expect(screen.getByText('Never')).toBeTruthy());
  });

  it('switches to Audit log tab and shows log entries', async () => {
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Audit log/ })));
    await waitFor(() => {
      expect(screen.getByText('DEVICE_CREATED')).toBeTruthy();
    });
  });

  it('shows actor email in Audit log tab', async () => {
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Audit log/ })));
    await waitFor(() => expect(screen.getByText('alice@acme.com')).toBeTruthy());
  });

  it('shows "No audit logs yet" when audit logs are empty', async () => {
    vi.mocked(tenantApi.auditLogs).mockResolvedValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
    } as any);
    renderSettings();
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Audit log/ })));
    await waitFor(() => expect(screen.getByText('No audit logs yet')).toBeTruthy());
  });

  it('shows logo URL input in branding tab', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByPlaceholderText('https://…/logo.png')).toBeTruthy());
  });

  it('shows tenant initials avatar in branding tab', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByText('AC')).toBeTruthy()); // Acme Logistics -> AC
  });
});
