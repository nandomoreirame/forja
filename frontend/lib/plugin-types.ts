import type { LucideIcon } from "lucide-react";
import * as icons from "lucide-react";

// Mirror types from electron/plugins/types.ts
export type PluginPermission =
  | "project.active"
  | "git.status"
  | "git.log"
  | "git.diff"
  | "fs.read"
  | "fs.write"
  | "terminal.output"
  | "terminal.execute"
  | "theme.current"
  | "notifications";

export const VALID_PERMISSIONS: readonly PluginPermission[] = [
  "project.active",
  "git.status",
  "git.log",
  "git.diff",
  "fs.read",
  "fs.write",
  "terminal.output",
  "terminal.execute",
  "theme.current",
  "notifications",
] as const;

export interface PluginManifest {
  name: string;
  version: string;
  displayName: string;
  description: string;
  author: string;
  icon: string;
  entry: string;
  permissions: PluginPermission[];
  minForjaVersion?: string;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  path: string;
  entryUrl: string;
  enabled: boolean;
}

export interface PluginPermissionGrant {
  pluginName: string;
  grantedPermissions: PluginPermission[];
  deniedPermissions: PluginPermission[];
  grantedAt: string;
}

export type PermissionRisk = "low" | "medium" | "high" | "critical";

export interface PermissionInfo {
  label: string;
  description: string;
  risk: PermissionRisk;
}

export const PERMISSION_INFO: Record<PluginPermission, PermissionInfo> = {
  "project.active": {
    label: "Active Project",
    description: "Read active project info (name, path)",
    risk: "low",
  },
  "git.status": {
    label: "Git Status",
    description: "Read git status of the current project",
    risk: "low",
  },
  "git.log": {
    label: "Git History",
    description: "Read git commit history",
    risk: "low",
  },
  "git.diff": {
    label: "Git Diff",
    description: "Read file diffs and changed files",
    risk: "medium",
  },
  "fs.read": {
    label: "Read Files",
    description: "Read files within the project directory",
    risk: "medium",
  },
  "fs.write": {
    label: "Write Files",
    description: "Create or modify files within the project directory",
    risk: "high",
  },
  "terminal.output": {
    label: "Terminal Output",
    description: "Read terminal output buffer",
    risk: "high",
  },
  "terminal.execute": {
    label: "Terminal Execute",
    description: "Execute commands in the terminal",
    risk: "critical",
  },
  "theme.current": {
    label: "Current Theme",
    description: "Read the current theme colors",
    risk: "low",
  },
  notifications: {
    label: "Notifications",
    description: "Show desktop notifications",
    risk: "low",
  },
};

export function getPluginIcon(iconName: string): LucideIcon | null {
  const icon = (icons as Record<string, unknown>)[iconName];
  if (icon === null || icon === undefined) return null;
  // Lucide React icons are forwardRef objects (typeof === "object" with $$typeof)
  // or plain function components (typeof === "function")
  if (typeof icon === "function" || typeof icon === "object") {
    return icon as LucideIcon;
  }
  return null;
}
