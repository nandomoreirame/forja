import { getCurrentWindow, invoke } from "@/lib/ipc";
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
  /** Epoch ms when this tab was created. Used by session detection to ignore
   *  filesystem sessions that existed before the tab was spawned. */
  createdAt?: number;
}

export interface ClosedTabEntry {
  path: string;
  sessionType: SessionType;
  customName?: string;
}

const MAX_RECENTLY_CLOSED = 20;

interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  counter: number;
  isTerminalFullscreen: boolean;
  recentlyClosed: ClosedTabEntry[];

  nextTabId: () => string;
  addTab: (id: string, path: string, sessionType?: SessionType, customName?: string) => void;
  /** Registers tab metadata WITHOUT creating a layout block. Used for non-active project tabs during session restore. */
  registerTab: (id: string, path: string, sessionType?: SessionType, customName?: string) => void;
  removeTab: (id: string) => void;
  /** Restores the most recently closed tab. Returns true if a tab was restored, false if no closed tabs exist. */
  restoreLastClosedTab: () => boolean;
  setActiveTab: (id: string) => void;
  markTabExited: (id: string) => void;
  markTabRunning: (id: string) => void;
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
  /** Serializes tabs for a specific project path into a disk-persistable format. */
  serializeTabsForSave: (projectPath: string) => {
    tabs: Array<{ id: string; sessionType: string; cliSessionId?: string; exited?: boolean; customName?: string }>;
    activeTabIndex: number;
  };
  /** Stores the detected CLI session ID on the specified tab for future resume capability. */
  setCliSessionId: (tabId: string, sessionId: string) => void;
  /** Removes all tabs for a given project path. */
  cleanupProjectState: (projectPath: string) => void;
}

export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  counter: 0,
  isTerminalFullscreen: false,
  recentlyClosed: [],

  nextTabId: () => {
    const newCounter = get().counter + 1;
    set({ counter: newCounter });
    const windowLabel = getCurrentWindow().label;
    return `${windowLabel}-${RENDERER_INSTANCE_ID}-tab-${newCounter}`;
  },

  addTab: (id: string, path: string, sessionType: SessionType = 'claude', customName?: string) => {
    const tab: TerminalTab = {
      id,
      name: getSessionDisplayName(sessionType),
      path,
      isRunning: true,
      sessionType,
      createdAt: Date.now(),
      ...(customName ? { customName } : {}),
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: id,
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
    const { tabs, activeTabId, recentlyClosed } = get();
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;

    // Save closed tab info for restore
    const closedTab = tabs[index];
    const entry: ClosedTabEntry = {
      path: closedTab.path,
      sessionType: closedTab.sessionType,
      customName: closedTab.customName,
    };
    const updatedClosed = [...recentlyClosed, entry].slice(-MAX_RECENTLY_CLOSED);

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

    set({ tabs: newTabs, activeTabId: newActiveTabId, recentlyClosed: updatedClosed });

    // Remove the block from the tiling layout
    useTilingLayoutStore.getState().removeBlock(id);

    // Clean up session telemetry for the removed tab
    import("./session-telemetry").then(({ useSessionTelemetryStore }) => {
      useSessionTelemetryStore.getState().cleanup(id);
    }).catch(() => {});
  },

  restoreLastClosedTab: () => {
    const { recentlyClosed } = get();
    if (recentlyClosed.length === 0) return false;

    const entry = recentlyClosed[recentlyClosed.length - 1];
    const updatedClosed = recentlyClosed.slice(0, -1);
    set({ recentlyClosed: updatedClosed });

    // Create a new tab with the closed tab's info
    const id = get().nextTabId();
    get().addTab(id, entry.path, entry.sessionType, entry.customName);

    return true;
  },

  setActiveTab: (id: string) =>
    set({ activeTabId: id }),

  markTabExited: (id: string) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, isRunning: false } : t
      ),
    })),

  markTabRunning: (id: string) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, isRunning: true } : t
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

  serializeTabsForSave: (projectPath: string) => {
    const projectTabs = get().tabs.filter((t) => t.path === projectPath);
    const activeIdx = projectTabs.findIndex((t) => t.id === get().activeTabId);
    return {
      tabs: projectTabs.map((tab) => ({
        id: tab.id,
        sessionType: tab.sessionType,
        ...(tab.cliSessionId ? { cliSessionId: tab.cliSessionId } : {}),
        ...(!tab.isRunning ? { exited: true } : {}),
        ...(tab.customName ? { customName: tab.customName } : {}),
      })),
      activeTabIndex: activeIdx >= 0 ? activeIdx : 0,
    };
  },

  setCliSessionId: (tabId: string, sessionId: string) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, cliSessionId: sessionId } : t
      ),
    })),

  cleanupProjectState: (projectPath: string) => {
    const { tabs, activeTabId } = get();
    const remainingTabs = tabs.filter((t) => t.path !== projectPath);

    // If the active tab belonged to the removed project, switch to another
    const activeGone = activeTabId && !remainingTabs.some((t) => t.id === activeTabId);
    const newActiveTabId = activeGone ? (remainingTabs[0]?.id ?? null) : activeTabId;

    set({
      tabs: remainingTabs,
      activeTabId: newActiveTabId,
    });
  },
}));

/**
 * Sync tab display names to the main process whenever tabs change.
 * This allows the WS bridge (mobile remote control) to show the correct
 * tab name including customName and auto-numbered names like "Claude #2".
 */
let prevDisplayNames: Record<string, string> = {};

function syncDisplayNames(state: { tabs: TerminalTab[] }): void {
  const names = computeTabDisplayNames(state.tabs);
  try {
    for (const [tabId, name] of Object.entries(names)) {
      if (prevDisplayNames[tabId] !== name) {
        invoke("pty:set-tab-display-name", { tabId, displayName: name }).catch(() => {});
      }
    }
    // Clean up removed tabs
    for (const tabId of Object.keys(prevDisplayNames)) {
      if (!(tabId in names)) {
        invoke("pty:set-tab-display-name", { tabId, displayName: "" }).catch(() => {});
      }
    }
  } catch {
    // Silently ignore in test environments where invoke is not available
  }
  prevDisplayNames = names;
}

useTerminalTabsStore.subscribe(syncDisplayNames);

// Sync immediately for any tabs that already exist at store creation time
syncDisplayNames(useTerminalTabsStore.getState());
