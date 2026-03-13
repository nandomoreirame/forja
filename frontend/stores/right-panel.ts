import { create } from "zustand";
import { usePluginsStore } from "./plugins";

type ActiveView = "empty" | "plugin" | "marketplace";

interface RightPanelState {
  isOpen: boolean;
  isOpenByProject: Record<string, boolean>;
  activeView: ActiveView;
  activeViewByProject: Record<string, ActiveView>;
  togglePanel: () => void;
  /** Closes the panel only if no plugin is pinned. When a plugin is pinned, the
   * panel must remain open so the pinned plugin stays visible. Use this instead
   * of togglePanel() in resize callbacks to enforce the invariant. */
  closePanel: () => void;
  setActiveView: (view: ActiveView) => void;
  saveStateForProject: (projectPath: string) => void;
  restoreStateForProject: (projectPath: string) => void;
}

export const useRightPanelStore = create<RightPanelState>((set, get) => ({
  isOpen: false,
  isOpenByProject: {},
  activeView: "empty",
  activeViewByProject: {},

  togglePanel: () =>
    set((state) => {
      const nextOpen = !state.isOpen;
      return {
        isOpen: nextOpen,
        activeView: nextOpen ? state.activeView : "empty",
      };
    }),

  closePanel: () => {
    // Do not close if a plugin is pinned — pinned plugins must always be visible.
    const { pinnedPluginName } = usePluginsStore.getState();
    if (pinnedPluginName) return;
    set({ isOpen: false, activeView: "empty" });
  },

  setActiveView: (view: ActiveView) => set({ activeView: view }),

  saveStateForProject: (projectPath: string) => {
    const { isOpen, isOpenByProject, activeView, activeViewByProject } = get();
    set({
      isOpenByProject: { ...isOpenByProject, [projectPath]: isOpen },
      activeViewByProject: {
        ...activeViewByProject,
        [projectPath]: activeView,
      },
    });
  },

  restoreStateForProject: (projectPath: string) => {
    const { isOpenByProject, activeViewByProject } = get();
    const savedOpen = isOpenByProject[projectPath];
    const savedView = activeViewByProject[projectPath];
    set({
      isOpen: savedOpen ?? false,
      activeView: savedView ?? "empty",
    });
  },
}));
