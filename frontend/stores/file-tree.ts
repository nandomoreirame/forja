import { invoke, open } from "@/lib/ipc";
import { create } from "zustand";
import { useFilePreviewStore } from "./file-preview";
import { useGitDiffStore } from "./git-diff";

export const APP_NAME = "Forja";
export const FILE_TREE_MAX_DEPTH = 2;

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

/**
 * Recursively walks the tree to find the node matching `dirPath`,
 * replaces its `children` with `newChildren`, and returns a new tree
 * (immutable update). If the node is not found, returns the original
 * root unchanged and logs a warning.
 */
export function mergeSubtree(
  root: FileNode,
  dirPath: string,
  newChildren: FileNode[],
): FileNode {
  if (root.path === dirPath) {
    return { ...root, children: newChildren };
  }

  if (!root.children) {
    return root;
  }

  let merged = false;
  const updatedChildren = root.children.map((child) => {
    if (!child.isDir) return child;

    // Prune branches that can't contain the target path
    if (!dirPath.startsWith(child.path)) return child;

    const updated = mergeSubtree(child, dirPath, newChildren);
    if (updated !== child) merged = true;
    return updated;
  });

  if (!merged) {
    return root;
  }

  return { ...root, children: updatedChildren };
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
  loadSubdirectory: (dirPath: string, projectPath: string) => Promise<void>;
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

    loadSubdirectory: async (dirPath: string, projectPath: string) => {
      const { trees, activeProjectPath } = get();
      const existingTree = trees[projectPath];

      if (!existingTree) {
        console.warn(
          `[file-tree] loadSubdirectory: no tree loaded for project "${projectPath}"`,
        );
        return;
      }

      try {
        const result = await invoke<DirectoryTree>(
          "read_directory_tree_command",
          { path: dirPath, maxDepth: 1 },
        );

        const newChildren = result.root.children ?? [];
        const updatedRoot = mergeSubtree(existingTree.root, dirPath, newChildren);

        if (updatedRoot === existingTree.root) {
          // Node not found in tree — mergeSubtree returned unchanged root
          console.warn(
            `[file-tree] loadSubdirectory: directory "${dirPath}" not found in tree for project "${projectPath}"`,
          );
          return;
        }

        const updatedTree: DirectoryTree = { root: updatedRoot };

        set((state) => {
          const newTrees = { ...state.trees, [projectPath]: updatedTree };
          const isActive = activeProjectPath === projectPath;
          return {
            trees: newTrees,
            ...(isActive ? { tree: updatedTree } : {}),
          };
        });
      } catch (error) {
        console.error(
          `[file-tree] Failed to load subdirectory "${dirPath}":`,
          error,
        );
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

        await activateProject(selected);

        // Notify projects store so sidebar updates
        const { useProjectsStore } = await import("./projects");
        await useProjectsStore.getState().addProject(selected);
      } catch (error) {
        console.error("Failed to load project directory:", error);
      }
    },

    openProjectPath: async (path: string) => {
      try {
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
