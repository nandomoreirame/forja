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
import { getPluginPermissions, setPluginEnabled, getPluginOrder, setPluginOrder, getPinnedPlugin, setPinnedPlugin } from "../config.js";
import { fetchRegistry } from "./plugin-registry.js";
import { installPlugin, uninstallPlugin, getInstalledVersions } from "./plugin-installer.js";
import type { PluginPermission, RegistryData } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGISTRY_URL = "https://nandomoreirame.github.io/forja-plugins/registry.json";

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

interface PluginOrderArgs {
  names?: string[];
}

interface PluginPinArgs {
  name?: string | null;
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
    ["plugin:get-plugin-order", handleGetPluginOrder],
    ["plugin:set-plugin-order", handleSetPluginOrder],
    ["plugin:pin", handlePinPlugin],
    ["plugin:get-pinned", handleGetPinnedPlugin],
    ["plugin:fetch-registry", handleFetchRegistry],
    ["plugin:install", handleInstall],
    ["plugin:uninstall", handleUninstall],
    ["plugin:check-updates", handleCheckUpdates],
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

async function handleGetPluginOrder(): Promise<string[]> {
  return getPluginOrder();
}

async function handleSetPluginOrder(_event: unknown, args: unknown): Promise<void> {
  const { names } = (args ?? {}) as PluginOrderArgs;
  if (!names) throw new Error("names is required");
  setPluginOrder(names);
}

async function handlePinPlugin(_event: unknown, args: unknown): Promise<void> {
  const { name } = (args ?? {}) as PluginPinArgs;
  // name can be null (to unpin) or a string (to pin)
  setPinnedPlugin(name ?? null);
}

async function handleGetPinnedPlugin(): Promise<string | null> {
  return getPinnedPlugin();
}

async function handleGetPreloadPath(): Promise<string> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // This file is already inside the plugins/ directory, so the preload
  // script is a sibling file — no extra "plugins" segment needed.
  return path.join(__dirname, "plugin-preload.cjs");
}

// ---------------------------------------------------------------------------
// Marketplace handlers
// ---------------------------------------------------------------------------

async function handleFetchRegistry(): Promise<RegistryData> {
  return fetchRegistry(REGISTRY_URL);
}

async function handleInstall(_event: unknown, args: unknown): Promise<unknown> {
  const { name } = (args ?? {}) as PluginNameArgs;
  if (!name) throw new Error("name is required");

  const registry = await fetchRegistry(REGISTRY_URL);
  const registryPlugin = registry.plugins.find((p) => p.name === name);
  if (!registryPlugin) {
    throw new Error(`Plugin not found in registry: ${name}`);
  }

  await installPlugin(registryPlugin);
  return scanPlugins();
}

async function handleUninstall(_event: unknown, args: unknown): Promise<unknown> {
  const { name } = (args ?? {}) as PluginNameArgs;
  if (!name) throw new Error("name is required");

  await uninstallPlugin(name);
  return scanPlugins();
}

interface UpdateAvailable {
  name: string;
  currentVersion: string;
  latestVersion: string;
}

async function handleCheckUpdates(): Promise<UpdateAvailable[]> {
  const [registry, installedVersions] = await Promise.all([
    fetchRegistry(REGISTRY_URL),
    getInstalledVersions(),
  ]);

  const updates: UpdateAvailable[] = [];

  for (const registryPlugin of registry.plugins) {
    const currentVersion = installedVersions.get(registryPlugin.name);
    if (currentVersion === undefined) continue; // not installed — skip
    if (currentVersion !== registryPlugin.version) {
      updates.push({
        name: registryPlugin.name,
        currentVersion,
        latestVersion: registryPlugin.version,
      });
    }
  }

  return updates;
}
