import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AlertCircle, Anvil, Clock, FolderOpen, PanelLeft, Plus, Search, TerminalSquare } from "lucide-react";
import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { MOD_KEY } from "./lib/platform";
import { FileTreeSidebar } from "./components/file-tree-sidebar";
import { FilePreviewPane } from "./components/file-preview-pane";
import { Statusbar } from "./components/statusbar";
import { TabBar } from "./components/tab-bar";
import { TerminalPane } from "./components/terminal-pane";
import { Titlebar } from "./components/titlebar";
import { useAppDialogsStore } from "./stores/app-dialogs";
import { useCommandPaletteStore } from "./stores/command-palette";
import { useFilePreviewStore } from "./stores/file-preview";
import { useFileTreeStore } from "./stores/file-tree";
import { useTerminalTabsStore } from "./stores/terminal-tabs";
import { useSessionStateStore } from "./stores/session-state";
import { useTerminalZoomStore } from "./stores/terminal-zoom";

// Root error boundary to prevent blank screen on any React crash
interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Forja app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-ctp-base p-8">
          <AlertCircle className="h-12 w-12 text-ctp-red" strokeWidth={1.5} />
          <h1 className="text-lg font-semibold text-ctp-text">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-ctp-overlay1">
            {this.state.error?.message || 'An unexpected error occurred.'}
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
  import("./components/command-palette").then((m) => ({ default: m.CommandPalette }))
);
const NewSessionDialog = lazy(() =>
  import("./components/new-session-dialog").then((m) => ({ default: m.NewSessionDialog }))
);
const ClaudeNotFoundDialog = lazy(() =>
  import("./components/claude-not-found-dialog").then((m) => ({ default: m.ClaudeNotFoundDialog }))
);

interface PtyDataPayload {
  tab_id: string;
  data: string;
}

interface PtyExitPayload {
  tab_id: string;
  code: number;
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
  const { openProject, openProjectPath, toggleSidebar } = useFileTreeStore();
  const mod = MOD_KEY;
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    invoke<RecentProject[]>("get_recent_projects")
      .then(setRecentProjects)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="flex flex-col items-center gap-4">
        <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-ctp-text">Forja</h1>
        <p className="text-sm text-ctp-overlay1">
          A dedicated desktop client for Claude Code
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={openProject}
          className="group flex items-center justify-between gap-8 rounded-md px-4 py-2 text-left transition-colors hover:bg-ctp-mantle"
        >
          <span className="flex items-center gap-2 text-sm text-ctp-subtext0 group-hover:text-ctp-text">
            <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
            Open Project
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{mod}</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>O</Kbd>
          </span>
        </button>

        <button
          onClick={toggleSidebar}
          className="group flex items-center justify-between gap-8 rounded-md px-4 py-2 text-left transition-colors hover:bg-ctp-mantle"
        >
          <span className="flex items-center gap-2 text-sm text-ctp-subtext0 group-hover:text-ctp-text">
            <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
            Toggle Sidebar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{mod}</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>B</Kbd>
          </span>
        </button>

        <button
          onClick={() => useCommandPaletteStore.getState().open("commands")}
          className="group flex items-center justify-between gap-8 rounded-md px-4 py-2 text-left transition-colors hover:bg-ctp-mantle"
        >
          <span className="flex items-center gap-2 text-sm text-ctp-subtext0 group-hover:text-ctp-text">
            <Search className="h-4 w-4" strokeWidth={1.5} />
            Command Palette
          </span>
          <span className="flex items-center gap-1">
            <Kbd>{mod}</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>Shift</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>P</Kbd>
          </span>
        </button>
      </div>

      {recentProjects.length > 0 && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          <div className="flex items-center gap-2 px-2 text-xs text-ctp-overlay0">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            <span>Recent Projects</span>
          </div>
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
        </div>
      )}
    </div>
  );
}

function NoSessionsState({ onOpenDialog }: { onOpenDialog: () => void }) {
  const mod = MOD_KEY;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <TerminalSquare className="h-12 w-12 text-ctp-surface1" strokeWidth={1.5} />
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-ctp-overlay1">No active sessions</p>
        <button
          onClick={onOpenDialog}
          className="group mt-2 flex items-center gap-2 rounded-md px-4 py-2 text-sm text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Session
          <span className="ml-2 flex items-center gap-1">
            <Kbd>{mod}</Kbd>
            <span className="text-[11px] text-ctp-surface1">+</span>
            <Kbd>T</Kbd>
          </span>
        </button>
      </div>
    </div>
  );
}

