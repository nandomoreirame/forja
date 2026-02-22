import { create } from "zustand";

interface AppDialogsState {
  shortcutsOpen: boolean;
  aboutOpen: boolean;
  newSessionOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setNewSessionOpen: (open: boolean) => void;
}

export const useAppDialogsStore = create<AppDialogsState>((set) => ({
  shortcutsOpen: false,
  aboutOpen: false,
  newSessionOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setNewSessionOpen: (open) => set({ newSessionOpen: open }),
}));
