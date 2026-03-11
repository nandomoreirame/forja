import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import type { WebContents } from "electron";
import path from "path";
import { invalidateFileCache, invalidateProjectCache } from "./file-cache.js";

interface FileWatcherSession {
  watcher: FSWatcher;
  path: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pendingPaths: Set<string>;
}

const fileWatchers = new Map<string, FileWatcherSession>();
const DEBOUNCE_MS = 1000;

const IGNORED_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.cache/**",
  "**/coverage/**",
  "**/__pycache__/**",
  "**/.venv/**",
];

export function startFileWatcher(
  windowId: number,
  projectPath: string,
  sender: WebContents,
): void {
  const key = `${windowId}:${projectPath}`;
  stopFileWatcherByKey(key);

  // depth: 3 matches FILE_TREE_MAX_DEPTH (2) + 1 to catch changes
  // one level below the visible tree. Deeper changes are picked up
  // when the user expands a subdirectory (lazy load).
  // Using Infinity here would create inotify watchers for every file
  // in the project, consuming GBs of memory.
  const watcher = chokidar.watch(projectPath, {
    ignoreInitial: true,
    persistent: true,
    depth: 3,
    ignored: IGNORED_PATTERNS,
  });

  const session: FileWatcherSession = {
    watcher,
    path: projectPath,
    debounceTimer: null,
    pendingPaths: new Set<string>(),
  };
  fileWatchers.set(key, session);

  const notify = (changedAbsolutePath: string) => {
    // Collect the changed path (relative to project root)
    if (changedAbsolutePath) {
      const relativePath = path.relative(projectPath, changedAbsolutePath);
      if (relativePath && !relativePath.startsWith("..")) {
        session.pendingPaths.add(relativePath);
        // Invalidate this specific file in the backend cache
        invalidateFileCache(changedAbsolutePath);
      }
    }

    if (session.debounceTimer) clearTimeout(session.debounceTimer);
    session.debounceTimer = setTimeout(() => {
      if (!sender.isDestroyed()) {
        const changedPaths = Array.from(session.pendingPaths);
        session.pendingPaths.clear();

        sender.send("files:changed", {
          path: projectPath,
          changedPaths,
        });

        // If no specific paths were tracked, invalidate the whole project cache
        if (changedPaths.length === 0) {
          invalidateProjectCache(projectPath);
        }
      } else {
        session.pendingPaths.clear();
      }
    }, DEBOUNCE_MS);
  };

  watcher.on("add", notify);
  watcher.on("change", notify);
  watcher.on("unlink", notify);
  watcher.on("addDir", notify);
  watcher.on("unlinkDir", notify);
}

function stopFileWatcherByKey(key: string): void {
  const session = fileWatchers.get(key);
  if (session) {
    if (session.debounceTimer) clearTimeout(session.debounceTimer);
    session.watcher
      .close()
      .catch((err) => console.warn("[file-watcher] Close failed:", err));
    fileWatchers.delete(key);
  }
}

export function stopFileWatcher(
  windowId: number,
  projectPath: string,
): void {
  const key = `${windowId}:${projectPath}`;
  stopFileWatcherByKey(key);
}

export function stopAllFileWatchers(): void {
  for (const [key, session] of fileWatchers) {
    if (session.debounceTimer) clearTimeout(session.debounceTimer);
    session.watcher
      .close()
      .catch((err) => console.warn("[file-watcher] Close failed:", err));
    fileWatchers.delete(key);
  }
}
