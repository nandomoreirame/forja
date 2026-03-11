// frontend/stores/__tests__/theme.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useThemeStore } from "../theme";
import { DEFAULT_THEME_ID } from "@/themes";

vi.mock("@/themes/apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

describe("useThemeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({
      activeThemeId: DEFAULT_THEME_ID,
      customThemes: [],
    });
  });

  it("has default theme id", () => {
    expect(useThemeStore.getState().activeThemeId).toBe("catppuccin-mocha");
  });

  it("setActiveTheme changes the theme id", () => {
    useThemeStore.getState().setActiveTheme("dracula");
    expect(useThemeStore.getState().activeThemeId).toBe("dracula");
  });

  it("getActiveTheme returns resolved theme", () => {
    const theme = useThemeStore.getState().getActiveTheme();
    expect(theme.id).toBe("catppuccin-mocha");
  });

  it("getActiveTheme falls back to default for invalid id", () => {
    useThemeStore.getState().setActiveTheme("nonexistent");
    const theme = useThemeStore.getState().getActiveTheme();
    expect(theme.id).toBe("catppuccin-mocha");
  });

  it("getAllThemes includes built-ins and customs", () => {
    const all = useThemeStore.getState().getAllThemes();
    expect(all.length).toBeGreaterThanOrEqual(4);
  });
});
