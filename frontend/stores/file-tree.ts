import { invoke, open } from "@/lib/ipc";
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
  trees: Record<string, DirectoryTree>;
  activeProjectPath: string | null;

  toggleSidebar: () => void;
  openProject: () => Promise<void>;
  openProjectPath: (path: string) => Promise<void>;
  loadProjectTree: (projectPath: string) => Promise<void>;
  setActiveProjectPath: (path: string) => void;
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
  trees: {},
  activeProjectPath: null,

  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),

  loadProjectTree: async (projectPath: string) => {
    try {
      const result = await invoke<DirectoryTree>(
        "read_directory_tree_command",
        { path: projectPath, maxDepth: 8 },
      );
      set((state) => ({
        trees: { ...state.trees, [projectPath]: result },
        // Auto-expand the project root so files are visible immediately
        expandedPaths: { ...state.expandedPaths, [projectPath]: true },
      }));
    } catch (error) {
      console.error("Failed to load project tree:", error);
    }
  },

  openProject: async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Project Directory",
      });

      if (!selected) return;

      const workspaceStore = await import("./workspace").then(
        (m) => m.useWorkspaceStore,
      );
      const activeWsId = workspaceStore.getState().activeWorkspaceId;

      if (activeWsId) {
        // Add to current workspace
        await workspaceStore.getState().addProject(activeWsId, selected);
        await get().loadProjectTree(selected);
        const updatedTrees = get().trees;
        set({
          currentPath: selected,
          activeProjectPath: selected,
          tree: updatedTrees[selected] ?? null,
        });
        invoke("add_recent_project", { path: selected }).catch(() => {});
        invoke("start_watcher", { path: selected }).catch(() => {});
        return;
      }

      // If a project is already open, create a workspace grouping both
      const { currentPath: current, trees: existingTrees } = get();
      if (current) {
        const baseName = current.split("/").pop() ?? "Workspace";
        const ws = await workspaceStore
          .getState()
          .createWorkspace(baseName, current);
        await workspaceStore.getState().addProject(ws.id, selected);
        await workspaceStore.getState().setActiveWorkspace(ws.id);
        await get().loadProjectTree(selected);
        // Ensure existing project tree is also in trees map
        if (!existingTrees[current]) {
          await get().loadProjectTree(current);
        }
        const updatedTrees = get().trees;
        set({
          currentPath: selected,
          activeProjectPath: selected,
          tree: updatedTrees[selected] ?? null,
        });
        invoke("add_recent_project", { path: selected }).catch(() => {});
        invoke("start_watcher", { path: selected }).catch(() => {});
        return;
      }

      const result = await invoke<DirectoryTree>(
        "read_directory_tree_command",
        { path: selected, maxDepth: 8 },
      );
      set({
        currentPath: selected,
        activeProjectPath: selected,
        tree: result,
        trees: { [selected]: result },
        expandedPaths: {},
      });
      invoke("add_recent_project", { path: selected }).catch(() => {});
    } catch (error) {
      console.error("Failed to load project directory:", error);
    }
  },

  openProjectPath: async (path: string) => {
    try {
      const workspaceStore = await import("./workspace").then(
        (m) => m.useWorkspaceStore,
      );
      const activeWsId = workspaceStore.getState().activeWorkspaceId;

      if (activeWsId) {
        await workspaceStore.getState().addProject(activeWsId, path);
        await get().loadProjectTree(path);
        const updatedTrees = get().trees;
        set({
          currentPath: path,
          activeProjectPath: path,
          tree: updatedTrees[path] ?? null,
        });
        invoke("add_recent_project", { path }).catch(() => {});
        return;
      }

      // If a project is already open, create a workspace grouping both
      const { currentPath: current, trees: existingTrees } = get();
      if (current) {
        const baseName = current.split("/").pop() ?? "Workspace";
        const ws = await workspaceStore
          .getState()
          .createWorkspace(baseName, current);
        await workspaceStore.getState().addProject(ws.id, path);
        await workspaceStore.getState().setActiveWorkspace(ws.id);
        await get().loadProjectTree(path);
        if (!existingTrees[current]) {
          await get().loadProjectTree(current);
        }
        const updatedTrees = get().trees;
        set({
          currentPath: path,
          activeProjectPath: path,
          tree: updatedTrees[path] ?? null,
        });
        invoke("add_recent_project", { path }).catch(() => {});
        invoke("start_watcher", { path }).catch(() => {});
        return;
      }

      const result = await invoke<DirectoryTree>(
        "read_directory_tree_command",
        { path, maxDepth: 8 },
      );
      set({
        currentPath: path,
        activeProjectPath: path,
        tree: result,
        trees: { [path]: result },
        expandedPaths: {},
      });
      invoke("add_recent_project", { path }).catch(() => {});
    } catch (error) {
      console.error("Failed to load project directory:", error);
    }
  },

  setActiveProjectPath: (path: string) => {
    const trees = get().trees;
    const tree = trees[path] ?? null;
    set({ activeProjectPath: path, currentPath: path, tree });
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
