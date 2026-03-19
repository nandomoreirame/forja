import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWebviewShortcutBridge } from "../use-webview-shortcut-bridge";

type ListenCallback = (event: { payload: unknown }) => void;

let listenCallback: ListenCallback | null = null;
const mockCleanup = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn((_event: string, cb: ListenCallback) => {
    listenCallback = cb;
    return Promise.resolve(mockCleanup);
  }),
}));

describe("useWebviewShortcutBridge", () => {
  let capturedKeydowns: KeyboardEvent[];
  let keydownHandler: (e: Event) => void;

  beforeEach(() => {
    listenCallback = null;
    mockCleanup.mockClear();
    capturedKeydowns = [];
    keydownHandler = (e: Event) => {
      if (e instanceof KeyboardEvent) capturedKeydowns.push(e);
    };
    window.addEventListener("keydown", keydownHandler);
  });

  afterEach(() => {
    window.removeEventListener("keydown", keydownHandler);
  });

  it("registers IPC listener for webview:shortcut-forwarded", async () => {
    const { listen } = await import("@/lib/ipc");
    renderHook(() => useWebviewShortcutBridge());

    expect(listen).toHaveBeenCalledWith(
      "webview:shortcut-forwarded",
      expect.any(Function),
    );
  });

  it("dispatches KeyboardEvent to window when shortcut is received", () => {
    renderHook(() => useWebviewShortcutBridge());

    expect(listenCallback).not.toBeNull();
    listenCallback!({
      payload: {
        key: "Tab",
        code: "Tab",
        control: true,
        meta: false,
        shift: false,
        alt: false,
      },
    });

    expect(capturedKeydowns).toHaveLength(1);
    const event = capturedKeydowns[0];
    expect(event.key).toBe("Tab");
    expect(event.code).toBe("Tab");
    expect(event.ctrlKey).toBe(true);
    expect(event.metaKey).toBe(false);
    expect(event.shiftKey).toBe(false);
    expect(event.altKey).toBe(false);
  });

  it("dispatches Ctrl+Shift+Tab with correct modifiers", () => {
    renderHook(() => useWebviewShortcutBridge());

    listenCallback!({
      payload: {
        key: "Tab",
        code: "Tab",
        control: true,
        meta: false,
        shift: true,
        alt: false,
      },
    });

    expect(capturedKeydowns).toHaveLength(1);
    expect(capturedKeydowns[0].shiftKey).toBe(true);
    expect(capturedKeydowns[0].ctrlKey).toBe(true);
  });

  it("dispatches Ctrl+W with correct key", () => {
    renderHook(() => useWebviewShortcutBridge());

    listenCallback!({
      payload: {
        key: "w",
        code: "KeyW",
        control: true,
        meta: false,
        shift: false,
        alt: false,
      },
    });

    expect(capturedKeydowns).toHaveLength(1);
    expect(capturedKeydowns[0].key).toBe("w");
    expect(capturedKeydowns[0].code).toBe("KeyW");
  });

  it("cleans up IPC listener on unmount", async () => {
    const { unmount } = renderHook(() => useWebviewShortcutBridge());

    // Allow the listen promise to resolve
    await new Promise((r) => setTimeout(r, 0));

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });
});
