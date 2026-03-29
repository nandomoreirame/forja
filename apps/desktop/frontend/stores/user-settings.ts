import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import { DEFAULT_SETTINGS, type UserSettings } from "@/lib/settings-types";

interface UserSettingsState {
  settings: UserSettings;
  loaded: boolean;

  // Editor state
  editorOpen: boolean;
  editorContent: string;
  editorDirty: boolean;
  editorError: string | null;

  loadSettings: () => Promise<void>;
  setSettings: (settings: UserSettings) => void;
  openSettingsFile: () => Promise<void>;
  openSettingsEditor: () => void;
  closeSettingsEditor: () => void;
  setEditorContent: (content: string) => void;
  saveEditorContent: () => Promise<void>;
}

export const useUserSettingsStore = create<UserSettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  editorOpen: false,
  editorContent: "",
  editorDirty: false,
  editorError: null,

  loadSettings: async () => {
    try {
      const settings = await invoke<UserSettings>("get_user_settings");
      set({ settings, loaded: true });
    } catch {
      set({ settings: { ...DEFAULT_SETTINGS }, loaded: true });
    }
  },

  setSettings: (settings: UserSettings) => {
    set({ settings });
  },

  openSettingsFile: async () => {
    await invoke("open_settings_file");
  },

  openSettingsEditor: () => {
    const { settings } = get();
    set({
      editorOpen: true,
      editorContent: JSON.stringify(settings, null, 2),
      editorDirty: false,
      editorError: null,
    });
  },

  closeSettingsEditor: () => {
    set({
      editorOpen: false,
      editorContent: "",
      editorDirty: false,
      editorError: null,
    });
  },

  setEditorContent: (content: string) => {
    set({ editorContent: content, editorDirty: true });
  },

  saveEditorContent: async () => {
    const { editorContent } = get();
    try {
      const settings = await invoke<UserSettings>("save_user_settings", {
        content: editorContent,
      });
      set({ settings, editorDirty: false, editorError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      set({ editorError: message });
    }
  },
}));
