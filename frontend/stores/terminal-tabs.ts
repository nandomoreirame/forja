import { getCurrentWindow } from "@/lib/ipc";
import { getSessionDisplayName, type SessionType } from "@/lib/cli-registry";
import { create } from "zustand";

const RENDERER_INSTANCE_ID = `${Date.now().toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

export interface TerminalTab {
  id: string;
  name: string;
  path: string;
  isRunning: boolean;
  sessionType: SessionType;
}

interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  counter: number;
  isTerminalPaneOpen: boolean;

  nextTabId: () => string;
  addTab: (id: string, path: string, sessionType?: SessionType) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  markTabExited: (id: string) => void;
  toggleTerminalPane: () => void;
}

export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  counter: 0,
  isTerminalPaneOpen: true,

  nextTabId: () => {
    const newCounter = get().counter + 1;
    set({ counter: newCounter });
    const windowLabel = getCurrentWindow().label;
    return `${windowLabel}-${RENDERER_INSTANCE_ID}-tab-${newCounter}`;
  },

  addTab: (id: string, path: string, sessionType: SessionType = 'claude') => {
    const currentCounter = get().counter;
    const tab: TerminalTab = {
      id,
      name: getSessionDisplayName(sessionType, currentCounter),
      path,
      isRunning: true,
      sessionType,
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: id,
    }));
  },

  removeTab: (id: string) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;

    const newTabs = tabs.filter((t) => t.id !== id);

    let newActiveTabId = activeTabId;
    if (activeTabId === id) {
      if (newTabs.length === 0) {
        newActiveTabId = null;
      } else if (index > 0) {
        // Activate previous tab
        newActiveTabId = newTabs[index - 1].id;
      } else {
        // Activate next tab (now at same index)
        newActiveTabId = newTabs[0].id;
      }
    }

    set({ tabs: newTabs, activeTabId: newActiveTabId });
  },

  setActiveTab: (id: string) => set({ activeTabId: id }),

  markTabExited: (id: string) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, isRunning: false } : t
      ),
    })),

  toggleTerminalPane: () =>
    set((state) => ({ isTerminalPaneOpen: !state.isTerminalPaneOpen })),
}));
