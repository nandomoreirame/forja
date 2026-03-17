import { getCurrentWindow } from "@/lib/ipc";
import { computeTabDisplayNames, getSessionDisplayName, type SessionType } from "@/lib/cli-registry";
import { create } from "zustand";
import { useTilingLayoutStore } from "./tiling-layout";

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
  /** Detected CLI session ID for resume. Set when the CLI reports its session ID via output parsing. */
  cliSessionId?: string;
}

interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  counter: number;
  isTerminalFullscreen: boolean;
  activeTabIdByProject: Record<string, string>;
  tabLastActiveAt: Record<string, number>;
  isFullscreenByProject: Record<string, boolean>;

  nextTabId: () => string;
  addTab: (id: string, path: string, sessionType?: SessionType) => void;
  /** Registers tab metadata WITHOUT creating a layout block. Used for non-active project tabs during session restore. */
  registerTab: (id: string, path: string, sessionType?: SessionType, customName?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  markTabExited: (id: string) => void;
  /** Renames a tab with a custom user-defined name. Empty string clears the custom name. */
  renameTab: (id: string, name: string) => void;
  toggleTerminalFullscreen: () => void;
  /** Returns a map of tabId -> computed display name based on current open tabs. */
  getTabDisplayNames: () => Record<string, string>;
  /** Returns tabs belonging to a specific project path. */
  getTabsForProject: (projectPath: string) => TerminalTab[];
  /** Reorders tabs by moving the tab with activeId to the position of overId. */
  reorderTabs: (activeId: string, overId: string) => void;
  /** Creates layout blocks for project tabs that were registered without blocks (e.g., non-active project tabs during session restore). */
  ensureBlocksForProjectTabs: (projectPath: string) => void;
  hasTab: (tabId: string) => boolean;
  /** Stores the detected CLI session ID on the specified tab for future resume capability. */
  setCliSessionId: (tabId: string, sessionId: string) => void;
  /** Saves current activeTabId for the given project path. */
  saveActiveTabForProject: (projectPath: string) => void;
  /** Restores activeTabId for the given project path (falls back to first tab or null). */
  restoreActiveTabForProject: (projectPath: string) => void;
  /** Saves terminal fullscreen state for the given project path. */
  saveFullscreenForProject: (projectPath: string) => void;
  /** Restores terminal fullscreen state for the given project path. */
  restoreFullscreenForProject: (projectPath: string) => void;
}

export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  counter: 0,
  isTerminalFullscreen: false,
  activeTabIdByProject: {},
  tabLastActiveAt: {},
  isFullscreenByProject: {},

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
      tabLastActiveAt: { ...state.tabLastActiveAt, [id]: Date.now() },
    }));

    // Create a terminal block in the tiling layout (use tabId as nodeId)
    useTilingLayoutStore.getState().addBlock(
      { type: "terminal", tabId: id, sessionType },
      undefined,
      id,
    );
  },

  registerTab: (id: string, path: string, sessionType: SessionType = 'claude', customName?: string) => {
    const tab: TerminalTab = {
      id,
      name: getSessionDisplayName(sessionType),
      path,
      isRunning: true,
      sessionType,
    };
    if (customName) {
      tab.customName = customName;
    }
    set((state) => ({
      tabs: [...state.tabs, tab],
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

    // Remove the block from the tiling layout
    useTilingLayoutStore.getState().removeBlock(id);
  },

  setActiveTab: (id: string) =>
    set((state) => ({
      activeTabId: id,
      tabLastActiveAt: { ...state.tabLastActiveAt, [id]: Date.now() },
    })),

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

  toggleTerminalFullscreen: () =>
    set((state) => ({
      isTerminalFullscreen: !state.isTerminalFullscreen,
    })),

  getTabsForProject: (projectPath: string) => {
    return get().tabs.filter((t) => t.path === projectPath);
  },

  reorderTabs: (activeId: string, overId: string) => {
    const { tabs } = get();
    const oldIndex = tabs.findIndex((t) => t.id === activeId);
    const newIndex = tabs.findIndex((t) => t.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    const newTabs = [...tabs];
    const [moved] = newTabs.splice(oldIndex, 1);
    newTabs.splice(newIndex, 0, moved);
    set({ tabs: newTabs });
  },

  ensureBlocksForProjectTabs: (projectPath: string) => {
    const projectTabs = get().tabs.filter((t) => t.path === projectPath);
    const tilingStore = useTilingLayoutStore.getState();
    for (const tab of projectTabs) {
      if (!tilingStore.hasBlock(tab.id)) {
        tilingStore.addBlock(
          { type: "terminal", tabId: tab.id, sessionType: tab.sessionType },
          undefined,
          tab.id,
        );
      }
    }
  },

  hasTab: (tabId: string) => {
    return get().tabs.some((t) => t.id === tabId);
  },

  setCliSessionId: (tabId: string, sessionId: string) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, cliSessionId: sessionId } : t
      ),
    })),

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

  saveFullscreenForProject: (projectPath: string) => {
    const { isTerminalFullscreen, isFullscreenByProject } = get();
    set({
      isFullscreenByProject: { ...isFullscreenByProject, [projectPath]: isTerminalFullscreen },
    });
  },

  restoreFullscreenForProject: (projectPath: string) => {
    const { isFullscreenByProject } = get();
    const saved = isFullscreenByProject[projectPath];
    set({ isTerminalFullscreen: saved ?? false });
  },
}));
