import { useEffect } from "react";
import { Anvil, FolderOpen, PanelLeft } from "lucide-react";
import { Titlebar } from "./components/titlebar";
import { Statusbar } from "./components/statusbar";
import { FileTreeSidebar } from "./components/file-tree-sidebar";
import { useFileTreeStore } from "./stores/file-tree";

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
      </div>
    </div>
  );
}

function App() {
  const { tree, toggleSidebar, openProject } = useFileTreeStore();

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
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleSidebar, openProject]);

  return (
    <div className="flex h-full flex-col bg-ctp-base">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <FileTreeSidebar />
        {tree ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-sm text-ctp-overlay1">
              Project loaded: {tree.root.name}
            </p>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      <Statusbar />
    </div>
  );
}

export default App;
