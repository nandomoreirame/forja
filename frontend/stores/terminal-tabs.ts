import { getCurrentWindow } from "@/lib/ipc";
import { computeTabDisplayNames, getSessionDisplayName, type SessionType } from "@/lib/cli-registry";
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
  /** User-defined custom name for the tab. When set, overrides the auto-generated display name. */
  customName?: string;
}

interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  counter: number;
  isTerminalPaneOpen: boolean;
  isTerminalFullscreen: boolean;
  activeTabIdByProject: Record<string, string>;

  nextTabId: () => string;
  addTab: (id: string, path: string, sessionType?: SessionType) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  markTabExited: (id: string) => void;
  /** Renames a tab with a custom user-defined name. Empty string clears the custom name. */
  renameTab: (id: string, name: string) => void;
  toggleTerminalPane: () => void;
  toggleTerminalFullscreen: () => void;
  /** Returns a map of tabId -> computed display name based on current open tabs. */
  getTabDisplayNames: () => Record<string, string>;
  /** Returns tabs belonging to a specific project path. */
  getTabsForProject: (projectPath: string) => TerminalTab[];
  hasTab: (tabId: string) => boolean;
  /** Saves current activeTabId for the given project path. */
  saveActiveTabForProject: (projectPath: string) => void;
  /** Restores activeTabId for the given project path (falls back to first tab or null). */
  restoreActiveTabForProject: (projectPath: string) => void;
}

export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  counter: 0,
  isTerminalPaneOpen: true,
  isTerminalFullscreen: false,
  activeTabIdByProject: {},

  nextTabId: () => {
    const newCounter = get().counter + 1;
    set({ counter: newCounter });
    const windowLabel = getCurrentWindow().label;
    return `${windowLabel}-${RENDERER_INSTANCE_ID}-tab-${newCounter}`;
  },

  addTab: (id: string, path: string, sessionType: SessionType = 'claude') => {
    const tab: TerminalTab = {
      id,
      name: getSessionDisplayName(sessionType),
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

  renameTab: (id: string, name: string) =>
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id !== id) return t;
        const trimmed = name.trim();
        if (!trimmed) {
          // Empty name clears customName
          const { customName: _removed, ...rest } = t;
          return rest;
        }
        return { ...t, customName: trimmed };
      }),
    })),

  getTabDisplayNames: () => computeTabDisplayNames(get().tabs),

  toggleTerminalPane: () =>
    set((state) => ({
      isTerminalPaneOpen: !state.isTerminalPaneOpen,
      isTerminalFullscreen: !state.isTerminalPaneOpen ? state.isTerminalFullscreen : false,
    })),

  toggleTerminalFullscreen: () =>
    set((state) => ({
      isTerminalFullscreen: !state.isTerminalFullscreen,
      isTerminalPaneOpen: !state.isTerminalFullscreen ? true : state.isTerminalPaneOpen,
    })),

  getTabsForProject: (projectPath: string) => {
    return get().tabs.filter((t) => t.path === projectPath);
  },

  hasTab: (tabId: string) => {
    return get().tabs.some((t) => t.id === tabId);
  },

  saveActiveTabForProject: (projectPath: string) => {
    const { activeTabId, activeTabIdByProject } = get();
    if (activeTabId) {
      set({
        activeTabIdByProject: { ...activeTabIdByProject, [projectPath]: activeTabId },
      });
    }
  },

  restoreActiveTabForProject: (projectPath: string) => {
    const { activeTabIdByProject, tabs } = get();
    const savedId = activeTabIdByProject[projectPath];
    const projectTabs = tabs.filter((t) => t.path === projectPath);

    if (savedId && projectTabs.some((t) => t.id === savedId)) {
      set({ activeTabId: savedId });
    } else if (projectTabs.length > 0) {
      set({ activeTabId: projectTabs[0].id });
    } else {
      set({ activeTabId: null });
    }
  },
}));
