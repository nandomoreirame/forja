export interface ActionRegistryEntry {
  id: string;
  label: string;
  icon: string;
  group: string;
  shortcut?: string;
  requiresProject?: boolean;
}

const STATIC_ACTIONS: ActionRegistryEntry[] = [
  // Panels & View group
  {
    id: "open-files",
    label: "Open Files",
    icon: "folder-tree",
    group: "Panels & View",
    shortcut: "Ctrl+Shift+E",
    requiresProject: true,
  },
  {
    id: "open-browser",
    label: "Open Browser",
    icon: "globe",
    group: "Panels & View",
    shortcut: "Ctrl+Shift+B",
  },
  {
    id: "toggle-focus-mode",
    label: "Toggle Focus Mode",
    icon: "minimize-2",
    group: "Panels & View",
    shortcut: "Ctrl+Alt+F",
  },

  // Terminal group
  {
    id: "zoom-in",
    label: "Zoom In",
    icon: "zoom-in",
    group: "Terminal",
    shortcut: "Ctrl+Alt+=",
  },
  {
    id: "zoom-out",
    label: "Zoom Out",
    icon: "zoom-out",
    group: "Terminal",
    shortcut: "Ctrl+Alt+-",
  },
  {
    id: "zoom-reset",
    label: "Reset Zoom",
    icon: "rotate-ccw",
    group: "Terminal",
    shortcut: "Ctrl+Alt+0",
  },

  // Git group
  {
    id: "git-changes",
    label: "View Git Changes",
    icon: "git-compare-arrows",
    group: "Git",
    shortcut: "Ctrl+Shift+G",
    requiresProject: true,
  },
  {
    id: "toggle-diff-mode",
    label: "Toggle Diff Mode",
    icon: "split-square-horizontal",
    group: "Git",
    requiresProject: true,
  },
  {
    id: "refresh-git",
    label: "Refresh Git Status",
    icon: "refresh-cw",
    group: "Git",
    requiresProject: true,
  },

  // Settings group
  {
    id: "change-theme",
    label: "Change Theme",
    icon: "palette",
    group: "Settings",
  },
  {
    id: "open-settings",
    label: "Open Settings",
    icon: "settings",
    group: "Settings",
    shortcut: "Ctrl+,",
  },
  {
    id: "edit-settings-json",
    label: "Open Settings (JSON)",
    icon: "file-json",
    group: "Settings",
  },
  {
    id: "keyboard-shortcuts",
    label: "Keyboard Shortcuts",
    icon: "keyboard",
    group: "Settings",
    shortcut: "Ctrl+?",
  },
];

export function getAllActions(): ActionRegistryEntry[] {
  return STATIC_ACTIONS;
}

export function getAction(id: string): ActionRegistryEntry | undefined {
  return STATIC_ACTIONS.find((action) => action.id === id);
}

export function getActionsByGroup(): Record<string, ActionRegistryEntry[]> {
  const grouped: Record<string, ActionRegistryEntry[]> = {};
  for (const action of STATIC_ACTIONS) {
    if (!grouped[action.group]) {
      grouped[action.group] = [];
    }
    grouped[action.group].push(action);
  }
  return grouped;
}

interface CliInfo {
  id: string;
  displayName: string;
}

interface PluginInfo {
  name: string;
  displayName: string;
  icon: string;
}

export function getDynamicActions(
  installedClis: CliInfo[],
  enabledPlugins: PluginInfo[],
): ActionRegistryEntry[] {
  const cliActions: ActionRegistryEntry[] = installedClis.map((cli) => ({
    id: `session:${cli.id}`,
    label: cli.displayName,
    icon: "terminal",
    group: "Session",
    requiresProject: true,
  }));

  // Always include the built-in terminal session
  cliActions.push({
    id: "session:terminal",
    label: "Terminal",
    icon: "terminal-square",
    group: "Session",
    requiresProject: true,
  });

  const pluginActions: ActionRegistryEntry[] = enabledPlugins.map((plugin) => ({
    id: `plugin:${plugin.name}`,
    label: plugin.displayName,
    icon: plugin.icon,
    group: "Plugins",
  }));

  return [...cliActions, ...pluginActions];
}
