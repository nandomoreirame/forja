import { create } from "zustand";
import { invoke } from "@/lib/ipc";
import { useWorkspaceStore } from "./workspace";

// ---------------------------------------------------------------------------
// Module-level helpers (Task 6): single source of truth for project UI state
// ---------------------------------------------------------------------------

export async function saveCurrentProjectToDisk(projectPath: string): Promise<void> {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) return;

  // Dynamic imports to avoid circular dependencies
  const [
    { useTerminalTabsStore },
    { useTilingLayoutStore },
    { useFileTreeStore },
    { useRightPanelStore },
    { useFilePreviewStore },
    { usePluginsStore },
    { resolveMissingSessionIds },
  ] = await Promise.all([
    import("./terminal-tabs"),
    import("./tiling-layout"),
    import("./file-tree"),
    import("./right-panel"),
    import("./file-preview"),
    import("./plugins"),
    import("@/hooks/use-pty"),
  ]);

  // Safety net: resolve any missing session IDs before saving
  await resolveMissingSessionIds(projectPath);

  const tabsStore = useTerminalTabsStore.getState();
  const tilingStore = useTilingLayoutStore.getState();

  await invoke("save_project_ui_state", {
    workspaceId: wsId,
    path: projectPath,
    state: {
      sidebarOpen: useFileTreeStore.getState().isOpen,
      rightPanelOpen: useRightPanelStore.getState().isOpen,
      rightPanelActiveView: useRightPanelStore.getState().activeView,
      terminalFullscreen: tabsStore.isTerminalFullscreen,
      previewFile: useFilePreviewStore.getState().currentFile,
      activePluginName: usePluginsStore.getState().activePluginName,
      layoutJson: tilingStore.getModelJson() as Record<string, unknown>,
      ...tabsStore.serializeTabsForSave(projectPath),
    },
  });
}

export async function loadProjectFromDisk(projectPath: string): Promise<void> {
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) return;

  const savedState = await invoke<{
    sidebarOpen?: boolean;
    rightPanelOpen?: boolean;
    rightPanelActiveView?: string;
    terminalFullscreen?: boolean;
    previewFile?: string | null;
    activePluginName?: string | null;
    layoutJson?: Record<string, unknown>;
    tabs?: Array<{ id?: string; sessionType: string; cliSessionId?: string; exited?: boolean; customName?: string; tmuxSessionName?: string }>;
    activeTabIndex?: number;
  } | null>("get_project_ui_state", {
    workspaceId: wsId,
    path: projectPath,
  });

  if (!savedState) return;

  // Dynamic imports
  const [
    { useTerminalTabsStore },
    { useTilingLayoutStore },
    { useFileTreeStore },
    { useRightPanelStore },
    { usePluginsStore },
  ] = await Promise.all([
    import("./terminal-tabs"),
    import("./tiling-layout"),
    import("./file-tree"),
    import("./right-panel"),
    import("./plugins"),
  ]);

  if (savedState.sidebarOpen !== undefined) {
    useFileTreeStore.setState({ isOpen: savedState.sidebarOpen });
  }

  if (savedState.activePluginName !== undefined) {
    usePluginsStore.getState().setActivePlugin(savedState.activePluginName);
  }

  if (savedState.rightPanelOpen !== undefined) {
    const hasPlugin = usePluginsStore.getState().activePluginName !== null;
    useRightPanelStore.setState({
      isOpen: savedState.rightPanelOpen && hasPlugin,
      ...(savedState.rightPanelActiveView ? { activeView: savedState.rightPanelActiveView as "empty" | "plugin" | "marketplace" } : {}),
    });
  }

  if (savedState.terminalFullscreen !== undefined) {
    useTerminalTabsStore.setState({ isTerminalFullscreen: savedState.terminalFullscreen });
  }

  // Restore tiling layout
  if (savedState.layoutJson) {
    const { parseLayoutJson } = await import("@/lib/layout-migration");
    let layout = parseLayoutJson(savedState.layoutJson);

    const { stripFilePreviewBlocksFromJson } = await import("./tiling-layout");
    layout = stripFilePreviewBlocksFromJson(layout);

    const projectTabs = useTerminalTabsStore.getState().getTabsForProject(projectPath);
    const hasSavedTabs = savedState.tabs && savedState.tabs.length > 0;
    if (projectTabs.length === 0 && !hasSavedTabs) {
      // Only strip terminal blocks when there are truly no tabs to restore.
      // When saved tabs exist, keep blocks in the layout so they preserve
      // their tabset positions (left/right split). ensureBlocksForProjectTabs()
      // will skip creation for blocks that already exist in the model.
      const { stripProjectBlocksFromJson } = await import("./tiling-layout");
      layout = stripProjectBlocksFromJson(layout);
    }

    useTilingLayoutStore.getState().loadFromJson(layout);
  }

  // Restore terminal tabs from disk on first visit in this session
  if (savedState.tabs?.length) {
    const existingTabs = useTerminalTabsStore.getState().getTabsForProject(projectPath);
    if (existingTabs.length === 0) {
      const tabsStore = useTerminalTabsStore.getState();
      for (const tab of savedState.tabs) {
        const id = tab.id || tabsStore.nextTabId();
        tabsStore.registerTab(
          id,
          projectPath,
          (tab.sessionType || "claude") as import("@/lib/cli-registry").SessionType,
          tab.customName,
        );
        if (tab.cliSessionId) tabsStore.setCliSessionId(id, tab.cliSessionId);
        if (tab.exited) tabsStore.markTabExited(id);
        if (tab.tmuxSessionName) tabsStore.setTmuxSessionName(id, tab.tmuxSessionName);
      }
    }
  }
}

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
  notificationMessages: Record<string, string>;
  /** Path of the project that was just switched to via keyboard shortcut.
   *  Used to temporarily show the sidebar tooltip + focus glow. Auto-clears after timeout. */
  keyboardFocusedProjectPath: string | null;

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
  markProjectNotified: (projectPath: string, message?: string) => void;
  clearProjectNotified: (projectPath: string) => void;
  setProjectNotificationMessage: (projectPath: string, message: string) => void;
  clearProjectNotificationMessage: (projectPath: string) => void;
  flashKeyboardFocus: (projectPath: string, durationMs?: number) => void;
}

