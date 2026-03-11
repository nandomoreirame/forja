import { invoke } from "@/lib/ipc";
import { create } from "zustand";
import { useGitDiffStore } from "./git-diff";

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
  previewByProject: Record<string, { currentFile: string; content: FileContent | null } | null>;

  togglePreview: () => void;
  openPreview: () => void;
  closePreview: () => void;
  loadFile: (path: string) => Promise<void>;
  reloadCurrentFile: () => Promise<void>;
  reloadCurrentFileForProject: (projectPath: string) => Promise<void>;
  reloadCurrentFileIfChanged: (projectPath: string, changedPaths: string[]) => Promise<void>;
  clearError: () => void;
  setEditing: (editing: boolean) => void;
  setEditContent: (content: string) => void;
  saveFile: () => Promise<void>;
  savePreviewForProject: (projectPath: string) => void;
  restorePreviewForProject: (projectPath: string) => void;
}

export const useFilePreviewStore = create<FilePreviewState>((set, get) => ({
  isOpen: true,
  currentFile: null,
  content: null,
  isLoading: false,
  error: null,
  isEditing: false,
  editContent: null,
  editDirty: false,
  previewByProject: {},

  togglePreview: () => set((state) => ({ isOpen: !state.isOpen })),

  openPreview: () => set({ isOpen: true }),

  closePreview: () => {
    useGitDiffStore.getState().clearSelection();
    set({
      isOpen: true,
      currentFile: null,
      content: null,
      error: null,
      isEditing: false,
      editContent: null,
      editDirty: false,
    });
  },

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

  reloadCurrentFile: async () => {
    const { currentFile } = get();
    if (!currentFile) return;

    try {
      const result = await invoke<FileContent>("read_file_command", {
        path: currentFile,
        maxSizeMb: 10,
        skipCache: true,
      });
      set({ content: result });
    } catch {
      // Silently ignore reload errors — file may have been deleted
    }
  },

  reloadCurrentFileForProject: async (projectPath: string) => {
    const { currentFile } = get();
    if (!currentFile) return;

    const normalizedProjectPath = projectPath.endsWith("/")
      ? projectPath
      : `${projectPath}/`;

    if (!currentFile.startsWith(normalizedProjectPath)) return;

    await get().reloadCurrentFile();
  },

  reloadCurrentFileIfChanged: async (projectPath: string, changedPaths: string[]) => {
    const { currentFile } = get();
    if (!currentFile) return;

    const normalizedProjectPath = projectPath.endsWith("/")
      ? projectPath
      : `${projectPath}/`;

    // The current file must belong to the changed project
    if (!currentFile.startsWith(normalizedProjectPath)) return;

    // If changedPaths is empty, treat it as a full project refresh (reload unconditionally)
    if (changedPaths.length === 0) {
      await get().reloadCurrentFile();
      return;
    }

    // Check if the current file's relative path is in the changed paths list
    const relativeCurrentFile = currentFile.slice(normalizedProjectPath.length);
    const isCurrentFileChanged = changedPaths.some(
      (p) => p === relativeCurrentFile || relativeCurrentFile.startsWith(`${p}/`),
    );

    if (!isCurrentFileChanged) return;

    await get().reloadCurrentFile();
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

  savePreviewForProject: (projectPath: string) => {
    const { isOpen, currentFile, content, previewByProject } = get();
    if (isOpen && currentFile) {
      set({
        previewByProject: {
          ...previewByProject,
          [projectPath]: { currentFile, content },
        },
      });
    } else {
      set({
        previewByProject: {
          ...previewByProject,
          [projectPath]: null,
        },
      });
    }
  },

  restorePreviewForProject: (projectPath: string) => {
    const { previewByProject } = get();
    const saved = previewByProject[projectPath];
    if (saved) {
      set({
        isOpen: true,
        currentFile: saved.currentFile,
        content: saved.content,
        error: null,
        isEditing: false,
        editContent: null,
        editDirty: false,
      });
    } else {
      set({
        isOpen: true,
        currentFile: null,
        content: null,
        error: null,
        isEditing: false,
        editContent: null,
        editDirty: false,
      });
    }
  },
}));
