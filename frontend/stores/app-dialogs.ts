import { create } from "zustand";

interface AppDialogsState {
  shortcutsOpen: boolean;
  aboutOpen: boolean;
  newSessionOpen: boolean;
  createWorkspaceOpen: boolean;
  createWorkspacePendingPath: string | null;
  setShortcutsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setNewSessionOpen: (open: boolean) => void;
  setCreateWorkspaceOpen: (open: boolean, pendingPath?: string | null) => void;
}

export const useAppDialogsStore = create<AppDialogsState>((set) => ({
  shortcutsOpen: false,
  aboutOpen: false,
  newSessionOpen: false,
  createWorkspaceOpen: false,
  createWorkspacePendingPath: null,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setNewSessionOpen: (open) => set({ newSessionOpen: open }),
  setCreateWorkspaceOpen: (open, pendingPath) =>
    set({
      createWorkspaceOpen: open,
      createWorkspacePendingPath: pendingPath ?? null,
    }),
}));
