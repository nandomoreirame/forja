import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStateStore } from "../session-state";

describe("useSessionStateStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSessionStateStore.setState({ states: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with empty states", () => {
    const state = useSessionStateStore.getState();
    expect(state.states).toEqual({});
  });

  it("returns idle for unknown tab", () => {
    const { getState } = useSessionStateStore.getState();
    expect(getState("nonexistent")).toBe("idle");
  });

  it("marks tab as thinking when data arrives", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    expect(getState("tab-1")).toBe("thinking");
  });

  it("transitions to ready after timeout with no new data", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    expect(getState("tab-1")).toBe("thinking");

    vi.advanceTimersByTime(2500);
    expect(getState("tab-1")).toBe("ready");
  });

  it("stays thinking if data keeps arriving", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    vi.advanceTimersByTime(1000);
    onData("tab-1");
    vi.advanceTimersByTime(1000);
    onData("tab-1");
    vi.advanceTimersByTime(1000);

    expect(getState("tab-1")).toBe("thinking");
  });

  it("resets debounce timer on each data event", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    vi.advanceTimersByTime(1500);
    onData("tab-1");
    vi.advanceTimersByTime(1500);

    // Only 1.5s since last data, should still be thinking
    expect(getState("tab-1")).toBe("thinking");

    vi.advanceTimersByTime(1000);
    // Now 2.5s since last data, should be ready
    expect(getState("tab-1")).toBe("ready");
  });

  it("tracks multiple tabs independently", () => {
    const { onData, getState } = useSessionStateStore.getState();
    onData("tab-1");
    onData("tab-2");

    vi.advanceTimersByTime(2500);
    expect(getState("tab-1")).toBe("ready");
    expect(getState("tab-2")).toBe("ready");

    onData("tab-1");
    expect(getState("tab-1")).toBe("thinking");
    expect(getState("tab-2")).toBe("ready");
  });

  it("marks tab as exited", () => {
    const { onData, onExit, getState } = useSessionStateStore.getState();
    onData("tab-1");
    onExit("tab-1");
    expect(getState("tab-1")).toBe("exited");
  });

  it("cleans up tab state", () => {
    const { onData, cleanup, getState } = useSessionStateStore.getState();
    onData("tab-1");
    cleanup("tab-1");
    expect(getState("tab-1")).toBe("idle");
  });
});
