import { describe, it, expect } from "vitest";
import { shouldForwardToApp } from "../webview-keyboard-bridge";

describe("shouldForwardToApp", () => {
  it("forwards Ctrl+Tab to app", () => {
    expect(
      shouldForwardToApp({ key: "Tab", control: true, meta: false, shift: false, alt: false }),
    ).toBe(true);
  });

  it("forwards Ctrl+Shift+Tab to app", () => {
    expect(
      shouldForwardToApp({ key: "Tab", control: true, meta: false, shift: true, alt: false }),
    ).toBe(true);
  });

  it("forwards Ctrl+, (settings) to app", () => {
    expect(
      shouldForwardToApp({ key: ",", control: true, meta: false, shift: false, alt: false }),
    ).toBe(true);
  });

  it("forwards Ctrl+Shift+P (command palette) to app", () => {
    expect(
      shouldForwardToApp({ key: "p", control: true, meta: false, shift: true, alt: false }),
    ).toBe(true);
  });

  it("forwards Ctrl+W (close) to app", () => {
    expect(
      shouldForwardToApp({ key: "w", control: true, meta: false, shift: false, alt: false }),
    ).toBe(true);
  });

  it("forwards Meta+Tab (macOS) to app", () => {
    expect(
      shouldForwardToApp({ key: "Tab", control: false, meta: true, shift: false, alt: false }),
    ).toBe(true);
  });

  it("does NOT forward Ctrl+C (copy) — stays in webview", () => {
    expect(
      shouldForwardToApp({ key: "c", control: true, meta: false, shift: false, alt: false }),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+V (paste) — stays in webview", () => {
    expect(
      shouldForwardToApp({ key: "v", control: true, meta: false, shift: false, alt: false }),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+X (cut) — stays in webview", () => {
    expect(
      shouldForwardToApp({ key: "x", control: true, meta: false, shift: false, alt: false }),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+A (select all) — stays in webview", () => {
    expect(
      shouldForwardToApp({ key: "a", control: true, meta: false, shift: false, alt: false }),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+Z (undo) — stays in webview", () => {
    expect(
      shouldForwardToApp({ key: "z", control: true, meta: false, shift: false, alt: false }),
    ).toBe(false);
  });

  it("does NOT forward Ctrl+F (find) — stays in webview", () => {
    expect(
      shouldForwardToApp({ key: "f", control: true, meta: false, shift: false, alt: false }),
    ).toBe(false);
  });

  it("DOES forward Ctrl+Alt+F (focus mode) — Alt overrides webview retention", () => {
    expect(
      shouldForwardToApp({ key: "f", control: true, meta: false, shift: false, alt: true }),
    ).toBe(true);
  });

  it("does NOT forward plain keys without modifier", () => {
    expect(
      shouldForwardToApp({ key: "a", control: false, meta: false, shift: false, alt: false }),
    ).toBe(false);
  });

  it("does NOT forward Shift+key alone (no Ctrl/Meta)", () => {
    expect(
      shouldForwardToApp({ key: "A", control: false, meta: false, shift: true, alt: false }),
    ).toBe(false);
  });

  it("does NOT forward Alt+key alone (no Ctrl/Meta)", () => {
    expect(
      shouldForwardToApp({ key: "Tab", control: false, meta: false, shift: false, alt: true }),
    ).toBe(false);
  });
});
