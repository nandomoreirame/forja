import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import type { SessionType } from "@/lib/cli-registry";
import { parseLayoutJson } from "@/lib/layout-migration";
import { useFileTreeStore } from "./file-tree";
import { useProjectsStore } from "./projects";
import { useTerminalTabsStore } from "./terminal-tabs";
import { useTilingLayoutStore } from "./tiling-layout";

export type WorkspaceColor =
  | "green"
  | "teal"
  | "blue"
  | "mauve"
  | "red"
  | "peach"
  | "yellow";

export type WorkspaceIcon =
  | "waves"
  | "mountain"
  | "star"
  | "heart"
  | "bolt"
  | "cloud"
  | "moon"
  | "layers"
  | "rocket"
  | "beaker"
  | "link"
  | "trending"
  | "graduation"
  | "coffee";

export interface WorkspaceProject {
  path: string;
  name: string;
  last_opened: string;
  icon_path?: string | null;
}

export interface UiPreferences {
  sidebarSize: number;
  previewSize: number;
  sidebarOpen: boolean;
  terminalSplitEnabled: boolean;
  terminalSplitOrientation: "horizontal" | "vertical";
  terminalSplitRatio: number;
  rightPanelWidth: number;
}

export interface Workspace {
  id: string;
  name: string;
  color?: WorkspaceColor;
  icon?: WorkspaceIcon;
  projects: WorkspaceProject[];
  uiPreferences: UiPreferences;
  createdAt: string;
  lastUsedAt: string;
  lastActiveProjectPath?: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  loading: boolean;

  loadWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, initialProject?: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  updateWorkspaceDetails: (id: string, updates: {
    name?: string;
    color?: WorkspaceColor;
    icon?: WorkspaceIcon;
  }) => Promise<void>;
  addProject: (workspaceId: string, projectPath: string) => Promise<void>;
  removeProject: (workspaceId: string, projectPath: string) => Promise<void>;
  setActiveWorkspace: (id: string | null) => Promise<void>;
  openWorkspaceInNewWindow: (workspaceId: string) => Promise<void>;
  activateWorkspace: (workspaceId: string) => Promise<void>;
}

