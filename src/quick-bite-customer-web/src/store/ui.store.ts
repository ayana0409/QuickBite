import { create } from "zustand";

interface UiState {
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  setAuthModalOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),
}));
