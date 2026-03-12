import { getAllCliIds, type SessionType } from "@/lib/cli-registry";
import { invoke, listen } from "@/lib/ipc";
import {
  AlertCircle,
  Anvil,
  Loader2,
  Plus,
  TerminalSquare,
} from "lucide-react";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode
} from "react";
import { usePanelRef } from "react-resizable-panels";
const FilePreviewPane = lazy(() =>
  import("./components/file-preview-pane").then((m) => ({
    default: m.FilePreviewPane,
  }))
);
import { useBrowserPaneStore } from "./stores/browser-pane";

const BrowserPane = lazy(() =>
  import("./components/browser-pane").then((m) => ({
    default: m.BrowserPane,
  }))
);
import { FileTreeSidebar, SIDEBAR_MAX_WIDTH } from "./components/file-tree-sidebar";
import { NewSessionDropdown } from "./components/new-session-dropdown";
import { ProjectSidebar } from "./components/project-sidebar";
import { RightSidebar } from "./components/right-sidebar";
import { TabBar } from "./components/tab-bar";
import { TerminalPane } from "./components/terminal-pane";
import { Titlebar } from "./components/titlebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { MOD_KEY } from "./lib/platform";
import { ptyDispatcher } from "./lib/pty-dispatcher";
import {
  loadPersistedSessionState,
  savePersistedSessionState,
} from "./lib/session-persistence";
import { useShallow } from "zustand/react/shallow";
import { useFilePreviewStore } from "./stores/file-preview";
import { useFileTreeStore } from "./stores/file-tree";
import { useGitStatusStore } from "./stores/git-status";
import { useGitDiffStore } from "./stores/git-diff";
import { useSessionStateStore } from "./stores/session-state";
import { useTerminalSplitLayoutStore } from "./stores/terminal-split-layout";
import { useRightPanelStore } from "./stores/right-panel";
import { useTerminalTabsStore } from "./stores/terminal-tabs";
import { useTerminalZoomStore } from "./stores/terminal-zoom";
import { useUserSettingsStore } from "./stores/user-settings";
import { useThemeStore } from "./stores/theme";
import type { ThemeDefinition } from "@/themes";
import { usePerformanceStore } from "./stores/performance";
import { useProjectsStore } from "./stores/projects";
import { useAgentChatStore } from "./stores/agent-chat";
import { usePluginsStore } from "./stores/plugins";
import { PluginPermissionDialog } from "./components/plugin-permission-dialog";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useBrowserAutoOpen } from "./hooks/use-browser-auto-open";
import {
  getPanelSizesForLayout,
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
          <h1 className="text-lg font-semibold text-ctp-text">
            Something went wrong
          </h1>
          <p className="max-w-md text-center text-sm text-ctp-overlay1">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-ctp-surface0 px-4 py-2 text-sm text-ctp-text transition-colors hover:bg-ctp-surface1"
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
const ChatPanel = lazy(() =>
  import("./components/chat-panel").then((m) => ({
    default: m.ChatPanel,
  }))
);
const ClaudeNotFoundDialog = lazy(() =>
  import("./components/claude-not-found-dialog").then((m) => ({
    default: m.ClaudeNotFoundDialog,
  }))
);
const PluginHost = lazy(() =>
  import("./components/plugin-host").then((m) => ({
    default: m.PluginHost,
  }))
);

interface GitChangedPayload {
  path: string;
}

interface FilesChangedPayload {
  path: string;
  changedPaths: string[];
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-[11px] text-ctp-overlay1">
      {children}
    </kbd>
  );
}

function EmptyState() {
  const openProject = useFileTreeStore((s) => s.openProject);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-ctp-text">Forja</h1>
        <p className="text-sm text-ctp-overlay1">
          A dedicated desktop client for vibe coders
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-ctp-overlay1">
          Click <kbd className="rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-xs">+</kbd> in the sidebar to add a project.
        </p>
        <button
          onClick={openProject}
          className="flex items-center gap-2 rounded-md border border-ctp-surface0 px-4 py-2 text-sm text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Project
        </button>
      </div>
    </div>
  );
}

