import { invoke } from "@/lib/ipc";
import { create } from "zustand";

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

interface FilePreviewState {
  isOpen: boolean;
  currentFile: string | null;
  content: FileContent | null;
  isLoading: boolean;
  error: string | null;

  togglePreview: () => void;
  openPreview: () => void;
  closePreview: () => void;
  loadFile: (path: string) => Promise<void>;
  clearError: () => void;
}

export const useFilePreviewStore = create<FilePreviewState>((set) => ({
  isOpen: false,
  currentFile: null,
  content: null,
  isLoading: false,
  error: null,

  togglePreview: () => set((state) => ({ isOpen: !state.isOpen })),

  openPreview: () => set({ isOpen: true }),

  closePreview: () =>
    set({
      isOpen: false,
      currentFile: null,
      content: null,
      error: null,
    }),

  loadFile: async (path: string) => {
    set({ isLoading: true, currentFile: path, error: null });

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
}));
