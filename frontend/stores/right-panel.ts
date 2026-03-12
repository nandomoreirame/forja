import { create } from "zustand";

interface RightPanelState {
  isOpen: boolean;
  isOpenByProject: Record<string, boolean>;
  togglePanel: () => void;
  saveStateForProject: (projectPath: string) => void;
  restoreStateForProject: (projectPath: string) => void;
}

export const useRightPanelStore = create<RightPanelState>((set, get) => ({
  isOpen: false,
  isOpenByProject: {},
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),

  saveStateForProject: (projectPath: string) => {
    const { isOpen, isOpenByProject } = get();
    set({
      isOpenByProject: { ...isOpenByProject, [projectPath]: isOpen },
    });
  },

  restoreStateForProject: (projectPath: string) => {
    const { isOpenByProject } = get();
    const saved = isOpenByProject[projectPath];
    set({ isOpen: saved ?? false });
  },
}));
