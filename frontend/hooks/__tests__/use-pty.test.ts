import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePty } from "../use-pty";
import { ptyDispatcher } from "@/lib/pty-dispatcher";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  getCurrentWindow: () => ({ label: "main" }),
}));

vi.mock("@/lib/pty-dispatcher", () => {
  const dataHandlers = new Map<string, (data: string) => void>();
  const exitHandlers = new Map<string, (code: number) => void>();
  return {
    ptyDispatcher: {
      registerData: vi.fn((tabId: string, handler: (data: string) => void) => {
        dataHandlers.set(tabId, handler);
      }),
      unregisterData: vi.fn((tabId: string) => {
        dataHandlers.delete(tabId);
      }),
      registerExit: vi.fn((tabId: string, handler: (code: number) => void) => {
        exitHandlers.set(tabId, handler);
      }),
      unregisterExit: vi.fn((tabId: string) => {
        exitHandlers.delete(tabId);
      }),
      // Test helpers to simulate dispatching
      _simulateData: (tabId: string, data: string) => {
        dataHandlers.get(tabId)?.(data);
      },
      _simulateExit: (tabId: string, code: number) => {
        exitHandlers.get(tabId)?.(code);
      },
    },
  };
});

const mockDispatcher = vi.mocked(ptyDispatcher) as typeof ptyDispatcher & {
  _simulateData: (tabId: string, data: string) => void;
  _simulateExit: (tabId: string, code: number) => void;
};

describe("usePty", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    vi.mocked(ptyDispatcher.registerData).mockClear();
    vi.mocked(ptyDispatcher.unregisterData).mockClear();
    vi.mocked(ptyDispatcher.registerExit).mockClear();
    vi.mocked(ptyDispatcher.unregisterExit).mockClear();
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

  it("registers with ptyDispatcher on mount", () => {
    renderHook(() => usePty({ tabId: "tab-1" }));

    expect(ptyDispatcher.registerData).toHaveBeenCalledWith("tab-1", expect.any(Function));
    expect(ptyDispatcher.registerExit).toHaveBeenCalledWith("tab-1", expect.any(Function));
  });

  it("unregisters from ptyDispatcher on unmount", () => {
    const { unmount } = renderHook(() => usePty({ tabId: "tab-1" }));

    unmount();

    expect(ptyDispatcher.unregisterData).toHaveBeenCalledWith("tab-1");
    expect(ptyDispatcher.unregisterExit).toHaveBeenCalledWith("tab-1");
  });

  it("calls onData callback when dispatcher routes data to this tab", () => {
    const onData = vi.fn();
    renderHook(() => usePty({ tabId: "tab-1", onData }));

    act(() => {
      mockDispatcher._simulateData("tab-1", "hello");
    });

    expect(onData).toHaveBeenCalledWith("hello");
  });

  it("does not receive data for other tabs (dispatcher handles routing)", () => {
    const onData = vi.fn();
    renderHook(() => usePty({ tabId: "tab-1", onData }));

    act(() => {
      // Simulate data for a different tab — dispatcher won't route it here
      mockDispatcher._simulateData("tab-2", "world");
    });

    expect(onData).not.toHaveBeenCalled();
  });

  it("calls onExit and sets isRunning false on exit", async () => {
    const onExit = vi.fn();
    const { result } = renderHook(() => usePty({ tabId: "tab-1", onExit }));

    // Simulate spawn to set isRunning
    mockInvoke.mockResolvedValueOnce("tab-1");
    await act(async () => {
      await result.current.spawn("/test/path");
    });
    expect(result.current.isRunning).toBe(true);

    // Simulate exit via dispatcher
    act(() => {
      mockDispatcher._simulateExit("tab-1", 0);
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
