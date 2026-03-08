/**
 * Context Watch Sync Service
 *
 * Watches the canonical .forja/context/ directory and installed CLI tool
 * directories for file changes, setting pendingSyncOut/pendingSyncIn flags
 * with debounce to avoid loops.
 */

import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import * as os from "os";
import * as path from "path";
import { getAllToolIds, getToolById } from "./tool-registry.js";

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
// State
// ---------------------------------------------------------------------------

const sessions = new Map<string, WatchSession>();
const syncStates = new Map<string, SyncState>();

const CONTEXT_DIR = ".forja/context";
const DEBOUNCE_MS = 800;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts watching the project's context hub directory and all detected CLI
 * tool directories for file changes.
 */
export function startContextWatcher(projectPath: string): void {
  // Stop existing watcher for this project
  stopContextWatcher(projectPath);

  const home = os.homedir();
  const hubPath = path.join(projectPath, CONTEXT_DIR);
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
        ensureState(projectPath).pendingSyncOut = true;
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
            ensureState(projectPath).pendingSyncIn = true;
          }, DEBOUNCE_MS)
        );
      };

      cliWatcher.on("change", onCliChange);
      cliWatcher.on("add", onCliChange);
      cliWatcher.on("unlink", onCliChange);

      cliWatchers.push(cliWatcher);
    }
  }

  sessions.set(projectPath, { hubWatcher, cliWatchers, debounceTimers: timers });
}

/**
 * Stops all watchers for a project and cleans up timers.
 */
export function stopContextWatcher(projectPath: string): void {
  const session = sessions.get(projectPath);
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

  sessions.delete(projectPath);
}

/**
 * Returns the current sync state for a project.
 */
export function getContextSyncState(projectPath: string): SyncState {
  return { ...ensureState(projectPath) };
}

/**
 * Resets both sync flags for a project (e.g. after sync completes).
 */
export function resetSyncFlags(projectPath?: string): void {
  if (projectPath) {
    syncStates.set(projectPath, { pendingSyncOut: false, pendingSyncIn: false });
  } else {
    syncStates.clear();
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function ensureState(projectPath: string): SyncState {
  let state = syncStates.get(projectPath);
  if (!state) {
    state = { pendingSyncOut: false, pendingSyncIn: false };
    syncStates.set(projectPath, state);
  }
  return state;
}
