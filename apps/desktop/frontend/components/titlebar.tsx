import { IS_MAC } from "@/lib/platform";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { APP_NAME, useFileTreeStore } from "@/stores/file-tree";
import { useWsBridgeStore } from "@/stores/ws-bridge";
import { useUserSettingsStore } from "@/stores/user-settings";
import { getCurrentWindow, invoke, isDev, isTilingDesktop } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { TitlebarSettings } from "@/lib/settings-types";
import {
  Copy,
  Info,
  Keyboard,
  Maximize,
  Menu,
  Minus,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings,
  Square,
  TerminalSquare,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AboutDialog } from "./about-dialog";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { SettingsDialog } from "./settings-dialog";
import { ResourceUsagePopover } from "./resource-usage-popover";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { QuickActions } from "./quick-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

type ElectronWindow = ReturnType<typeof getCurrentWindow>;
let _appWindow: ElectronWindow | null = null;
function getAppWindow() {
  if (!_appWindow) _appWindow = getCurrentWindow();
  return _appWindow;
}

const isMac = IS_MAC;
const mod = isMac ? "\u2318" : "Ctrl";

export function Titlebar() {
  const [maximized, setMaximized] = useState(false);
  const [tilingDesktop, setTilingDesktop] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const { aboutOpen, setAboutOpen, shortcutsOpen, setShortcutsOpen, settingsOpen, setSettingsOpen } = useAppDialogsStore();
  const { tree, openProject } = useFileTreeStore();
  const baseTitle = tree ? `${tree.root.name} - ${APP_NAME}` : APP_NAME;
  const title = devMode ? `${baseTitle} (DEVELOPMENT MODE)` : baseTitle;
  const [menuOpen, setMenuOpen] = useState(false);
  const wsBridgeRunning = useWsBridgeStore((s) => s.running);
  const settings = useUserSettingsStore((s) => s.settings);
  const titlebar = settings.ui.titlebar ?? {
    commandBar: true,
    quickActionsLeft: true,
    quickActionsRight: true,
    resourceUsage: true,
    workspaceSwitcher: true,
  };

  const toggleTitlebarSection = useCallback(
    (key: keyof TitlebarSettings) => {
      const current = titlebar;
      const updated = {
        ...settings,
        ui: {
          ...settings.ui,
          titlebar: { ...current, [key]: !current[key] },
        },
      };
      useUserSettingsStore.getState().setSettings(updated);
      invoke("save_user_settings", { content: JSON.stringify(updated, null, 2) }).catch(() => {});
    },
    [settings, titlebar],
  );

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

  // Alt key toggles main menu (like native menu bar)
  // On Linux/Chromium/Ozone, keyup for Alt reports e.key as "GroupPrevious"
  // instead of "Alt", so we detect release via !e.altKey on any keyup.
  useEffect(() => {
    let altOnly = false;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Alt" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.repeat) {
        altOnly = true;
      } else if (e.key !== "Alt") {
        altOnly = false;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (altOnly && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        altOnly = false;
        setMenuOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

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

  const zoomIn = useCallback(() => invoke("zoom:in"), []);
  const zoomOut = useCallback(() => invoke("zoom:out"), []);
  const zoomReset = useCallback(() => invoke("set_zoom_level", { level: 0 }), []);
  const reload = useCallback(() => invoke("window:reload"), []);
  const toggleDevTools = useCallback(() => invoke("window:toggleDevTools"), []);
  const toggleFullScreen = useCallback(() => invoke("window:toggleFullScreen"), []);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-testid="titlebar"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          className={cn(
            "relative flex h-12 shrink-0 select-none items-center justify-between pr-3",
            isMac && "pl-[78px]"
          )}
        >
          {/* Left: menu + workspace switcher */}
          <div className="relative z-10 flex items-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <div className="flex w-12 shrink-0 items-center justify-center">
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
                    aria-label="Menu"
                  >
                    <Menu className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-52 border-none">
                {/* File */}
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={openProject}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Project
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+Shift+O
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => useCommandPaletteStore.getState().open("commands")}>
                    <Search className="h-3.5 w-3.5" />
                    Command Palette
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+Shift+P
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* View */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-app-xs text-ctp-overlay0">View</DropdownMenuLabel>
                  <DropdownMenuItem onClick={reload}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reload Window
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+Shift+R
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleDevTools}>
                    <TerminalSquare className="h-3.5 w-3.5" />
                    Toggle Developer Tools
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+Shift+I
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={zoomIn}>
                    <ZoomIn className="h-3.5 w-3.5" />
                    Zoom In
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+=
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={zoomOut}>
                    <ZoomOut className="h-3.5 w-3.5" />
                    Zoom Out
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+-
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={zoomReset}>
                    Reset Zoom
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+0
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleFullScreen}>
                    <Maximize className="h-3.5 w-3.5" />
                    Toggle Full Screen
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      F11
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => useWsBridgeStore.getState().toggle()}>
                    <Radio className="h-3.5 w-3.5" />
                    {wsBridgeRunning ? "Stop Remote Server" : "Start Remote Server"}
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      Ctrl+Shift+R
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Preferences */}
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+,
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                    <Keyboard className="h-3.5 w-3.5" />
                    Shortcuts
                    <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
                      {mod}+?
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                    <Info className="h-3.5 w-3.5" />
                    About
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="ml-2.5" />
            {titlebar.workspaceSwitcher && (
              <>
                <WorkspaceSwitcher />
                <div className="mx-1 h-4 w-px bg-ctp-surface1" />
              </>
            )}
            {titlebar.quickActionsLeft && <QuickActions position="left" />}
          </div>

          {/* Center: search bar or project title */}
          <div
            className="relative z-10 mx-auto flex-1 px-4"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {titlebar.commandBar ? (
              <button
                type="button"
                onClick={() => useCommandPaletteStore.getState().open("commands")}
                className="mx-auto flex h-7 w-full max-w-md items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-surface0/50 px-3 text-app-sm text-ctp-overlay0 transition-colors hover:border-ctp-surface2 hover:bg-ctp-surface0 hover:text-ctp-overlay1"
              >
                <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1 truncate text-left">Command Palette</span>
                <kbd className="ml-auto shrink-0 rounded bg-ctp-surface1/50 px-1.5 py-0.5 font-mono text-app-xs text-ctp-overlay0">
                  {mod}+Shift+P
                </kbd>
              </button>
            ) : (
              <div className="mx-auto flex h-7 max-w-md items-center justify-center">
                <span className="truncate text-app-sm text-ctp-subtext0">{title}</span>
              </div>
            )}
          </div>

          {/* Right: quick actions + resource usage + window controls */}
          <div className="relative z-10 flex items-center" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            {titlebar.quickActionsRight && <QuickActions position="right" />}
            {titlebar.resourceUsage && <ResourceUsagePopover />}
            {!isMac && !tilingDesktop && (
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
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuLabel className="text-app-xs text-ctp-overlay0">Titlebar Sections</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={titlebar.commandBar} onCheckedChange={() => toggleTitlebarSection("commandBar")}>
          Command Bar
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked={titlebar.quickActionsLeft} onCheckedChange={() => toggleTitlebarSection("quickActionsLeft")}>
          Quick Actions (Left)
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked={titlebar.quickActionsRight} onCheckedChange={() => toggleTitlebarSection("quickActionsRight")}>
          Quick Actions (Right)
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked={titlebar.resourceUsage} onCheckedChange={() => toggleTitlebarSection("resourceUsage")}>
          Resource Usage
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked={titlebar.workspaceSwitcher} onCheckedChange={() => toggleTitlebarSection("workspaceSwitcher")}>
          Workspace Switcher
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
