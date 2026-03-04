import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import { useFileTreeStore } from "./file-tree";

export interface Workspace {
  id: string;
  name: string;
  projects: string[];
  createdAt: string;
  lastUsedAt: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  loading: boolean;

  loadWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, initialProject?: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  addProject: (workspaceId: string, projectPath: string) => Promise<void>;
  removeProject: (workspaceId: string, projectPath: string) => Promise<void>;
  setActiveWorkspace: (id: string | null) => Promise<void>;
  openWorkspaceInNewWindow: (workspaceId: string) => Promise<void>;
  activateWorkspace: (workspaceId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: false,

  loadWorkspaces: async () => {
    set({ loading: true });
    try {
      const workspaces = await invoke<Workspace[]>("get_workspaces");
      const active = await invoke<Workspace | null>("get_active_workspace");
      set({
        workspaces: workspaces ?? [],
        activeWorkspaceId: active?.id ?? null,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  createWorkspace: async (name, initialProject) => {
    const workspace = await invoke<Workspace>("create_workspace", { name, initialProject });
    await get().loadWorkspaces();
    return workspace;
  },

  deleteWorkspace: async (id) => {
    await invoke("delete_workspace", { id });
    await get().loadWorkspaces();
  },

  renameWorkspace: async (id, name) => {
    await invoke("update_workspace", { id, name });
    await get().loadWorkspaces();
  },

  addProject: async (workspaceId, projectPath) => {
    await invoke("add_project_to_workspace", { workspaceId, projectPath });
    await get().loadWorkspaces();
  },

  removeProject: async (workspaceId, projectPath) => {
    await invoke("remove_project_from_workspace", { workspaceId, projectPath });
    await get().loadWorkspaces();
  },

  setActiveWorkspace: async (id) => {
    await invoke("set_active_workspace", { id });
    set({ activeWorkspaceId: id });
  },

  openWorkspaceInNewWindow: async (workspaceId) => {
    await invoke("open_workspace_in_new_window", { workspaceId });
  },

  activateWorkspace: async (workspaceId) => {
    const { workspaces } = get();
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;

    await get().setActiveWorkspace(workspaceId);

    const fileTreeState = useFileTreeStore.getState();
    for (const projectPath of workspace.projects) {
      await fileTreeState.loadProjectTree(projectPath);
    }

    if (workspace.projects.length > 0) {
      fileTreeState.openProjectPath(workspace.projects[0]);
    }
  },
}));
