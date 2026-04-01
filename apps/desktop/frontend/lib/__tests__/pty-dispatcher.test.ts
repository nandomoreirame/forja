import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { createPtyDispatcher } from "../pty-dispatcher";

describe("PtyDispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes pty:data to the correct handler by tabId", () => {
    const dispatcher = createPtyDispatcher();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    dispatcher.registerData("tab-1", handler1);
    dispatcher.registerData("tab-2", handler2);

    dispatcher.handleData({ tab_id: "tab-1", data: "hello" });

    expect(handler1).toHaveBeenCalledWith("hello");
    expect(handler2).not.toHaveBeenCalled();
  });

  it("routes pty:exit to the correct handler by tabId", () => {
    const dispatcher = createPtyDispatcher();
    const handler = vi.fn();

    dispatcher.registerExit("tab-1", handler);

    dispatcher.handleExit({ tab_id: "tab-1", code: 0 });

    expect(handler).toHaveBeenCalledWith(0);
  });

  it("does not crash when no handler is registered for tabId", () => {
    const dispatcher = createPtyDispatcher();

    expect(() => {
      dispatcher.handleData({ tab_id: "unknown", data: "test" });
    }).not.toThrow();
  });

  it("unregisters data handler", () => {
    const dispatcher = createPtyDispatcher();
    const handler = vi.fn();

    dispatcher.registerData("tab-1", handler);
    dispatcher.unregisterData("tab-1");

    dispatcher.handleData({ tab_id: "tab-1", data: "hello" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("unregisters exit handler", () => {
    const dispatcher = createPtyDispatcher();
    const handler = vi.fn();

    dispatcher.registerExit("tab-1", handler);
    dispatcher.unregisterExit("tab-1");

    dispatcher.handleExit({ tab_id: "tab-1", code: 0 });

    expect(handler).not.toHaveBeenCalled();
  });

  it("replaces handler when re-registering same tabId", () => {
    const dispatcher = createPtyDispatcher();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    dispatcher.registerData("tab-1", handler1);
    dispatcher.registerData("tab-1", handler2);

    dispatcher.handleData({ tab_id: "tab-1", data: "hello" });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith("hello");
  });

  it("invokes global data listener when set", () => {
    const dispatcher = createPtyDispatcher();
    const globalHandler = vi.fn();
    const tabHandler = vi.fn();

    dispatcher.onGlobalData(globalHandler);
    dispatcher.registerData("tab-1", tabHandler);

    dispatcher.handleData({ tab_id: "tab-1", data: "hello" });

    expect(globalHandler).toHaveBeenCalledWith("tab-1", "hello");
    expect(tabHandler).toHaveBeenCalledWith("hello");
  });

  describe("registerPermanentExitHandler", () => {
    it("calls permanent handler when no tab-specific handler exists", () => {
      const dispatcher = createPtyDispatcher();
      const permanent = vi.fn();
      dispatcher.registerPermanentExitHandler(permanent);
      dispatcher.handleExit({ tab_id: "tab-orphan", code: 1 });
      expect(permanent).toHaveBeenCalledWith("tab-orphan", 1);
    });

    it("does NOT call permanent handler when tab-specific handler exists", () => {
      const dispatcher = createPtyDispatcher();
      const permanent = vi.fn();
      const tabHandler = vi.fn();
      dispatcher.registerPermanentExitHandler(permanent);
      dispatcher.registerExit("tab-1", tabHandler);
      dispatcher.handleExit({ tab_id: "tab-1", code: 0 });
      expect(tabHandler).toHaveBeenCalledWith(0);
      expect(permanent).not.toHaveBeenCalled();
    });

    it("calls permanent handler after tab handler is unregistered", () => {
      const dispatcher = createPtyDispatcher();
      const permanent = vi.fn();
      const tabHandler = vi.fn();
      dispatcher.registerPermanentExitHandler(permanent);
      dispatcher.registerExit("tab-1", tabHandler);
      dispatcher.unregisterExit("tab-1");
      dispatcher.handleExit({ tab_id: "tab-1", code: 0 });
      expect(tabHandler).not.toHaveBeenCalled();
      expect(permanent).toHaveBeenCalledWith("tab-1", 0);
    });

    it("destroy clears permanent handler", () => {
      const dispatcher = createPtyDispatcher();
      const permanent = vi.fn();
      dispatcher.registerPermanentExitHandler(permanent);
      dispatcher.destroy();
      dispatcher.handleExit({ tab_id: "tab-1", code: 0 });
      expect(permanent).not.toHaveBeenCalled();
    });
  });
});
