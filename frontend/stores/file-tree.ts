import { invoke, open } from "@/lib/ipc";
import { create } from "zustand";
import { useFilePreviewStore } from "./file-preview";
import { useGitDiffStore } from "./git-diff";

export const APP_NAME = "Forja";
export const FILE_TREE_MAX_DEPTH = 8;

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  extension?: string | null;
  ignored?: boolean;
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
  removeProjectTree: (projectPath: string) => void;
  setActiveProjectPath: (path: string) => void;
  setTree: (tree: DirectoryTree | null) => void;
  toggleExpanded: (path: string) => void;
  isExpanded: (path: string) => boolean;
  collapseAll: () => void;
  selectFile: (path: string) => Promise<void>;
}

export const useFileTreeStore = create<FileTreeState>((set, get) => {
  // Helper to activate a project (load tree, set state, register recent + watcher)
  const activateProject = async (projectPath: string) => {
    await get().loadProjectTree(projectPath);
    const updatedTrees = get().trees;
    set({
      isOpen: true,
      currentPath: projectPath,
      activeProjectPath: projectPath,
      tree: updatedTrees[projectPath] ?? null,
    });
    invoke("add_recent_project", { path: projectPath }).catch((err) =>
      console.warn("[file-tree] Failed to add recent project:", err),
    );
    invoke("start_watcher", { path: projectPath }).catch((err) =>
      console.warn("[file-tree] Failed to start watcher:", err),
    );
  };

  return {
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
          { path: projectPath, maxDepth: FILE_TREE_MAX_DEPTH },
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

    removeProjectTree: (projectPath: string) => {
      const { trees, expandedPaths, activeProjectPath, currentPath } = get();

      // Remove the tree entry
      const { [projectPath]: _removed, ...remainingTrees } = trees;

      // Remove expanded paths that belong to this project
      const remainingExpanded: Record<string, boolean> = {};
      for (const [p, v] of Object.entries(expandedPaths)) {
        if (!p.startsWith(projectPath)) {
          remainingExpanded[p] = v;
        }
      }

      // If the removed project was active, switch to another
      const remainingPaths = Object.keys(remainingTrees);
      const needsSwitch =
        activeProjectPath === projectPath || currentPath === projectPath;

      if (needsSwitch && remainingPaths.length > 0) {
        const nextPath = remainingPaths[0];
        set({
          trees: remainingTrees,
          expandedPaths: remainingExpanded,
          activeProjectPath: nextPath,
          currentPath: nextPath,
          tree: remainingTrees[nextPath] ?? null,
        });
      } else if (needsSwitch) {
        set({
          trees: remainingTrees,
          expandedPaths: remainingExpanded,
          activeProjectPath: null,
          currentPath: null,
          tree: null,
        });
      } else {
        set({
          trees: remainingTrees,
          expandedPaths: remainingExpanded,
        });
      }

      // Stop the file watcher for the removed project
      invoke("stop_watcher", { path: projectPath }).catch((err) =>
        console.warn("[file-tree] Failed to stop watcher:", err),
      );
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
          await activateProject(selected);
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
          // Ensure existing project tree is also in trees map
          if (!existingTrees[current]) {
            await get().loadProjectTree(current);
          }
          await activateProject(selected);
          return;
        }

        set({ expandedPaths: {}, trees: {} });
        await activateProject(selected);
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
          await activateProject(path);
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
          if (!existingTrees[current]) {
            await get().loadProjectTree(current);
          }
          await activateProject(path);
          return;
        }

        set({ expandedPaths: {}, trees: {} });
        await activateProject(path);
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
      useGitDiffStore.getState().clearSelection();
      await useFilePreviewStore.getState().loadFile(path);
    },
  };
});
