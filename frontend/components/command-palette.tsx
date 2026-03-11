import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useFileTreeStore } from "@/stores/file-tree";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useAgentChatStore } from "@/stores/agent-chat";
import { useTerminalZoomStore } from "@/stores/terminal-zoom";
import { useGitDiffStore } from "@/stores/git-diff";
import { useGitStatusStore } from "@/stores/git-status";
import { useThemeStore } from "@/stores/theme";
import { flattenFileTree } from "@/lib/flatten-file-tree";
import {
  ChevronsDownUp,
  GitCompareArrows,
  Info,
  Keyboard,
  Loader2,
  MessageSquare,
  Palette,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  SplitSquareHorizontal,
  TerminalSquare,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo } from "react";
import { useInstalledClis } from "@/hooks/use-installed-clis";
import { CliIcon } from "./cli-icon";
import { FileIcon } from "./file-icon";
import type { SessionType } from "@/lib/cli-registry";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./ui/command";

import { MOD_KEY } from "@/lib/platform";
const mod = MOD_KEY;

export function CommandPalette() {
  const { isOpen, mode, close, open } = useCommandPaletteStore();
  const { tree, currentPath } = useFileTreeStore();
  const { installedClis, loading: clisLoading } = useInstalledClis();
  const { customThemes: themeCustom } = useThemeStore();
  const allThemes = useMemo(
    () => useThemeStore.getState().getAllThemes(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeCustom],
  );

  const flatFiles = useMemo(() => {
    if (!tree || !currentPath) return [];
    return flattenFileTree(tree.root, currentPath);
  }, [tree, currentPath]);

  const handleFileSelect = (filePath: string) => {
    useFilePreviewStore.getState().loadFile(filePath);
    close();
  };

  const handleThemeSelect = (themeId: string) => {
    useThemeStore.getState().setActiveTheme(themeId);
    const settingsStore = useUserSettingsStore.getState();
    const updated = {
      ...settingsStore.settings,
      theme: { ...settingsStore.settings.theme, active: themeId },
    };
    settingsStore.setEditorContent(JSON.stringify(updated, null, 2));
    settingsStore.saveEditorContent();
    close();
  };

  const handleSessionSelect = (sessionType: SessionType) => {
    const cp = useFileTreeStore.getState().currentPath;
    if (cp) {
      const tabStore = useTerminalTabsStore.getState();
      const id = tabStore.nextTabId();
      tabStore.addTab(id, cp, sessionType);
    }
    close();
  };

  const handleCommand = (command: string) => {
    switch (command) {
      case "new-session":
        open("sessions");
        return; // return early to avoid close()
      case "open-project":
        useFileTreeStore.getState().openProject();
        break;
      case "toggle-sidebar":
        useFileTreeStore.getState().toggleSidebar();
        break;
      case "toggle-file-preview":
        useFilePreviewStore.getState().togglePreview();
        break;
      case "keyboard-shortcuts":
        useAppDialogsStore.getState().setShortcutsOpen(true);
        break;
      case "about":
        useAppDialogsStore.getState().setAboutOpen(true);
        break;
      case "open-settings":
        useUserSettingsStore.getState().openSettingsEditor();
        useFilePreviewStore.getState().openPreview();
        break;
      case "toggle-terminal":
        useTerminalTabsStore.getState().toggleTerminalPane();
        break;
      case "toggle-chat":
        useAgentChatStore.getState().togglePanel();
        break;
      case "collapse-all":
        useFileTreeStore.getState().collapseAll();
        break;
      case "zoom-in":
        useTerminalZoomStore.getState().zoomIn();
        break;
      case "zoom-out":
        useTerminalZoomStore.getState().zoomOut();
        break;
      case "zoom-reset":
        useTerminalZoomStore.getState().resetZoom();
        break;
      case "git-changes": {
        const projectPath = useFileTreeStore.getState().currentPath;
        if (!projectPath) break;
        const diffState = useGitDiffStore.getState();
        const files =
          diffState.changedFilesByProject[projectPath] ?? [];
        if (files.length === 0) break;
        useFilePreviewStore.getState().openPreview();
        const targetPath =
          diffState.selectedProjectPath === projectPath &&
          diffState.selectedPath
            ? diffState.selectedPath
            : files[0].path;
        diffState.selectChangedFile(projectPath, targetPath);
        break;
      }
      case "toggle-diff-mode": {
        const diff = useGitDiffStore.getState();
        diff.setDiffMode(diff.diffMode === "split" ? "unified" : "split");
        break;
      }
      case "refresh-git": {
        const path = useFileTreeStore.getState().currentPath;
        if (path) useGitStatusStore.getState().forceFetchStatuses(path);
        break;
      }
    }
    close();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <CommandInput
        placeholder={
          mode === "files"
            ? "Search files..."
            : mode === "sessions"
              ? "Select session type..."
              : mode === "themes"
                ? "Select theme..."
                : "Type a command..."
        }
      />
      <CommandList>
        <CommandEmpty>
          {mode === "files"
            ? "No files found."
            : mode === "sessions"
              ? "No session types found."
              : mode === "themes"
                ? "No themes found."
                : "No commands found."}
        </CommandEmpty>

        {mode === "files" && (
          <CommandGroup heading="Files">
            {flatFiles.map((file) => (
              <CommandItem
                key={file.path}
                value={file.relativePath}
                onSelect={() => handleFileSelect(file.path)}
              >
                <FileIcon
                  isDir={false}
                  extension={file.extension}
                />
                <span className="truncate">{file.relativePath}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode === "sessions" && (
          <CommandGroup heading="New Session">
            {clisLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-ctp-overlay1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting installed CLIs...
              </div>
            ) : (
              <>
                {installedClis.map((cli) => (
                  <CommandItem
                    key={cli.id}
                    value={cli.displayName}
                    onSelect={() => handleSessionSelect(cli.id as SessionType)}
                  >
                    <CliIcon sessionType={cli.id as SessionType} className="h-4 w-4" />
                    {cli.displayName}
                  </CommandItem>
                ))}
                <CommandItem
                  value="Terminal"
                  onSelect={() => handleSessionSelect("terminal")}
                >
                  <TerminalSquare className="h-4 w-4 text-ctp-overlay1" strokeWidth={1.5} />
                  Terminal
                </CommandItem>
              </>
            )}
          </CommandGroup>
        )}

        {mode === "themes" && (
          <CommandGroup heading="Theme">
            {allThemes.map((theme) => (
              <CommandItem
                key={theme.id}
                value={theme.name}
                onSelect={() => handleThemeSelect(theme.id)}
              >
                <span
                  className="h-3 w-3 rounded-full border border-current"
                  style={{ backgroundColor: theme.colors.accent }}
                />
                {theme.name}
                {theme.type === "light" && (
                  <span className="ml-auto text-xs text-ctp-overlay1">Light</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode === "commands" && (
          <>
            <CommandGroup heading="Session">
              <CommandItem
                value="New Session"
                onSelect={() => handleCommand("new-session")}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                New Session
                <CommandShortcut>{mod}+Shift+T</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Add Project"
                onSelect={() => handleCommand("open-project")}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Add Project
                <CommandShortcut>{mod}+O</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Panels & View">
              <CommandItem
                value="Toggle Sidebar"
                onSelect={() => handleCommand("toggle-sidebar")}
              >
                <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
                Toggle Sidebar
                <CommandShortcut>{mod}+B</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Toggle File Preview"
                onSelect={() => handleCommand("toggle-file-preview")}
              >
                <PanelRight className="h-4 w-4" strokeWidth={1.5} />
                Toggle File Preview
                <CommandShortcut>{mod}+E</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Toggle Terminal"
                onSelect={() => handleCommand("toggle-terminal")}
              >
                <PanelBottom className="h-4 w-4" strokeWidth={1.5} />
                Toggle Terminal
                <CommandShortcut>{mod}+J</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Toggle Chat Panel"
                onSelect={() => handleCommand("toggle-chat")}
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                Toggle Chat Panel
              </CommandItem>
              <CommandItem
                value="Collapse All Folders"
                onSelect={() => handleCommand("collapse-all")}
              >
                <ChevronsDownUp className="h-4 w-4" strokeWidth={1.5} />
                Collapse All Folders
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Terminal">
              <CommandItem
                value="Zoom In"
                onSelect={() => handleCommand("zoom-in")}
              >
                <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
                Zoom In
                <CommandShortcut>{mod}+Alt+=</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Zoom Out"
                onSelect={() => handleCommand("zoom-out")}
              >
                <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
                Zoom Out
                <CommandShortcut>{mod}+Alt+-</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Reset Zoom"
                onSelect={() => handleCommand("zoom-reset")}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                Reset Zoom
                <CommandShortcut>{mod}+Alt+0</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Git">
              <CommandItem
                value="View Git Changes"
                onSelect={() => handleCommand("git-changes")}
              >
                <GitCompareArrows className="h-4 w-4" strokeWidth={1.5} />
                View Git Changes
                <CommandShortcut>{mod}+Shift+G</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Toggle Diff Mode"
                onSelect={() => handleCommand("toggle-diff-mode")}
              >
                <SplitSquareHorizontal className="h-4 w-4" strokeWidth={1.5} />
                Toggle Diff Mode
              </CommandItem>
              <CommandItem
                value="Refresh Git Status"
                onSelect={() => handleCommand("refresh-git")}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                Refresh Git Status
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Settings & Help">
              <CommandItem
                value="Change Theme"
                onSelect={() => open("themes")}
              >
                <Palette className="h-4 w-4" strokeWidth={1.5} />
                Change Theme
              </CommandItem>
              <CommandItem
                value="Open Settings"
                onSelect={() => handleCommand("open-settings")}
              >
                <Settings className="h-4 w-4" strokeWidth={1.5} />
                Open Settings
                <CommandShortcut>{mod}+,</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Keyboard Shortcuts"
                onSelect={() => handleCommand("keyboard-shortcuts")}
              >
                <Keyboard className="h-4 w-4" strokeWidth={1.5} />
                Keyboard Shortcuts
                <CommandShortcut>{mod}+?</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="About"
                onSelect={() => handleCommand("about")}
              >
                <Info className="h-4 w-4" strokeWidth={1.5} />
                About
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
