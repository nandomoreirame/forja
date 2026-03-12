import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { pathToFileURL } from "url";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import { validateManifest } from "./types.js";
import type { LoadedPlugin } from "./types.js";

export const PLUGINS_DIR = path.join(os.homedir(), ".config", "forja", "plugins");

export async function ensurePluginsDir(): Promise<void> {
  await fs.mkdir(PLUGINS_DIR, { recursive: true });
}

export async function loadPlugin(pluginDir: string): Promise<LoadedPlugin | null> {
  try {
    const manifestPath = path.join(pluginDir, "manifest.json");
    const raw = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
    const result = validateManifest(raw);
    if (!result.valid || !result.manifest) {
      console.warn(`[plugins] Invalid manifest in ${pluginDir}: ${result.errors.join(", ")}`);
      return null;
    }
    const entryPath = path.join(pluginDir, result.manifest.entry);
    await fs.access(entryPath);
    return {
      manifest: result.manifest,
      path: pluginDir,
      entryUrl: pathToFileURL(entryPath).href,
      enabled: true,
    };
  } catch {
    return null;
  }
}

export async function scanPlugins(): Promise<LoadedPlugin[]> {
  await ensurePluginsDir();
  const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
  const plugins: LoadedPlugin[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const plugin = await loadPlugin(path.join(PLUGINS_DIR, entry.name));
    if (plugin) plugins.push(plugin);
  }
  return plugins;
}

// --- Plugin Watcher ---

let watcher: FSWatcher | null = null;

export function startPluginWatcher(onChange: () => void): void {
  if (watcher) return;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  watcher = chokidar.watch(PLUGINS_DIR, {
    depth: 1,
    ignoreInitial: true,
    persistent: true,
  });

  const debouncedOnChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onChange, 500);
  };

  watcher
    .on("add", debouncedOnChange)
    .on("change", debouncedOnChange)
    .on("unlink", debouncedOnChange)
    .on("addDir", debouncedOnChange)
    .on("unlinkDir", debouncedOnChange);
}

export function stopPluginWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
