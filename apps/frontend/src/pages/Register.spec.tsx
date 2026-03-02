import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Register from './Register';
import { auth } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

vi.mock('../lib/ws', () => ({
  fleetWs: { connect: vi.fn(), disconnect: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  auth: { register: vi.fn() },
}));

const mockResponse = {
  token: 'jwt',
  userId: 'u1',
  email: 'jane@myfleet.com',
  fullName: 'Jane',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 't1',
  tenantName: 'My Fleet',
  primaryColor: '#3B82F6',
};

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText('Acme Logistics'), {
    target: { value: 'My Fleet' },
  });
  fireEvent.change(screen.getByPlaceholderText('acme'), {
    target: { value: 'myfleet' },
  });
  fireEvent.change(screen.getByPlaceholderText('Jane Smith'), {
    target: { value: 'Jane Doe' },
  });
  fireEvent.change(screen.getByPlaceholderText('jane@company.com'), {
    target: { value: 'jane@myfleet.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('8+ characters'), {
    target: { value: 'Password1!' },
  });
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  vi.clearAllMocks();
});

describe('Register', () => {
  it('renders "Create your fleet account" subtitle', () => {
    renderRegister();
    expect(screen.getByText('Create your fleet account')).toBeTruthy();
  });

  it('renders FleetPilot heading', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'FleetPilot' })).toBeTruthy();
  });

  it('renders all required form fields', () => {
    renderRegister();
    expect(screen.getByPlaceholderText('Acme Logistics')).toBeTruthy();
    expect(screen.getByPlaceholderText('acme')).toBeTruthy();
    expect(screen.getByPlaceholderText('Jane Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('jane@company.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('8+ characters')).toBeTruthy();
  });

  it('renders the Create account button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('renders link to sign-in page', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
  });

  it('calls auth.register with form data on submit', async () => {
    vi.mocked(auth.register).mockResolvedValue({ data: mockResponse } as any);
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(auth.register).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantName: 'My Fleet',
          subdomain: 'myfleet',
          adminName: 'Jane Doe',
          adminEmail: 'jane@myfleet.com',
          adminPassword: 'Password1!',
        })
      )
    );
  });

  it('navigates to /dashboard on successful registration', async () => {
    vi.mocked(auth.register).mockResolvedValue({ data: mockResponse } as any);
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByText('Dashboard Page')).toBeTruthy());
  });

  it('stores auth state on successful registration', async () => {
    vi.mocked(auth.register).mockResolvedValue({ data: mockResponse } as any);
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().user?.tenantName).toBe('My Fleet');
  });

  it('shows server error message on failed registration', async () => {
    vi.mocked(auth.register).mockRejectedValue({
      response: { data: { message: 'Subdomain already taken' } },
    });
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByText('Subdomain already taken')).toBeTruthy());
  });

  it('shows fallback error when server provides no message', async () => {
    vi.mocked(auth.register).mockRejectedValue({});
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByText('Registration failed')).toBeTruthy());
  });

  it('shows loading text and disables button while submitting', async () => {
    let settle!: (v: any) => void;
    vi.mocked(auth.register).mockReturnValue(
      new Promise((r) => {
        settle = r;
      })
    );
    renderRegister();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.getByText('Creating account…')).toBeTruthy());
    const btn = screen.getByText('Creating account…').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    await act(async () => {
      settle({ data: mockResponse });
    });
  });
});
