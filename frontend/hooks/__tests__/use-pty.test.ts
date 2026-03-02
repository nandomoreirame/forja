import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePty } from "../use-pty";

const mockInvoke = vi.fn();
const mockListen = vi.fn();
let listenCallbacks: Record<string, (event: { payload: unknown }) => void> = {};

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (event: string, callback: (event: { payload: unknown }) => void) => {
    listenCallbacks[event] = callback;
    mockListen(event, callback);
    return Promise.resolve(() => {
      delete listenCallbacks[event];
    });
  },
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ label: "main" }),
}));

describe("usePty", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockListen.mockClear();
    listenCallbacks = {};
    mockInvoke.mockResolvedValue(undefined);
  });

  it("starts with isRunning as false", () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));
    expect(result.current.isRunning).toBe(false);
  });

  it("calls write_pty with tabId when write is called", () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    act(() => {
      result.current.write("hello");
    });

    expect(mockInvoke).toHaveBeenCalledWith("write_pty", {
      tabId: "tab-1",
      data: "hello",
    });
  });

  it("calls resize_pty with tabId when resize is called", async () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.resize(48, 120);
    });

    expect(mockInvoke).toHaveBeenCalledWith("resize_pty", {
      tabId: "tab-1",
      rows: 48,
      cols: 120,
    });
  });

  it("calls close_pty with tabId when close is called", async () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.close();
    });

    expect(mockInvoke).toHaveBeenCalledWith("close_pty", {
      tabId: "tab-1",
    });
    expect(result.current.isRunning).toBe(false);
  });

  it("sets up scoped pty:data and pty:exit listeners on mount", () => {
    renderHook(() => usePty({ tabId: "tab-1" }));

    expect(mockListen).toHaveBeenCalledWith("pty:data:tab-1", expect.any(Function));
    expect(mockListen).toHaveBeenCalledWith("pty:exit:tab-1", expect.any(Function));
  });

  it("calls onData callback when scoped event fires", () => {
    const onData = vi.fn();
    renderHook(() => usePty({ tabId: "tab-1", onData }));

    act(() => {
      listenCallbacks["pty:data:tab-1"]?.({
        payload: { tab_id: "tab-1", data: "hello" },
      });
    });
    expect(onData).toHaveBeenCalledWith("hello");

    // tab-2 events go to a different scoped listener, not this one
    expect(listenCallbacks["pty:data:tab-2"]).toBeUndefined();
  });

  it("calls onExit and sets isRunning false when scoped exit event fires", async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePty({ tabId: "tab-1", onExit }));

    // Simulate spawn to set isRunning
    mockInvoke.mockResolvedValueOnce("tab-1");
    await act(async () => {
      await result.current.spawn("/test/path");
    });
    expect(result.current.isRunning).toBe(true);

    // Scoped exit event for this tab
    act(() => {
      listenCallbacks["pty:exit:tab-1"]?.({
        payload: { tab_id: "tab-1", code: 0 },
      });
    });
    expect(result.current.isRunning).toBe(false);
    expect(onExit).toHaveBeenCalledWith(0);
  });

  it("calls spawn_pty and returns tab_id from spawn", async () => {
    mockInvoke.mockResolvedValueOnce("tab-1");
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    let tabId: string | undefined;
    await act(async () => {
      tabId = await result.current.spawn("/test/path");
    });

    expect(mockInvoke).toHaveBeenCalledWith("spawn_pty", {
      tabId: "tab-1",
      path: "/test/path",
      windowLabel: "main",
    });
    expect(tabId).toBe("tab-1");
    expect(result.current.isRunning).toBe(true);
  });
});
