import type { PluginPermission, PluginPermissionGrant } from "./types.js";
import { getPluginPermissions, setPluginPermission } from "../config.js";

export const METHOD_PERMISSION_MAP: Record<string, PluginPermission> = {
  "project.getActive": "project.active",
  "git.status": "git.status",
  "git.log": "git.log",
  "git.diff": "git.diff",
  "fs.readFile": "fs.read",
  "fs.writeFile": "fs.write",
  "terminal.getOutput": "terminal.output",
  "terminal.execute": "terminal.execute",
  "theme.getCurrent": "theme.current",
  "notifications.show": "notifications",
};

export function getRequiredPermission(method: string): PluginPermission | null {
  return METHOD_PERMISSION_MAP[method] ?? null;
}

export function hasPermission(pluginName: string, permission: PluginPermission): boolean {
  const grants = getPluginPermissions();
  const grant = grants.find((g) => g.pluginName === pluginName);
  if (!grant) return false;
  return grant.grantedPermissions.includes(permission);
}

export function isPermissionDenied(pluginName: string, permission: PluginPermission): boolean {
  const grants = getPluginPermissions();
  const grant = grants.find((g) => g.pluginName === pluginName);
  if (!grant) return false;
  return grant.deniedPermissions.includes(permission);
}

export function hasAnyGrant(pluginName: string): boolean {
  const grants = getPluginPermissions();
  return grants.some((g) => g.pluginName === pluginName);
}

export function grantPermissions(pluginName: string, permissions: PluginPermission[]): void {
  const grants = getPluginPermissions();
  const existing = grants.find((g) => g.pluginName === pluginName);

  const grant: PluginPermissionGrant = {
    pluginName,
    grantedPermissions: existing
      ? [...new Set([...existing.grantedPermissions, ...permissions])]
      : permissions,
    deniedPermissions: existing
      ? existing.deniedPermissions.filter((p) => !permissions.includes(p))
      : [],
    grantedAt: new Date().toISOString(),
  };

  setPluginPermission(grant);
}

export function denyPermissions(pluginName: string, permissions: PluginPermission[]): void {
  const grants = getPluginPermissions();
  const existing = grants.find((g) => g.pluginName === pluginName);

  const grant: PluginPermissionGrant = {
    pluginName,
    grantedPermissions: existing
      ? existing.grantedPermissions.filter((p) => !permissions.includes(p))
      : [],
    deniedPermissions: existing
      ? [...new Set([...existing.deniedPermissions, ...permissions])]
      : permissions,
    grantedAt: new Date().toISOString(),
  };

  setPluginPermission(grant);
}
