import { create } from "zustand";
import { invoke } from "@/lib/ipc";

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
  sessionStates: {},
  unreadProjects: new Set<string>(),
  thinkingProjects: new Set<string>(),
  notifiedProjects: new Set<string>(),

  loadProjects: async () => {
    set({ loading: true });
    try {
      const raw = await invoke<Array<{ path: string; name: string; last_opened: string; icon_path?: string | null }>>(
        "get_recent_projects"
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
    await invoke("add_recent_project", { path: projectPath });
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
    invoke("remove_recent_project", { path: projectPath }).catch(() => {});
  },

  setActiveProject: (projectPath: string) => {
    set({ activeProjectPath: projectPath });
  },

  switchToProject: async (projectPath: string) => {
    const previousPath = get().activeProjectPath;
    set({ activeProjectPath: projectPath });
    get().markProjectAsRead(projectPath);
    get().clearProjectNotified(projectPath);

    // Save/restore tiling layout per project
    if (previousPath !== projectPath) {
      const { useTilingLayoutStore } = await import("./tiling-layout");
      const tilingStore = useTilingLayoutStore.getState();
      if (previousPath) {
        tilingStore.saveLayoutForProject(previousPath);
      }
      tilingStore.restoreLayoutForProject(projectPath);
    }

    // Save/restore file preview per project
    if (previousPath !== projectPath) {
      const { useFilePreviewStore } = await import("./file-preview");
      const previewStore = useFilePreviewStore.getState();
      if (previousPath) {
        previewStore.savePreviewForProject(previousPath);
      }
      previewStore.restorePreviewForProject(projectPath);

      // Save/restore git diff selection per project
      const { useGitDiffStore } = await import("./git-diff");
      const diffStore = useGitDiffStore.getState();
      if (previousPath) {
        diffStore.saveDiffForProject(previousPath);
      }
      diffStore.restoreDiffForProject(projectPath);
    }

    // Save/restore terminal tabs per project
    const { useTerminalTabsStore } = await import("./terminal-tabs");
    const tabsStore = useTerminalTabsStore.getState();
    if (previousPath && previousPath !== projectPath) {
      tabsStore.saveActiveTabForProject(previousPath);
      tabsStore.saveFullscreenForProject(previousPath);
    }
    tabsStore.restoreActiveTabForProject(projectPath);
    tabsStore.restoreFullscreenForProject(projectPath);

    // Ensure layout blocks exist for this project's terminal tabs.
    // Tabs registered via registerTab (during session restore for non-active
    // projects) have metadata but no layout blocks — create them now.
    tabsStore.ensureBlocksForProjectTabs(projectPath);

    // Save/restore right panel state per project
    const { useRightPanelStore } = await import("./right-panel");
    const rightPanelStore = useRightPanelStore.getState();
    if (previousPath && previousPath !== projectPath) {
      rightPanelStore.saveStateForProject(previousPath);
    }
    rightPanelStore.restoreStateForProject(projectPath);

    // Save/restore active plugin per project
    const { usePluginsStore } = await import("./plugins");
    const pluginsStore = usePluginsStore.getState();
    if (previousPath && previousPath !== projectPath) {
      pluginsStore.saveActivePluginForProject(previousPath);
    }
    pluginsStore.restoreActivePluginForProject(projectPath);

    // If there is a pinned plugin, ensure the right panel stays open regardless
    // of per-project saved state (pinned plugin is always visible across all projects)
    const afterRestoreStore = usePluginsStore.getState();
    const { pinnedPluginName } = afterRestoreStore;
    if (pinnedPluginName) {
      afterRestoreStore.setActivePlugin(pinnedPluginName);
      useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });
    }

    // Save/restore file tree sidebar state per project
    const { useFileTreeStore } = await import("./file-tree");
    const fileTreeStore = useFileTreeStore.getState();
    if (previousPath && previousPath !== projectPath) {
      fileTreeStore.saveSidebarStateForProject(previousPath);
    }
    fileTreeStore.restoreSidebarStateForProject(projectPath);

    await fileTreeStore.openProjectPath(projectPath);

    // Update the file-tree tab name with the project name
    // Re-read fresh state after openProjectPath (which calls set() internally)
    const updatedTree = useFileTreeStore.getState().tree;
    if (updatedTree?.root.name) {
      const tilingStoreNow = (await import("./tiling-layout")).useTilingLayoutStore.getState();
      tilingStoreNow.updateFileTreeTabName(updatedTree.root.name);
    }

    // Persist previous project's UI state to disk
    if (previousPath && previousPath !== projectPath) {
      const prevPreviewStore = (await import("./file-preview")).useFilePreviewStore.getState();
      const prevPreview = prevPreviewStore.previewByProject[previousPath];
      const { useTilingLayoutStore } = await import("./tiling-layout");
      const tilingStore = useTilingLayoutStore.getState();
      const prevLayoutJson = tilingStore.layoutByProject[previousPath];
      invoke("save_project_ui_state", {
        path: previousPath,
        state: {
          sidebarOpen: useFileTreeStore.getState().isOpenByProject[previousPath] ?? true,
          rightPanelOpen: rightPanelStore.isOpenByProject[previousPath] ?? false,
          terminalFullscreen: tabsStore.isFullscreenByProject[previousPath] ?? false,
          previewFile: prevPreview?.currentFile ?? null,
          layoutJson: prevLayoutJson as Record<string, unknown> | undefined,
        },
      }).catch(() => {});
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
      } | null>("get_project_ui_state", { path: projectPath });

      if (savedState) {
        // Only apply disk state if we don't have in-memory state yet
        const hasInMemoryFileTree = useFileTreeStore.getState().isOpenByProject[projectPath] !== undefined;
        if (!hasInMemoryFileTree) {
          if (savedState.sidebarOpen !== undefined) {
            useFileTreeStore.setState({ isOpen: savedState.sidebarOpen });
          }
          if (savedState.rightPanelOpen !== undefined) {
            // Only open right panel if there is an active plugin to show
            const { usePluginsStore } = await import("./plugins");
            const hasActivePlugin = usePluginsStore.getState().activePluginName !== null;
            useRightPanelStore.setState({ isOpen: savedState.rightPanelOpen && hasActivePlugin });
          }
          if (savedState.terminalFullscreen !== undefined) {
            useTerminalTabsStore.setState({ isTerminalFullscreen: savedState.terminalFullscreen });
          }
        }

        // Restore tiling layout from disk if no in-memory layout exists
        if (savedState.layoutJson) {
          const { useTilingLayoutStore } = await import("./tiling-layout");
          const tilingStore = useTilingLayoutStore.getState();
          const hasInMemoryLayout = tilingStore.layoutByProject[projectPath] !== undefined;
          if (!hasInMemoryLayout) {
            const { parseLayoutJson } = await import("@/lib/layout-migration");
            const layout = parseLayoutJson(savedState.layoutJson);
            tilingStore.loadFromJson(layout);
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
  },

  reorderProjects: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const projects = [...get().projects];
    const [moved] = projects.splice(fromIndex, 1);
    projects.splice(toIndex, 0, moved);
    set({ projects });
    invoke("reorder_recent_projects", { paths: projects.map((p) => p.path) }).catch(() => {});
  },

  updateProject: (projectPath, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.path === projectPath ? { ...p, ...updates } : p
      ),
    }));
    invoke("update_recent_project", {
      path: projectPath,
      name: updates.name,
      icon_path: updates.iconPath,
    }).catch(() => {});
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
