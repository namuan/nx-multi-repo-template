import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './auth.store';
import { fleetWs } from '../lib/ws';

vi.mock('../lib/ws', () => ({
  fleetWs: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

const mockLoginResponse = {
  token: 'test-jwt-token',
  userId: 'user-1',
  email: 'alice@acme.com',
  fullName: 'Alice Smith',
  role: 'fleet_admin',
  isPlatformAdmin: false,
  tenantId: 'tenant-1',
  tenantName: 'Acme Logistics',
  primaryColor: '#3B82F6',
};

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('starts unauthenticated with null token and user', () => {
      const { token, user, isAuthenticated } = useAuthStore.getState();
      expect(token).toBeNull();
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('sets token, user, and isAuthenticated to true', () => {
      useAuthStore.getState().login(mockLoginResponse);
      const state = useAuthStore.getState();
      expect(state.token).toBe('test-jwt-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('alice@acme.com');
      expect(state.user?.tenantName).toBe('Acme Logistics');
      expect(state.user?.isPlatformAdmin).toBe(false);
    });

    it('does not include token in user object', () => {
      useAuthStore.getState().login(mockLoginResponse);
      const { user } = useAuthStore.getState();
      expect(user).not.toHaveProperty('token');
    });

    it('stores token in localStorage', () => {
      useAuthStore.getState().login(mockLoginResponse);
      expect(localStorage.getItem('fleet_token')).toBe('test-jwt-token');
    });

    it('connects WebSocket with the token', () => {
      useAuthStore.getState().login(mockLoginResponse);
      expect(fleetWs.connect).toHaveBeenCalledWith('test-jwt-token');
      expect(fleetWs.connect).toHaveBeenCalledTimes(1);
    });

    it('stores all user fields correctly', () => {
      useAuthStore.getState().login(mockLoginResponse);
      const { user } = useAuthStore.getState();
      expect(user?.userId).toBe('user-1');
      expect(user?.role).toBe('fleet_admin');
      expect(user?.tenantId).toBe('tenant-1');
      expect(user?.primaryColor).toBe('#3B82F6');
    });
  });

  describe('logout', () => {
    it('clears token, user, and isAuthenticated', () => {
      useAuthStore.getState().login(mockLoginResponse);
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('removes fleet_token from localStorage', () => {
      localStorage.setItem('fleet_token', 'test-jwt-token');
      useAuthStore.getState().logout();
      expect(localStorage.getItem('fleet_token')).toBeNull();
    });

    it('removes fleet_user from localStorage', () => {
      localStorage.setItem('fleet_user', '{"email":"alice@acme.com"}');
      useAuthStore.getState().logout();
      expect(localStorage.getItem('fleet_user')).toBeNull();
    });

    it('disconnects WebSocket', () => {
      useAuthStore.getState().logout();
      expect(fleetWs.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
