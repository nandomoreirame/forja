import { getAllCliIds } from "@/lib/cli-registry";
import { invoke, listen } from "@/lib/ipc";
import {
  AlertCircle,
  Anvil,
  Plus,
} from "lucide-react";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,

  useRef,
  useState,
  type ErrorInfo,
  type ReactNode
} from "react";

import { ProjectSidebar } from "./components/project-sidebar";
import { RightSidebar } from "./components/right-sidebar";
import { TilingLayout } from "./components/tiling-layout";
import { Titlebar } from "./components/titlebar";

import { ptyDispatcher } from "./lib/pty-dispatcher";
import {
  loadPersistedSessionState,
} from "./lib/session-persistence";
import { cn } from "./lib/utils";
import { useShallow } from "zustand/react/shallow";
import { useFilePreviewStore } from "./stores/file-preview";
import { useFileTreeStore } from "./stores/file-tree";
import { useGitStatusStore } from "./stores/git-status";
import { useGitDiffStore } from "./stores/git-diff";
import { useSessionStateStore } from "./stores/session-state";
import { useTerminalTabsStore } from "./stores/terminal-tabs";
import { useTilingLayoutStore } from "./stores/tiling-layout";
import { useTerminalZoomStore } from "./stores/terminal-zoom";
import { useUserSettingsStore } from "./stores/user-settings";
import { useThemeStore } from "./stores/theme";
import type { ThemeDefinition } from "@/themes";
import { applyBackgroundOpacity } from "@/themes/apply";
import { usePerformanceStore } from "./stores/performance";
import { useProjectsStore } from "./stores/projects";
import { useWorkspaceStore } from "./stores/workspace";

import { usePluginsStore } from "./stores/plugins";
import { useFocusModeStore } from "./stores/focus-mode";
import { PluginPermissionDialog } from "./components/plugin-permission-dialog";
import { FocusModeIndicator } from "./components/focus-mode-indicator";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import {
  usePanelPreferences,
} from "./hooks/use-panel-preferences";

// Root error boundary to prevent blank screen on any React crash
interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Forja app error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-ctp-base p-8">
          <AlertCircle className="h-12 w-12 text-ctp-red" strokeWidth={1.5} />
          <h1 className="text-app-lg font-semibold text-ctp-text">
            Something went wrong
          </h1>
          <p className="max-w-md text-center text-app text-ctp-overlay1">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-ctp-surface0 px-4 py-2 text-app text-ctp-text transition-colors hover:bg-ctp-surface1"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load non-essential components
const CommandPalette = lazy(() =>
  import("./components/command-palette").then((m) => ({
    default: m.CommandPalette,
  }))
);
const ClaudeNotFoundDialog = lazy(() =>
  import("./components/claude-not-found-dialog").then((m) => ({
    default: m.ClaudeNotFoundDialog,
  }))
);

interface GitChangedPayload {
  path: string;
}

interface FilesChangedPayload {
  path: string;
  changedPaths: string[];
}

function EmptyState() {
  const openProject = useFileTreeStore((s) => s.openProject);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-ctp-text">Forja</h1>
        <p className="text-app text-ctp-overlay1">
          A dedicated desktop client for vibe coders
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-app text-ctp-overlay1">
          Click <kbd className="rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-app-sm">+</kbd> in the sidebar to add a project.
        </p>
        <button
          onClick={openProject}
          className="flex items-center gap-2 rounded-md border border-ctp-surface0 px-4 py-2 text-app text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Project
        </button>
      </div>
    </div>
  );
}