// Dedup guard: prevents concurrent loadWorkspaces() calls from each creating
// a "Default Workspace" when the config is empty (e.g. after Clear cache + reload).
let loadWorkspacesPromise: Promise<void> | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: false,

  loadWorkspaces: () => {
    if (loadWorkspacesPromise) return loadWorkspacesPromise;

    loadWorkspacesPromise = (async () => {
      set({ loading: true });
      try {
        let workspaces = await invoke<Workspace[]>("get_workspaces");
        let active = await invoke<Workspace | null>("get_active_workspace");

        // Auto-create a default workspace when none exist
        if (!workspaces || workspaces.length === 0) {
          const created = await invoke<Workspace>("create_workspace", {
            name: "Default Workspace",
          });
          if (created) {
            await invoke("set_active_workspace", { id: created.id });
            workspaces = [created];
            active = created;
          }
        }

        // Preserve the local activeWorkspaceId if already set (multi-window:
        // another window may have written a different ID to global config).
        const currentActiveId = get().activeWorkspaceId;
        set({
          workspaces: workspaces ?? [],
          activeWorkspaceId: currentActiveId ?? active?.id ?? null,
          loading: false,
        });
      } catch {
        set({ loading: false });
      } finally {
        loadWorkspacesPromise = null;
      }
    })();

    return loadWorkspacesPromise;
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

  updateWorkspaceDetails: async (id, updates) => {
    await invoke("update_workspace", { id, ...updates });
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

    // Save outgoing workspace's tiling layout before switching
    const outgoingWsId = get().activeWorkspaceId;
    if (outgoingWsId) {
      const outgoingWs = get().workspaces.find((w) => w.id === outgoingWsId);
      const outgoingProjectPath = outgoingWs?.lastActiveProjectPath || outgoingWs?.projects[0]?.path;
      const layoutJson = useTilingLayoutStore.getState().getModelJson();
      const saveArgs: Record<string, unknown> = { workspaceId: outgoingWsId, layoutJson };
      if (outgoingProjectPath) saveArgs.projectPath = outgoingProjectPath;
      invoke("save_ui_preferences", saveArgs).catch(() => {});
    }

    await get().setActiveWorkspace(workspaceId);

    // Clear existing trees and expanded paths before loading the new workspace's projects
    useFileTreeStore.setState({
      trees: {},
      expandedPaths: {},
      tree: null,
      currentPath: null,
      activeProjectPath: null,
    });

    // Clear old project state and reload from the new workspace
    useProjectsStore.setState({ projects: [], activeProjectPath: null });
    await useProjectsStore.getState().loadProjects();

    // Set activeProjectPath BEFORE layout restoration so that terminal blocks
    // rendered by blockFactory get the correct project path for PTY spawn.
    const targetProjectPath = workspace.lastActiveProjectPath || workspace.projects[0]?.path;
    if (targetProjectPath) {
      useProjectsStore.setState({ activeProjectPath: targetProjectPath });
    }

    // Close existing PTY sessions before clearing tabs to prevent orphan processes
    const existingTabs = useTerminalTabsStore.getState().tabs;
    for (const tab of existingTabs) {
      invoke("close_pty", { tabId: tab.id }).catch(() => {});
    }

    // Clear terminal tabs
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null });

    // Restore incoming workspace's tiling layout (including terminal blocks
    // with their custom names). Blocks for tabs not in config are cleaned up
    // by orphan removal after tab restore below.
    const getPrefsArgs: Record<string, unknown> = { workspaceId };
    if (targetProjectPath) getPrefsArgs.projectPath = targetProjectPath;
    const uiPrefs = await invoke<{ layoutJson?: Record<string, unknown> } | null>(
      "get_ui_preferences",
      getPrefsArgs,
    );
    if (uiPrefs?.layoutJson) {
      const layoutJson = parseLayoutJson(uiPrefs.layoutJson);
      useTilingLayoutStore.getState().loadFromJson(layoutJson);
    } else {
      useTilingLayoutStore.getState().resetToDefault();
    }

    const fileTreeState = useFileTreeStore.getState();
    for (const project of workspace.projects) {
      await fileTreeState.loadProjectTree(project.path);
    }

    if (workspace.projects.length > 0) {
      fileTreeState.openProjectPath(workspace.projects[0].path);
    }

    // Restore saved tabs from config.json for the new workspace
    const projectPath = workspace.lastActiveProjectPath || workspace.projects[0]?.path;
    if (projectPath) {
      const uiState = await invoke<{
        tabs?: Array<{ id?: string; path?: string; sessionType: string; cliSessionId?: string; exited?: boolean }>;
        activeTabIndex?: number;
      } | null>("get_project_ui_state", { workspaceId, path: projectPath });

      if (uiState?.tabs && uiState.tabs.length > 0) {
        const tabsStore = useTerminalTabsStore.getState();
        const restoredIds: string[] = [];

        for (const tab of uiState.tabs) {
          const tabPath = tab.path || projectPath;
          const id = tab.id || tabsStore.nextTabId();
          tabsStore.addTab(id, tabPath, (tab.sessionType || "claude") as SessionType);
          if (tab.cliSessionId) {
            tabsStore.setCliSessionId(id, tab.cliSessionId);
          }
          if (tab.exited) {
            tabsStore.markTabExited(id);
          }
          restoredIds.push(id);
        }

        // Set the active tab from saved state
        if (restoredIds.length > 0) {
          const activeIdx = uiState.activeTabIndex ?? 0;
          const activeId = restoredIds[activeIdx] ?? restoredIds[0];
          tabsStore.setActiveTab(activeId);
        }
      }
    }
  },
}));

export function _resetLoadWorkspacesGuard(): void {
  loadWorkspacesPromise = null;
}