function NoSessionsState({
  onSessionTypeSelect,
}: {
  onSessionTypeSelect: (type: SessionType) => void;
}) {
  const mod = MOD_KEY;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <TerminalSquare className="h-12 w-12 text-ctp-surface1" strokeWidth={1.5} />
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-ctp-overlay1">No active sessions</p>
        <div className="mt-2 flex items-center gap-2">
          <NewSessionDropdown onSessionTypeSelect={onSessionTypeSelect} />
          <span className="flex items-center gap-1">
            <Kbd>{mod}</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>Shift</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>T</Kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

function App({ initialProjectPath }: { initialProjectPath?: string | null }) {
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
  const isBrowserOpen = useBrowserPaneStore((s) => s.isOpen);
  const {
    isTerminalFullscreen,
    tabs,
    activeTabId,
    nextTabId,
    addTab,
    removeTab,
    setActiveTab,
  } = useTerminalTabsStore(
    useShallow((s) => ({
      isTerminalFullscreen: s.isTerminalFullscreen,
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      nextTabId: s.nextTabId,
      addTab: s.addTab,
      removeTab: s.removeTab,
      setActiveTab: s.setActiveTab,
    })),
  );
  const splitOrientation = useTerminalSplitLayoutStore((s) => s.orientation);
  const splitRatio = useTerminalSplitLayoutStore((s) => s.ratio);
  const splitTabId = useTerminalSplitLayoutStore((s) => s.splitTabId);
  const secondarySessionType = useTerminalSplitLayoutStore((s) => s.secondarySessionType);
  // Filter tabs to only show the ones belonging to the active project
  const projectTabs = useMemo(
    () => (currentPath ? tabs.filter((t) => t.path === currentPath) : tabs),
    [tabs, currentPath],
  );
  const projectActiveTabId = projectTabs.some((t) => t.id === activeTabId)
    ? activeTabId
    : projectTabs[0]?.id ?? null;

  const [claudeNotFound, setClaudeNotFound] = useState(false);
  const [sessionRestoreDone, setSessionRestoreDone] = useState(false);
  const sidebarPanelRef = usePanelRef();
  const previewPanelRef = usePanelRef();
  const terminalPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();
  const {
    panelSizes,
    sidebarOpen: persistedSidebarOpen,
    terminalSplit: persistedTerminalSplit,
    loaded: panelPrefsLoaded,
    savePanelSize,
    saveSidebarOpen,
    saveTerminalSplit,
  } =
    usePanelPreferences();
  const isChatOpen = useAgentChatStore((s) => s.isPanelOpen);
  const activePluginName = usePluginsStore((s) => s.activePluginName);
  const hasProject = Boolean((tree && currentPath) || Object.keys(trees).length > 0);
  const effectivePanelSizes = getPanelSizesForLayout(hasProject, panelSizes);

  // Sync persisted sidebarOpen preference into the file tree store on load
  const sidebarSyncedRef = useRef(false);
  useEffect(() => {
    if (!panelPrefsLoaded || sidebarSyncedRef.current) return;
    sidebarSyncedRef.current = true;
    const store = useFileTreeStore.getState();
    if (store.isOpen !== persistedSidebarOpen) {
      store.toggleSidebar();
    }
  }, [panelPrefsLoaded, persistedSidebarOpen]);

  // Load per-project UI state from disk on initial project load
  // This overrides the global sidebar preference above with per-project state when available
  const perProjectStateLoadedRef = useRef(false);
  useEffect(() => {
    if (!sessionRestoreDone || !currentPath || perProjectStateLoadedRef.current) return;
    perProjectStateLoadedRef.current = true;

    invoke<{
      sidebarOpen?: boolean;
      rightPanelOpen?: boolean;
      terminalFullscreen?: boolean;
      previewFile?: string | null;
      browserOpen?: boolean;
      browserUrl?: string;
    } | null>("get_project_ui_state", { path: currentPath })
      .then((savedState) => {
        if (!savedState) return;
        if (savedState.sidebarOpen !== undefined) {
          const store = useFileTreeStore.getState();
          if (store.isOpen !== savedState.sidebarOpen) {
            store.toggleSidebar();
          }
        }
        if (savedState.rightPanelOpen !== undefined) {
          useRightPanelStore.setState({ isOpen: savedState.rightPanelOpen });
        }
        if (savedState.terminalFullscreen !== undefined) {
          useTerminalTabsStore.setState({ isTerminalFullscreen: savedState.terminalFullscreen });
        }
      })
      .catch(() => {
        // Non-fatal: disk state load failure
      });
  }, [sessionRestoreDone, currentPath]);

  useEffect(() => {
    void usePluginsStore.getState().loadPlugins();
  }, []);

  const splitPrefsSyncedRef = useRef(false);
  useEffect(() => {
    if (!panelPrefsLoaded || splitPrefsSyncedRef.current) return;
    splitPrefsSyncedRef.current = true;
    const splitStore = useTerminalSplitLayoutStore.getState();
    splitStore.setRatio(persistedTerminalSplit.ratio);
    if (!persistedTerminalSplit.enabled) {
      splitStore.closeSplit();
    }
  }, [panelPrefsLoaded, persistedTerminalSplit]);

  useEffect(() => {
    if (!panelPrefsLoaded) return;
    saveTerminalSplit({
      enabled: splitOrientation !== "none",
      orientation:
        splitOrientation === "horizontal" ? "horizontal" : "vertical",
      ratio: splitRatio,
    });
  }, [panelPrefsLoaded, splitOrientation, splitRatio, saveTerminalSplit]);

  // Sync sidebar panel collapse with store (and fullscreen)
  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (isTerminalFullscreen) {
      if (!panel.isCollapsed()) panel.collapse();
    } else if (isSidebarOpen && panel.isCollapsed()) {
      panel.expand();
    } else if (!isSidebarOpen && !panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isSidebarOpen, isTerminalFullscreen]);

  // Expand sidebar when chat opens (chat lives inside the sidebar panel)
  useEffect(() => {
    if (isChatOpen) {
      const panel = sidebarPanelRef.current;
      if (panel?.isCollapsed()) {
        panel.expand();
      }
      if (!useFileTreeStore.getState().isOpen) {
        useFileTreeStore.getState().toggleSidebar();
        saveSidebarOpen(true);
      }
    }
  }, [isChatOpen, saveSidebarOpen]);

  // Sync preview + terminal panel sizes together
  // Both effects need to know about each other's state to calculate correct sizes
  const savedPreviewSize = effectivePanelSizes.previewSize > 0 && effectivePanelSizes.previewSize < 100
    ? effectivePanelSizes.previewSize
    : 35;

  // Sync preview panel collapse with store (also opens for browser pane)
  const previewPaneVisible = isPreviewOpen || isBrowserOpen;
  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel) return;
    if (isTerminalFullscreen) {
      if (!panel.isCollapsed()) panel.collapse();
      return;
    }
    if (previewPaneVisible) {
      if (panel.isCollapsed()) panel.expand();
      panel.resize(`${savedPreviewSize}%`);
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
  }, [previewPaneVisible, savedPreviewSize, isTerminalFullscreen]);

  // Sync terminal panel size with fullscreen state
  useEffect(() => {
    const terminal = terminalPanelRef.current;
    if (!terminal) return;
    const targetSize = isTerminalFullscreen
      ? 100
      : previewPaneVisible ? 100 - savedPreviewSize : 100;
    terminal.resize(`${targetSize}%`);
  }, [isTerminalFullscreen, previewPaneVisible, savedPreviewSize]);

  // Sync right panel collapse with store
  const isRightPanelOpen = useRightPanelStore((s) => s.isOpen);
  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    if (isRightPanelOpen) {
      if (panel.isCollapsed()) panel.expand();
      panel.resize(400);
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isRightPanelOpen]);

  // Load projects on mount for ProjectSidebar
  useEffect(() => {
    useProjectsStore.getState().loadProjects();
  }, []);

  // Load performance mode on mount (lite-mode detection)
  useEffect(() => {
    usePerformanceStore.getState().loadPerformanceMode();
  }, []);

  // Restore previous user session when opening app without explicit route params
  useEffect(() => {
    if (initialProjectPath) {
      setSessionRestoreDone(true);
      return;
    }

    let cancelled = false;

    const restore = async () => {
      const snapshot = loadPersistedSessionState();
      if (!snapshot) {
        if (!cancelled) setSessionRestoreDone(true);
        return;
      }

      const previewStore = useFilePreviewStore.getState();
      const tabsStore = useTerminalTabsStore.getState();
      const splitStore = useTerminalSplitLayoutStore.getState();

      // 1) Restore project
      if (snapshot.activeProjectPath) {
        await useFileTreeStore.getState().openProjectPath(snapshot.activeProjectPath);
        // Also register in projects store
        await useProjectsStore.getState().addProject(snapshot.activeProjectPath);
      }

      const effectiveProjectPath = useFileTreeStore.getState().currentPath;

      // 2) Restore preview file
      if (snapshot.preview.isOpen && snapshot.preview.currentFile && effectiveProjectPath) {
        await previewStore.loadFile(snapshot.preview.currentFile);
      }

      // 3) Restore terminal tabs
      useTerminalTabsStore.setState({
        tabs: [],
        activeTabId: null,
      });

      const restoredTabIds: string[] = [];
      for (const tab of snapshot.terminal.tabs) {
        const id = tabsStore.nextTabId();
        const tabPath = tab.path || effectiveProjectPath || snapshot.activeProjectPath || "";
        if (!tabPath) continue;
        tabsStore.addTab(id, tabPath, tab.sessionType);
        if (tab.customName) {
          tabsStore.renameTab(id, tab.customName);
        }
        restoredTabIds.push(id);
      }

      if (restoredTabIds.length > 0) {
        const restoredActiveTabId =
          restoredTabIds[
            Math.min(snapshot.terminal.activeTabIndex, restoredTabIds.length - 1)
          ] ?? restoredTabIds[0];
        tabsStore.setActiveTab(restoredActiveTabId);
      }

      const split = snapshot.terminal.split;
      if (
        split.isEnabled &&
        split.splitTabIndex < restoredTabIds.length &&
        split.secondarySessionType
      ) {
        const splitId = restoredTabIds[split.splitTabIndex];
        splitStore.openSplit(split.orientation, splitId, split.secondarySessionType);
        splitStore.setRatio(split.ratio);
      } else {
        splitStore.resetForProjectSwitch();
      }

      if (!cancelled) setSessionRestoreDone(true);
    };

    restore().catch((err) => {
      console.warn("[App] Failed to restore session:", err);
      if (!cancelled) setSessionRestoreDone(true);
    });

    return () => {
      cancelled = true;
    };
  }, [initialProjectPath]);

  // Load user settings on mount and listen for changes
  useEffect(() => {
    useUserSettingsStore.getState().loadSettings();

    const unlisten = listen<import("@/lib/settings-types").UserSettings>(
      "settings:changed",
      (event) => {
        useUserSettingsStore.getState().setSettings(event.payload);
      },
    );

    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
    };
  }, []);

  // Apply settings effects when they change
  const settings = useUserSettingsStore((s) => s.settings);
  useEffect(() => {
    // Apply window opacity
    invoke("set_window_opacity", { opacity: settings.window.opacity }).catch((err) => console.warn("[App] IPC call failed:", err));
    // Apply zoom level
    invoke("set_zoom_level", { level: settings.window.zoomLevel }).catch((err) => console.warn("[App] IPC call failed:", err));
    // Terminal font settings
    useTerminalZoomStore.getState().setBaseFontSize(settings.terminal.fontSize);
    useTerminalZoomStore.getState().setFontFamily(settings.terminal.fontFamily);
    // App (UI) font settings
    document.documentElement.style.setProperty("--font-sans", settings.app.fontFamily);
    document.documentElement.style.setProperty("font-size", `${settings.app.fontSize}px`);
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

  const handleNewSessionType = useCallback(
    (sessionType: SessionType) => {
      if (!currentPath) return;
      const tabId = nextTabId();
      addTab(tabId, currentPath, sessionType);
    },
    [currentPath, nextTabId, addTab],
  );

  const handleSelectTab = useCallback(
    (tabId: string) => setActiveTab(tabId),
    [setActiveTab],
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      const splitStore = useTerminalSplitLayoutStore.getState();
      if (splitStore.splitTabId === tabId) {
        splitStore.closeSplit();
        try {
          await invoke("close_pty", { tabId: `${tabId}:split` });
        } catch {
          // Secondary PTY may already be closed
        }
      }
      try {
        await invoke("close_pty", { tabId });
      } catch {
        // Session may already be closed
      }
      removeTab(tabId);
    },
    [removeTab],
  );

  useEffect(() => {
    const splitStore = useTerminalSplitLayoutStore.getState();
    if (splitStore.orientation === "none" || !splitStore.splitTabId) return;
    if (!useTerminalTabsStore.getState().hasTab(splitStore.splitTabId)) {
      splitStore.closeSplit();
    }
  }, [tabs]);

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

  // Persist session snapshot across renderer reloads
  useEffect(() => {
    if (!sessionRestoreDone) return;
    const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    const splitTabIndex = splitTabId
      ? tabs.findIndex((t) => t.id === splitTabId)
      : -1;
    savePersistedSessionState({
      activeWorkspaceId: null, // deprecated, keep for backward compat
      activeProjectPath: currentPath,
      preview: {
        isOpen: isPreviewOpen,
        currentFile: previewCurrentFile,
      },
      terminal: {
        activeTabIndex: activeTabIndex >= 0 ? activeTabIndex : 0,
        split: {
          isEnabled: splitOrientation !== "none" && splitTabIndex >= 0,
          orientation:
            splitOrientation === "horizontal" ? "horizontal" : "vertical",
          ratio: splitRatio,
          splitTabIndex: splitTabIndex >= 0 ? splitTabIndex : 0,
          secondarySessionType: secondarySessionType ?? null,
        },
        tabs: tabs.map((tab) => ({
          path: tab.path,
          sessionType: tab.sessionType,
          ...(tab.customName ? { customName: tab.customName } : {}),
        })),
      },
    });

    // Also persist tab data (session types + custom names) to config.json per project
    if (currentPath) {
      invoke("save_project_ui_state", {
        path: currentPath,
        state: {
          tabs: tabs.map((tab) => ({
            sessionType: tab.sessionType,
            ...(tab.customName ? { customName: tab.customName } : {}),
          })),
        },
      }).catch((err: unknown) => console.warn("[App] Failed to save project tab state:", err));
    }
  }, [
    sessionRestoreDone,
    currentPath,
    isPreviewOpen,
    previewCurrentFile,
    splitOrientation,
    splitRatio,
    splitTabId,
    secondarySessionType,
    tabs,
    activeTabId,
  ]);

  // Keyboard shortcuts extracted to dedicated hook
  useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab });

  // Auto-open browser pane when a localhost URL is detected in terminal output
  useBrowserAutoOpen();

  return (
    <AppErrorBoundary>
      <div className="relative flex h-full flex-col bg-ctp-mantle">
        <Titlebar />
        {panelPrefsLoaded && (
          <div className="flex flex-1 overflow-hidden">
            <ProjectSidebar
              onOpenProject={() => useFileTreeStore.getState().openProject()}
            />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-ctp-surface0 bg-ctp-base">
            {hasProject ? (
          <ResizablePanelGroup
            orientation="horizontal"
            className="flex-1 overflow-hidden"
          >
            <ResizablePanel
              panelRef={sidebarPanelRef}
              defaultSize={`${effectivePanelSizes.sidebarSize}%`}
              minSize="10%"
              maxSize={SIDEBAR_MAX_WIDTH}
              collapsible
              collapsedSize="0%"
              order={1}
              onResize={(size) => {
                // Skip store sync when fullscreen is controlling the collapse
                if (useTerminalTabsStore.getState().isTerminalFullscreen) return;
                const isCollapsed = size.asPercentage === 0;
                const storeIsOpen = useFileTreeStore.getState().isOpen;
                if (isCollapsed && storeIsOpen) {
                  useFileTreeStore.getState().toggleSidebar();
                  saveSidebarOpen(false);
                } else if (!isCollapsed && !storeIsOpen) {
                  useFileTreeStore.getState().toggleSidebar();
                  saveSidebarOpen(true);
                }
                // Close chat if sidebar is collapsed
                if (isCollapsed && useAgentChatStore.getState().isPanelOpen) {
                  useAgentChatStore.getState().togglePanel();
                }
                if (!isCollapsed) {
                  savePanelSize("sidebarSize", size.asPercentage);
                }
              }}
            >
              {isChatOpen ? (
                <Suspense fallback={null}>
                  <ChatPanel projectPath={currentPath} />
                </Suspense>
              ) : (
                <FileTreeSidebar />
              )}
            </ResizablePanel>
            <ResizableHandle
              disabled={!isSidebarOpen || isTerminalFullscreen}
              className={isSidebarOpen && !isTerminalFullscreen ? "" : "opacity-0 w-0"}
            />
            <ResizablePanel
              defaultSize={`${100 - effectivePanelSizes.sidebarSize}%`}
              order={2}
            >
              <div className="flex h-full">
                <div className="relative min-w-0 flex-1">
                  <ResizablePanelGroup orientation="horizontal">
                    <ResizablePanel
                      panelRef={previewPanelRef}
                      defaultSize={previewPaneVisible ? `${savedPreviewSize}%` : "0%"}
                      minSize="20%"
                      collapsible
                      collapsedSize="0%"
                      order={1}
                      onResize={(size) => {
                        // Skip store sync when fullscreen is controlling the collapse
                        if (useTerminalTabsStore.getState().isTerminalFullscreen) return;
                        // Only sync drag-to-collapse; preview opens only via file click
                        if (size.asPercentage === 0) {
                          if (useFilePreviewStore.getState().isOpen) {
                            useFilePreviewStore.getState().togglePreview();
                          }
                          if (useBrowserPaneStore.getState().isOpen) {
                            useBrowserPaneStore.getState().closePane();
                          }
                        }
                        if (size.asPercentage > 0) {
                          savePanelSize("previewSize", size.asPercentage);
                        }
                      }}
                    >
                      <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>}>
                        {isBrowserOpen ? <BrowserPane /> : <FilePreviewPane />}
                      </Suspense>
                    </ResizablePanel>
                    <ResizableHandle
                      disabled={!previewPaneVisible || isTerminalFullscreen}
                      className={previewPaneVisible && !isTerminalFullscreen ? "" : "opacity-0 w-0"}
                    />
                    <ResizablePanel
                      panelRef={terminalPanelRef}
                      defaultSize={previewPaneVisible ? `${100 - savedPreviewSize}%` : "100%"}
                      minSize="40%"
                      order={2}
                    >
                      <div className="flex h-full min-w-0 flex-col overflow-hidden">
                        {!hasProject ? (
                          <EmptyState />
                        ) : (
                          <>
                            <TabBar
                              tabs={projectTabs}
                              activeTabId={projectActiveTabId}
                              onSelectTab={handleSelectTab}
                              onCloseTab={closeTab}
                              onSessionTypeSelect={handleNewSessionType}
                              onRenameTab={(id, name) => useTerminalTabsStore.getState().renameTab(id, name)}
                              onReorderTab={(activeId, overId) => useTerminalTabsStore.getState().reorderTabs(activeId, overId)}
                            />
                            {projectTabs.length === 0 && (
                              <NoSessionsState
                                onSessionTypeSelect={handleNewSessionType}
                              />
                            )}
                            <div className={`flex min-h-0 flex-1 overflow-hidden ${projectTabs.length === 0 ? "hidden" : ""}`}>
                              <TerminalPane projectPath={currentPath} />
                            </div>
                          </>
                        )}
                      </div>
                    </ResizablePanel>
                    <ResizableHandle
                      disabled={!isRightPanelOpen || isTerminalFullscreen}
                      className={isRightPanelOpen && !isTerminalFullscreen ? "" : "opacity-0 w-0"}
                    />
                    <ResizablePanel
                      panelRef={rightPanelRef}
                      defaultSize={isRightPanelOpen ? "400px" : "0%"}
                      minSize="10%"
                      maxSize="40%"
                      collapsible
                      collapsedSize="0%"
                      order={3}
                      onResize={(size) => {
                        if (size.asPercentage === 0 && useRightPanelStore.getState().isOpen) {
                          useRightPanelStore.getState().togglePanel();
                        }
                      }}
                    >
                      {activePluginName && (
                        <Suspense
                          fallback={
                            <div className="flex h-full items-center justify-center border-l border-ctp-surface0 bg-ctp-base">
                              <Loader2 className="h-5 w-5 animate-spin text-ctp-overlay0" />
                            </div>
                          }
                        >
                          <PluginHost pluginName={activePluginName} />
                        </Suspense>
                      )}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
            ) : (
              <EmptyState />
            )}
            </div>
            <RightSidebar hasProject={hasProject} />
          </div>
        )}
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
