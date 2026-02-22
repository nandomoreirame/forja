import { create } from "zustand";

interface AppDialogsState {
  shortcutsOpen: boolean;
  aboutOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
}

export const useAppDialogsStore = create<AppDialogsState>((set) => ({
  shortcutsOpen: false,
  aboutOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
}));
