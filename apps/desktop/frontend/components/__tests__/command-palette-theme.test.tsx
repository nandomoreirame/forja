// frontend/components/__tests__/command-palette-theme.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommandPalette } from "../command-palette";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useThemeStore } from "@/stores/theme";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/themes/apply", () => ({
  applyTheme: vi.fn(),
  buildTerminalTheme: vi.fn(() => ({})),
  buildMonacoTheme: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({ installedClis: [], loading: false }),
}));

describe("command palette themes mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({
      activeThemeId: "catppuccin-mocha",
      customThemes: [],
    });
  });

  it("shows theme options when in themes mode", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "themes" });
    render(<CommandPalette />);
    expect(screen.getByText("Catppuccin Mocha")).toBeInTheDocument();
    expect(screen.getByText("Dracula")).toBeInTheDocument();
    expect(screen.getByText("Catppuccin Latte")).toBeInTheDocument();
    expect(screen.getByText("Alucard")).toBeInTheDocument();
  });
});
