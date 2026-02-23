import { IS_MAC } from "@/lib/platform";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { APP_NAME, useFileTreeStore } from "@/stores/file-tree";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { type Window, getCurrentWindow } from "@tauri-apps/api/window";
import {
  Copy,
  FolderOpen,
  Info,
  Keyboard,
  Menu,
  Minus,
  PanelLeft,
  Plus,
  Search,
  Square,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AboutDialog } from "./about-dialog";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

let _appWindow: Window | null = null;
function getAppWindow() {
  if (!_appWindow) _appWindow = getCurrentWindow();
  return _appWindow;
}

const isMac = IS_MAC;

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);
  const { aboutOpen, setAboutOpen, shortcutsOpen, setShortcutsOpen } = useAppDialogsStore();
  const { isOpen, tree, currentPath, toggleSidebar, openProject } = useFileTreeStore();
  const { nextTabId, addTab } = useTerminalTabsStore();
  const title = tree ? `${tree.root.name} - ${APP_NAME}` : APP_NAME;

  const createNewTab = () => {
    if (!currentPath) return;
    const tabId = nextTabId();
    addTab(tabId, currentPath);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "?") {
        event.preventDefault();
        setShortcutsOpen(!shortcutsOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcutsOpen, setShortcutsOpen]);

  useEffect(() => {
    getAppWindow().isMaximized().then(setMaximized);

    const unlisten = getAppWindow().onResized(async () => {
      const isMax = await getAppWindow().isMaximized();
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
      {/* Left: menu + sidebar toggle */}
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
          <DropdownMenuContent align="start" className="min-w-52 border-none">
            <DropdownMenuItem onClick={createNewTab} disabled={!currentPath}>
              <Plus className="h-3.5 w-3.5" />
              New Session
              <span className="ml-auto font-mono text-[11px] text-ctp-overlay0">
                {isMac ? "\u2318" : "Ctrl"}+T
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openProject}>
              <FolderOpen className="h-3.5 w-3.5" />
              Open Project
              <span className="ml-auto font-mono text-[11px] text-ctp-overlay0">
                {isMac ? "\u2318" : "Ctrl"}+O
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useCommandPaletteStore.getState().open("commands")}>
              <Search className="h-3.5 w-3.5" />
              Command Palette
              <span className="ml-auto font-mono text-[11px] text-ctp-overlay0">
                {isMac ? "\u2318" : "Ctrl"}+Shift+P
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
              <Keyboard className="h-3.5 w-3.5" />
              Shortcuts
              <span className="ml-auto font-mono text-[11px] text-ctp-overlay0">
                {isMac ? "\u2318" : "Ctrl"}+?
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAboutOpen(true)}>
              <Info className="h-3.5 w-3.5" />
              About
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={toggleSidebar}
          className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <span
        data-tauri-drag-region
        className="pointer-events-none absolute inset-x-0 text-center text-sm font-semibold text-ctp-overlay1"
      >
        {title}
      </span>

      {/* Right: window controls */}
      <div className="flex items-center">
        <button
          onClick={() => getAppWindow().minimize()}
          className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        <button
          onClick={() =>
            maximized ? getAppWindow().unmaximize() : getAppWindow().maximize()
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
          onClick={() => getAppWindow().close()}
          className="inline-flex h-8 w-10 items-center justify-center text-ctp-overlay1 transition-colors hover:bg-ctp-red/20 hover:text-ctp-red"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