let _keyboardFocusTimer: ReturnType<typeof setTimeout> | null = null;

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProjectPath: null,
  loading: false,
  isSwitchingProject: false,
  sessionStates: {},
  unreadProjects: new Set<string>(),
  thinkingProjects: new Set<string>(),
  notifiedProjects: new Set<string>(),
  notificationMessages: {},
  keyboardFocusedProjectPath: null,

  flashKeyboardFocus: (projectPath: string, durationMs = 2000) => {
    if (_keyboardFocusTimer !== null) {
      clearTimeout(_keyboardFocusTimer);
      _keyboardFocusTimer = null;
    }
    set({ keyboardFocusedProjectPath: projectPath });
    _keyboardFocusTimer = setTimeout(() => {
      set({ keyboardFocusedProjectPath: null });
      _keyboardFocusTimer = null;
    }, durationMs);
  },

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
      set((state) => ({ projects: [...state.projects, newProject] }));
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
    const isRemovingActive = activeProjectPath === projectPath;
    const newProjects = projects.filter((p) => p.path !== projectPath);
    const newActive = isRemovingActive ? (newProjects[0]?.path ?? null) : activeProjectPath;

    // Guard persist effects: set isSwitchingProject when removing the active
    // project AND there is another project to switch to.  This prevents
    // App.tsx from saving the stale layout under the next project's path.
    // The flag is reset by switchToProject (called by the UI after removal)
    // or immediately if no projects remain.
    if (isRemovingActive && newActive) {
      set({ isSwitchingProject: true });
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

    // Guard against concurrent switches — a second call while the first is
    // still in-flight would read partially-updated state and corrupt saved
    // project layouts (sessions bleed across projects).
    if (get().isSwitchingProject) return;

    set({ isSwitchingProject: true });
    try {
      // Pre-resolve dynamic imports
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

      // Exit focus mode for correct save
      const wasFocusMode = useFocusModeStore.getState().isActive;
      if (wasFocusMode) {
        useFocusModeStore.getState().exitFocusMode();
      }

      // 1. SAVE outgoing project to disk (AWAITED)
      if (previousPath) {
        await saveCurrentProjectToDisk(previousPath);
      }

      // Keep git diff data caches in sync (these are data caches, not UI state)
      const diffStore = useGitDiffStore.getState();
      if (previousPath) {
        diffStore.saveDiffForProject(previousPath);
      }
      diffStore.restoreDiffForProject(projectPath);

      // 2. Set new active project
      set({ activeProjectPath: projectPath });
      get().markProjectAsRead(projectPath);
      get().clearProjectNotified(projectPath);

      // 3. Reset stores to defaults (prevents stale flash)
      useFilePreviewStore.setState({
        currentFile: null, content: null, error: null,
        isEditing: false, editContent: null, editDirty: false,
      });
      useGitDiffStore.getState().clearSelection();
      useTerminalTabsStore.setState({ isTerminalFullscreen: false });
      useRightPanelStore.setState({ isOpen: false, activeView: "empty" });

      // Reset tiling layout to a clean default BEFORE loading the new
      // project's state.  Without this, when loadProjectFromDisk finds no
      // saved layoutJson (first open, disk failure, partial state), the
      // outgoing project's layout bleeds through and gets persisted under
      // the new project's config — permanently contaminating it with
      // terminal blocks from the wrong project.
      useTilingLayoutStore.getState().resetToDefault();

      // 4. Load file tree for new project
      await useFileTreeStore.getState().openProjectPath(projectPath);
      const updatedTree = useFileTreeStore.getState().tree;
      if (updatedTree?.root.name) {
        useTilingLayoutStore.getState().updateFileTreeTabName(updatedTree.root.name);
      }

      // 5. Load UI state from disk (single source of truth)
      try {
        await loadProjectFromDisk(projectPath);
      } catch {
        // Non-fatal: disk state load failure
      }

      // 6. Pinned plugin override (after disk load so it takes precedence)
      const { pinnedPluginName } = usePluginsStore.getState();
      if (pinnedPluginName) {
        usePluginsStore.getState().setActivePlugin(pinnedPluginName);
        useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });
      }

      // 7. Ensure terminal blocks exist for loaded tabs
      useTerminalTabsStore.getState().ensureBlocksForProjectTabs(projectPath);

      // 8. Restore active tab for this project
      const projectTabs = useTerminalTabsStore.getState().getTabsForProject(projectPath);
      if (projectTabs.length > 0) {
        const activeTabId = useTerminalTabsStore.getState().activeTabId;
        if (!activeTabId || !projectTabs.some((t) => t.id === activeTabId)) {
          useTerminalTabsStore.setState({ activeTabId: projectTabs[0].id });
        }
      }

      // 9. Re-enter focus mode
      if (wasFocusMode) {
        useFocusModeStore.getState().enterFocusMode();
      }

      // 10. Load icon if needed
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

  markProjectNotified: (projectPath, message) => {
    set((s) => {
      if (s.activeProjectPath === projectPath) return {};
      const next = new Set(s.notifiedProjects);
      next.add(projectPath);
      const msgs = message
        ? { ...s.notificationMessages, [projectPath]: message }
        : s.notificationMessages;
      return { notifiedProjects: next, notificationMessages: msgs };
    });
  },

  clearProjectNotified: (projectPath) => {
    set((s) => {
      const next = new Set(s.notifiedProjects);
      next.delete(projectPath);
      const msgs = { ...s.notificationMessages };
      delete msgs[projectPath];
      return { notifiedProjects: next, notificationMessages: msgs };
    });
  },

  setProjectNotificationMessage: (projectPath, message) => {
    set((s) => ({
      notificationMessages: { ...s.notificationMessages, [projectPath]: message },
    }));
  },

  clearProjectNotificationMessage: (projectPath) => {
    set((s) => {
      const next = { ...s.notificationMessages };
      delete next[projectPath];
      return { notificationMessages: next };
    });
  },
}));
