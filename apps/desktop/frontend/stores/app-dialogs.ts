import { create } from "zustand";

interface AppDialogsState {
  shortcutsOpen: boolean;
  aboutOpen: boolean;
  settingsOpen: boolean;
  createWorkspaceOpen: boolean;
  createWorkspacePendingPath: string | null;
  createWorkspaceEditId: string | null;
  createWorkspaceInitialName: string | null;
  saveSessionOpen: boolean;
  saveSessionTabId: string | null;
  saveSessionResolve: ((action: "save" | "close" | "cancel") => void) | null;
  setShortcutsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCreateWorkspaceOpen: (
    open: boolean,
    pendingPath?: string | null,
    options?: { workspaceId?: string | null; initialName?: string | null },
  ) => void;
  openSaveSessionDialog: (tabId: string) => Promise<"save" | "close" | "cancel">;
  closeSaveSessionDialog: (action: "save" | "close" | "cancel") => void;
}

export const useAppDialogsStore = create<AppDialogsState>((set) => ({
  shortcutsOpen: false,
  aboutOpen: false,
  settingsOpen: false,
  createWorkspaceOpen: false,
  createWorkspacePendingPath: null,
  createWorkspaceEditId: null,
  createWorkspaceInitialName: null,
  saveSessionOpen: false,
  saveSessionTabId: null,
  saveSessionResolve: null,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCreateWorkspaceOpen: (open, pendingPath, options) =>
    set({
      createWorkspaceOpen: open,
      createWorkspacePendingPath: pendingPath ?? null,
      createWorkspaceEditId: open ? options?.workspaceId ?? null : null,
      createWorkspaceInitialName: open ? options?.initialName ?? null : null,
    }),
  openSaveSessionDialog: (tabId) =>
    new Promise((resolve) => {
      set({
        saveSessionOpen: true,
        saveSessionTabId: tabId,
        saveSessionResolve: resolve,
      });
    }),
  closeSaveSessionDialog: (action) =>
    set((state) => {
      state.saveSessionResolve?.(action);
      return {
        saveSessionOpen: false,
        saveSessionTabId: null,
        saveSessionResolve: null,
      };
    }),
}));
