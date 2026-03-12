import { create } from "zustand";

interface RightPanelState {
  isOpen: boolean;
  togglePanel: () => void;
}

export const useRightPanelStore = create<RightPanelState>((set) => ({
  isOpen: false,
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
}));
