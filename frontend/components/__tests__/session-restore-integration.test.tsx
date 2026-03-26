import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: vi.fn(() => ({
      addBlock: vi.fn(),
      removeBlock: vi.fn(),
      hasBlock: vi.fn(() => false),
    })),
  },
}));

describe("session ID save/restore cycle", () => {
  beforeEach(() => {
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("serializeTabsForSave includes deterministic cliSessionId", () => {
    const store = useTerminalTabsStore.getState();
    const tabId = "main-test-tab-1";
    store.addTab(tabId, "/project", "claude", "MY SESSION");
    store.setCliSessionId(tabId, "aaaaaaaa-1111-2222-3333-444444444444");

    const serialized = useTerminalTabsStore.getState().serializeTabsForSave("/project");

    expect(serialized.tabs).toHaveLength(1);
    expect(serialized.tabs[0].id).toBe(tabId);
    expect(serialized.tabs[0].cliSessionId).toBe("aaaaaaaa-1111-2222-3333-444444444444");
    expect(serialized.tabs[0].customName).toBe("MY SESSION");
  });

  it("restored tab preserves exact same cliSessionId for --resume", () => {
    const store = useTerminalTabsStore.getState();
    store.registerTab("main-test-tab-1", "/project", "claude", "MY SESSION");
    store.setCliSessionId("main-test-tab-1", "aaaaaaaa-1111-2222-3333-444444444444");

    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "main-test-tab-1");
    expect(tab?.cliSessionId).toBe("aaaaaaaa-1111-2222-3333-444444444444");
    expect(tab?.customName).toBe("MY SESSION");
  });

  it("two Claude tabs get independent session IDs that survive serialize/restore", () => {
    const store = useTerminalTabsStore.getState();

    store.addTab("tab-A", "/project", "claude", "SESSION A");
    store.setCliSessionId("tab-A", "uuid-aaaa");
    store.addTab("tab-B", "/project", "claude", "SESSION B");
    store.setCliSessionId("tab-B", "uuid-bbbb");

    const saved = useTerminalTabsStore.getState().serializeTabsForSave("/project");
    expect(saved.tabs[0].cliSessionId).toBe("uuid-aaaa");
    expect(saved.tabs[1].cliSessionId).toBe("uuid-bbbb");

    // Simulate restore in a fresh store
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
    const freshStore = useTerminalTabsStore.getState();
    for (const tab of saved.tabs) {
      freshStore.registerTab(tab.id, "/project", tab.sessionType as any, tab.customName);
      if (tab.cliSessionId) freshStore.setCliSessionId(tab.id, tab.cliSessionId);
    }

    const restoredTabs = useTerminalTabsStore.getState().tabs;
    expect(restoredTabs[0].cliSessionId).toBe("uuid-aaaa");
    expect(restoredTabs[1].cliSessionId).toBe("uuid-bbbb");
    expect(restoredTabs[0].cliSessionId).not.toBe(restoredTabs[1].cliSessionId);
  });

  it("tmuxSessionName survives serialize/restore cycle", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-T", "/project", "terminal", "btop");
    store.setTmuxSessionName("tab-T", "forja-main-tab-T");

    const saved = useTerminalTabsStore.getState().serializeTabsForSave("/project");
    expect(saved.tabs[0].tmuxSessionName).toBe("forja-main-tab-T");

    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
    const freshStore = useTerminalTabsStore.getState();
    for (const tab of saved.tabs) {
      freshStore.registerTab(tab.id, "/project", tab.sessionType as any, tab.customName);
      if (tab.tmuxSessionName) freshStore.setTmuxSessionName(tab.id, tab.tmuxSessionName);
    }

    const restored = useTerminalTabsStore.getState().tabs[0];
    expect(restored.tmuxSessionName).toBe("forja-main-tab-T");
  });
});
