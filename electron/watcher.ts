import * as path from "path";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import type { WebContents } from "electron";

interface WatcherSession {
  watcher: FSWatcher;
  path: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

const watchers = new Map<string, WatcherSession>();
const DEBOUNCE_MS = 500;

export function startWatcher(
  windowId: number,
  projectPath: string,
  sender: WebContents
): void {
  const key = `${windowId}:${projectPath}`;
  stopWatcherByKey(key);

  const gitPath = path.join(projectPath, ".git");

  const watcher = chokidar.watch(gitPath, {
    ignoreInitial: true,
    persistent: true,
    depth: 2,
  });

  const session: WatcherSession = { watcher, path: projectPath, debounceTimer: null };
  watchers.set(key, session);

  const notify = () => {
    if (session.debounceTimer) clearTimeout(session.debounceTimer);
    session.debounceTimer = setTimeout(() => {
      if (!sender.isDestroyed()) {
        sender.send("git:changed", { path: projectPath });
      }
    }, DEBOUNCE_MS);
  };

  watcher.on("add", notify);
  watcher.on("change", notify);
  watcher.on("unlink", notify);
}

function stopWatcherByKey(key: string): void {
  const session = watchers.get(key);
  if (session) {
    if (session.debounceTimer) clearTimeout(session.debounceTimer);
    session.watcher.close().catch((err) => console.warn("[watcher] Close failed:", err));
    watchers.delete(key);
  }
}

export function stopWatcher(windowId: number): void {
  for (const [key, session] of watchers) {
    if (key.startsWith(`${windowId}:`)) {
      if (session.debounceTimer) clearTimeout(session.debounceTimer);
      session.watcher.close().catch((err) => console.warn("[watcher] Close failed:", err));
      watchers.delete(key);
    }
  }
}

export function stopProjectWatcher(windowId: number, projectPath: string): void {
  const key = `${windowId}:${projectPath}`;
  stopWatcherByKey(key);
}

export function stopAllWatchers(): void {
  for (const [key, session] of watchers) {
    if (session.debounceTimer) clearTimeout(session.debounceTimer);
    session.watcher.close().catch((err) => console.warn("[watcher] Close failed:", err));
    watchers.delete(key);
  }
}
