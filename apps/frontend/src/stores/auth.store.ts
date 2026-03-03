import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginResponse } from '../lib/api';
import { fleetWs } from '../lib/ws';

interface AuthState {
  token: string | null;
  user: Omit<LoginResponse, 'token'> | null;
  isAuthenticated: boolean;
  login: (res: LoginResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (res) => {
        localStorage.setItem('fleet_token', res.token);
        fleetWs.connect(res.token);
        const { token, ...user } = res;
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('fleet_token');
        fleetWs.disconnect();
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'fleet_auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          localStorage.setItem('fleet_token', state.token);
          fleetWs.connect(state.token);
        }
      },
    }
  )
);
