import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePty } from "../use-pty";

const mockInvoke = vi.fn();
const mockListen = vi.fn();
let listenCallbacks: Record<string, (event: { payload: unknown }) => void> = {};

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  listen: (event: string, callback: (event: { payload: unknown }) => void) => {
    listenCallbacks[event] = callback;
    mockListen(event, callback);
    return Promise.resolve(() => {
      delete listenCallbacks[event];
    });
  },
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

  it("calls write_pty with tabId when write is called", async () => {
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.write("hello");
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

  it("sets up pty:data and pty:exit listeners on mount", () => {
    renderHook(() => usePty({ tabId: "tab-1" }));

    expect(mockListen).toHaveBeenCalledWith("pty:data", expect.any(Function));
    expect(mockListen).toHaveBeenCalledWith("pty:exit", expect.any(Function));
  });

  it("calls onData callback only for matching tab_id", () => {
    const onData = vi.fn();
    renderHook(() => usePty({ tabId: "tab-1", onData }));

    // Matching tab_id
    act(() => {
      listenCallbacks["pty:data"]?.({
        payload: { tab_id: "tab-1", data: "hello" },
      });
    });
    expect(onData).toHaveBeenCalledWith("hello");

    onData.mockClear();

    // Non-matching tab_id should be ignored
    act(() => {
      listenCallbacks["pty:data"]?.({
        payload: { tab_id: "tab-2", data: "world" },
      });
    });
    expect(onData).not.toHaveBeenCalled();
  });

  it("calls onExit and sets isRunning false only for matching tab_id", async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePty({ tabId: "tab-1", onExit }));

    // Simulate spawn to set isRunning
    mockInvoke.mockResolvedValueOnce("tab-1");
    await act(async () => {
      await result.current.spawn("/test/path");
    });
    expect(result.current.isRunning).toBe(true);

    // Non-matching tab_id - should NOT set isRunning to false
    act(() => {
      listenCallbacks["pty:exit"]?.({
        payload: { tab_id: "tab-2", code: 0 },
      });
    });
    expect(result.current.isRunning).toBe(true);
    expect(onExit).not.toHaveBeenCalled();

    // Matching tab_id
    act(() => {
      listenCallbacks["pty:exit"]?.({
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

  it("passes sessionType to spawn_pty", async () => {
    mockInvoke.mockResolvedValueOnce("tab-1");
    const { result } = renderHook(() => usePty({ tabId: "tab-1" }));

    await act(async () => {
      await result.current.spawn("/test/path", "gemini");
    });

    expect(mockInvoke).toHaveBeenCalledWith("spawn_pty", {
      tabId: "tab-1",
      path: "/test/path",
      sessionType: "gemini",
      windowLabel: "main",
    });
  });
});
