import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string | null, idToken?: string | null) => void;
  setTokens: (accessToken: string, refreshToken?: string | null) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken = null, idToken = null) =>
        set({
          user,
          accessToken,
          refreshToken: refreshToken || null,
          idToken: idToken || null,
          isAuthenticated: true,
        }),
      setTokens: (accessToken, refreshToken = null) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken !== undefined && refreshToken !== null ? refreshToken : state.refreshToken,
          isAuthenticated: !!accessToken,
        })),
      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          idToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'qb-auth-storage', // localStorage key
    }
  )
);
