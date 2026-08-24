import { create } from "zustand";

interface UiState {
  isAuthModalOpen: boolean;
  authModalTab: "login" | "register";
  openAuthModal: (tab?: "login" | "register") => void;
  closeAuthModal: () => void;
  setAuthModalOpen: (open: boolean, tab?: "login" | "register") => void;
  setAuthModalTab: (tab: "login" | "register") => void;
}

export const useUiStore = create<UiState>((set) => ({
  isAuthModalOpen: false,
  authModalTab: "login",
  openAuthModal: (tab) =>
    set({
      isAuthModalOpen: true,
      authModalTab: typeof tab === "string" ? tab : "login",
    }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setAuthModalOpen: (open: boolean, tab = "login") =>
    set({
      isAuthModalOpen: open,
      authModalTab: typeof tab === "string" ? tab : "login",
    }),
  setAuthModalTab: (tab: "login" | "register") => set({ authModalTab: tab }),
}));
