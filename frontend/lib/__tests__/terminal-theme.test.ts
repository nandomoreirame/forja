import { describe, it, expect } from "vitest";
import { TERMINAL_THEME, TERMINAL_OPTIONS } from "../terminal-theme";

describe("TERMINAL_THEME", () => {
  it("has Catppuccin Mocha background color", () => {
    expect(TERMINAL_THEME.background).toBe("#1e1e2e");
  });

  it("has Catppuccin Mocha foreground color", () => {
    expect(TERMINAL_THEME.foreground).toBe("#cdd6f4");
  });

  it("has Catppuccin Rosewater cursor color", () => {
    expect(TERMINAL_THEME.cursor).toBe("#f5e0dc");
  });

  it("has all required ANSI colors", () => {
    expect(TERMINAL_THEME.black).toBeDefined();
    expect(TERMINAL_THEME.red).toBeDefined();
    expect(TERMINAL_THEME.green).toBeDefined();
    expect(TERMINAL_THEME.yellow).toBeDefined();
    expect(TERMINAL_THEME.blue).toBeDefined();
    expect(TERMINAL_THEME.magenta).toBeDefined();
    expect(TERMINAL_THEME.cyan).toBeDefined();
    expect(TERMINAL_THEME.white).toBeDefined();
    expect(TERMINAL_THEME.brightBlack).toBeDefined();
    expect(TERMINAL_THEME.brightWhite).toBeDefined();
  });
});

describe("TERMINAL_OPTIONS", () => {
  it("uses JetBrains Mono font family", () => {
    expect(TERMINAL_OPTIONS.fontFamily).toContain("JetBrains Mono");
  });

  it("uses 15px font size", () => {
    expect(TERMINAL_OPTIONS.fontSize).toBe(15);
  });

  it("sets cursorBlink to true", () => {
    expect(TERMINAL_OPTIONS.cursorBlink).toBe(true);
  });

  it("includes the theme", () => {
    expect(TERMINAL_OPTIONS.theme).toBe(TERMINAL_THEME);
  });
});