function App({ initialProjectPath }: { initialProjectPath?: string | null }) {
  const tree = useFileTreeStore((s) => s.tree);
  const currentPath = useFileTreeStore((s) => s.currentPath);
  const tabs = useTerminalTabsStore((s) => s.tabs);
  const activeTabId = useTerminalTabsStore((s) => s.activeTabId);
  const nextTabId = useTerminalTabsStore((s) => s.nextTabId);
  const addTab = useTerminalTabsStore((s) => s.addTab);
  const removeTab = useTerminalTabsStore((s) => s.removeTab);
  const setActiveTab = useTerminalTabsStore((s) => s.setActiveTab);
  const newSessionOpen = useAppDialogsStore((s) => s.newSessionOpen);
  const [claudeNotFound, setClaudeNotFound] = useState(false);

  // Auto-open project when launched via query param from a new window
  useEffect(() => {
    if (initialProjectPath && !currentPath) {
      useFileTreeStore.getState().openProjectPath(initialProjectPath);
    }
  }, [initialProjectPath, currentPath]);

  // Check if claude CLI is installed when project opens
  useEffect(() => {
    if (!currentPath) return;
    invoke("check_claude_installed").catch(() => {
      setClaudeNotFound(true);
    });
  }, [currentPath]);

  // Refs for keyboard handler to avoid recreating listener
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  tabsRef.current = tabs;
  activeTabIdRef.current = activeTabId;

  const handleNewSessionType = useCallback(
    (sessionType: "claude-code" | "terminal") => {
      if (!currentPath) return;
      const tabId = nextTabId();
      addTab(tabId, currentPath, sessionType);
      useAppDialogsStore.getState().setNewSessionOpen(false);
    },
    [currentPath, nextTabId, addTab]
  );

  const openNewSessionDialog = useCallback(() => {
    useAppDialogsStore.getState().setNewSessionOpen(true);
  }, []);

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
      unlisten.then((fn) => fn());
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
      unlisten.then((fn) => fn());
    };
  }, [removeTab]);

  // Keyboard shortcuts - stable handler using refs for mutable values
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key === "b") {
        event.preventDefault();
        useFileTreeStore.getState().toggleSidebar();
        return;
      }
      if (mod && event.key === "o") {
        event.preventDefault();
        useFileTreeStore.getState().openProject();
        return;
      }
      if (mod && event.key === "t") {
        event.preventDefault();
        if (useFileTreeStore.getState().currentPath) {
          useAppDialogsStore.getState().setNewSessionOpen(true);
        }
        return;
      }
      if (mod && event.key === "w") {
        event.preventDefault();
        const id = activeTabIdRef.current;
        if (id) closeTab(id);
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        useCommandPaletteStore.getState().open("commands");
        return;
      }
      if (mod && !event.shiftKey && event.key === "p") {
        event.preventDefault();
        const { tree: t, currentPath: cp } = useFileTreeStore.getState();
        if (t && cp) {
          useCommandPaletteStore.getState().open("files");
        }
        return;
      }
      if (mod && event.key === "e") {
        event.preventDefault();
        useFilePreviewStore.getState().togglePreview();
        return;
      }
      if (mod && event.altKey && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        useTerminalZoomStore.getState().zoomIn();
        return;
      }
      if (mod && event.altKey && event.key === "-") {
        event.preventDefault();
        useTerminalZoomStore.getState().zoomOut();
        return;
      }
      if (mod && event.altKey && event.key === "0") {
        event.preventDefault();
        useTerminalZoomStore.getState().resetZoom();
        return;
      }
      // Ctrl+Tab / Ctrl+Shift+Tab: cycle tabs
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        const currentTabs = tabsRef.current;
        const currentActive = activeTabIdRef.current;
        if (currentTabs.length > 1 && currentActive) {
          const currentIndex = currentTabs.findIndex((t) => t.id === currentActive);
          const nextIndex = event.shiftKey
            ? (currentIndex - 1 + currentTabs.length) % currentTabs.length
            : (currentIndex + 1) % currentTabs.length;
          useTerminalTabsStore.getState().setActiveTab(currentTabs[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeTab]);

  const hasProject = tree && currentPath;

  return (
    <AppErrorBoundary>
    <div className="relative flex h-full flex-col bg-ctp-base">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <FileTreeSidebar />
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <FilePreviewPane />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {!hasProject ? (
              <EmptyState />
            ) : (
              <>
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelectTab={setActiveTab}
                  onCloseTab={closeTab}
                  onNewTab={openNewSessionDialog}
                />
                {tabs.length === 0 ? (
                  <NoSessionsState onOpenDialog={openNewSessionDialog} />
                ) : (
                  <div className="flex min-h-0 flex-1 overflow-hidden">
                    <TerminalPane />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Statusbar />
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
      <Suspense fallback={null}>
        {newSessionOpen && (
          <NewSessionDialog
            open={newSessionOpen}
            onOpenChange={useAppDialogsStore.getState().setNewSessionOpen}
            onSessionTypeSelect={handleNewSessionType}
          />
        )}
      </Suspense>
      <Suspense fallback={null}>
        {claudeNotFound && (
          <ClaudeNotFoundDialog
            open={claudeNotFound}
            onResolved={() => setClaudeNotFound(false)}
          />
        )}
      </Suspense>
    </div>
    </AppErrorBoundary>
  );
}

export default App;
