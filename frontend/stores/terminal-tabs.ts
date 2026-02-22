import { create } from "zustand";

export interface TerminalTab {
  id: string;
  name: string;
  path: string;
  isRunning: boolean;
}

interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  counter: number;

  nextTabId: () => string;
  addTab: (id: string, path: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  markTabExited: (id: string) => void;
}

export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  counter: 0,

  nextTabId: () => {
    const newCounter = get().counter + 1;
    set({ counter: newCounter });
    return `tab-${newCounter}`;
  },

  addTab: (id: string, path: string) => {
    const currentCounter = get().counter;
    const tab: TerminalTab = {
      id,
      name: `Session #${currentCounter}`,
      path,
      isRunning: true,
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
}));
