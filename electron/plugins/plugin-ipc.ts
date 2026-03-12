/**
 * Plugin System IPC Handlers
 *
 * Returns an array of [channel, handler] tuples that can be registered
 * with ipcMain.handle() in the Electron main process.
 */

import * as path from "path";
import { fileURLToPath } from "url";
import { scanPlugins } from "./plugin-loader.js";
import { executeBridgeCall } from "./plugin-bridge.js";
import { grantPermissions, denyPermissions } from "./plugin-permissions.js";
import { getPluginPermissions, setPluginEnabled } from "../config.js";
import type { PluginPermission } from "./types.js";

// ---------------------------------------------------------------------------
// Argument types
// ---------------------------------------------------------------------------

interface BridgeArgs {
  pluginName?: string;
  method?: string;
  args?: Record<string, unknown>;
  projectPath?: string | null;
}

interface PluginNameArgs {
  name?: string;
}

interface PermissionArgs {
  name?: string;
  permissions?: PluginPermission[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type IpcHandler = (_event: unknown, args: unknown) => Promise<unknown>;

/**
 * Creates all plugin system IPC handlers.
 *
 * Returns an array of [channel, handler] tuples suitable for
 * ipcMain.handle() registration.
 */
export function createPluginHandlers(): Array<[string, IpcHandler]> {
  return [
    ["plugin:list", handleList],
    ["plugin:bridge", handleBridge],
    ["plugin:enable", handleEnable],
    ["plugin:disable", handleDisable],
    ["plugin:get-permissions", handleGetPermissions],
    ["plugin:grant-permissions", handleGrantPermissions],
    ["plugin:deny-permissions", handleDenyPermissions],
    ["plugin:get-preload-path", handleGetPreloadPath],
  ];
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleList(): Promise<unknown> {
  return scanPlugins();
}

async function handleBridge(_event: unknown, args: unknown): Promise<unknown> {
  const { pluginName, method, args: bridgeArgs = {}, projectPath = null } = (args ?? {}) as BridgeArgs;
  if (!pluginName) throw new Error("pluginName is required");
  if (!method) throw new Error("method is required");
  return executeBridgeCall(pluginName, method, bridgeArgs, projectPath ?? null);
}

async function handleEnable(_event: unknown, args: unknown): Promise<void> {
  const { name } = (args ?? {}) as PluginNameArgs;
  if (!name) throw new Error("name is required");
  setPluginEnabled(name, true);
}

async function handleDisable(_event: unknown, args: unknown): Promise<void> {
  const { name } = (args ?? {}) as PluginNameArgs;
  if (!name) throw new Error("name is required");
  setPluginEnabled(name, false);
}

async function handleGetPermissions(_event: unknown, args: unknown): Promise<unknown> {
  const { name } = (args ?? {}) as PluginNameArgs;
  if (!name) throw new Error("name is required");
  const grants = getPluginPermissions();
  return grants.find((g) => g.pluginName === name) ?? null;
}

async function handleGrantPermissions(_event: unknown, args: unknown): Promise<void> {
  const { name, permissions } = (args ?? {}) as PermissionArgs;
  if (!name) throw new Error("name is required");
  if (!permissions) throw new Error("permissions is required");
  grantPermissions(name, permissions);
}

async function handleDenyPermissions(_event: unknown, args: unknown): Promise<void> {
  const { name, permissions } = (args ?? {}) as PermissionArgs;
  if (!name) throw new Error("name is required");
  if (!permissions) throw new Error("permissions is required");
  denyPermissions(name, permissions);
}

async function handleGetPreloadPath(): Promise<string> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "plugins", "plugin-preload.cjs");
}
