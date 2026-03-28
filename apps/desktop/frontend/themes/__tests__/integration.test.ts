// frontend/themes/__tests__/integration.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useThemeStore } from "@/stores/theme";
import { applyTheme } from "../apply";

vi.mock("../apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

describe("theme integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({
      activeThemeId: "catppuccin-mocha",
      customThemes: [],
    });
  });

  it("setActiveTheme calls applyTheme", () => {
    useThemeStore.getState().setActiveTheme("dracula");
    expect(applyTheme).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dracula" }),
    );
  });

  it("applyCurrentTheme applies the current theme", () => {
    useThemeStore.getState().applyCurrentTheme();
    expect(applyTheme).toHaveBeenCalledWith(
      expect.objectContaining({ id: "catppuccin-mocha" }),
    );
  });
});
