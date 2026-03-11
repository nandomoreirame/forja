import { describe, it, expect } from "vitest";
import {
  getBuiltinThemes,
  getThemeById,
  resolveTheme,
  DEFAULT_THEME_ID,
} from "../index";

describe("theme registry", () => {
  it("exports 14 built-in themes", () => {
    const themes = getBuiltinThemes();
    expect(themes).toHaveLength(14);
  });

  it("DEFAULT_THEME_ID is catppuccin-mocha", () => {
    expect(DEFAULT_THEME_ID).toBe("catppuccin-mocha");
  });

  it("getThemeById returns correct theme", () => {
    const theme = getThemeById("dracula");
    expect(theme).toBeDefined();
    expect(theme!.name).toBe("Dracula");
  });

  it("getThemeById returns undefined for unknown id", () => {
    expect(getThemeById("nonexistent")).toBeUndefined();
  });

  it("resolveTheme returns theme from built-ins", () => {
    const theme = resolveTheme("dracula", []);
    expect(theme.id).toBe("dracula");
  });

  it("resolveTheme returns custom theme when found", () => {
    const custom = {
      id: "my-theme",
      name: "My Theme",
      type: "dark" as const,
      colors: getThemeById("dracula")!.colors,
      terminal: getThemeById("dracula")!.terminal,
    };
    const theme = resolveTheme("my-theme", [custom]);
    expect(theme.id).toBe("my-theme");
  });

  it("resolveTheme falls back to default for unknown id", () => {
    const theme = resolveTheme("nonexistent", []);
    expect(theme.id).toBe(DEFAULT_THEME_ID);
  });
});
