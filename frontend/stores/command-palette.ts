import { create } from "zustand";

interface CommandPaletteState {
  isOpen: boolean;
  mode: "files" | "commands";
  open: (mode: "files" | "commands") => void;
  close: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  mode: "files",
  open: (mode) => set({ isOpen: true, mode }),
  close: () => set({ isOpen: false }),
}));
