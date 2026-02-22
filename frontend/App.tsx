import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Anvil, FolderOpen, PanelLeft, Plus, TerminalSquare } from "lucide-react";
import { useCallback, useEffect } from "react";
import { FilePreviewPane } from "./components/file-preview-pane";
import { FileTreeSidebar } from "./components/file-tree-sidebar";
import { Statusbar } from "./components/statusbar";
import { TabBar } from "./components/tab-bar";
import { TerminalPane } from "./components/terminal-pane";
import { Titlebar } from "./components/titlebar";
import { useFilePreviewStore } from "./stores/file-preview";
import { useFileTreeStore } from "./stores/file-tree";
import { useTerminalTabsStore } from "./stores/terminal-tabs";

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

function EmptyState() {
  const { openProject, toggleSidebar } = useFileTreeStore();
  const isMac = navigator.userAgent.includes("Mac");
  const mod = isMac ? "\u2318" : "Ctrl";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10">
      <div className="flex flex-col items-center gap-4">
        <Anvil className="h-16 w-16 text-brand" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-ctp-text">Forja for Claude Code</h1>
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
      </div>
    </div>
  );
}

function NoSessionsState({ onNewTab }: { onNewTab: () => void }) {
  const isMac = navigator.userAgent.includes("Mac");
  const mod = isMac ? "\u2318" : "Ctrl";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <TerminalSquare className="h-12 w-12 text-ctp-surface1" strokeWidth={1.5} />
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-ctp-overlay1">No active Claude Code sessions</p>
        <button
          onClick={onNewTab}
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

function App() {
  const { tree, currentPath, toggleSidebar, openProject } = useFileTreeStore();
  const { tabs, activeTabId, nextTabId, addTab, removeTab, setActiveTab } =
    useTerminalTabsStore();
  const createNewTab = useCallback(() => {
    if (!currentPath) return;
    const tabId = nextTabId();
    addTab(tabId, currentPath);
  }, [currentPath, nextTabId, addTab]);

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


  // Auto-close tab when Claude session exits
  useEffect(() => {
    const unlisten = listen<PtyExitPayload>("pty:exit", (event) => {
      removeTab(event.payload.tab_id);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [removeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key === "b") {
        event.preventDefault();
        toggleSidebar();
      }
      if (mod && event.key === "o") {
        event.preventDefault();
        openProject();
      }
      if (mod && event.key === "t") {
        event.preventDefault();
        createNewTab();
      }
      if (mod && event.key === "w") {
        event.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      if (mod && event.key === "p") {
        event.preventDefault();
        useFilePreviewStore.getState().togglePreview();
      }
      // Ctrl+Tab / Ctrl+Shift+Tab: cycle tabs
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        if (tabs.length > 1 && activeTabId) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = event.shiftKey
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length;
          setActiveTab(tabs[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar, openProject, createNewTab, closeTab, activeTabId, tabs, setActiveTab]);

  const hasProject = tree && currentPath;

  return (
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
                  onNewTab={createNewTab}
                />
                {tabs.length === 0 ? (
                  <NoSessionsState onNewTab={createNewTab} />
                ) : (
                  <TerminalPane />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Statusbar />
    </div>
  );
}

export default App;
