import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/pty-dispatcher", () => ({
  ptyDispatcher: {
    registerData: vi.fn(),
    registerExit: vi.fn(),
    unregisterData: vi.fn(),
    unregisterExit: vi.fn(),
  },
}));

const mockInvoke = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Must import AFTER mock declaration
import { terminalCache, CACHE_TTL_MS, CACHE_MAX_SIZE } from "../terminal-instance-cache";
import { ptyDispatcher } from "@/lib/pty-dispatcher";

function makeMockTerminal() {
  return {
    write: vi.fn(),
    dispose: vi.fn(),
  } as unknown as import("@xterm/xterm").Terminal;
}

function makeMockFitAddon() {
  return {
    fit: vi.fn(),
    dispose: vi.fn(),
  } as unknown as import("@xterm/addon-fit").FitAddon;
}

function makeMockHostElement() {
  const el = document.createElement("div");
  el.remove = vi.fn();
  return el;
}

describe("terminalCache", () => {
  beforeEach(() => {
    terminalCache.clear();
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  it("has() returns false for unknown tabId", () => {
    expect(terminalCache.has("unknown-tab")).toBe(false);
  });

  it("park() stores terminal and has() returns true", () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);

    expect(terminalCache.has("tab-1")).toBe(true);
  });

  it("park() removes hostElement from DOM", () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);

    expect(host.remove).toHaveBeenCalled();
  });

  it("get() returns cached entry after park", () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);

    const entry = terminalCache.get("tab-1");
    expect(entry).toBeDefined();
    expect(entry!.terminal).toBe(terminal);
    expect(entry!.fitAddon).toBe(fitAddon);
    expect(entry!.hostElement).toBe(host);
  });

  it("get() returns undefined for unknown tabId", () => {
    expect(terminalCache.get("unknown-tab")).toBeUndefined();
  });

  it("dispose() calls terminal.dispose() and removes from cache", () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);
    terminalCache.dispose("tab-1");

    expect(terminal.dispose).toHaveBeenCalled();
    expect(terminalCache.has("tab-1")).toBe(false);
  });

  it("dispose() is no-op for unknown tabId", () => {
    // Should not throw
    terminalCache.dispose("unknown-tab");
  });

  it("park() registers ptyDispatcher handlers via queueMicrotask", async () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);

    // Handlers not registered synchronously
    expect(ptyDispatcher.registerData).not.toHaveBeenCalled();
    expect(ptyDispatcher.registerExit).not.toHaveBeenCalled();

    // Flush microtask queue
    await Promise.resolve();

    expect(ptyDispatcher.registerData).toHaveBeenCalledWith("tab-1", expect.any(Function));
    expect(ptyDispatcher.registerExit).toHaveBeenCalledWith("tab-1", expect.any(Function));
  });

  it("park() does not register handlers if disposed before microtask runs", async () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);
    terminalCache.dispose("tab-1");

    // Flush microtask queue
    await Promise.resolve();

    expect(ptyDispatcher.registerData).not.toHaveBeenCalled();
    expect(ptyDispatcher.registerExit).not.toHaveBeenCalled();
  });

  it("parked data handler writes to terminal", async () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);
    await Promise.resolve();

    // Get the registered data handler and invoke it
    const dataHandler = vi.mocked(ptyDispatcher.registerData).mock.calls[0][1];
    dataHandler("hello world");

    expect(terminal.write).toHaveBeenCalledWith("hello world");
  });

  it("parked exit handler writes session ended message", async () => {
    const terminal = makeMockTerminal();
    const fitAddon = makeMockFitAddon();
    const host = makeMockHostElement();

    terminalCache.park("tab-1", terminal, fitAddon, host);
    await Promise.resolve();

    const exitHandler = vi.mocked(ptyDispatcher.registerExit).mock.calls[0][1];
    exitHandler(0);

    expect(terminal.write).toHaveBeenCalledWith(
      "\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n"
    );
  });

  it("clear() disposes all cached terminals", () => {
    const t1 = makeMockTerminal();
    const t2 = makeMockTerminal();
    const f1 = makeMockFitAddon();
    const f2 = makeMockFitAddon();

    terminalCache.park("tab-1", t1, f1, makeMockHostElement());
    terminalCache.park("tab-2", t2, f2, makeMockHostElement());

    terminalCache.clear();

    expect(t1.dispose).toHaveBeenCalled();
    expect(t2.dispose).toHaveBeenCalled();
    expect(terminalCache.has("tab-1")).toBe(false);
    expect(terminalCache.has("tab-2")).toBe(false);
  });

  describe("TTL eviction", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("exports TTL and max size constants", () => {
      expect(CACHE_TTL_MS).toBe(5 * 60 * 1000);
      expect(CACHE_MAX_SIZE).toBe(20);
    });

    it("evicts entries after TTL expires", () => {
      const terminal = makeMockTerminal();
      const fitAddon = makeMockFitAddon();
      const host = makeMockHostElement();

      terminalCache.park("tab-ttl", terminal, fitAddon, host);
      expect(terminalCache.has("tab-ttl")).toBe(true);

      vi.advanceTimersByTime(CACHE_TTL_MS + 100);

      expect(terminalCache.has("tab-ttl")).toBe(false);
      expect(terminal.dispose).toHaveBeenCalled();
    });

    it("does NOT kill backend PTY when TTL eviction fires (PTY survives for reconnection)", () => {
      const terminal = makeMockTerminal();
      const fitAddon = makeMockFitAddon();
      const host = makeMockHostElement();

      terminalCache.park("tab-ttl-kill", terminal, fitAddon, host);
      vi.advanceTimersByTime(CACHE_TTL_MS + 100);

      expect(mockInvoke).not.toHaveBeenCalledWith("close_pty", { tabId: "tab-ttl-kill" });
    });

    it("unregisters dispatcher handlers when TTL eviction fires", () => {
      const terminal = makeMockTerminal();
      const fitAddon = makeMockFitAddon();
      const host = makeMockHostElement();

      terminalCache.park("tab-ttl-unreg", terminal, fitAddon, host);
      vi.advanceTimersByTime(CACHE_TTL_MS + 100);

      expect(ptyDispatcher.unregisterData).toHaveBeenCalledWith("tab-ttl-unreg");
      expect(ptyDispatcher.unregisterExit).toHaveBeenCalledWith("tab-ttl-unreg");
    });

    it("cancels TTL timer when entry is retrieved via get()", () => {
      const terminal = makeMockTerminal();
      const fitAddon = makeMockFitAddon();
      const host = makeMockHostElement();

      terminalCache.park("tab-get", terminal, fitAddon, host);

      // Retrieve before TTL - should cancel the timer
      const entry = terminalCache.get("tab-get");
      expect(entry).toBeDefined();

      vi.advanceTimersByTime(CACHE_TTL_MS + 100);

      // Should NOT have been evicted since it was retrieved
      expect(terminal.dispose).not.toHaveBeenCalled();
    });

    it("cancels TTL timer when entry is manually disposed", () => {
      const terminal = makeMockTerminal();
      const fitAddon = makeMockFitAddon();
      const host = makeMockHostElement();

      terminalCache.park("tab-dispose", terminal, fitAddon, host);
      terminalCache.dispose("tab-dispose");

      // dispose should have been called once (manually)
      expect(terminal.dispose).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(CACHE_TTL_MS + 100);

      // Should NOT double-dispose
      expect(terminal.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("max size eviction", () => {
    it("evicts oldest entry when cache exceeds max size", () => {
      const terminals: ReturnType<typeof makeMockTerminal>[] = [];

      // Fill cache to max
      for (let i = 0; i < CACHE_MAX_SIZE; i++) {
        const t = makeMockTerminal();
        terminals.push(t);
        terminalCache.park(`tab-${i}`, t, makeMockFitAddon(), makeMockHostElement());
      }

      // All should be present
      for (let i = 0; i < CACHE_MAX_SIZE; i++) {
        expect(terminalCache.has(`tab-${i}`)).toBe(true);
      }

      // Add one more - should evict the oldest (tab-0)
      const extra = makeMockTerminal();
      terminalCache.park("tab-extra", extra, makeMockFitAddon(), makeMockHostElement());

      expect(terminalCache.has("tab-extra")).toBe(true);
      expect(terminalCache.has("tab-0")).toBe(false);
      expect(terminals[0].dispose).toHaveBeenCalled();
    });

    it("does NOT kill backend PTY when evicting oldest (PTY survives for reconnection)", () => {
      // Fill cache to max so next park triggers eviction
      for (let i = 0; i < CACHE_MAX_SIZE; i++) {
        terminalCache.park(`tab-maxevict-${i}`, makeMockTerminal(), makeMockFitAddon(), makeMockHostElement());
      }

      vi.clearAllMocks();
      mockInvoke.mockResolvedValue(undefined);

      // Add one more — triggers eviction of tab-maxevict-0
      terminalCache.park("tab-maxevict-extra", makeMockTerminal(), makeMockFitAddon(), makeMockHostElement());

      // PTY should NOT be killed — it survives for reconnection
      expect(mockInvoke).not.toHaveBeenCalledWith("close_pty", { tabId: "tab-maxevict-0" });
      // But frontend dispatcher handlers should be unregistered
      expect(ptyDispatcher.unregisterData).toHaveBeenCalledWith("tab-maxevict-0");
      expect(ptyDispatcher.unregisterExit).toHaveBeenCalledWith("tab-maxevict-0");
    });
  });

  describe("clear()", () => {
    it("calls close_pty for each cached entry on clear()", () => {
      terminalCache.park("tab-clear-1", makeMockTerminal(), makeMockFitAddon(), makeMockHostElement());
      terminalCache.park("tab-clear-2", makeMockTerminal(), makeMockFitAddon(), makeMockHostElement());

      vi.clearAllMocks();
      mockInvoke.mockResolvedValue(undefined);

      terminalCache.clear();

      expect(mockInvoke).toHaveBeenCalledWith("close_pty", { tabId: "tab-clear-1" });
      expect(mockInvoke).toHaveBeenCalledWith("close_pty", { tabId: "tab-clear-2" });
    });

    it("unregisters dispatcher handlers for all entries on clear()", () => {
      terminalCache.park("tab-clear-a", makeMockTerminal(), makeMockFitAddon(), makeMockHostElement());
      terminalCache.park("tab-clear-b", makeMockTerminal(), makeMockFitAddon(), makeMockHostElement());

      vi.clearAllMocks();

      terminalCache.clear();

      expect(ptyDispatcher.unregisterData).toHaveBeenCalledWith("tab-clear-a");
      expect(ptyDispatcher.unregisterData).toHaveBeenCalledWith("tab-clear-b");
      expect(ptyDispatcher.unregisterExit).toHaveBeenCalledWith("tab-clear-a");
      expect(ptyDispatcher.unregisterExit).toHaveBeenCalledWith("tab-clear-b");
    });
  });
});
