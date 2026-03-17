import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useFileTreeStore } from "@/stores/file-tree";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useTerminalZoomStore } from "@/stores/terminal-zoom";
import { useGitDiffStore } from "@/stores/git-diff";
import { useGitStatusStore } from "@/stores/git-status";
import { useThemeStore } from "@/stores/theme";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { useProjectsStore } from "@/stores/projects";
import { flattenFileTree } from "@/lib/flatten-file-tree";
import {
  ChevronsDownUp,
  FolderOpen,
  FolderTree,
  GitCompareArrows,
  Globe,
  Info,
  Keyboard,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  SplitSquareHorizontal,
  TerminalSquare,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo, useRef } from "react";
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
  const { projects, activeProjectPath, getProjectInitial, getProjectColor } = useProjectsStore();
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

  const browserCounterRef = useRef(0);

  const handleOpenFiles = () => {
    const tilingStore = useTilingLayoutStore.getState();
    if (!tilingStore.hasBlock("tab-file-tree")) {
      const tree = useFileTreeStore.getState().tree;
      const projectName = tree?.root.name;
      tilingStore.addBlock(
        { type: "file-tree", projectName },
        undefined,
        "tab-file-tree",
      );
    }
    close();
  };

  const handleOpenBrowser = () => {
    const tilingStore = useTilingLayoutStore.getState();
    browserCounterRef.current += 1;
    const blockId = `browser-${Date.now().toString(36)}-${browserCounterRef.current}`;
    tilingStore.addBlock(
      { type: "browser", url: "https://github.com/nandomoreirame/forja" },
      undefined,
      blockId,
    );
    close();
  };

  const handleProjectSelect = (projectPath: string) => {
    useProjectsStore.getState().switchToProject(projectPath);
    close();
  };

  const handleCommand = (command: string) => {
    switch (command) {
      case "new-session":
        open("sessions");
        return; // return early to avoid close()
      case "go-to-project":
        open("projects");
        return; // return early to avoid close()
      case "open-project":
        useFileTreeStore.getState().openProject();
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
                : mode === "projects"
                  ? "Go to project..."
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
                : mode === "projects"
                  ? "No projects found."
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
              <div className="flex items-center gap-2 px-2 py-3 text-app text-ctp-overlay1">
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
                  <span className="ml-auto text-app-sm text-ctp-overlay1">Light</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode === "projects" && (
          <CommandGroup heading="Open Projects">
            {projects.map((project) => {
              const initial = getProjectInitial(project.name);
              const color = getProjectColor(project.name);
              const isActive = project.path === activeProjectPath;
              return (
                <CommandItem
                  key={project.path}
                  value={project.name}
                  onSelect={() => handleProjectSelect(project.path)}
                >
                  {project.iconPath ? (
                    <img
                      src={project.iconPath}
                      alt={project.name}
                      className="h-4 w-4 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-app-xs font-bold"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {initial}
                    </span>
                  )}
                  <span className="flex-1 truncate">{project.name}</span>
                  <span className="ml-2 truncate text-app-sm text-ctp-overlay1">{project.path}</span>
                  {isActive && (
                    <FolderOpen className="ml-2 h-3.5 w-3.5 shrink-0 text-ctp-mauve" strokeWidth={1.5} />
                  )}
                </CommandItem>
              );
            })}
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
                value="Go to Project"
                onSelect={() => handleCommand("go-to-project")}
              >
                <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
                Go to Project
                <CommandShortcut>{mod}+Shift+L</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Add Project"
                onSelect={() => handleCommand("open-project")}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Add Project
                <CommandShortcut>{mod}+Shift+O</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Panels & View">
              <CommandItem
                value="Open Files"
                onSelect={handleOpenFiles}
              >
                <FolderTree className="h-4 w-4" strokeWidth={1.5} />
                Open Files
                <CommandShortcut>{mod}+Shift+E</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Open Browser"
                onSelect={handleOpenBrowser}
              >
                <Globe className="h-4 w-4" strokeWidth={1.5} />
                Open Browser
                <CommandShortcut>{mod}+Shift+B</CommandShortcut>
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
