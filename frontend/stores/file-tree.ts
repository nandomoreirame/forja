import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { create } from "zustand";
import { useFilePreviewStore } from "./file-preview";

export const APP_NAME = "Forja for Claude Code";

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
  expandedPaths: Set<string>;

  toggleSidebar: () => void;
  openProject: () => Promise<void>;
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
  expandedPaths: new Set<string>(),

  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),

  openProject: async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (selected) {
        const result = await invoke<DirectoryTree>(
          "read_directory_tree_command",
          { path: selected, maxDepth: 8 },
        );
        set({
          currentPath: selected,
          tree: result,
          expandedPaths: new Set<string>(),
        });
      }
    } catch (error) {
      console.error("Failed to load project directory:", error);
    }
  },

  setTree: (tree: DirectoryTree | null) => set({ tree }),

  toggleExpanded: (path: string) => {
    const expanded = new Set(get().expandedPaths);
    if (expanded.has(path)) {
      expanded.delete(path);
    } else {
      expanded.add(path);
    }
    set({ expandedPaths: expanded });
  },

  isExpanded: (path: string) => get().expandedPaths.has(path),

  collapseAll: () => set({ expandedPaths: new Set<string>() }),

  selectFile: async (path: string) => {
    await useFilePreviewStore.getState().loadFile(path);
  },
}));
