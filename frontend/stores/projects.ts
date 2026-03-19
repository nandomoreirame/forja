import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import { useWorkspaceStore } from "./workspace";

// Catppuccin Mocha palette colors for project icons (excluding too-dark/light)
const PROJECT_COLORS = [
  "#cba6f7", // mauve (brand)
  "#f38ba8", // red
  "#fab387", // peach
  "#f9e2af", // yellow
  "#a6e3a1", // green
  "#94e2d5", // teal
  "#89dceb", // sky
  "#89b4fa", // blue
  "#b4befe", // lavender
  "#f5c2e7", // pink
];

function basename(p: string): string {
  return p.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? p;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export type SessionState = "running" | "exited" | "idle";

export interface Project {
  path: string;
  name: string;
  lastOpened: string;
  iconPath?: string | null;
}

interface ProjectsState {
  projects: Project[];
  activeProjectPath: string | null;
  loading: boolean;
  isSwitchingProject: boolean;
  sessionStates: Record<string, SessionState>;
  unreadProjects: Set<string>;
  thinkingProjects: Set<string>;
  notifiedProjects: Set<string>;

  loadProjects: () => Promise<void>;
  addProject: (projectPath: string) => Promise<void>;
  removeProject: (projectPath: string) => void;
  setActiveProject: (projectPath: string) => void;
  switchToProject: (projectPath: string) => Promise<void>;
  loadProjectIcon: (projectPath: string) => Promise<void>;
  reorderProjects: (fromIndex: number, toIndex: number) => void;
  updateProject: (projectPath: string, updates: { name?: string; iconPath?: string | null }) => void;
  getProjectInitial: (nameOrPath: string) => string;
  getProjectColor: (nameOrPath: string) => string;
  setProjectSessionState: (projectPath: string, state: SessionState) => void;
  markProjectAsRead: (projectPath: string) => void;
  setProjectThinking: (projectPath: string, isThinking: boolean) => void;
  markProjectNotified: (projectPath: string) => void;
  clearProjectNotified: (projectPath: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProjectPath: null,
  loading: false,
  isSwitchingProject: false,
  sessionStates: {},
  unreadProjects: new Set<string>(),
  thinkingProjects: new Set<string>(),
  notifiedProjects: new Set<string>(),

  loadProjects: async () => {
    set({ loading: true });
    try {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      if (!workspaceId) {
        set({ projects: [], loading: false });
        return;
      }
      const raw = await invoke<Array<{ path: string; name: string; last_opened: string; icon_path?: string | null }>>(
        "get_workspace_projects", { workspaceId }
      );
      const projects: Project[] = (raw ?? []).map((p) => ({
        path: p.path,
        name: p.name || basename(p.path),
        lastOpened: p.last_opened,
        iconPath: p.icon_path ?? null,
      }));
      set({ projects, loading: false });
      // Auto-detect icons only for projects without a persisted icon
      for (const p of projects) {
        if (!p.iconPath) {
          get().loadProjectIcon(p.path).catch(() => {});
        }
      }
    } catch {
      set({ loading: false });
    }
  },

  addProject: async (projectPath: string) => {
    const name = basename(projectPath);
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    if (workspaceId) {
      await invoke("add_project_to_workspace", { workspaceId, projectPath });
    }
    const existing = get().projects.find((p) => p.path === projectPath);
    if (!existing) {
      const newProject: Project = {
        path: projectPath,
        name,
        lastOpened: new Date().toISOString(),
        iconPath: null,
      };
      set((state) => ({ projects: [newProject, ...state.projects] }));
    }
    set({ activeProjectPath: projectPath });
    // Load icon only if the project has no custom icon already set
    const current = get().projects.find((p) => p.path === projectPath);
    if (!current?.iconPath) {
      get().loadProjectIcon(projectPath).catch(() => {});
    }
  },

  removeProject: (projectPath: string) => {
    const { projects, activeProjectPath } = get();
    const newProjects = projects.filter((p) => p.path !== projectPath);
    let newActive = activeProjectPath;
    if (activeProjectPath === projectPath) {
      newActive = newProjects[0]?.path ?? null;
    }
    set({ projects: newProjects, activeProjectPath: newActive });
    // Persist removal to disk
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    if (workspaceId) {
      invoke("remove_project_from_workspace", { workspaceId, projectPath }).catch(() => {});
    }
  },

  setActiveProject: (projectPath: string) => {
    set({ activeProjectPath: projectPath });
  },

  switchToProject: async (projectPath: string) => {
    const previousPath = get().activeProjectPath;
    if (previousPath === projectPath) return;

    set({ isSwitchingProject: true });
    try {

    // Pre-resolve all dynamic imports in parallel so the state changes
    // below run in a single synchronous block (React 18 batches them).
    const [
      { useTilingLayoutStore },
      { useFilePreviewStore },
      { useGitDiffStore },
      { useTerminalTabsStore },
      { useRightPanelStore },
      { usePluginsStore },
      { useFileTreeStore },
      { useFocusModeStore },
    ] = await Promise.all([
      import("./tiling-layout"),
      import("./file-preview"),
      import("./git-diff"),
      import("./terminal-tabs"),
      import("./right-panel"),
      import("./plugins"),
      import("./file-tree"),
      import("./focus-mode"),
    ]);

    // --- Synchronous state changes (React 18 batches into one render) ---

    // Exit focus mode before switching projects to avoid snapshot conflicts
    if (useFocusModeStore.getState().isActive) {
      useFocusModeStore.getState().exitFocusMode();
    }

    set({ activeProjectPath: projectPath });
    get().markProjectAsRead(projectPath);
    get().clearProjectNotified(projectPath);

    const tilingStore = useTilingLayoutStore.getState();
    const previewStore = useFilePreviewStore.getState();
    const diffStore = useGitDiffStore.getState();
    const tabsStore = useTerminalTabsStore.getState();
    const rightPanelStore = useRightPanelStore.getState();
    const pluginsStore = usePluginsStore.getState();
    const fileTreeStore = useFileTreeStore.getState();

    // Save outgoing project state
    if (previousPath) {
      tilingStore.saveLayoutForProject(previousPath);
      previewStore.savePreviewForProject(previousPath);
      diffStore.saveDiffForProject(previousPath);
      tabsStore.saveActiveTabForProject(previousPath);
      tabsStore.saveFullscreenForProject(previousPath);
      rightPanelStore.saveStateForProject(previousPath);
      pluginsStore.saveActivePluginForProject(previousPath);
      fileTreeStore.saveSidebarStateForProject(previousPath);
    }

    // Restore incoming project state (non-layout stores first)
    previewStore.restorePreviewForProject(projectPath);
    diffStore.restoreDiffForProject(projectPath);
    tabsStore.restoreActiveTabForProject(projectPath);
    tabsStore.restoreFullscreenForProject(projectPath);
    rightPanelStore.restoreStateForProject(projectPath);
    pluginsStore.restoreActivePluginForProject(projectPath);
    fileTreeStore.restoreSidebarStateForProject(projectPath);

    // If there is a pinned plugin, ensure the right panel stays open regardless
    // of per-project saved state (pinned plugin is always visible across all projects)
    const { pinnedPluginName } = usePluginsStore.getState();
    if (pinnedPluginName) {
      usePluginsStore.getState().setActivePlugin(pinnedPluginName);
      useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });
    }

    // Layout restore LAST among sync changes so that when FlexLayout
    // re-renders with the new model, all other stores already have the
    // correct state for the incoming project.
    const projectTabIds = new Set(
      tabsStore.getTabsForProject(projectPath).map((t) => t.id),
    );
    tilingStore.restoreLayoutForProject(projectPath, projectTabIds);
    tabsStore.ensureBlocksForProjectTabs(projectPath);

    // --- Async operations below (separate render batch) ---

    await fileTreeStore.openProjectPath(projectPath);

    // Update the file-tree tab name with the project name
    const updatedTree = useFileTreeStore.getState().tree;
    if (updatedTree?.root.name) {
      useTilingLayoutStore.getState().updateFileTreeTabName(updatedTree.root.name);
    }

    // Persist previous project's UI state to disk (fire-and-forget)
    if (previousPath) {
      const prevPreview = useFilePreviewStore.getState().previewByProject[previousPath];
      const prevLayoutJson = useTilingLayoutStore.getState().layoutByProject[previousPath];
      const wsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (wsId) {
        invoke("save_project_ui_state", {
          workspaceId: wsId,
          path: previousPath,
          state: {
            sidebarOpen: useFileTreeStore.getState().isOpenByProject[previousPath] ?? true,
            rightPanelOpen: rightPanelStore.isOpenByProject[previousPath] ?? false,
            terminalFullscreen: tabsStore.isFullscreenByProject[previousPath] ?? false,
            previewFile: prevPreview?.currentFile ?? null,
            layoutJson: prevLayoutJson as Record<string, unknown> | undefined,
            ...tabsStore.serializeTabsForSave(previousPath),
          },
        }).catch(() => {});
      }
    }

    // Load persisted UI state for the new project from disk
    try {
      const savedState = await invoke<{
        sidebarOpen?: boolean;
        rightPanelOpen?: boolean;
        terminalFullscreen?: boolean;
        previewFile?: string | null;
        browserOpen?: boolean;
        browserUrl?: string;
        layoutJson?: Record<string, unknown>;
        tabs?: Array<{ id?: string; sessionType: string; cliSessionId?: string; exited?: boolean }>;
        activeTabIndex?: number;
      } | null>("get_project_ui_state", {
        workspaceId: useWorkspaceStore.getState().activeWorkspaceId ?? "",
        path: projectPath,
      });

      if (savedState) {
        // Only apply disk state if we don't have in-memory state yet
        const hasInMemoryFileTree = useFileTreeStore.getState().isOpenByProject[projectPath] !== undefined;
        if (!hasInMemoryFileTree) {
          if (savedState.sidebarOpen !== undefined) {
            useFileTreeStore.setState({ isOpen: savedState.sidebarOpen });
          }
          if (savedState.rightPanelOpen !== undefined) {
            const hasActivePlugin = usePluginsStore.getState().activePluginName !== null;
            useRightPanelStore.setState({ isOpen: savedState.rightPanelOpen && hasActivePlugin });
          }
          if (savedState.terminalFullscreen !== undefined) {
            useTerminalTabsStore.setState({ isTerminalFullscreen: savedState.terminalFullscreen });
          }
        }

        // Restore tiling layout from disk if no in-memory layout exists
        if (savedState.layoutJson) {
          const hasInMemoryLayout = useTilingLayoutStore.getState().layoutByProject[projectPath] !== undefined;
          if (!hasInMemoryLayout) {
            const { parseLayoutJson } = await import("@/lib/layout-migration");
            const layout = parseLayoutJson(savedState.layoutJson);
            useTilingLayoutStore.getState().loadFromJson(layout);
          }
        }

        // Restore terminal tabs from disk ONLY on first visit in this
        // session (no in-memory layout yet).  Once we've saved an
        // in-memory layout for a project (via saveLayoutForProject on
        // switch-away), the in-memory state is authoritative and we must
        // NOT overwrite it with potentially stale disk data — the
        // fire-and-forget disk save may not have completed yet (race).
        if (savedState.tabs?.length) {
          const existingProjectTabs = useTerminalTabsStore.getState().getTabsForProject(projectPath);
          const hasInMemoryLayout = useTilingLayoutStore.getState().layoutByProject[projectPath] !== undefined;
          if (existingProjectTabs.length === 0 && !hasInMemoryLayout) {
            const currentTabsStore = useTerminalTabsStore.getState();
            for (const tab of savedState.tabs) {
              const id = tab.id || currentTabsStore.nextTabId();
              currentTabsStore.registerTab(id, projectPath, (tab.sessionType || "claude") as import("@/lib/cli-registry").SessionType);
              if (tab.cliSessionId) currentTabsStore.setCliSessionId(id, tab.cliSessionId);
              if (tab.exited) currentTabsStore.markTabExited(id);
            }
          }
        }
      }
    } catch {
      // Non-fatal: disk state load failure
    }

    // Load icon if not already loaded
    const project = get().projects.find((p) => p.path === projectPath);
    if (project && project.iconPath === null) {
      await get().loadProjectIcon(projectPath);
    }
    } finally {
      set({ isSwitchingProject: false });
    }
  },

  reorderProjects: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const projects = [...get().projects];
    const [moved] = projects.splice(fromIndex, 1);
    projects.splice(toIndex, 0, moved);
    set({ projects });
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    if (workspaceId) {
      invoke("reorder_workspace_projects", { workspaceId, paths: projects.map((p) => p.path) }).catch(() => {});
    }
  },

  updateProject: (projectPath, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.path === projectPath ? { ...p, ...updates } : p
      ),
    }));
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    if (workspaceId) {
      invoke("update_workspace_project", {
        workspaceId,
        path: projectPath,
        name: updates.name,
        icon_path: updates.iconPath,
      }).catch(() => {});
    }
  },

  loadProjectIcon: async (projectPath: string) => {
    try {
      const iconPath = await invoke<string | null>("detect_project_icon", { path: projectPath });
      set((state) => ({
        projects: state.projects.map((p) =>
          p.path === projectPath ? { ...p, iconPath: iconPath ?? null } : p
        ),
      }));
    } catch {
      // Non-fatal: keep letter icon
    }
  },

  getProjectInitial: (nameOrPath: string) => {
    const name = basename(nameOrPath);
    return (name[0] ?? "?").toUpperCase();
  },

  getProjectColor: (nameOrPath: string) => {
    const name = basename(nameOrPath);
    const index = hashString(name) % PROJECT_COLORS.length;
    return PROJECT_COLORS[index];
  },

  setProjectSessionState: (projectPath, state) => {
    set((s) => {
      const newUnread = new Set(s.unreadProjects);
      if (state === "exited" && s.activeProjectPath !== projectPath) {
        newUnread.add(projectPath);
      }
      return {
        sessionStates: { ...s.sessionStates, [projectPath]: state },
        unreadProjects: newUnread,
      };
    });
  },

  markProjectAsRead: (projectPath) => {
    set((s) => {
      const newUnread = new Set(s.unreadProjects);
      newUnread.delete(projectPath);
      return { unreadProjects: newUnread };
    });
  },

  setProjectThinking: (projectPath, isThinking) => {
    set((s) => {
      const next = new Set(s.thinkingProjects);
      isThinking ? next.add(projectPath) : next.delete(projectPath);
      return { thinkingProjects: next };
    });
  },

  markProjectNotified: (projectPath) => {
    set((s) => {
      if (s.activeProjectPath === projectPath) return {};
      const next = new Set(s.notifiedProjects);
      next.add(projectPath);
      return { notifiedProjects: next };
    });
  },

  clearProjectNotified: (projectPath) => {
    set((s) => {
      const next = new Set(s.notifiedProjects);
      next.delete(projectPath);
      return { notifiedProjects: next };
    });
  },
}));
