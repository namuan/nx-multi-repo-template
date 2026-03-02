import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './ProtectedRoute';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn() },
}));

const mockUser = {
  userId: 'user-1',
  email: 'alice@acme.com',
  fullName: 'Alice',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 'tenant-1',
  tenantName: 'Acme',
  primaryColor: '#3B82F6',
};

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
});

function renderWithRoutes(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    renderWithRoutes(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Login Page')).toBeTruthy();
    expect(screen.queryByText('Secret Content')).toBeNull();
  });

  it('renders children for authenticated users', () => {
    useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
    renderWithRoutes(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Secret Content')).toBeTruthy();
    expect(screen.queryByText('Login Page')).toBeNull();
  });
});

describe('AdminRoute', () => {
  it('redirects to /login when no user is logged in', () => {
    renderWithRoutes(
      <AdminRoute>
        <div>Admin Panel</div>
      </AdminRoute>
    );
    expect(screen.getByText('Login Page')).toBeTruthy();
    expect(screen.queryByText('Admin Panel')).toBeNull();
  });

  it('redirects non-admin users to /dashboard', () => {
    useAuthStore.setState({ isAuthenticated: true, user: mockUser, token: 'tok' });
    renderWithRoutes(
      <AdminRoute>
        <div>Admin Panel</div>
      </AdminRoute>
    );
    expect(screen.getByText('Dashboard Page')).toBeTruthy();
    expect(screen.queryByText('Admin Panel')).toBeNull();
  });

  it('renders children for platform admins', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { ...mockUser, isPlatformAdmin: true },
      token: 'tok',
    });
    renderWithRoutes(
      <AdminRoute>
        <div>Admin Panel</div>
      </AdminRoute>
    );
    expect(screen.getByText('Admin Panel')).toBeTruthy();
  });
});
