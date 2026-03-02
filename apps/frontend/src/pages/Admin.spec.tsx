import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Admin from './Admin';
import { tenant as tenantApi, alerts } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  tenant: { allTenants: vi.fn(), suspend: vi.fn() },
  alerts: { count: vi.fn() },
}));

const mockUser = {
  userId: 'u1',
  email: 'admin@fleetpilot.io',
  fullName: 'Admin',
  role: 'admin',
  isPlatformAdmin: true,
  tenantId: 't0',
  tenantName: 'FleetPilot',
  primaryColor: '#3B82F6',
};

const mockTenants = [
  {
    id: 't1',
    name: 'Acme Logistics',
    subdomain: 'acme',
    primaryColor: '#3B82F6',
    plan: 'pro',
    status: 'active',
    maxDevices: 50,
    retentionDays: 90,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 't2',
    name: 'SwiftFleet',
    subdomain: 'swift',
    primaryColor: '#10B981',
    plan: 'free',
    status: 'suspended',
    maxDevices: 10,
    retentionDays: 30,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const mockPage = {
  content: mockTenants,
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
};

function renderAdmin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
  vi.mocked(tenantApi.allTenants).mockResolvedValue({ data: mockPage } as any);
  vi.mocked(alerts.count).mockResolvedValue({ data: { count: 0 } } as any);
});

describe('Admin', () => {
  it('renders Platform Admin Portal heading', async () => {
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Platform Admin Portal')).toBeTruthy());
  });

  it('renders total tenants stat card', async () => {
    renderAdmin();
    // Wait for data to load — the stat value updates after the query resolves
    await waitFor(() => {
      expect(screen.getByText('Total tenants')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy(); // totalElements = 2
    });
  });

  it('renders active tenants count', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('Active tenants')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy(); // only Acme is 'active'
    });
  });

  it('renders table with Tenant, Plan, Status columns', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('Tenant')).toBeTruthy();
      expect(screen.getByText('Plan')).toBeTruthy();
      expect(screen.getByText('Status')).toBeTruthy();
    });
  });

  it('renders tenant names', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('Acme Logistics')).toBeTruthy();
      expect(screen.getByText('SwiftFleet')).toBeTruthy();
    });
  });

  it('renders tenant subdomains', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('acme')).toBeTruthy();
      expect(screen.getByText('swift')).toBeTruthy();
    });
  });

  it('renders plan names in uppercase', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('PRO')).toBeTruthy();
      expect(screen.getByText('FREE')).toBeTruthy();
    });
  });

  it('renders tenant status badges', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('active')).toBeTruthy();
      expect(screen.getByText('suspended')).toBeTruthy();
    });
  });

  it('shows Suspend button only for active tenants', async () => {
    renderAdmin();
    await waitFor(() => expect(screen.getByText('Acme Logistics')).toBeTruthy());
    const suspendBtns = screen.getAllByText('Suspend');
    expect(suspendBtns).toHaveLength(1); // only Acme is active
  });

  it('shows empty state when no tenants', async () => {
    vi.mocked(tenantApi.allTenants).mockResolvedValue({
      data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
    } as any);
    renderAdmin();
    await waitFor(() => expect(screen.getByText('No tenants found')).toBeTruthy());
  });

  it('calls suspend API when Suspend button is clicked and confirmed', async () => {
    vi.mocked(tenantApi.suspend).mockResolvedValue({} as any);
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    renderAdmin();
    await waitFor(() => fireEvent.click(screen.getByText('Suspend')));
    expect(tenantApi.suspend).toHaveBeenCalledWith('t1');
    vi.unstubAllGlobals();
  });

  it('does not call suspend when confirmation is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    renderAdmin();
    await waitFor(() => fireEvent.click(screen.getByText('Suspend')));
    expect(tenantApi.suspend).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('renders tenant initials avatars', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('AC')).toBeTruthy(); // Acme Logistics -> AC
      expect(screen.getByText('SW')).toBeTruthy(); // SwiftFleet -> SW
    });
  });

  it('renders max devices column', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('50')).toBeTruthy(); // Acme maxDevices
      expect(screen.getByText('10')).toBeTruthy(); // SwiftFleet maxDevices
    });
  });
});
