import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("monaco-editor", () => {
  const disposable = { dispose: vi.fn() };
  const mockModel = { dispose: vi.fn(), getValue: vi.fn(() => ""), setValue: vi.fn() };
  const mockEditor = {
    getValue: vi.fn(() => ""), setValue: vi.fn(), dispose: vi.fn(),
    getModel: vi.fn(() => mockModel),
    onDidChangeModelContent: vi.fn(() => disposable),
    onDidDispose: vi.fn(() => disposable),
    layout: vi.fn(), updateOptions: vi.fn(), focus: vi.fn(),
    getAction: vi.fn(), addCommand: vi.fn(),
  };
  return {
    editor: { create: vi.fn(() => mockEditor), defineTheme: vi.fn(), setTheme: vi.fn() },
    Uri: { parse: vi.fn((s: string) => s) },
    KeyMod: { CtrlCmd: 2048 }, KeyCode: { KeyS: 49 },
  };
});

vi.mock("@/lib/monaco-theme", () => ({
  catppuccinMochaTheme: { base: "vs-dark", inherit: true, rules: [], colors: {} },
  THEME_NAME: "catppuccin-mocha",
  getMonacoThemeName: vi.fn(() => "catppuccin-mocha"),
  getMonacoThemeData: vi.fn(() => ({ base: "vs-dark", inherit: true, rules: [], colors: {} })),
}));

vi.mock("@/stores/theme", () => ({
  useThemeStore: Object.assign(
    vi.fn(() => ({ customThemes: [] })),
    {
      getState: vi.fn(() => ({
        getActiveTheme: vi.fn(() => ({ id: "catppuccin-mocha", type: "dark" })),
        getAllThemes: vi.fn(() => []),
        customThemes: [],
      })),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

describe("SettingsEditor", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    useUserSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: true,
      editorOpen: true,
      editorContent: JSON.stringify(DEFAULT_SETTINGS, null, 2),
      editorDirty: false,
      editorError: null,
    });
  });

  it("renders Monaco editor container", async () => {
    const { SettingsEditor } = await import("../settings-editor");
    const { container } = render(<SettingsEditor />);
    expect(container.querySelector("[data-testid='monaco-editor-container']")).toBeInTheDocument();
  });

  it("renders header with settings.json and Editing badge", async () => {
    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);
    expect(screen.getByText("settings.json")).toBeInTheDocument();
    expect(screen.getByText("Editing")).toBeInTheDocument();
  });

  it("close button calls closeSettingsEditor", async () => {
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    const closeSpy = vi.spyOn(useUserSettingsStore.getState(), "closeSettingsEditor");
    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);
    fireEvent.click(screen.getByLabelText("Close settings editor"));
    expect(closeSpy).toHaveBeenCalled();
  });

  it("shows 'Unsaved changes' when dirty", async () => {
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    useUserSettingsStore.setState({ editorDirty: true });
    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("shows error message when editorError is set", async () => {
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    useUserSettingsStore.setState({ editorError: "Invalid JSON syntax" });
    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);
    expect(screen.getByText("Invalid JSON syntax")).toBeInTheDocument();
  });

  it("shows 'Saved' when not dirty and no error", async () => {
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    useUserSettingsStore.setState({ editorDirty: false, editorError: null });
    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
