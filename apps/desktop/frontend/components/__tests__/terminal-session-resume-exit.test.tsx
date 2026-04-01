import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

describe("onExit behavior for resumed sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("markTabResumed sets wasResumed flag on tab", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");

    store.markTabResumed("tab-1");

    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
    expect(tab?.wasResumed).toBe(true);
  });

  it("fresh AI CLI tab does not have wasResumed flag", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-2", "/project", "claude");

    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-2");
    expect(tab?.wasResumed).toBeFalsy();
  });

  it("markTabResumed only affects the specified tab", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");
    store.addTab("tab-2", "/project", "claude");

    store.markTabResumed("tab-1");

    const tab1 = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
    const tab2 = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-2");
    expect(tab1?.wasResumed).toBe(true);
    expect(tab2?.wasResumed).toBeFalsy();
  });
});
