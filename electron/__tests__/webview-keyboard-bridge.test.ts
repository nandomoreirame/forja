import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shouldForwardToApp,
  attachWebviewKeyboardBridge,
} from "../webview-keyboard-bridge.js";
import type { Input } from "electron";

function makeInput(overrides: Partial<Input> = {}): Input {
  return {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    control: true,
    meta: false,
    shift: false,
    alt: false,
    isAutoRepeat: false,
    isComposing: false,
    ...overrides,
  } as Input;
}

describe("shouldForwardToApp (main process)", () => {
  it("forwards Ctrl+Tab", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "Tab", control: true })),
    ).toBe(true);
  });

  it("forwards Ctrl+Shift+Tab", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "Tab", control: true, shift: true })),
    ).toBe(true);
  });

  it("forwards Ctrl+W (close tab)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "w", control: true })),
    ).toBe(true);
  });

  it("forwards Ctrl+, (settings)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: ",", control: true })),
    ).toBe(true);
  });

  it("forwards Ctrl+Shift+P (command palette)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "p", control: true, shift: true })),
    ).toBe(true);
  });

  it("forwards Meta+Tab (macOS)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "Tab", control: false, meta: true })),
    ).toBe(true);
  });

  it("does NOT forward Ctrl+C (copy)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "c", control: true })),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+V (paste)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "v", control: true })),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+X (cut)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "x", control: true })),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+A (select all)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "a", control: true })),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+Z (undo)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "z", control: true })),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+F (find)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "f", control: true })),
    ).toBe(false);
  });

  it("DOES forward Ctrl+Alt+F (alt overrides webview retention)", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "f", control: true, alt: true })),
    ).toBe(true);
  });

  it("does NOT forward plain keys without modifier", () => {
    expect(
      shouldForwardToApp(makeInput({ key: "a", control: false })),
    ).toBe(false);
  });
});

describe("attachWebviewKeyboardBridge", () => {
  let handlers: Map<string, (event: unknown, input: unknown) => void>;
  let mockContents: { on: ReturnType<typeof vi.fn> };
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handlers = new Map();
    mockContents = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
      }),
    };
    sendSpy = vi.fn();
  });

  it("registers before-input-event listener on webview contents", () => {
    attachWebviewKeyboardBridge(mockContents as never, sendSpy);
    expect(mockContents.on).toHaveBeenCalledWith(
      "before-input-event",
      expect.any(Function),
    );
  });

  it("forwards app shortcuts via sendShortcut callback", () => {
    attachWebviewKeyboardBridge(mockContents as never, sendSpy);
    const handler = handlers.get("before-input-event")!;
    const mockEvent = { preventDefault: vi.fn() };

    handler(
      mockEvent,
      makeInput({ key: "Tab", control: true, code: "Tab" }),
    );

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledWith({
      key: "Tab",
      code: "Tab",
      control: true,
      meta: false,
      shift: false,
      alt: false,
    });
  });

  it("does NOT forward webview-only shortcuts like Ctrl+C", () => {
    attachWebviewKeyboardBridge(mockContents as never, sendSpy);
    const handler = handlers.get("before-input-event")!;
    const mockEvent = { preventDefault: vi.fn() };

    handler(
      mockEvent,
      makeInput({ key: "c", control: true, code: "KeyC" }),
    );

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("ignores keyUp events", () => {
    attachWebviewKeyboardBridge(mockContents as never, sendSpy);
    const handler = handlers.get("before-input-event")!;
    const mockEvent = { preventDefault: vi.fn() };

    handler(
      mockEvent,
      makeInput({ type: "keyUp" as Input["type"], key: "Tab", control: true }),
    );

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("forwards Ctrl+Shift+Tab with all modifier flags", () => {
    attachWebviewKeyboardBridge(mockContents as never, sendSpy);
    const handler = handlers.get("before-input-event")!;
    const mockEvent = { preventDefault: vi.fn() };

    handler(
      mockEvent,
      makeInput({
        key: "Tab",
        code: "Tab",
        control: true,
        shift: true,
      }),
    );

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "Tab",
        control: true,
        shift: true,
      }),
    );
  });
});
