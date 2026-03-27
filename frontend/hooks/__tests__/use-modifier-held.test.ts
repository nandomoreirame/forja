import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useModifierHeldStore } from "@/stores/modifier-held";
import { detectModifierCombo } from "../use-modifier-held";

function makeKeyEvent(
  type: "keydown" | "keyup",
  overrides: Partial<KeyboardEvent> = {}
): KeyboardEvent {
  return new KeyboardEvent(type, {
    bubbles: true,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    key: "",
    code: "",
    ...overrides,
  });
}

describe("modifier detection logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useModifierHeldStore.getState().cancelBadges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Cmd+Shift sets cmd-shift", () => {
    const e = makeKeyEvent("keydown", { metaKey: true, shiftKey: true, key: "Shift" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-shift");
  });

  it("Ctrl+Shift sets cmd-shift (cross-platform mod)", () => {
    const e = makeKeyEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Shift" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-shift");
  });

  it("bare Ctrl sets ctrl", () => {
    const e = makeKeyEvent("keydown", { ctrlKey: true, key: "Control" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("ctrl");
  });

  it("bare Alt sets alt", () => {
    const e = makeKeyEvent("keydown", { altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("alt");
  });

  it("Cmd+Alt sets cmd-alt", () => {
    const e = makeKeyEvent("keydown", { metaKey: true, altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-alt");
  });

  it("Ctrl+Alt sets cmd-alt (cross-platform)", () => {
    const e = makeKeyEvent("keydown", { ctrlKey: true, altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-alt");
  });

  it("bare Cmd sets cmd", () => {
    const e = makeKeyEvent("keydown", { metaKey: true, key: "Meta" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd");
  });

  it("returns null for non-modifier keys", () => {
    const e = makeKeyEvent("keydown", { key: "a", code: "KeyA" });
    const combo = detectModifierCombo(e);
    expect(combo).toBeNull();
  });

  it("returns null when all three modifiers are held", () => {
    const e = makeKeyEvent("keydown", { metaKey: true, shiftKey: true, altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBeNull();
  });
});