function App({
  initialProjectPath,
  initialWorkspaceId,
}: {
  initialProjectPath?: string | null;
  initialWorkspaceId?: string | null;
}) {
  const { tree, currentPath, trees, isSidebarOpen } = useFileTreeStore(
    useShallow((s) => ({
      tree: s.tree,
      currentPath: s.currentPath,
      trees: s.trees,
      isSidebarOpen: s.isOpen,
    })),
  );
  const isPreviewOpen = useFilePreviewStore((s) => s.isOpen);
  const previewCurrentFile = useFilePreviewStore((s) => s.currentFile);
  const {
    tabs,
    activeTabId,
    removeTab,
  } = useTerminalTabsStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      removeTab: s.removeTab,
    })),
  );
  const [claudeNotFound, setClaudeNotFound] = useState(false);
  const [sessionRestoreDone, setSessionRestoreDone] = useState(false);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const {
    loaded: panelPrefsLoaded,
  } =
    usePanelPreferences(currentPath);
  const hasProject = Boolean((tree && currentPath) || Object.keys(trees).length > 0);
  const tilingTabCount = useTilingLayoutStore((s) => s.tabCount);

  useEffect(() => {
    usePluginsStore.getState().loadPlugins().catch(() => {
      // Non-fatal: plugin load failure is handled inside loadPlugins()
    });
  }, []);

  // Load workspaces first, then projects for ProjectSidebar.
  // Workspaces must be loaded before projects because loadProjects() needs activeWorkspaceId.
  // Skip when opening a workspace window — the workspace activation handles its own projects.
  useEffect(() => {
    if (initialWorkspaceId) return;
    useWorkspaceStore.getState().loadWorkspaces().then(() => {
      setWorkspacesLoaded(true);
      useProjectsStore.getState().loadProjects();
    });
  }, [initialWorkspaceId]);

  // Load performance mode on mount (lite-mode detection)
  useEffect(() => {
    usePerformanceStore.getState().loadPerformanceMode();
  }, []);

  // Restore previous user session when opening app without explicit route params.
  // Waits for panelPrefsLoaded so the structural layout (tabset arrangement,
  // sizes) is already in the model before terminal blocks are added via addTab().
  // Also waits for workspacesLoaded so activeWorkspaceId is available for
  // reading saved session state from config.json.
  //
  // When initialWorkspaceId is set, this is a NEW workspace window — activate
  // that workspace (which clears file tree and project sidebar) so the window
  // opens empty with the correct workspace selected.
  useEffect(() => {
    if (initialProjectPath) {
      setSessionRestoreDone(true);
      return;
    }

    if (initialWorkspaceId) {
      // Wait for panel preferences (including layout) to load first, then reset.
      // This avoids a race where resetToDefault() runs before the old layout
      // finishes loading, causing the stale layout to overwrite our reset.
      if (!panelPrefsLoaded) return;

      let cancelled = false;
      const activateNewWorkspace = async () => {
        const wsStore = useWorkspaceStore.getState();
        await wsStore.loadWorkspaces();
        await wsStore.activateWorkspace(initialWorkspaceId);
        // activateWorkspace already handles: clearing old tabs, loading the
        // workspace layout, and restoring saved tabs with their cliSessionId
        // values. Do NOT reset or clear state here — that would wipe the
        // session IDs needed to resume CLI sessions (--resume <id>).
        if (!cancelled) setSessionRestoreDone(true);
      };
      activateNewWorkspace();
      return () => { cancelled = true; };
    }

    if (!panelPrefsLoaded || !workspacesLoaded) return;

    let cancelled = false;

    const restore = async () => {
      // Restore from config.json (workspace-scoped) instead of localStorage
      const wsStore = useWorkspaceStore.getState();
      const wsId = wsStore.activeWorkspaceId;
      const workspace = wsStore.workspaces.find((w) => w.id === wsId);
      const projectPath = workspace?.lastActiveProjectPath;

      // Fallback: try localStorage for users upgrading from older versions
      if (!wsId || !projectPath) {
        const snapshot = loadPersistedSessionState();
        if (!snapshot) {
          if (!cancelled) setSessionRestoreDone(true);
          return;
        }
        // One-time migration from localStorage
        await restoreFromSnapshot(snapshot, cancelled);
        // Clear localStorage after successful migration
        try { window.localStorage.removeItem("forja:session:v1"); } catch { /* ignore */ }
        if (!cancelled) setSessionRestoreDone(true);
        return;
      }

      const uiState = await invoke<{
        tabs?: Array<{ id?: string; path?: string; sessionType: string; cliSessionId?: string }>;
        activeTabIndex?: number;
        previewFile?: string | null;
      } | null>("get_project_ui_state", { workspaceId: wsId, path: projectPath });

      if (!uiState || !uiState.tabs || uiState.tabs.length === 0) {
        // Still open the project so the file tree loads and UI is usable,
        // even when there are no terminal sessions to restore.
        await useFileTreeStore.getState().openProjectPath(projectPath);
        await useProjectsStore.getState().addProject(projectPath);

        if (!cancelled) setSessionRestoreDone(true);
        return;
      }

      const previewStore = useFilePreviewStore.getState();
      const tabsStore = useTerminalTabsStore.getState();

      // 1) Restore project
      await useFileTreeStore.getState().openProjectPath(projectPath);
      await useProjectsStore.getState().addProject(projectPath);

      const effectiveProjectPath = useFileTreeStore.getState().currentPath;

      // 2) Restore preview file
      if (uiState.previewFile && effectiveProjectPath) {
        await previewStore.loadFile(uiState.previewFile);
      }

      // 3) Restore terminal tabs from config.json
      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });

      const layoutStore = useTilingLayoutStore.getState();
      const activeProjectTabIds: string[] = [];
      for (const tab of uiState.tabs) {
        const tabPath = tab.path || effectiveProjectPath || projectPath;
        if (!tabPath) continue;

        const isActiveProject = tabPath === effectiveProjectPath;

        if (isActiveProject) {
          const id = tab.id && layoutStore.hasBlock(tab.id)
            ? tab.id
            : tabsStore.nextTabId();
          tabsStore.addTab(id, tabPath, tab.sessionType as import("@/lib/cli-registry").SessionType);
          if (tab.cliSessionId) {
            tabsStore.setCliSessionId(id, tab.cliSessionId);
          }
          activeProjectTabIds.push(id);
        } else {
          const id = tab.id || tabsStore.nextTabId();
          tabsStore.registerTab(id, tabPath, tab.sessionType as import("@/lib/cli-registry").SessionType);
          if (tab.cliSessionId) {
            tabsStore.setCliSessionId(id, tab.cliSessionId);
          }
        }
      }

      // Clean up orphaned terminal blocks
      const activeIds = new Set(activeProjectTabIds);
      const orphanIds: string[] = [];
      layoutStore.model.visitNodes((node) => {
        if (
          node.getType() === "tab" &&
          (node as any).getComponent?.() === "terminal" &&
          !activeIds.has(node.getId())
        ) {
          orphanIds.push(node.getId());
        }
      });
      for (const orphanId of orphanIds) {
        layoutStore.removeBlock(orphanId);
      }

      if (activeProjectTabIds.length > 0) {
        const activeTabIndex = uiState.activeTabIndex ?? 0;
        const snapshotActiveTab = uiState.tabs[activeTabIndex];
        const matchingId = snapshotActiveTab?.id && activeProjectTabIds.includes(snapshotActiveTab.id)
          ? snapshotActiveTab.id
          : activeProjectTabIds[0];
        tabsStore.setActiveTab(matchingId);
      }

      // Clean stale persisted buffers (buffers for tabs that no longer exist)
      if (effectiveProjectPath) {
        const activeIds = useTerminalTabsStore.getState().tabs
          .filter(t => t.path === effectiveProjectPath)
          .map(t => t.id);
        invoke("pty:clean-stale-buffers", {
          projectPath: effectiveProjectPath,
          activeTabIds: activeIds,
        }).catch(() => {});
      }

      if (!cancelled) setSessionRestoreDone(true);
    };

    // Helper: restore from legacy localStorage snapshot (migration path)
    async function restoreFromSnapshot(snapshot: NonNullable<ReturnType<typeof loadPersistedSessionState>>, cancelled: boolean) {
      const previewStore = useFilePreviewStore.getState();
      const tabsStore = useTerminalTabsStore.getState();

      if (snapshot.activeProjectPath) {
        await useFileTreeStore.getState().openProjectPath(snapshot.activeProjectPath);
        await useProjectsStore.getState().addProject(snapshot.activeProjectPath);
      }

      const effectiveProjectPath = useFileTreeStore.getState().currentPath;

      if (snapshot.preview.isOpen && snapshot.preview.currentFile && effectiveProjectPath) {
        await previewStore.loadFile(snapshot.preview.currentFile);
      }

      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });
      const layoutStore = useTilingLayoutStore.getState();
      const activeProjectTabIds: string[] = [];

      for (const tab of snapshot.terminal.tabs) {
        const tabPath = tab.path || effectiveProjectPath || snapshot.activeProjectPath || "";
        if (!tabPath) continue;
        const isActiveProject = tabPath === effectiveProjectPath;
        if (isActiveProject) {
          const id = tab.id && layoutStore.hasBlock(tab.id) ? tab.id : tabsStore.nextTabId();
          tabsStore.addTab(id, tabPath, tab.sessionType);
          activeProjectTabIds.push(id);
        } else {
          const id = tab.id || tabsStore.nextTabId();
          tabsStore.registerTab(id, tabPath, tab.sessionType);
        }
      }

      const activeIds = new Set(activeProjectTabIds);
      const orphanIds: string[] = [];
      layoutStore.model.visitNodes((node) => {
        if (node.getType() === "tab" && (node as any).getComponent?.() === "terminal" && !activeIds.has(node.getId())) {
          orphanIds.push(node.getId());
        }
      });
      for (const orphanId of orphanIds) layoutStore.removeBlock(orphanId);

      if (activeProjectTabIds.length > 0) {
        const snapshotActiveTab = snapshot.terminal.tabs[snapshot.terminal.activeTabIndex];
        const matchingId = snapshotActiveTab?.id && activeProjectTabIds.includes(snapshotActiveTab.id)
          ? snapshotActiveTab.id : activeProjectTabIds[0];
        tabsStore.setActiveTab(matchingId);
      }
    }

    restore().catch((err) => {
      console.warn("[App] Failed to restore session:", err);
      if (!cancelled) setSessionRestoreDone(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialProjectPath, initialWorkspaceId, panelPrefsLoaded, workspacesLoaded]);

  // Load user settings on mount and listen for changes
  useEffect(() => {
    useUserSettingsStore.getState().loadSettings();

    const unlisten = listen<import("@/lib/settings-types").UserSettings>(
      "settings:changed",
      (event) => {
        useUserSettingsStore.getState().setSettings(event.payload);
      },
    );

    // Apply background-only opacity via CSS variables (not whole-window opacity).
    // BrowserWindow.setOpacity() is not supported on Linux and makes text
    // transparent on other platforms, so we use CSS background alpha instead.
    const unlistenOpacity = listen<number>("window:apply-opacity", (event) => {
      applyBackgroundOpacity(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
      unlistenOpacity.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
    };
  }, []);

  // Apply settings effects when they change
  const settings = useUserSettingsStore((s) => s.settings);
  useEffect(() => {
    // Apply background-only opacity (CSS variables with alpha channel)
    applyBackgroundOpacity(settings.window.opacity);
    // Notify main process for transparent window support
    invoke("set_window_opacity", { opacity: settings.window.opacity }).catch((err) => console.warn("[App] IPC call failed:", err));
    // Apply zoom level
    invoke("set_zoom_level", { level: settings.window.zoomLevel }).catch((err) => console.warn("[App] IPC call failed:", err));
    // Terminal font settings
    useTerminalZoomStore.getState().setBaseFontSize(settings.terminal.fontSize);
    useTerminalZoomStore.getState().setFontFamily(settings.terminal.fontFamily);
    // App (UI) font settings
    document.documentElement.style.setProperty("--font-sans", settings.app.fontFamily);
    document.documentElement.style.setProperty("font-size", `${settings.app.fontSize}px`);
    // App font-size scale (derived from base setting)
    const fs = settings.app.fontSize;
    document.documentElement.style.setProperty("--app-fs", `${fs}px`);
    document.documentElement.style.setProperty("--app-fs-sm", `${fs - 2}px`);
    document.documentElement.style.setProperty("--app-fs-xs", `${fs - 4}px`);
    document.documentElement.style.setProperty("--app-fs-2xs", `${Math.max(fs - 6, 7)}px`);
    document.documentElement.style.setProperty("--app-fs-lg", `${fs + 2}px`);
    document.documentElement.style.setProperty("--app-fs-xl", `${fs + 6}px`);
    // Editor/Preview (monospace areas) font settings
    document.documentElement.style.setProperty("--font-mono", settings.editor.fontFamily);
    document.documentElement.style.setProperty("--editor-font-size", `${settings.editor.fontSize}px`);
    // Theme settings
    const themeStore = useThemeStore.getState();
    if (settings.theme?.active && settings.theme.active !== themeStore.activeThemeId) {
      themeStore.setActiveTheme(settings.theme.active);
    }
    if (settings.theme?.custom) {
      themeStore.setCustomThemes(settings.theme.custom as ThemeDefinition[]);
    }
  }, [settings]);

  // Apply initial theme on mount
  useEffect(() => {
    useThemeStore.getState().applyCurrentTheme();
  }, []);

  // Auto-open project when launched via query param from a new window
  useEffect(() => {
    if (initialProjectPath && !currentPath) {
      useFileTreeStore.getState().openProjectPath(initialProjectPath);
    }
  }, [initialProjectPath, currentPath]);

  // Check if any AI CLI is installed when project opens (deferred)
  useEffect(() => {
    if (!currentPath) return;
    const idleId = requestIdleCallback(() => {
      invoke<Record<string, boolean>>("detect_installed_clis", {
        cliIds: getAllCliIds(),
      })
        .then((results) => {
          const anyInstalled = Object.values(results).some(Boolean);
          if (!anyInstalled) {
            setClaudeNotFound(true);
          }
        })
        .catch(() => {
          setClaudeNotFound(true);
        });
    });
    return () => cancelIdleCallback(idleId);
  }, [currentPath]);

  // Fetch git file statuses when project changes (deferred, force to ensure fresh data on switch)
  useEffect(() => {
    if (!currentPath) {
      useGitStatusStore.getState().clearStatuses();
      useGitDiffStore.getState().reset();
      return;
    }
    const idleId = requestIdleCallback(() => {
      useGitStatusStore.getState().forceFetchStatuses(currentPath);
      useGitDiffStore.getState().forceRefresh(currentPath);
    });
    return () => cancelIdleCallback(idleId);
  }, [currentPath]);

  // Keep git state warm for every loaded project in a multi-project workspace
  // Only fetch for newly added projects (avoids refetching all on every trees change)
  const fetchedProjectsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const projectPaths = Object.keys(trees);
    for (const projectPath of projectPaths) {
      if (!fetchedProjectsRef.current.has(projectPath)) {
        fetchedProjectsRef.current.add(projectPath);
        useGitStatusStore.getState().fetchStatuses(projectPath);
        useGitDiffStore.getState().fetchChangedFiles(projectPath);
      }
    }
    // Clean up removed projects
    for (const cached of fetchedProjectsRef.current) {
      if (!trees[cached]) {
        fetchedProjectsRef.current.delete(cached);
      }
    }
  }, [trees]);

  // Refresh file tree on filesystem changes (files:changed events)
  useEffect(() => {
    const unlisten = listen<FilesChangedPayload>("files:changed", (event) => {
      const changedProjectPath = event.payload?.path;
      const changedPaths = event.payload?.changedPaths ?? [];
      if (!changedProjectPath) return;

      // Only refresh the file tree if the changed project is the currently active one
      const activeProjectPath = useFileTreeStore.getState().activeProjectPath;
      if (activeProjectPath === changedProjectPath) {
        useFileTreeStore.getState().refreshTree(changedProjectPath);
      }

      // Reload preview only if the currently previewed file is among the changed paths
      useFilePreviewStore.getState().reloadCurrentFileIfChanged(changedProjectPath, changedPaths);
    });
    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
    };
  }, []);

  // Refresh git file statuses on git:changed events (debounced to coalesce rapid events)
  useEffect(() => {
    const pendingPaths = new Set<string>();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const flushPendingPaths = () => {
      for (const projectPath of pendingPaths) {
        useGitStatusStore.getState().fetchStatuses(projectPath);
        useGitDiffStore.getState().refresh(projectPath);
      }
      pendingPaths.clear();
      debounceTimer = null;
    };

    const unlisten = listen<GitChangedPayload>("git:changed", (event) => {
      const changedProjectPath = event.payload?.path;
      const resolvedPath = changedProjectPath || useFileTreeStore.getState().currentPath;
      if (!resolvedPath) return;

      pendingPaths.add(resolvedPath);

      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(flushPendingPaths, 250);
    });

    return () => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      pendingPaths.clear();
      unlisten.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
    };
  }, []);

  // Refs for keyboard handler to avoid recreating listener
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  const closeTab = useCallback(
    async (tabId: string) => {
      try {
        await invoke("close_pty", { tabId });
      } catch {
        // Session may already be closed
      }
      removeTab(tabId);
    },
    [removeTab],
  );

  // Centralized PTY event dispatcher — single IPC listener routes to all sessions via Map O(1)
  useEffect(() => {
    // Global data handler: track session activity
    ptyDispatcher.onGlobalData((tabId) => {
      const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === tabId);
      const meta = tab ? { projectPath: tab.path, sessionType: tab.sessionType } : undefined;
      useSessionStateStore.getState().onData(tabId, meta);
    });

    // Single IPC listener for pty:data
    const unlistenData = listen<{ tab_id: string; data: string }>("pty:data", (event) => {
      ptyDispatcher.handleData(event.payload);
    });

    // Single IPC listener for pty:exit
    const unlistenExit = listen<{ tab_id: string; code: number }>("pty:exit", (event) => {
      ptyDispatcher.handleExit(event.payload);
      // Mark tab as exited (keep visible so user can see output)
      useSessionStateStore.getState().onExit(event.payload.tab_id);
      useTerminalTabsStore.getState().markTabExited(event.payload.tab_id);
    });

    // Session state changes (sidebar spinner/badge indicators)
    const unlistenState = listen<{
      sessionId: string;
      projectPath: string;
      state: "running" | "exited" | "idle";
      exitCode: number | null;
    }>("pty:session-state-changed", (event) => {
      const { projectPath, state } = event.payload;
      if (state === "exited") {
        const projectTabs = useTerminalTabsStore.getState().getTabsForProject(projectPath);
        const anyRunning = projectTabs.some((t) => t.isRunning);
        useProjectsStore.getState().setProjectSessionState(
          projectPath,
          anyRunning ? "running" : "exited",
        );
      } else {
        useProjectsStore.getState().setProjectSessionState(projectPath, state);
      }
    });

    return () => {
      unlistenData.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
      unlistenExit.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
      unlistenState.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
    };
  }, []);

  // Persist session snapshot across renderer reloads.
  // Secondary workspace windows (initialWorkspaceId) must NOT write to
  // shared localStorage — it would overwrite the primary window's session.
  useEffect(() => {
    if (!sessionRestoreDone) return;
    if (initialWorkspaceId) return;

    // Persist full tab data (id, path, sessionType, activeTabIndex) to config.json per project
    if (currentPath) {
      const wsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (wsId) {
        const tabsStore = useTerminalTabsStore.getState();
        invoke("save_project_ui_state", {
          workspaceId: wsId,
          path: currentPath,
          state: tabsStore.serializeTabsForSave(currentPath),
        }).catch((err: unknown) => console.warn("[App] Failed to save project tab state:", err));

        invoke("set_last_active_project_path", {
          workspaceId: wsId,
          projectPath: currentPath,
        }).catch((err: unknown) => console.warn("[App] Failed to save last active project path:", err));
      }
    }
  }, [
    sessionRestoreDone,
    currentPath,
    isPreviewOpen,
    previewCurrentFile,
    tabs,
    activeTabId,
  ]);

  // Safety net: save ALL projects' terminal tabs on window close.
  // The reactive effect above only covers the active project; this ensures
  // non-active projects' tabs are persisted before the window is destroyed.
  useEffect(() => {
    if (initialWorkspaceId) return;

    const handler = () => {
      const tabsStore = useTerminalTabsStore.getState();
      const wsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (!wsId) return;

      const projectPaths = new Set(tabsStore.tabs.map((t) => t.path));
      for (const projectPath of projectPaths) {
        invoke("save_project_ui_state", {
          workspaceId: wsId,
          path: projectPath,
          state: tabsStore.serializeTabsForSave(projectPath),
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [initialWorkspaceId]);

  // Keyboard shortcuts extracted to dedicated hook
  useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab });

  const isFocusMode = useFocusModeStore((s) => s.isActive);

  return (
    <AppErrorBoundary>
      <div className="relative flex h-full flex-col bg-ctp-mantle">
        <div className={cn("transition-all duration-200", isFocusMode && "h-0 overflow-hidden opacity-0 pointer-events-none")}>
          <Titlebar />
        </div>
        {panelPrefsLoaded && (
          <div className="flex flex-1 overflow-hidden">
            <div className={cn("transition-all duration-200", isFocusMode && "w-0 overflow-hidden opacity-0")}>
              <ProjectSidebar
                onOpenProject={() => useFileTreeStore.getState().openProject()}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-ctp-surface0 bg-ctp-base">
            {hasProject ? (
              sessionRestoreDone ? <TilingLayout /> : null
            ) : tilingTabCount > 0 ? (
              <TilingLayout />
            ) : (
              <EmptyState />
            )}
            </div>
            <div className={cn("transition-all duration-200", isFocusMode && "w-0 overflow-hidden opacity-0")}>
              <RightSidebar hasProject={hasProject} />
            </div>
          </div>
        )}
        {isFocusMode && <FocusModeIndicator />}
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
        <Suspense fallback={null}>
          {claudeNotFound && (
            <ClaudeNotFoundDialog
              open={claudeNotFound}
              onResolved={() => setClaudeNotFound(false)}
            />
          )}
        </Suspense>
        <PluginPermissionDialog />
      </div>
    </AppErrorBoundary>
  );
}

export default App;
