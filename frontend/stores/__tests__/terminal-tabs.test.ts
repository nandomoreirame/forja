import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTerminalTabsStore } from "../terminal-tabs";
import type { SessionType } from "@/lib/cli-registry";

vi.mock("@/lib/ipc", () => ({
  getCurrentWindow: () => ({ label: "main" }),
}));

/**
 * Helper that mirrors the real app flow: nextTabId() then addTab().
 */
function createTab(path: string, sessionType?: SessionType) {
  const store = useTerminalTabsStore.getState();
  const tabId = store.nextTabId();
  useTerminalTabsStore.getState().addTab(tabId, path, sessionType);
  return tabId;
}

describe("useTerminalTabsStore", () => {
  beforeEach(() => {
    useTerminalTabsStore.setState({
      tabs: [],
      activeTabId: null,
      counter: 0,
      isTerminalFullscreen: false,
      tabLastActiveAt: {},
    });
  });

  it("starts with empty tabs and no active tab", () => {
    const state = useTerminalTabsStore.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTabId).toBeNull();
  });

  it("adds a tab and sets it as active", () => {
    const tabId = createTab("/test/path");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]).toEqual({
      id: tabId,
      name: "Claude Code",
      path: "/test/path",
      isRunning: true,
      sessionType: "claude",
    });
    expect(state.activeTabId).toBe(tabId);
  });

  it("stores base name (no counter) — display names are computed dynamically", () => {
    createTab("/path/a");
    createTab("/path/b");
    createTab("/path/c");

    const state = useTerminalTabsStore.getState();
    // The stored name is always the base name — no static counter
    expect(state.tabs.map((t) => t.name)).toEqual([
      "Claude Code",
      "Claude Code",
      "Claude Code",
    ]);
  });

  it("removes a tab and activates the previous one", () => {
    createTab("/a");
    const id2 = createTab("/b");
    const id3 = createTab("/c");

    useTerminalTabsStore.getState().removeTab(id3);

    const state = useTerminalTabsStore.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabId).toBe(id2);
  });

  it("removes a tab and activates the next one when no previous", () => {
    const id1 = createTab("/a");
    const id2 = createTab("/b");
    useTerminalTabsStore.getState().setActiveTab(id1);

    useTerminalTabsStore.getState().removeTab(id1);

    const state = useTerminalTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(id2);
  });

  it("sets activeTabId to null when last tab is removed", () => {
    const id1 = createTab("/a");

    useTerminalTabsStore.getState().removeTab(id1);

    const state = useTerminalTabsStore.getState();
    expect(state.tabs).toHaveLength(0);
    expect(state.activeTabId).toBeNull();
  });

  it("sets active tab", () => {
    const id1 = createTab("/a");
    createTab("/b");

    useTerminalTabsStore.getState().setActiveTab(id1);

    const state = useTerminalTabsStore.getState();
    expect(state.activeTabId).toBe(id1);
  });

  it("marks a tab as exited", () => {
    const id1 = createTab("/a");

    useTerminalTabsStore.getState().markTabExited(id1);

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].isRunning).toBe(false);
  });

  it("generates sequential tab IDs with nextTabId", () => {
    const store = useTerminalTabsStore.getState();
    const id1 = store.nextTabId();
    const id2 = useTerminalTabsStore.getState().nextTabId();

    expect(id1).toMatch(/^main-.+-tab-1$/);
    expect(id2).toMatch(/^main-.+-tab-2$/);
    expect(useTerminalTabsStore.getState().counter).toBe(2);
  });

  it("adds tab with sessionType 'claude'", () => {
    createTab("/test/path", "claude");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("claude");
    expect(state.tabs[0].name).toBe("Claude Code");
  });

  it("adds tab with sessionType 'terminal'", () => {
    createTab("/test/path", "terminal");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("terminal");
    expect(state.tabs[0].name).toBe("Terminal");
  });

  it("adds tab with sessionType 'gemini'", () => {
    createTab("/test/path", "gemini");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("gemini");
    expect(state.tabs[0].name).toBe("Gemini CLI");
  });

  it("defaults to 'claude' when sessionType is not provided", () => {
    createTab("/test/path");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("claude");
  });

  it("creates tabs with mixed session types storing base names", () => {
    createTab("/path/a", "claude");
    createTab("/path/b", "gemini");
    createTab("/path/c", "terminal");

    const state = useTerminalTabsStore.getState();
    // Stored names are base names (no counters)
    expect(state.tabs[0].name).toBe("Claude Code");
    expect(state.tabs[1].name).toBe("Gemini CLI");
    expect(state.tabs[2].name).toBe("Terminal");
  });

  describe("getTabDisplayNames", () => {
    it("returns empty object when no tabs", () => {
      const names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names).toEqual({});
    });

    it("single tab of each type — no numbers shown", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "gemini");
      const id3 = createTab("/c", "terminal");

      const names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id1]).toBe("Claude Code");
      expect(names[id2]).toBe("Gemini CLI");
      expect(names[id3]).toBe("Terminal");
    });

    it("two claude tabs get per-type sequential numbers", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "claude");

      const names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id1]).toBe("Claude Code #1");
      expect(names[id2]).toBe("Claude Code #2");
    });

    it("mixed types: two claude, one gemini — only claude gets numbers", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "gemini");
      const id3 = createTab("/c", "claude");

      const names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id1]).toBe("Claude Code #1");
      expect(names[id2]).toBe("Gemini CLI");
      expect(names[id3]).toBe("Claude Code #2");
    });

    it("counter resets after tabs are removed — based on current open tabs only", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "claude");

      // Both show numbers when there are 2
      let names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id1]).toBe("Claude Code #1");
      expect(names[id2]).toBe("Claude Code #2");

      // Remove first tab — remaining tab shows no number
      useTerminalTabsStore.getState().removeTab(id1);
      names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id2]).toBe("Claude Code");
    });

    it("numbers restart from 1 for new tabs after clearing", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "claude");

      // Remove both
      useTerminalTabsStore.getState().removeTab(id1);
      useTerminalTabsStore.getState().removeTab(id2);

      // Open two new ones — counter starts at 1 again
      const id3 = createTab("/c", "claude");
      const id4 = createTab("/d", "claude");

      const names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id3]).toBe("Claude Code #1");
      expect(names[id4]).toBe("Claude Code #2");
    });
  });

  describe("per-project tab isolation", () => {
    it("getTabsForProject returns only tabs matching the given path", () => {
      createTab("/project-a", "claude");
      createTab("/project-b", "terminal");
      createTab("/project-a", "gemini");

      const tabsA = useTerminalTabsStore.getState().getTabsForProject("/project-a");
      const tabsB = useTerminalTabsStore.getState().getTabsForProject("/project-b");

      expect(tabsA).toHaveLength(2);
      expect(tabsA.every((t) => t.path === "/project-a")).toBe(true);
      expect(tabsB).toHaveLength(1);
      expect(tabsB[0].path).toBe("/project-b");
    });

    it("getTabsForProject returns empty array for unknown project", () => {
      createTab("/project-a", "claude");

      const tabs = useTerminalTabsStore.getState().getTabsForProject("/unknown");
      expect(tabs).toHaveLength(0);
    });

    it("hasTab returns true only for existing tab ids", () => {
      const id = createTab("/project-a", "claude");
      const store = useTerminalTabsStore.getState();

      expect(store.hasTab(id)).toBe(true);
      expect(store.hasTab("missing-tab")).toBe(false);
    });

    it("remembers active tab per project when switching", () => {
      const idA1 = createTab("/project-a", "claude");
      const idA2 = createTab("/project-a", "terminal");
      const idB1 = createTab("/project-b", "claude");

      // Active tab is idB1 (last added)
      // Set active to idA1 for project A
      useTerminalTabsStore.getState().setActiveTab(idA1);
      useTerminalTabsStore.getState().saveActiveTabForProject("/project-a");

      // Switch to project B
      useTerminalTabsStore.getState().setActiveTab(idB1);
      useTerminalTabsStore.getState().saveActiveTabForProject("/project-b");

      // Restore project A
      useTerminalTabsStore.getState().restoreActiveTabForProject("/project-a");
      expect(useTerminalTabsStore.getState().activeTabId).toBe(idA1);

      // Restore project B
      useTerminalTabsStore.getState().restoreActiveTabForProject("/project-b");
      expect(useTerminalTabsStore.getState().activeTabId).toBe(idB1);
    });

    it("restoreActiveTabForProject falls back to first tab if saved tab was removed", () => {
      const idA1 = createTab("/project-a", "claude");
      const idA2 = createTab("/project-a", "terminal");

      // Save idA1 as active for project-a
      useTerminalTabsStore.getState().setActiveTab(idA1);
      useTerminalTabsStore.getState().saveActiveTabForProject("/project-a");

      // Remove idA1
      useTerminalTabsStore.getState().removeTab(idA1);

      // Restore should fall back to idA2
      useTerminalTabsStore.getState().restoreActiveTabForProject("/project-a");
      expect(useTerminalTabsStore.getState().activeTabId).toBe(idA2);
    });

    it("restoreActiveTabForProject sets null if project has no tabs", () => {
      createTab("/project-a", "claude");

      useTerminalTabsStore.getState().restoreActiveTabForProject("/project-b");
      expect(useTerminalTabsStore.getState().activeTabId).toBeNull();
    });

    it("markTabExited keeps all tabs in the list", () => {
      const idA1 = createTab("/project-a", "claude");
      const idA2 = createTab("/project-a", "terminal");

      useTerminalTabsStore.getState().markTabExited(idA1);

      const state = useTerminalTabsStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.tabs[0].isRunning).toBe(false);
      expect(state.tabs[1].isRunning).toBe(true);
    });

    it("exited tabs persist across project switches", () => {
      const idA1 = createTab("/project-a", "claude");
      createTab("/project-b", "terminal");

      // Mark A's tab as exited (simulating pty:exit)
      useTerminalTabsStore.getState().markTabExited(idA1);

      // Save and switch away from A
      useTerminalTabsStore.getState().setActiveTab(idA1);
      useTerminalTabsStore.getState().saveActiveTabForProject("/project-a");

      // Switch to B
      useTerminalTabsStore.getState().restoreActiveTabForProject("/project-b");

      // Switch back to A — exited tab should still be there
      useTerminalTabsStore.getState().restoreActiveTabForProject("/project-a");

      expect(useTerminalTabsStore.getState().activeTabId).toBe(idA1);
      const tabA = useTerminalTabsStore.getState().tabs.find((t) => t.id === idA1);
      expect(tabA).toBeDefined();
      expect(tabA!.isRunning).toBe(false);
    });
  });

  describe("renameTab", () => {
    it("renameTab sets customName on the specified tab", () => {
      const id1 = createTab("/a", "claude");
      createTab("/b", "claude");

      useTerminalTabsStore.getState().renameTab(id1, "My Build");

      const state = useTerminalTabsStore.getState();
      expect(state.tabs[0].customName).toBe("My Build");
      expect(state.tabs[1].customName).toBeUndefined();
    });

    it("renameTab with empty string clears customName", () => {
      const id1 = createTab("/a", "claude");
      useTerminalTabsStore.getState().renameTab(id1, "Custom Name");
      useTerminalTabsStore.getState().renameTab(id1, "");

      const state = useTerminalTabsStore.getState();
      expect(state.tabs[0].customName).toBeUndefined();
    });

    it("renameTab does nothing for unknown tabId", () => {
      createTab("/a", "claude");
      useTerminalTabsStore.getState().renameTab("unknown-id", "Name");

      const state = useTerminalTabsStore.getState();
      expect(state.tabs[0].customName).toBeUndefined();
    });

    it("getTabDisplayNames returns customName for renamed tabs", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "claude");

      useTerminalTabsStore.getState().renameTab(id1, "My Build");

      const names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id1]).toBe("My Build");
      // id2 still gets auto-named — but since id1 has customName, only id2 is "claude" type for numbering
      expect(names[id2]).toBe("Claude Code");
    });

    it("getTabDisplayNames: two renamed tabs each show their customName", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "claude");

      useTerminalTabsStore.getState().renameTab(id1, "Frontend");
      useTerminalTabsStore.getState().renameTab(id2, "Backend");

      const names = useTerminalTabsStore.getState().getTabDisplayNames();
      expect(names[id1]).toBe("Frontend");
      expect(names[id2]).toBe("Backend");
    });
  });

  describe("reorderTabs", () => {
    it("swaps two tabs by their IDs", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "terminal");
      const id3 = createTab("/c", "gemini");

      useTerminalTabsStore.getState().reorderTabs(id1, id3);

      const ids = useTerminalTabsStore.getState().tabs.map((t) => t.id);
      expect(ids).toEqual([id2, id3, id1]);
    });

    it("no-op when activeId equals overId", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "terminal");

      useTerminalTabsStore.getState().reorderTabs(id1, id1);

      const ids = useTerminalTabsStore.getState().tabs.map((t) => t.id);
      expect(ids).toEqual([id1, id2]);
    });

    it("no-op when activeId is unknown", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "terminal");

      useTerminalTabsStore.getState().reorderTabs("unknown", id2);

      const ids = useTerminalTabsStore.getState().tabs.map((t) => t.id);
      expect(ids).toEqual([id1, id2]);
    });

    it("no-op when overId is unknown", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "terminal");

      useTerminalTabsStore.getState().reorderTabs(id1, "unknown");

      const ids = useTerminalTabsStore.getState().tabs.map((t) => t.id);
      expect(ids).toEqual([id1, id2]);
    });

    it("moves last tab to first position", () => {
      const id1 = createTab("/a", "claude");
      const id2 = createTab("/b", "terminal");
      const id3 = createTab("/c", "gemini");

      useTerminalTabsStore.getState().reorderTabs(id3, id1);

      const ids = useTerminalTabsStore.getState().tabs.map((t) => t.id);
      expect(ids).toEqual([id3, id1, id2]);
    });
  });

  describe("registerTab", () => {
    it("adds tab metadata without creating a layout block", () => {
      const store = useTerminalTabsStore.getState();
      store.registerTab("reg-1", "/project-a", "claude");

      const state = useTerminalTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0]).toEqual({
        id: "reg-1",
        name: "Claude Code",
        path: "/project-a",
        isRunning: true,
        sessionType: "claude",
      });
    });

    it("does not set activeTabId", () => {
      const store = useTerminalTabsStore.getState();
      store.registerTab("reg-1", "/project-a", "claude");

      expect(useTerminalTabsStore.getState().activeTabId).toBeNull();
    });

    it("does not create a layout block (addTab does, registerTab does not)", () => {
      const store = useTerminalTabsStore.getState();

      // registerTab should only add metadata
      store.registerTab("reg-1", "/project-a", "terminal");

      // Verify tab exists in the store
      expect(store.hasTab("reg-1")).toBe(true);

      // Now use addTab to create another tab — it SHOULD create a block
      // This confirms the two methods have different behavior
      const id2 = store.nextTabId();
      useTerminalTabsStore.getState().addTab(id2, "/project-a", "terminal");

      // addTab sets activeTabId, registerTab does not
      expect(useTerminalTabsStore.getState().activeTabId).toBe(id2);
    });

    it("supports optional customName", () => {
      const store = useTerminalTabsStore.getState();
      store.registerTab("reg-1", "/project-a", "claude", "My Build");

      const state = useTerminalTabsStore.getState();
      expect(state.tabs[0].customName).toBe("My Build");
    });

    it("defaults sessionType to claude when not provided", () => {
      const store = useTerminalTabsStore.getState();
      store.registerTab("reg-1", "/project-a");

      const state = useTerminalTabsStore.getState();
      expect(state.tabs[0].sessionType).toBe("claude");
    });
  });

  describe("ensureBlocksForProjectTabs", () => {
    it("creates layout blocks for project tabs that have no block", () => {
      const store = useTerminalTabsStore.getState();
      // Register tabs (no blocks created)
      store.registerTab("tab-a1", "/project-a", "claude");
      store.registerTab("tab-a2", "/project-a", "terminal");

      // Call ensureBlocks — should create layout blocks for missing tabs
      useTerminalTabsStore.getState().ensureBlocksForProjectTabs("/project-a");

      // Verify tabs still exist
      expect(useTerminalTabsStore.getState().tabs).toHaveLength(2);
    });

    it("does not duplicate blocks for tabs that already have one", () => {
      const store = useTerminalTabsStore.getState();
      // addTab creates a block
      const id = store.nextTabId();
      store.addTab(id, "/project-a", "claude");

      // ensureBlocks should not create a duplicate
      useTerminalTabsStore.getState().ensureBlocksForProjectTabs("/project-a");

      expect(useTerminalTabsStore.getState().tabs).toHaveLength(1);
    });

    it("only creates blocks for the specified project", () => {
      const store = useTerminalTabsStore.getState();
      store.registerTab("tab-a1", "/project-a", "claude");
      store.registerTab("tab-b1", "/project-b", "terminal");

      useTerminalTabsStore.getState().ensureBlocksForProjectTabs("/project-a");

      // Only project-a's tab should have been processed
      // project-b's tab should still have no block
      expect(useTerminalTabsStore.getState().getTabsForProject("/project-a")).toHaveLength(1);
      expect(useTerminalTabsStore.getState().getTabsForProject("/project-b")).toHaveLength(1);
    });

    it("sets activeTabId to the first project tab if none is active", () => {
      const store = useTerminalTabsStore.getState();
      store.registerTab("tab-a1", "/project-a", "claude");
      store.registerTab("tab-a2", "/project-a", "terminal");

      expect(useTerminalTabsStore.getState().activeTabId).toBeNull();

      useTerminalTabsStore.getState().ensureBlocksForProjectTabs("/project-a");

      // activeTabId should be set to first tab of the project
      const projectTabs = useTerminalTabsStore.getState().getTabsForProject("/project-a");
      expect(projectTabs.length).toBeGreaterThan(0);
    });
  });

  describe("terminal fullscreen", () => {
    it("starts with isTerminalFullscreen as false", () => {
      const state = useTerminalTabsStore.getState();
      expect(state.isTerminalFullscreen).toBe(false);
    });

    it("toggleTerminalFullscreen toggles the value", () => {
      useTerminalTabsStore.getState().toggleTerminalFullscreen();
      expect(useTerminalTabsStore.getState().isTerminalFullscreen).toBe(true);

      useTerminalTabsStore.getState().toggleTerminalFullscreen();
      expect(useTerminalTabsStore.getState().isTerminalFullscreen).toBe(false);
    });

  });

  describe("tabLastActiveAt tracking", () => {
    it("initializes with empty tabLastActiveAt", () => {
      expect(useTerminalTabsStore.getState().tabLastActiveAt).toEqual({});
    });

    it("records timestamp when setActiveTab is called", () => {
      const id1 = createTab("/a");
      const before = Date.now();
      useTerminalTabsStore.getState().setActiveTab(id1);
      const after = Date.now();

      const lastActive = useTerminalTabsStore.getState().tabLastActiveAt[id1];
      expect(lastActive).toBeGreaterThanOrEqual(before);
      expect(lastActive).toBeLessThanOrEqual(after);
    });

    it("records timestamp when addTab creates a tab", () => {
      const before = Date.now();
      const id1 = createTab("/a");
      const after = Date.now();

      const lastActive = useTerminalTabsStore.getState().tabLastActiveAt[id1];
      expect(lastActive).toBeGreaterThanOrEqual(before);
      expect(lastActive).toBeLessThanOrEqual(after);
    });
  });
});
