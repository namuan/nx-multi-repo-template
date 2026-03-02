import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { auth } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  auth: { login: vi.fn() },
}));

const mockLoginResponse = {
  token: 'jwt-token',
  userId: 'user-1',
  email: 'alice@acme.com',
  fullName: 'Alice',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 'tenant-1',
  tenantName: 'Acme',
  primaryColor: '#3B82F6',
};

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
});

describe('Login', () => {
  it('renders the FleetPilot heading', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'FleetPilot' })).toBeTruthy();
  });

  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('you@company.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('renders the Sign in button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('renders link to Create an account', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: 'Create an account' })).toBeTruthy();
  });

  it('renders demo credentials section', () => {
    renderLogin();
    expect(screen.getByText(/Demo credentials/i)).toBeTruthy();
    expect(screen.getByText('Platform Admin:')).toBeTruthy();
    expect(screen.getByText('Acme Logistics:')).toBeTruthy();
    expect(screen.getByText('SwiftFleet:')).toBeTruthy();
  });

  it('fills in credentials when a demo user button is clicked', () => {
    renderLogin();
    fireEvent.click(screen.getByText('alice@acme.com'));
    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
    const passInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(emailInput.value).toBe('alice@acme.com');
    expect(passInput.value).toBe('Demo123!');
  });

  it('fills in admin credentials when platform admin button is clicked', () => {
    renderLogin();
    fireEvent.click(screen.getByText('admin@fleetpilot.io'));
    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement;
    expect(emailInput.value).toBe('admin@fleetpilot.io');
  });

  it('calls auth.login with entered email and password on submit', async () => {
    vi.mocked(auth.login).mockResolvedValue({ data: mockLoginResponse } as any);
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'alice@acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Demo123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('alice@acme.com', 'Demo123!'));
  });

  it('navigates to /dashboard on successful login', async () => {
    vi.mocked(auth.login).mockResolvedValue({ data: mockLoginResponse } as any);
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'alice@acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Demo123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Dashboard Page')).toBeTruthy());
  });

  it('stores auth state on successful login', async () => {
    vi.mocked(auth.login).mockResolvedValue({ data: mockLoginResponse } as any);
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'alice@acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Demo123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().user?.email).toBe('alice@acme.com');
  });

  it('shows error message from server on failed login', async () => {
    vi.mocked(auth.login).mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'wrong@user.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'badpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeTruthy());
  });

  it('shows fallback error when server provides no message', async () => {
    vi.mocked(auth.login).mockRejectedValue({});
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeTruthy());
  });

  it('shows loading text and disables button while submitting', async () => {
    let settle!: (v: any) => void;
    vi.mocked(auth.login).mockReturnValue(
      new Promise((r) => {
        settle = r;
      })
    );
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'alice@acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'Demo123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Signing in…')).toBeTruthy());
    const btn = screen.getByText('Signing in…').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await act(async () => {
      settle({ data: mockLoginResponse });
    });
  });
});
