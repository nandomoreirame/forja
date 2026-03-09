/**
 * Context Watch Sync Service
 *
 * Watches the canonical ~/.config/forja/context/ directory and installed CLI
 * tool directories for file changes, setting pendingSyncOut/pendingSyncIn
 * flags with debounce to avoid loops.
 *
 * Operates as a global singleton — one watcher instance for the entire app.
 */

import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import * as os from "os";
import * as path from "path";
import { getAllToolIds, getToolById } from "./tool-registry.js";
import { getContextHubRoot } from "./context-hub.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncState {
  pendingSyncOut: boolean;
  pendingSyncIn: boolean;
}

interface WatchSession {
  hubWatcher: FSWatcher;
  cliWatchers: FSWatcher[];
  debounceTimers: Map<string, ReturnType<typeof setTimeout>>;
}

// ---------------------------------------------------------------------------
// State (singleton)
// ---------------------------------------------------------------------------

let session: WatchSession | null = null;
let syncState: SyncState = { pendingSyncOut: false, pendingSyncIn: false };

const DEBOUNCE_MS = 800;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts watching the global context hub directory and all detected CLI
 * tool directories for file changes.
 */
export function startContextWatcher(callback?: () => void): void {
  // Stop existing watcher
  stopContextWatcher();

  const home = os.homedir();
  const hubPath = getContextHubRoot();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  // Watch hub directory
  const hubWatcher = chokidar.watch(hubPath, {
    ignoreInitial: true,
    persistent: true,
    depth: 4,
  });

  const onHubChange = () => {
    if (timers.has("hub")) clearTimeout(timers.get("hub")!);
    timers.set(
      "hub",
      setTimeout(() => {
        syncState.pendingSyncOut = true;
        callback?.();
      }, DEBOUNCE_MS)
    );
  };

  hubWatcher.on("change", onHubChange);
  hubWatcher.on("add", onHubChange);
  hubWatcher.on("unlink", onHubChange);

  // Watch CLI tool directories
  const cliWatchers: FSWatcher[] = [];
  const toolIds = getAllToolIds();

  for (const toolId of toolIds) {
    const tool = getToolById(toolId);
    if (!tool) continue;

    const watchPaths: string[] = [];
    if (tool.paths.agents) watchPaths.push(path.join(home, tool.paths.agents));
    if (tool.paths.skills) watchPaths.push(path.join(home, tool.paths.skills));
    if (tool.paths.docs) watchPaths.push(path.join(home, tool.paths.docs));

    for (const wp of watchPaths) {
      const cliWatcher = chokidar.watch(wp, {
        ignoreInitial: true,
        persistent: true,
        depth: 3,
      });

      const onCliChange = () => {
        const key = `cli:${toolId}`;
        if (timers.has(key)) clearTimeout(timers.get(key)!);
        timers.set(
          key,
          setTimeout(() => {
            syncState.pendingSyncIn = true;
            callback?.();
          }, DEBOUNCE_MS)
        );
      };

      cliWatcher.on("change", onCliChange);
      cliWatcher.on("add", onCliChange);
      cliWatcher.on("unlink", onCliChange);

      cliWatchers.push(cliWatcher);
    }
  }

  session = { hubWatcher, cliWatchers, debounceTimers: timers };
}

/**
 * Stops all watchers and cleans up timers.
 */
export function stopContextWatcher(): void {
  if (!session) return;

  // Clear debounce timers
  for (const timer of session.debounceTimers.values()) {
    clearTimeout(timer);
  }

  // Close watchers
  session.hubWatcher.close().catch(() => {});
  for (const w of session.cliWatchers) {
    w.close().catch(() => {});
  }

  session = null;
}

/**
 * Returns the current sync state.
 */
export function getContextSyncState(): SyncState {
  return { ...syncState };
}

/**
 * Resets both sync flags (e.g. after sync completes).
 */
export function resetSyncFlags(): void {
  syncState = { pendingSyncOut: false, pendingSyncIn: false };
}
