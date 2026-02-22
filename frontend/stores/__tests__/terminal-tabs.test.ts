import { beforeEach, describe, expect, it } from "vitest";
import { useTerminalTabsStore } from "../terminal-tabs";

/**
 * Helper that mirrors the real app flow: nextTabId() then addTab().
 */
function createTab(path: string) {
  const store = useTerminalTabsStore.getState();
  const tabId = store.nextTabId();
  useTerminalTabsStore.getState().addTab(tabId, path);
  return tabId;
}

describe("useTerminalTabsStore", () => {
  beforeEach(() => {
    useTerminalTabsStore.setState({
      tabs: [],
      activeTabId: null,
      counter: 0,
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
      name: "Session #1",
      path: "/test/path",
      isRunning: true,
    });
    expect(state.activeTabId).toBe(tabId);
  });

  it("auto-increments tab names", () => {
    createTab("/path/a");
    createTab("/path/b");
    createTab("/path/c");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs.map((t) => t.name)).toEqual([
      "Session #1",
      "Session #2",
      "Session #3",
    ]);
  });

  it("removes a tab and activates the previous one", () => {
    const id1 = createTab("/a");
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
    const id2 = createTab("/b");

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

    expect(id1).toBe("tab-1");
    expect(id2).toBe("tab-2");
    expect(useTerminalTabsStore.getState().counter).toBe(2);
  });
});
