import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings-types";

// Mock IPC
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn().mockResolvedValue(() => {}),
}));

import { invoke } from "@/lib/ipc";

describe("useUserSettingsStore", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useUserSettingsStore } = await import("../user-settings");
    useUserSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: false,
      editorOpen: false,
      editorContent: "",
      editorDirty: false,
      editorError: null,
    });
  });

  it("has DEFAULT_SETTINGS as initial state", async () => {
    const { useUserSettingsStore } = await import("../user-settings");
    const state = useUserSettingsStore.getState();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.loaded).toBe(false);
  });

  it("loadSettings calls invoke and updates state", async () => {
    const customSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      editor: { ...DEFAULT_SETTINGS.editor, fontSize: 20 },
    };
    vi.mocked(invoke).mockResolvedValueOnce(customSettings);

    const { useUserSettingsStore } = await import("../user-settings");
    await useUserSettingsStore.getState().loadSettings();

    expect(invoke).toHaveBeenCalledWith("get_user_settings");
    const state = useUserSettingsStore.getState();
    expect(state.settings.editor.fontSize).toBe(20);
    expect(state.loaded).toBe(true);
  });

  it("loadSettings falls back to defaults on error", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("IPC error"));

    const { useUserSettingsStore } = await import("../user-settings");
    await useUserSettingsStore.getState().loadSettings();

    const state = useUserSettingsStore.getState();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.loaded).toBe(true);
  });

  it("setSettings updates the settings state", async () => {
    const { useUserSettingsStore } = await import("../user-settings");
    const newSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      statusbar: { visible: false },
    };
    useUserSettingsStore.getState().setSettings(newSettings);

    const state = useUserSettingsStore.getState();
    expect(state.settings.statusbar.visible).toBe(false);
  });

  it("openSettingsFile calls invoke with open_settings_file", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    const { useUserSettingsStore } = await import("../user-settings");
    await useUserSettingsStore.getState().openSettingsFile();

    expect(invoke).toHaveBeenCalledWith("open_settings_file");
  });

  it("has correct initial editor state", async () => {
    const { useUserSettingsStore } = await import("../user-settings");
    const state = useUserSettingsStore.getState();
    expect(state.editorOpen).toBe(false);
    expect(state.editorContent).toBe("");
    expect(state.editorDirty).toBe(false);
    expect(state.editorError).toBeNull();
  });

  it("openSettingsEditor sets editorOpen and populates editorContent", async () => {
    const { useUserSettingsStore } = await import("../user-settings");
    const customSettings = {
      ...DEFAULT_SETTINGS,
      editor: { ...DEFAULT_SETTINGS.editor, fontSize: 20 },
    };
    useUserSettingsStore.setState({ settings: customSettings, loaded: true });

    useUserSettingsStore.getState().openSettingsEditor();

    const state = useUserSettingsStore.getState();
    expect(state.editorOpen).toBe(true);
    expect(state.editorContent).toContain('"fontSize": 20');
    expect(state.editorDirty).toBe(false);
    expect(state.editorError).toBeNull();
  });

  it("setEditorContent updates content and marks dirty", async () => {
    const { useUserSettingsStore } = await import("../user-settings");
    useUserSettingsStore.getState().openSettingsEditor();
    useUserSettingsStore.getState().setEditorContent('{"test": true}');

    const state = useUserSettingsStore.getState();
    expect(state.editorContent).toBe('{"test": true}');
    expect(state.editorDirty).toBe(true);
  });

  it("saveEditorContent calls IPC and clears dirty/error on success", async () => {
    const savedSettings = { ...DEFAULT_SETTINGS };
    vi.mocked(invoke).mockResolvedValueOnce(savedSettings);

    const { useUserSettingsStore } = await import("../user-settings");
    useUserSettingsStore.setState({
      editorOpen: true,
      editorContent: JSON.stringify(DEFAULT_SETTINGS, null, 2),
      editorDirty: true,
      editorError: null,
    });

    await useUserSettingsStore.getState().saveEditorContent();

    expect(invoke).toHaveBeenCalledWith("save_user_settings", {
      content: JSON.stringify(DEFAULT_SETTINGS, null, 2),
    });
    const state = useUserSettingsStore.getState();
    expect(state.editorDirty).toBe(false);
    expect(state.editorError).toBeNull();
    expect(state.settings).toEqual(savedSettings);
  });

  it("saveEditorContent sets editorError on failure", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Invalid JSON"));

    const { useUserSettingsStore } = await import("../user-settings");
    useUserSettingsStore.setState({
      editorOpen: true,
      editorContent: "{invalid",
      editorDirty: true,
      editorError: null,
    });

    await useUserSettingsStore.getState().saveEditorContent();

    const state = useUserSettingsStore.getState();
    expect(state.editorError).toBe("Invalid JSON");
    expect(state.editorDirty).toBe(true);
  });

  it("closeSettingsEditor resets all editor state", async () => {
    const { useUserSettingsStore } = await import("../user-settings");
    useUserSettingsStore.setState({
      editorOpen: true,
      editorContent: '{"foo": 1}',
      editorDirty: true,
      editorError: "some error",
    });

    useUserSettingsStore.getState().closeSettingsEditor();

    const state = useUserSettingsStore.getState();
    expect(state.editorOpen).toBe(false);
    expect(state.editorContent).toBe("");
    expect(state.editorDirty).toBe(false);
    expect(state.editorError).toBeNull();
  });
});
