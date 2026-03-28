import { create } from "zustand";
import { usePluginsStore } from "./plugins";

type ActiveView = "empty" | "plugin" | "marketplace";

interface RightPanelState {
  isOpen: boolean;
  activeView: ActiveView;
  togglePanel: () => void;
  /** Closes the panel only if no plugin is pinned. When a plugin is pinned, the
   * panel must remain open so the pinned plugin stays visible. Use this instead
   * of togglePanel() in resize callbacks to enforce the invariant. */
  closePanel: () => void;
  setActiveView: (view: ActiveView) => void;
}

export const useRightPanelStore = create<RightPanelState>((set, _get) => ({
  isOpen: false,
  activeView: "empty",

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
}));
