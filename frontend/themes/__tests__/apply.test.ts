// frontend/themes/__tests__/apply.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { applyTheme, buildTerminalTheme, buildMonacoTheme } from "../apply";
import type { ThemeDefinition } from "../schema";
import catppuccinMocha from "../catppuccin-mocha/theme.json";
import dracula from "../dracula/theme.json";

const mocha = catppuccinMocha as ThemeDefinition;
const draculaTheme = dracula as ThemeDefinition;

describe("applyTheme", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  it("sets CSS variables on :root", () => {
    applyTheme(mocha);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--bg-base")).toBe("#1e1e2e");
    expect(style.getPropertyValue("--fg-primary")).toBe("#cdd6f4");
    expect(style.getPropertyValue("--color-brand")).toBe("#cba6f7");
  });

  it("sets dark class for dark themes", () => {
    applyTheme(mocha);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("sets light class for light themes", () => {
    const latte = { ...mocha, type: "light" as const };
    applyTheme(latte);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("switches from dark to light correctly", () => {
    applyTheme(mocha);
    const latte = { ...mocha, type: "light" as const };
    applyTheme(latte);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("buildTerminalTheme", () => {
  it("maps theme to xterm ITheme", () => {
    const result = buildTerminalTheme(mocha);
    expect(result.background).toBe("#1e1e2e");
    expect(result.foreground).toBe("#cdd6f4");
    expect(result.red).toBe("#f38ba8");
    expect(result.cursor).toBe("#cdd6f4");
  });

  it("maps dracula correctly", () => {
    const result = buildTerminalTheme(draculaTheme);
    expect(result.background).toBe("#282a36");
    expect(result.red).toBe("#ff5555");
  });
});

describe("buildMonacoTheme", () => {
  it("returns theme with correct base for dark", () => {
    const result = buildMonacoTheme(mocha);
    expect(result.base).toBe("vs-dark");
    expect(result.colors["editor.background"]).toBe("#1e1e2e");
    expect(result.colors["editor.foreground"]).toBe("#cdd6f4");
  });

  it("returns theme with correct base for light", () => {
    const latte = { ...mocha, type: "light" as const };
    const result = buildMonacoTheme(latte);
    expect(result.base).toBe("vs");
  });

  it("includes syntax highlighting rules", () => {
    const result = buildMonacoTheme(mocha);
    expect(result.rules.length).toBeGreaterThan(0);
  });
});
