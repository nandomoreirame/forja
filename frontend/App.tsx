import { getAllCliBinaries, type SessionType } from "@/lib/cli-registry";
import { invoke, listen } from "@/lib/ipc";
import {
  AlertCircle,
  Anvil,
  Clock,
  FolderOpen,
  PanelRight,
  TerminalSquare,
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
import { usePanelRef } from "react-resizable-panels";
const FilePreviewPane = lazy(() =>
  import("./components/file-preview-pane").then((m) => ({
    default: m.FilePreviewPane,
  }))
);
import { FileTreeSidebar } from "./components/file-tree-sidebar";
import { NewSessionDropdown } from "./components/new-session-dropdown";
import { Statusbar } from "./components/statusbar";
import { TabBar } from "./components/tab-bar";
import { TerminalPane } from "./components/terminal-pane";
import { Titlebar } from "./components/titlebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { MOD_KEY } from "./lib/platform";
import {
  loadPersistedSessionState,
  savePersistedSessionState,
} from "./lib/session-persistence";
import { useShallow } from "zustand/react/shallow";
import { useAppDialogsStore } from "./stores/app-dialogs";
import { useFilePreviewStore } from "./stores/file-preview";
import { useFileTreeStore } from "./stores/file-tree";
import { useGitStatusStore } from "./stores/git-status";
import { useGitDiffStore } from "./stores/git-diff";
import { useSessionStateStore } from "./stores/session-state";
import { useTerminalTabsStore } from "./stores/terminal-tabs";
import { useTerminalZoomStore } from "./stores/terminal-zoom";
import { useUserSettingsStore } from "./stores/user-settings";
import { useWorkspaceStore } from "./stores/workspace";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
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
const ClaudeNotFoundDialog = lazy(() =>
  import("./components/claude-not-found-dialog").then((m) => ({
    default: m.ClaudeNotFoundDialog,
  }))
);
const CreateWorkspaceDialog = lazy(() =>
  import("./components/create-workspace-dialog").then((m) => ({
    default: m.CreateWorkspaceDialog,
  }))
);

interface PtyDataPayload {
  tab_id: string;
  data: string;
}

interface PtyExitPayload {
  tab_id: string;
  code: number;
}

interface GitChangedPayload {
  path: string;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-[11px] text-ctp-overlay1">
      {children}
    </kbd>
  );
}

interface RecentProject {
  path: string;
  name: string;
  last_opened: string;
}

