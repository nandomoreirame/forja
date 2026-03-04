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
      name: "Claude Code #1",
      path: "/test/path",
      isRunning: true,
      sessionType: "claude",
    });
    expect(state.activeTabId).toBe(tabId);
  });

  it("auto-increments tab names", () => {
    createTab("/path/a");
    createTab("/path/b");
    createTab("/path/c");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs.map((t) => t.name)).toEqual([
      "Claude Code #1",
      "Claude Code #2",
      "Claude Code #3",
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

    expect(id1).toBe("main-tab-1");
    expect(id2).toBe("main-tab-2");
    expect(useTerminalTabsStore.getState().counter).toBe(2);
  });

  it("adds tab with sessionType 'claude'", () => {
    createTab("/test/path", "claude");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("claude");
    expect(state.tabs[0].name).toBe("Claude Code #1");
  });

  it("adds tab with sessionType 'terminal'", () => {
    createTab("/test/path", "terminal");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("terminal");
    expect(state.tabs[0].name).toBe("Terminal #1");
  });

  it("adds tab with sessionType 'gemini'", () => {
    createTab("/test/path", "gemini");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("gemini");
    expect(state.tabs[0].name).toBe("Gemini CLI #1");
  });

  it("defaults to 'claude' when sessionType is not provided", () => {
    createTab("/test/path");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].sessionType).toBe("claude");
  });

  it("creates tabs with mixed session types and correct names", () => {
    createTab("/path/a", "claude");
    createTab("/path/b", "gemini");
    createTab("/path/c", "terminal");

    const state = useTerminalTabsStore.getState();
    expect(state.tabs[0].name).toBe("Claude Code #1");
    expect(state.tabs[1].name).toBe("Gemini CLI #2");
    expect(state.tabs[2].name).toBe("Terminal #3");
  });
});
