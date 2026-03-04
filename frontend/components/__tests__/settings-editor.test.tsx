import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("@/hooks/use-syntax-highlighter", () => ({
  useSyntaxHighlighter: () => ({
    isReady: true,
    hasError: false,
    highlight: vi.fn().mockResolvedValue('<pre><code><span class="line">highlighted</span></code></pre>'),
    detectLanguage: vi.fn().mockReturnValue("json"),
  }),
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

  it("renders textarea with editor content from store", async () => {
    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(JSON.stringify(DEFAULT_SETTINGS, null, 2));
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

  it("Ctrl+S in textarea calls saveEditorContent", async () => {
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    useUserSettingsStore.setState({ editorDirty: true });
    const saveSpy = vi.spyOn(useUserSettingsStore.getState(), "saveEditorContent");

    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);

    const textarea = screen.getByRole("textbox");
    fireEvent.keyDown(textarea, { key: "s", ctrlKey: true });

    expect(saveSpy).toHaveBeenCalled();
  });

  it("shows 'Saved' when not dirty and no error", async () => {
    const { useUserSettingsStore } = await import("@/stores/user-settings");
    useUserSettingsStore.setState({ editorDirty: false, editorError: null });

    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);

    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("renders highlighted code layer with aria-hidden", async () => {
    const { SettingsEditor } = await import("../settings-editor");
    render(<SettingsEditor />);

    const hiddenLayer = document.querySelector('[aria-hidden="true"]');
    expect(hiddenLayer).toBeInTheDocument();
    expect(hiddenLayer).toHaveClass("code-viewer");
  });
});
