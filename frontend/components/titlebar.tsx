import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Menu,
  FolderOpen,
  Info,
  Minus,
  PanelLeft,
  Square,
  Copy,
  X,
} from "lucide-react";
import { useFileTreeStore } from "@/stores/file-tree";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const appWindow = getCurrentWindow();

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);
  const { isOpen, toggleSidebar, openProject } = useFileTreeStore();

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized);

    const unlisten = appWindow.onResized(async () => {
      const isMax = await appWindow.isMaximized();
      setMaximized(isMax);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="relative flex h-10 shrink-0 select-none items-center justify-between px-3"
    >
      {/* Left: sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <span
        data-tauri-drag-region
        className="pointer-events-none absolute inset-x-0 text-center text-sm font-semibold text-ctp-overlay1"
      >
        Forja
      </span>

      {/* Right: menu + window controls */}
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              aria-label="Menu"
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48 border-none">
            <DropdownMenuItem onClick={openProject}>
              <FolderOpen className="h-3.5 w-3.5" />
              Open Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Info className="h-3.5 w-3.5" />
              Sobre o Forja
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => appWindow.minimize()}
          className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          onClick={() =>
            maximized ? appWindow.unmaximize() : appWindow.maximize()
          }
          className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label={maximized ? "Restore" : "Maximize"}
        >
          {maximized ? (
            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Square className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>

        <button
          onClick={() => appWindow.close()}
          className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-red/20 hover:text-ctp-red"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
