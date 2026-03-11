// frontend/components/__tests__/settings-dialog-theme.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsDialog } from "../settings-dialog";
import { useThemeStore } from "@/stores/theme";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";
import { useUserSettingsStore } from "@/stores/user-settings";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getVersion: vi.fn().mockResolvedValue("1.0.0"),
}));

vi.mock("@/themes/apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

describe("settings dialog theme section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      loaded: true,
      editorOpen: false,
      editorContent: "",
      editorDirty: false,
      editorError: null,
    });
    useThemeStore.setState({
      activeThemeId: "catppuccin-mocha",
      customThemes: [],
    });
  });

  it("shows theme setting in appearance section", () => {
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />);
    const themeElements = screen.getAllByText(/Theme/i);
    expect(themeElements.length).toBeGreaterThan(0);
  });
});
