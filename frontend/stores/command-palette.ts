import { create } from "zustand";

export type CommandPaletteMode = "files" | "commands" | "sessions" | "themes" | "projects";

interface CommandPaletteState {
  isOpen: boolean;
  mode: CommandPaletteMode;
  open: (mode: CommandPaletteMode) => void;
  close: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  mode: "files",
  open: (mode) => set({ isOpen: true, mode }),
  close: () => set({ isOpen: false }),
}));