function EmptyState() {
  const { openProject, openProjectPath } = useFileTreeStore();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    invoke<RecentProject[]>("get_recent_projects")
      .then((result) => setRecentProjects(result ?? []))
      .catch((err) => console.warn("[App] IPC call failed:", err));
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="flex flex-col items-center gap-4">
        <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-ctp-text">Forja</h1>
        <p className="text-sm text-ctp-overlay1">
          A dedicated desktop client for vibe coders
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <div className="flex items-center gap-2 px-2 text-xs text-ctp-overlay0">
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          <span>Recent Projects</span>
        </div>
        {recentProjects.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {recentProjects.map((project) => (
              <button
                key={project.path}
                onClick={() => openProjectPath(project.path)}
                className="group flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-ctp-mantle"
              >
                <span className="text-sm text-ctp-subtext0 group-hover:text-ctp-text">
                  {project.name}
                </span>
                <span className="truncate text-xs text-ctp-overlay0">
                  {project.path}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-3 text-xs text-ctp-overlay0">
            No recent projects
          </p>
        )}
        <button
          onClick={openProject}
          className="mx-3 mt-2 flex items-center justify-center gap-2 rounded-md border border-ctp-surface0 px-4 py-2 text-sm text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text"
        >
          <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
          Open Project
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
  const {
    isTerminalPaneOpen,
    tabs,
    activeTabId,
    nextTabId,
    addTab,
    removeTab,
    setActiveTab,
  } = useTerminalTabsStore(
    useShallow((s) => ({
      isTerminalPaneOpen: s.isTerminalPaneOpen,
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      nextTabId: s.nextTabId,
      addTab: s.addTab,
      removeTab: s.removeTab,
      setActiveTab: s.setActiveTab,
    })),
  );
  const createWorkspaceOpen = useAppDialogsStore((s) => s.createWorkspaceOpen);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [claudeNotFound, setClaudeNotFound] = useState(false);
  const [sessionRestoreDone, setSessionRestoreDone] = useState(false);
  const sidebarPanelRef = usePanelRef();
  const previewPanelRef = usePanelRef();
  const terminalPanelRef = usePanelRef();
  const { panelSizes, loaded: panelPrefsLoaded, savePanelSize } =
    usePanelPreferences();
  const hasProject = Boolean((tree && currentPath) || Object.keys(trees).length > 0);
  const effectivePanelSizes = getPanelSizesForLayout(hasProject, panelSizes);

  // Sync sidebar panel collapse with store
  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (isSidebarOpen && panel.isCollapsed()) panel.expand();
    else if (!isSidebarOpen && !panel.isCollapsed()) panel.collapse();
  }, [isSidebarOpen]);

  // Sync preview + terminal panel sizes together
  // Both effects need to know about each other's state to calculate correct sizes
  const savedPreviewSize = effectivePanelSizes.previewSize > 0 && effectivePanelSizes.previewSize < 100
    ? effectivePanelSizes.previewSize
    : 35;

  // Sync preview panel collapse with store
  useEffect(() => {
    const panel = previewPanelRef.current;
    if (!panel) return;
    if (isPreviewOpen) {
      if (panel.isCollapsed()) panel.expand();
      // If terminal is hidden, preview takes full width
      const size = isTerminalPaneOpen ? savedPreviewSize : 100;
      panel.resize(`${size}%`);
    } else if (!panel.isCollapsed()) {
      panel.collapse();
    }
  }, [isPreviewOpen, savedPreviewSize, isTerminalPaneOpen]);

  // Sync terminal panel visibility with store via resize
  useEffect(() => {
    const terminal = terminalPanelRef.current;
    if (!terminal) return;
    if (isTerminalPaneOpen) {
      const targetSize = isPreviewOpen ? 100 - savedPreviewSize : 100;
      terminal.resize(`${targetSize}%`);
    } else {
      terminal.resize("0%");
    }
  }, [isTerminalPaneOpen, isPreviewOpen, savedPreviewSize]);

  // Read workspace param from query string (set once on mount)
  const [workspaceId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("workspace");
  });

  // Load workspace data on mount
  useEffect(() => {
    useWorkspaceStore.getState().loadWorkspaces();
  }, []);

  // When workspace param is present, activate it and load projects
  useEffect(() => {
    if (!workspaceId) return;

    const load = async () => {
      await useWorkspaceStore.getState().loadWorkspaces();
      const workspaces = useWorkspaceStore.getState().workspaces;
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      await useWorkspaceStore.getState().setActiveWorkspace(workspaceId);

      // Load all projects in the workspace
      const fileTreeState = useFileTreeStore.getState();
      for (const projectPath of workspace.projects) {
        await fileTreeState.loadProjectTree(projectPath);
      }

      // Set the first project as active
      if (workspace.projects.length > 0) {
        fileTreeState.openProjectPath(workspace.projects[0]);
      }
    };

    load();
  }, [workspaceId]);

  // Restore previous user session when opening app without explicit route params
  useEffect(() => {
    if (workspaceId || initialProjectPath) {
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

      const workspaceStore = useWorkspaceStore.getState();
      const fileTreeStore = useFileTreeStore.getState();
      const previewStore = useFilePreviewStore.getState();
      const tabsStore = useTerminalTabsStore.getState();

      // 1) Restore workspace/project
      if (snapshot.activeWorkspaceId) {
        await workspaceStore.activateWorkspace(snapshot.activeWorkspaceId);
      } else if (snapshot.activeProjectPath) {
        await fileTreeStore.openProjectPath(snapshot.activeProjectPath);
      }

      if (snapshot.activeProjectPath) {
        const latestTreeState = useFileTreeStore.getState();
        if (latestTreeState.trees[snapshot.activeProjectPath]) {
          latestTreeState.setActiveProjectPath(snapshot.activeProjectPath);
        }
      }

      // 2) Restore preview file
      if (snapshot.preview.isOpen && snapshot.preview.currentFile) {
        await previewStore.loadFile(snapshot.preview.currentFile);
      }

      // 3) Restore terminal pane + tabs
      useTerminalTabsStore.setState({
        tabs: [],
        activeTabId: null,
        isTerminalPaneOpen: snapshot.terminal.isPaneOpen,
      });

      const restoredTabIds: string[] = [];
      for (const tab of snapshot.terminal.tabs) {
        const id = tabsStore.nextTabId();
        tabsStore.addTab(id, tab.path, tab.sessionType);
        restoredTabIds.push(id);
      }

      if (restoredTabIds.length > 0) {
        const restoredActiveTabId =
          restoredTabIds[
            Math.min(snapshot.terminal.activeTabIndex, restoredTabIds.length - 1)
          ] ?? restoredTabIds[0];
        tabsStore.setActiveTab(restoredActiveTabId);
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
  }, [workspaceId, initialProjectPath]);

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
  }, [settings]);

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
        binaries: getAllCliBinaries(),
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

  // Fetch git file statuses when project changes (deferred)
  useEffect(() => {
    if (!currentPath) {
      useGitStatusStore.getState().clearStatuses();
      useGitDiffStore.getState().reset();
      return;
    }
    const idleId = requestIdleCallback(() => {
      useGitStatusStore.getState().fetchStatuses(currentPath);
      useGitDiffStore.getState().fetchChangedFiles(currentPath);
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

  // Refresh git file statuses on git:changed events
  useEffect(() => {
    const unlisten = listen<GitChangedPayload>("git:changed", (event) => {
      const changedProjectPath = event.payload?.path;
      if (changedProjectPath) {
        useGitStatusStore.getState().fetchStatuses(changedProjectPath);
        useGitDiffStore.getState().refresh(changedProjectPath);
        return;
      }
      const fallbackPath = useFileTreeStore.getState().currentPath;
      if (!fallbackPath) return;
      useGitStatusStore.getState().fetchStatuses(fallbackPath);
      useGitDiffStore.getState().refresh(fallbackPath);
    });
    return () => {
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

  // Track session state from PTY output
  useEffect(() => {
    const unlisten = listen<PtyDataPayload>("pty:data", (event) => {
      useSessionStateStore.getState().onData(event.payload.tab_id);
    });
    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
    };
  }, []);

  // Auto-close tab when Claude session exits
  useEffect(() => {
    const unlisten = listen<PtyExitPayload>("pty:exit", (event) => {
      const { tab_id } = event.payload;
      useSessionStateStore.getState().onExit(tab_id);
      removeTab(tab_id);
    });
    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[App] Cleanup unlisten failed:", err));
    };
  }, [removeTab]);

  // Persist session snapshot across renderer reloads
  useEffect(() => {
    if (!sessionRestoreDone) return;
    const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    savePersistedSessionState({
      activeWorkspaceId,
      activeProjectPath: currentPath,
      preview: {
        isOpen: isPreviewOpen,
        currentFile: previewCurrentFile,
      },
      terminal: {
        isPaneOpen: isTerminalPaneOpen,
        activeTabIndex: activeTabIndex >= 0 ? activeTabIndex : 0,
        tabs: tabs.map((tab) => ({
          path: tab.path,
          sessionType: tab.sessionType,
        })),
      },
    });
  }, [
    sessionRestoreDone,
    activeWorkspaceId,
    currentPath,
    isPreviewOpen,
    previewCurrentFile,
    isTerminalPaneOpen,
    tabs,
    activeTabId,
  ]);

  // Keyboard shortcuts extracted to dedicated hook
  useKeyboardShortcuts({ tabsRef, activeTabIdRef, closeTab });

  return (
    <AppErrorBoundary>
      <div className="relative flex h-full flex-col bg-ctp-base">
        <Titlebar />
        {panelPrefsLoaded && hasProject ? (
          <ResizablePanelGroup
            orientation="horizontal"
            className="flex-1 overflow-hidden"
          >
            <ResizablePanel
              panelRef={sidebarPanelRef}
              defaultSize={`${effectivePanelSizes.sidebarSize}%`}
              minSize="10%"
              maxSize="40%"
              collapsible
              collapsedSize="0%"
              order={1}
              onResize={(size) => {
                const isCollapsed = size.asPercentage === 0;
                const storeIsOpen = useFileTreeStore.getState().isOpen;
                if (isCollapsed && storeIsOpen) {
                  useFileTreeStore.getState().toggleSidebar();
                } else if (!isCollapsed && !storeIsOpen) {
                  useFileTreeStore.getState().toggleSidebar();
                }
                if (!isCollapsed) {
                  savePanelSize("sidebarSize", size.asPercentage);
                }
              }}
            >
              <FileTreeSidebar />
            </ResizablePanel>
            <ResizableHandle
              disabled={!isSidebarOpen}
              className={isSidebarOpen ? "" : "opacity-0 w-0"}
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
                      defaultSize={isPreviewOpen ? `${isTerminalPaneOpen ? savedPreviewSize : 100}%` : "0%"}
                      minSize="20%"
                      collapsible
                      collapsedSize="0%"
                      order={1}
                      onResize={(size) => {
                        // Only sync drag-to-collapse; preview opens only via file click
                        if (
                          size.asPercentage === 0 &&
                          useFilePreviewStore.getState().isOpen
                        ) {
                          useFilePreviewStore.getState().togglePreview();
                        }
                        // Only persist the split ratio when both panels are visible
                        // (avoids saving 100% when terminal is hidden)
                        if (size.asPercentage > 0 && useTerminalTabsStore.getState().isTerminalPaneOpen) {
                          savePanelSize("previewSize", size.asPercentage);
                        }
                      }}
                    >
                      <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>}>
                        <FilePreviewPane />
                      </Suspense>
                    </ResizablePanel>
                    <ResizableHandle
                      disabled={!isPreviewOpen || !isTerminalPaneOpen}
                      className={isPreviewOpen && isTerminalPaneOpen ? "" : "opacity-0 w-0"}
                    />
                    <ResizablePanel
                      panelRef={terminalPanelRef}
                      defaultSize={
                        isTerminalPaneOpen
                          ? isPreviewOpen ? `${100 - savedPreviewSize}%` : "100%"
                          : "0%"
                      }
                      minSize="0%"
                      order={2}
                      onResize={(size) => {
                        const storeIsOpen = useTerminalTabsStore.getState().isTerminalPaneOpen;
                        // Snap-to-close: if user drags terminal very small, hide it
                        if (size.asPercentage < 5 && storeIsOpen) {
                          useTerminalTabsStore.getState().toggleTerminalPane();
                        }
                      }}
                    >
                      <div className="flex h-full min-w-0 flex-col overflow-hidden">
                        {!hasProject ? (
                          <EmptyState />
                        ) : (
                          <>
                            <TabBar
                              tabs={tabs}
                              activeTabId={activeTabId}
                              onSelectTab={setActiveTab}
                              onCloseTab={closeTab}
                              onSessionTypeSelect={handleNewSessionType}
                            />
                            {tabs.length === 0 ? (
                              <NoSessionsState
                                onSessionTypeSelect={handleNewSessionType}
                              />
                            ) : (
                              <div className="flex min-h-0 flex-1 overflow-hidden">
                                <TerminalPane />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                  {!isTerminalPaneOpen && !isPreviewOpen && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ctp-base">
                      <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
                      <h1 className="text-3xl font-bold text-ctp-text">Forja</h1>
                      <p className="text-sm text-ctp-overlay1">
                        A dedicated desktop client for vibe coders
                      </p>
                    </div>
                  )}
                </div>
                {!isTerminalPaneOpen && (
                  <div className="flex shrink-0 flex-col items-center border-l border-ctp-surface0 bg-ctp-mantle pt-1">
                    <button
                      onClick={() => useTerminalTabsStore.getState().toggleTerminalPane()}
                      className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
                      aria-label="Show terminal"
                    >
                      <PanelRight className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <EmptyState />
            </div>
          </div>
        )}
        <Statusbar />
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
        <Suspense fallback={null}>
          {createWorkspaceOpen && <CreateWorkspaceDialog />}
        </Suspense>
      </div>
    </AppErrorBoundary>
  );
}

export default App;
