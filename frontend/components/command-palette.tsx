import { useCommandPaletteStore } from "@/stores/command-palette";
import { useUserSettingsStore } from "@/stores/user-settings";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useFileTreeStore } from "@/stores/file-tree";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useThemeStore } from "@/stores/theme";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { useProjectsStore } from "@/stores/projects";
import { usePluginsStore, getOrderedEnabledPlugins } from "@/stores/plugins";
import { useQuickActionsStore } from "@/stores/quick-actions";
import { getPluginIcon } from "@/lib/plugin-types";
import { flattenFileTree } from "@/lib/flatten-file-tree";
import { getActionsByGroup } from "@/lib/action-registry";
import { executeAction } from "@/lib/action-executor";
import * as allIcons from "lucide-react";
import {
  Check,
  ChevronsDownUp,
  Eraser,
  FileJson,
  FolderOpen,
  FolderTree,
  GitCompareArrows,
  Globe,
  Info,
  Keyboard,
  Loader2,
  Minimize2,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  SplitSquareHorizontal,
  Puzzle,
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

function getIconByName(iconName: string): React.ComponentType<{ className?: string; strokeWidth?: number }> {
  const pascalCase = iconName
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return (allIcons as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[pascalCase] ?? allIcons.CircleDot;
}

export function CommandPalette() {
  const { isOpen, mode, close, open } = useCommandPaletteStore();
  const { tree, currentPath } = useFileTreeStore();
  const { installedClis, loading: clisLoading } = useInstalledClis();
  const { customThemes: themeCustom } = useThemeStore();
  const { projects, activeProjectPath, getProjectInitial, getProjectColor } = useProjectsStore();
  const isFileTreeOpen = useTilingLayoutStore((s) => s.hasBlock("tab-file-tree"));
  const { plugins, pluginOrder } = usePluginsStore();
  const enabledPlugins = useMemo(
    () => getOrderedEnabledPlugins({ plugins, pluginOrder }),
    [plugins, pluginOrder],
  );
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

  const handleOpenFiles = () => {
    executeAction("open-files");
    close();
  };

  const handleOpenBrowser = () => {
    executeAction("open-browser");
    close();
  };

  const handleOpenPlugin = (pluginName: string) => {
    executeAction(`plugin:${pluginName}`);
    close();
  };

  const handleProjectSelect = (projectPath: string) => {
    useProjectsStore.getState().switchToProject(projectPath);
    close();
  };

  const handleCommand = (command: string) => {
    // Special cases that change command palette mode (don't close)
    if (command === "new-session") {
      if (!useFileTreeStore.getState().currentPath) {
        close();
        return;
      }
      open("sessions");
      return;
    }
    if (command === "go-to-project") {
      open("projects");
      return;
    }

    // Delegate to centralized executor
    executeAction(command);
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
                  : mode === "quick-actions"
                    ? "Add quick action..."
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
                  : mode === "quick-actions"
                    ? "No actions found."
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
              {currentPath && (
                <CommandItem
                  value="New Session"
                  onSelect={() => handleCommand("new-session")}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  New Session
                  <CommandShortcut>{mod}+Shift+T</CommandShortcut>
                </CommandItem>
              )}
              {projects.length > 0 && (
                <CommandItem
                  value="Go to Project"
                  onSelect={() => handleCommand("go-to-project")}
                >
                  <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
                  Go to Project
                  <CommandShortcut>{mod}+Shift+L</CommandShortcut>
                </CommandItem>
              )}
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
              {currentPath && (
                <CommandItem
                  value="Open Files"
                  onSelect={handleOpenFiles}
                >
                  <FolderTree className="h-4 w-4" strokeWidth={1.5} />
                  Open Files
                  <CommandShortcut>{mod}+Shift+E</CommandShortcut>
                </CommandItem>
              )}
              <CommandItem
                value="Open Browser"
                onSelect={handleOpenBrowser}
              >
                <Globe className="h-4 w-4" strokeWidth={1.5} />
                Open Browser
                <CommandShortcut>{mod}+Shift+B</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Toggle Focus Mode"
                onSelect={() => handleCommand("toggle-focus-mode")}
              >
                <Minimize2 className="h-4 w-4" strokeWidth={1.5} />
                Toggle Focus Mode
                <CommandShortcut>{mod}+Alt+F</CommandShortcut>
              </CommandItem>
              {currentPath && isFileTreeOpen && (
                <CommandItem
                  value="Collapse All Folders"
                  onSelect={() => handleCommand("collapse-all")}
                >
                  <ChevronsDownUp className="h-4 w-4" strokeWidth={1.5} />
                  Collapse All Folders
                </CommandItem>
              )}
            </CommandGroup>

            {currentPath && (
              <CommandGroup heading="Sessions">
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
                        value={`session-${cli.id}`}
                        onSelect={() => handleSessionSelect(cli.id as SessionType)}
                      >
                        <CliIcon sessionType={cli.id as SessionType} className="h-4 w-4" />
                        {cli.displayName}
                      </CommandItem>
                    ))}
                    <CommandItem
                      value="session-terminal"
                      onSelect={() => handleSessionSelect("terminal")}
                    >
                      <TerminalSquare className="h-4 w-4 text-ctp-overlay1" strokeWidth={1.5} />
                      Terminal
                    </CommandItem>
                  </>
                )}
              </CommandGroup>
            )}

            {enabledPlugins.length > 0 && (
              <CommandGroup heading="Plugins">
                {enabledPlugins.map((plugin) => {
                  const Icon = getPluginIcon(plugin.manifest.icon) ?? Puzzle;
                  return (
                    <CommandItem
                      key={plugin.manifest.name}
                      value={`plugin-${plugin.manifest.name}`}
                      onSelect={() => handleOpenPlugin(plugin.manifest.name)}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      {plugin.manifest.displayName}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

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

            {currentPath && (
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
            )}

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
                value="Open Settings JSON"
                onSelect={() => handleCommand("edit-settings-json")}
              >
                <FileJson className="h-4 w-4" strokeWidth={1.5} />
                Open Settings (JSON)
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

            <CommandGroup heading="Developer">
              <CommandItem
                value="Developer Reload Window"
                onSelect={() => handleCommand("dev-reload")}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
                Developer: Reload Window
              </CommandItem>
              <CommandItem
                value="Developer Clear Cache"
                onSelect={() => handleCommand("dev-clear-cache")}
              >
                <Eraser className="h-4 w-4" strokeWidth={1.5} />
                Developer: Clear Cache
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {mode === "quick-actions" && (
          <>
            {Object.entries(getActionsByGroup()).map(([groupName, actions]) => (
              <CommandGroup key={groupName} heading={groupName}>
                {actions.map((action) => {
                  const Icon = getIconByName(action.icon);
                  const pinned = useQuickActionsStore.getState().isPinned(action.id);
                  return (
                    <CommandItem
                      key={action.id}
                      value={action.label}
                      onSelect={async () => {
                        const store = useQuickActionsStore.getState();
                        if (pinned) {
                          await store.removeAction(action.id);
                        } else {
                          await store.addAction(action.id);
                        }
                        close();
                      }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      {action.label}
                      {pinned && (
                        <Check className="ml-auto h-3.5 w-3.5 text-ctp-green" strokeWidth={1.5} />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}

            {!clisLoading && (
              <CommandGroup heading="Sessions">
                {installedClis.map((cli) => {
                  const pinnedCli = useQuickActionsStore.getState().isPinned(`session:${cli.id}`);
                  return (
                    <CommandItem
                      key={`qa-session-${cli.id}`}
                      value={`Session ${cli.displayName}`}
                      onSelect={async () => {
                        const store = useQuickActionsStore.getState();
                        const actionId = `session:${cli.id}`;
                        if (pinnedCli) await store.removeAction(actionId);
                        else await store.addAction(actionId);
                        close();
                      }}
                    >
                      <CliIcon sessionType={cli.id as SessionType} className="h-4 w-4" />
                      {cli.displayName}
                      {pinnedCli && <Check className="ml-auto h-3.5 w-3.5 text-ctp-green" strokeWidth={1.5} />}
                    </CommandItem>
                  );
                })}
                {(() => {
                  const pinnedTerminal = useQuickActionsStore.getState().isPinned("session:terminal");
                  return (
                    <CommandItem
                      key="qa-session-terminal"
                      value="Session Terminal"
                      onSelect={async () => {
                        const store = useQuickActionsStore.getState();
                        if (pinnedTerminal) await store.removeAction("session:terminal");
                        else await store.addAction("session:terminal");
                        close();
                      }}
                    >
                      <TerminalSquare className="h-4 w-4 text-ctp-overlay1" strokeWidth={1.5} />
                      Terminal
                      {pinnedTerminal && <Check className="ml-auto h-3.5 w-3.5 text-ctp-green" strokeWidth={1.5} />}
                    </CommandItem>
                  );
                })()}
              </CommandGroup>
            )}

            {enabledPlugins.length > 0 && (
              <CommandGroup heading="Plugins">
                {enabledPlugins.map((plugin) => {
                  const Icon = getPluginIcon(plugin.manifest.icon) ?? Puzzle;
                  const pinnedPlugin = useQuickActionsStore.getState().isPinned(`plugin:${plugin.manifest.name}`);
                  return (
                    <CommandItem
                      key={`qa-plugin-${plugin.manifest.name}`}
                      value={`Plugin ${plugin.manifest.displayName}`}
                      onSelect={async () => {
                        const store = useQuickActionsStore.getState();
                        const actionId = `plugin:${plugin.manifest.name}`;
                        if (pinnedPlugin) await store.removeAction(actionId);
                        else await store.addAction(actionId);
                        close();
                      }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      {plugin.manifest.displayName}
                      {pinnedPlugin && <Check className="ml-auto h-3.5 w-3.5 text-ctp-green" strokeWidth={1.5} />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
