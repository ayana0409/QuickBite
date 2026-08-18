import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, idToken?: string) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      idToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, idToken) =>
        set({
          user,
          accessToken,
          idToken: idToken || null,
          isAuthenticated: true,
        }),
      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          idToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'qb-auth-storage', // localStorage key
    }
  )
);
