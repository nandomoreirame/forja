import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/pty-dispatcher", () => ({
  ptyDispatcher: {
    registerData: vi.fn(),
    registerExit: vi.fn(),
    unregisterData: vi.fn(),
    unregisterExit: vi.fn(),
  },
}));

// Must import AFTER mock declaration
import { terminalCache } from "../terminal-instance-cache";
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
});
