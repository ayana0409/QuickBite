import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (newToast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = newToast.duration ?? (newToast.type === 'error' ? 6000 : 4000);

    const toastItem: ToastItem = {
      ...newToast,
      id,
      duration,
    };

    set((state) => ({
      toasts: [...state.toasts, toastItem],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),
}));

// Convenience Helper functions for easy invocation anywhere (components, services, interceptors)
export const toast = {
  success: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'success', message, title, duration }),

  error: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'error', message, title, duration }),

  warning: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'warning', message, title, duration }),

  info: (message: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'info', message, title, duration }),
};
