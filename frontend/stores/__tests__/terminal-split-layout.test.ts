import { beforeEach, describe, expect, it } from "vitest";
import { useTerminalSplitLayoutStore } from "../terminal-split-layout";

describe("terminal-split-layout store", () => {
  beforeEach(() => {
    useTerminalSplitLayoutStore.getState().resetForProjectSwitch();
  });

  it("starts with no split", () => {
    const state = useTerminalSplitLayoutStore.getState();
    expect(state.orientation).toBe("none");
    expect(state.ratio).toBe(50);
    expect(state.splitTabId).toBeNull();
    expect(state.secondarySessionType).toBeNull();
    expect(state.focusedPane).toBe("primary");
  });

  it("opens vertical split with tab id and session type", () => {
    const store = useTerminalSplitLayoutStore.getState();
    store.openSplit("vertical", "tab-1", "claude");

    const state = useTerminalSplitLayoutStore.getState();
    expect(state.orientation).toBe("vertical");
    expect(state.splitTabId).toBe("tab-1");
    expect(state.secondarySessionType).toBe("claude");
    expect(state.focusedPane).toBe("primary");
  });

  it("opens horizontal split", () => {
    const store = useTerminalSplitLayoutStore.getState();
    store.openSplit("horizontal", "tab-2", "terminal");

    const state = useTerminalSplitLayoutStore.getState();
    expect(state.orientation).toBe("horizontal");
    expect(state.splitTabId).toBe("tab-2");
    expect(state.secondarySessionType).toBe("terminal");
  });

  it("switches focus between panes", () => {
    const store = useTerminalSplitLayoutStore.getState();
    store.openSplit("horizontal", "tab-1", "claude");
    store.setFocusedPane("secondary");

    expect(useTerminalSplitLayoutStore.getState().focusedPane).toBe("secondary");
  });

  it("updates split ratio", () => {
    const store = useTerminalSplitLayoutStore.getState();
    store.openSplit("horizontal", "tab-1", "claude");
    store.setRatio(35);

    expect(useTerminalSplitLayoutStore.getState().ratio).toBe(35);
  });

  it("clamps ratio between 10 and 90", () => {
    const store = useTerminalSplitLayoutStore.getState();
    store.setRatio(5);
    expect(useTerminalSplitLayoutStore.getState().ratio).toBe(10);
    store.setRatio(95);
    expect(useTerminalSplitLayoutStore.getState().ratio).toBe(90);
  });

  it("closes split and resets to none", () => {
    const store = useTerminalSplitLayoutStore.getState();
    store.openSplit("vertical", "tab-1", "claude");
    store.closeSplit();

    const state = useTerminalSplitLayoutStore.getState();
    expect(state.orientation).toBe("none");
    expect(state.splitTabId).toBeNull();
    expect(state.secondarySessionType).toBeNull();
    expect(state.focusedPane).toBe("primary");
  });

  it("resets everything on project switch", () => {
    const store = useTerminalSplitLayoutStore.getState();
    store.openSplit("vertical", "tab-1", "claude");
    store.setRatio(70);
    store.setFocusedPane("secondary");
    store.resetForProjectSwitch();

    const state = useTerminalSplitLayoutStore.getState();
    expect(state.orientation).toBe("none");
    expect(state.ratio).toBe(50);
    expect(state.splitTabId).toBeNull();
    expect(state.secondarySessionType).toBeNull();
    expect(state.focusedPane).toBe("primary");
  });
});
