import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './Layout';
import { useAuthStore } from '../stores/auth.store';
import { alerts } from '../lib/api';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn(), subscribe: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  alerts: { count: vi.fn() },
}));

const mockUser = {
  userId: 'user-1',
  email: 'alice@acme.com',
  fullName: 'Alice',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 'tenant-1',
  tenantName: 'Acme Logistics',
  primaryColor: '#3B82F6',
};

function renderLayout(user = mockUser) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ isAuthenticated: true, user, token: 'tok' });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<Layout title="Dashboard">Page Content</Layout>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
  vi.mocked(alerts.count).mockResolvedValue({ data: { count: 0 } } as any);
});

describe('Layout', () => {
  it('renders sidebar navigation links', () => {
    renderLayout();
    // NavLinks render as <a> elements
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Devices/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Alerts/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Settings/ })).toBeTruthy();
  });

  it('renders page title in topbar', () => {
    renderLayout();
    // h1 renders the title prop
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  });

  it('renders children in main content area', () => {
    renderLayout();
    expect(screen.getByText('Page Content')).toBeTruthy();
  });

  it('renders tenant name in sidebar footer', () => {
    renderLayout();
    expect(screen.getByText('Acme Logistics')).toBeTruthy();
  });

  it('renders user email in sidebar footer', () => {
    renderLayout();
    expect(screen.getByText('alice@acme.com')).toBeTruthy();
  });

  it('does not show Platform Admin link for regular users', () => {
    renderLayout();
    expect(screen.queryByText('Platform Admin')).toBeNull();
  });

  it('shows Platform Admin link for platform admins', () => {
    renderLayout({ ...mockUser, isPlatformAdmin: true });
    expect(screen.getByText('Platform Admin')).toBeTruthy();
  });

  it('renders FleetPilot brand name in sidebar', () => {
    renderLayout();
    expect(screen.getByText('FleetPilot')).toBeTruthy();
  });

  it('navigates to /login after clicking Sign out', () => {
    renderLayout();
    fireEvent.click(screen.getByText('Sign out'));
    expect(screen.getByText('Login Page')).toBeTruthy();
  });

  it('shows tenant initials derived from tenant name', () => {
    renderLayout();
    // "Acme Logistics" -> initials "AC"
    expect(screen.getByText('AC')).toBeTruthy();
  });
});
