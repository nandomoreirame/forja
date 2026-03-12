import { create } from "zustand";

type ActiveView = "empty" | "plugin";

interface RightPanelState {
  isOpen: boolean;
  isOpenByProject: Record<string, boolean>;
  activeView: ActiveView;
  activeViewByProject: Record<string, ActiveView>;
  togglePanel: () => void;
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
