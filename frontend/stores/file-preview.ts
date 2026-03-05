import { invoke } from "@/lib/ipc";
import { create } from "zustand";

export interface FileContent {
  path: string;
  content: string;
  size: number;
  encoding?: "base64";
}

interface FilePreviewState {
  isOpen: boolean;
  currentFile: string | null;
  content: FileContent | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
  editContent: string | null;
  editDirty: boolean;

  togglePreview: () => void;
  openPreview: () => void;
  closePreview: () => void;
  loadFile: (path: string) => Promise<void>;
  clearError: () => void;
  setEditing: (editing: boolean) => void;
  setEditContent: (content: string) => void;
  saveFile: () => Promise<void>;
}

export const useFilePreviewStore = create<FilePreviewState>((set, get) => ({
  isOpen: false,
  currentFile: null,
  content: null,
  isLoading: false,
  error: null,
  isEditing: false,
  editContent: null,
  editDirty: false,

  togglePreview: () => set((state) => ({ isOpen: !state.isOpen })),

  openPreview: () => set({ isOpen: true }),

  closePreview: () =>
    set({
      isOpen: false,
      currentFile: null,
      content: null,
      error: null,
      isEditing: false,
      editContent: null,
      editDirty: false,
    }),

  loadFile: async (path: string) => {
    set({ isLoading: true, currentFile: path, error: null, isEditing: false, editContent: null, editDirty: false });

    try {
      const result = await invoke<FileContent>("read_file_command", {
        path,
        maxSizeMb: 10,
      });

      set({
        content: result,
        isLoading: false,
        isOpen: true,
      });
    } catch (error) {
      let errorMessage = "Failed to load file";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      set({
        content: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  clearError: () => set({ error: null }),

  setEditing: (editing) =>
    set((state) => ({
      isEditing: editing,
      editContent: editing ? state.content?.content ?? null : null,
      editDirty: false,
    })),

  setEditContent: (content) =>
    set({ editContent: content, editDirty: true }),

  saveFile: async () => {
    const state = get();
    const { currentFile, editContent } = state;
    if (!currentFile || editContent === null) return;
    await invoke("write_file", { path: currentFile, content: editContent });
    set((prevState) => ({
      editDirty: false,
      content: prevState.content
        ? { ...prevState.content, content: editContent, size: editContent.length }
        : null,
    }));
  },
}));
