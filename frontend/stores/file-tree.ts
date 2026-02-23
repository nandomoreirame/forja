import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { useFilePreviewStore } from "./file-preview";

export const APP_NAME = "Forja";

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  extension?: string | null;
}

export interface DirectoryTree {
  root: FileNode;
}

interface FileTreeState {
  isOpen: boolean;
  currentPath: string | null;
  tree: DirectoryTree | null;
  expandedPaths: Record<string, boolean>;

  toggleSidebar: () => void;
  openProject: () => Promise<void>;
  openProjectPath: (path: string) => Promise<void>;
  setTree: (tree: DirectoryTree | null) => void;
  toggleExpanded: (path: string) => void;
  isExpanded: (path: string) => boolean;
  collapseAll: () => void;
  selectFile: (path: string) => Promise<void>;
}

export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  isOpen: false,
  currentPath: null,
  tree: null,
  expandedPaths: {},

  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),

  openProject: async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (!selected) return;

      // If a project is already open, open in a new window
      const { currentPath: current } = get();
      if (current) {
        await invoke("open_project_in_new_window", { path: selected });
        return;
      }

      const result = await invoke<DirectoryTree>(
        "read_directory_tree_command",
        { path: selected, maxDepth: 8 },
      );
      set({
        currentPath: selected,
        tree: result,
        expandedPaths: {},
      });
      invoke("add_recent_project", { path: selected }).catch(() => {});
    } catch (error) {
      console.error("Failed to load project directory:", error);
    }
  },

  openProjectPath: async (path: string) => {
    try {
      // If a project is already open, open in a new window
      const { currentPath: current } = get();
      if (current) {
        await invoke("open_project_in_new_window", { path });
        return;
      }

      const result = await invoke<DirectoryTree>(
        "read_directory_tree_command",
        { path, maxDepth: 8 },
      );
      set({
        currentPath: path,
        tree: result,
        expandedPaths: {},
      });
      invoke("add_recent_project", { path }).catch(() => {});
    } catch (error) {
      console.error("Failed to load project directory:", error);
    }
  },

  setTree: (tree: DirectoryTree | null) => set({ tree }),

  toggleExpanded: (path: string) => {
    set((state) => ({
      expandedPaths: {
        ...state.expandedPaths,
        [path]: !state.expandedPaths[path],
      },
    }));
  },

  isExpanded: (path: string) => !!get().expandedPaths[path],

  collapseAll: () => set({ expandedPaths: {} }),

  selectFile: async (path: string) => {
    await useFilePreviewStore.getState().loadFile(path);
  },
}));
