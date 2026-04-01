import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

import { useTerminalTabsStore } from "../terminal-tabs";

describe("wasResumed serialization", () => {
  beforeEach(() => {
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("includes wasResumed in serialized output", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");
    store.markTabResumed("tab-1");

    const serialized = store.serializeTabsForSave("/project");
    expect(serialized.tabs[0].wasResumed).toBe(true);
  });

  it("omits wasResumed when not set", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");

    const serialized = store.serializeTabsForSave("/project");
    expect(serialized.tabs[0].wasResumed).toBeUndefined();
  });
});
