import { IS_MAC } from "@/lib/platform";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { APP_NAME, useFileTreeStore } from "@/stores/file-tree";
import { getCurrentWindow, isDev, isTilingDesktop } from "@/lib/ipc";
import { usePerformanceStore } from "@/stores/performance";
import { cn } from "@/lib/utils";
import {
  Copy,
  Gauge,
  Info,
  Keyboard,
  Menu,
  Minus,
  Plus,
  Search,
  Settings,
  Square,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AboutDialog } from "./about-dialog";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { SettingsDialog } from "./settings-dialog";
import { ResourceUsagePopover } from "./resource-usage-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type ElectronWindow = ReturnType<typeof getCurrentWindow>;
let _appWindow: ElectronWindow | null = null;
function getAppWindow() {
  if (!_appWindow) _appWindow = getCurrentWindow();
  return _appWindow;
}

const isMac = IS_MAC;

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);
  const [tilingDesktop, setTilingDesktop] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const isLite = usePerformanceStore((s) => s.isLite);
  const toggleLiteMode = usePerformanceStore((s) => s.toggleLiteMode);
  const { aboutOpen, setAboutOpen, shortcutsOpen, setShortcutsOpen, settingsOpen, setSettingsOpen } = useAppDialogsStore();
  const { tree, openProject } = useFileTreeStore();
  const title = tree ? `${tree.root.name} - ${APP_NAME}` : APP_NAME;

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
    isDev().then(setDevMode).catch(() => setDevMode(false));
  }, []);

  useEffect(() => {
    getAppWindow().isMaximized().then(setMaximized);
    isTilingDesktop().then(setTilingDesktop).catch(() => setTilingDesktop(false));

    const unlisten = getAppWindow().onResized(async () => {
      const isMax = await getAppWindow().isMaximized();
      setMaximized(isMax);
    });

    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[titlebar] Cleanup unlisten failed:", err));
    };
  }, []);

  return (
    <div
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      className={cn(
        "relative flex h-10 shrink-0 select-none items-center justify-between pr-3",
        isMac && "pl-[78px]"
      )}
    >
      {/* Left: menu + sidebar toggle */}
      <div className="relative z-10 flex items-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <div className="flex w-12 shrink-0 items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
                aria-label="Menu"
              >
                <Menu className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-52 border-none">
            <DropdownMenuItem onClick={openProject}>
              <Plus className="h-3.5 w-3.5" />
              Add Project
              <span className="ml-auto font-mono text-[11px] text-ctp-overlay0">
                {isMac ? "\u2318" : "Ctrl"}+Shift+O
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
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="h-3.5 w-3.5" />
              Settings
              <span className="ml-auto font-mono text-[11px] text-ctp-overlay0">
                {isMac ? "\u2318" : "Ctrl"}+,
              </span>
            </DropdownMenuItem>
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
        </div>

      </div>

      <span
        className="pointer-events-none absolute inset-x-0 text-center text-sm font-semibold text-ctp-overlay1"
      >
        {title}
      </span>

      {/* Right: resource usage + window controls */}
      <div className="relative z-10 flex items-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        {devMode && (
          <button
            onClick={toggleLiteMode}
            aria-label="Toggle lite mode"
            className={cn(
              "mr-1 inline-flex h-6 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-semibold uppercase transition-colors",
              isLite
                ? "border-ctp-yellow/40 bg-ctp-yellow/10 text-ctp-yellow"
                : "border-ctp-surface1 bg-ctp-surface0/50 text-ctp-overlay0 hover:text-ctp-text"
            )}
          >
            <Gauge className="h-3 w-3" strokeWidth={1.5} />
            Lite
          </button>
        )}
        <ResourceUsagePopover />
        {!isMac && (
          <>
            {!tilingDesktop && (
              <>
                <button
                  onClick={() => getAppWindow().minimize()}
                  className="inline-flex h-8 w-10 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
                  aria-label="Minimize"
                >
                  <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>

                <button
                  onClick={() =>
                    maximized ? getAppWindow().unmaximize() : getAppWindow().maximize()
                  }
                  className="inline-flex h-8 w-10 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
                  aria-label={maximized ? "Restore" : "Maximize"}
                >
                  {maximized ? (
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <Square className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                </button>
              </>
            )}

            <button
              onClick={() => getAppWindow().close()}
              className="inline-flex h-8 w-10 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-red/20 hover:text-ctp-red"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
