import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  session,
  shell,
  webContents,
} from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath, pathToFileURL } from "url";
import { execFile } from "child_process";
import { assertPathWithinScope } from "./path-validation.js";
import { resolveImeConfig } from "./ime-config.js";
import { readSettingsModeSync, resolveModeSyncFromHardware, getLiteModeConfig } from "./lite-mode.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PTY must be eager (resolveShellPath used at module scope)
import { resolveShellPath, spawnPty, writePty, resizePty, closePty, closeAllPtysForWindow, getSessionBuffer } from "./pty.js";

// Type-only imports for signatures
import type { UiPreferences } from "./config.js";

// Lazy module loaders (cached after first import)
const lazyImport = <T>(factory: () => Promise<T>) => {
  let mod: T | null = null;
  return async () => mod ?? (mod = await factory());
};

const getCliDetector = lazyImport(() => import("./cli-detector.js"));
const getWatcher = lazyImport(() => import("./watcher.js"));
const getFileWatcher = lazyImport(() => import("./file-watcher.js"));
const getAppMetrics = lazyImport(() => import("./app-metrics.js"));
const getConfig = lazyImport(() => import("./config.js"));
const getGitInfo = lazyImport(() => import("./git-info.js"));
const getFileTree = lazyImport(() => import("./file-tree.js"));
const getFileReader = lazyImport(() => import("./file-reader.js"));
const getFileWriter = lazyImport(() => import("./file-writer.js"));
const getFileCache = lazyImport(() => import("./file-cache.js"));
const getFileOperations = lazyImport(() => import("./file-operations.js"));
const getUserSettings = lazyImport(() => import("./user-settings.js"));
const getProjectIcon = lazyImport(() => import("./project-icon.js"));
const getContextIpc = lazyImport(() => import("./context/context-ipc.js"));
const getAgentChatIpc = lazyImport(() => import("./agent-chat-ipc.js"));

const isDev = !app.isPackaged;
const VITE_DEV_URL = "http://localhost:1420";

function isTilingDesktopSession(): boolean {
  const desktop = (
    process.env.XDG_CURRENT_DESKTOP ||
    process.env.DESKTOP_SESSION ||
    process.env.XDG_SESSION_DESKTOP ||
    ""
  ).toLowerCase();
  return ["hyprland", "sway", "niri", "i3", "river"].some((wm) =>
    desktop.includes(wm),
  );
}

// Let the system handle DPI scaling natively (supports fractional scaling on Wayland)

// Resolve performance mode synchronously (needed before app.ready for GPU switches)
const perfSettingsMode = readSettingsModeSync();
const resolvedPerfMode = resolveModeSyncFromHardware(perfSettingsMode);

// GPU Acceleration (skip in lite mode)
if (resolvedPerfMode !== "lite") {
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-oop-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");
  app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");

  // Linux-specific GPU
  if (process.platform === "linux") {
    const isWayland = !!process.env.WAYLAND_DISPLAY;
    if (isWayland) {
      app.commandLine.appendSwitch("ozone-platform", "wayland");
      app.commandLine.appendSwitch(
        "enable-features",
        "VaapiVideoDecoder,VaapiVideoEncoder,CanvasOopRasterization",
      );
    } else {
      app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder");
    }
  }
}

// IME / dead-key support (cedilla on pt_BR, Wayland IME)
const imeConfig = resolveImeConfig(process.platform, process.env);
console.log("[IME] platform=%s LANG=%s composeContent=%s", process.platform, process.env.LANG, !!imeConfig.composeContent);
for (const sw of imeConfig.switches) {
  app.commandLine.appendSwitch(...sw);
}
if (imeConfig.composeContent) {
  const runtimeDir = process.env.XDG_RUNTIME_DIR || os.tmpdir();
  const composePath = path.join(runtimeDir, "forja-compose");
  try {
    fs.writeFileSync(composePath, imeConfig.composeContent + "\n", "utf-8");
    imeConfig.env.XCOMPOSEFILE = composePath;
    console.log("[IME] Wrote compose file to %s", composePath);
  } catch (err) {
    console.error("[IME] Failed to write compose file:", err);
  }
}
Object.assign(process.env, imeConfig.env);
console.log("[IME] env XCOMPOSEFILE=%s GTK_IM_MODULE=%s", process.env.XCOMPOSEFILE, process.env.GTK_IM_MODULE);

// V8 GC: smaller semi-space in lite mode
const semiSpaceSize = resolvedPerfMode === "lite" ? 32 : 64;
app.commandLine.appendSwitch("js-flags", `--max-semi-space-size=${semiSpaceSize}`);

// Augment PATH for finding `claude` and other tools
process.env.PATH = resolveShellPath();

async function createWindow(projectPath?: string, workspaceId?: string): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 13, y: 13 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
    icon: path.join(__dirname, "..", "assets", "icons", "icon.png"),
    show: false,
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  // Block reload shortcuts (Ctrl+R, Cmd+R, F5, Ctrl+Shift+R) in production builds
  if (!isDev) {
    win.webContents.on("before-input-event", (_event, input) => {
      const isReload =
        (input.key.toLowerCase() === "r" && (input.control || input.meta)) ||
        input.key === "F5";
      if (isReload) {
        _event.preventDefault();
      }
    });
  }

  // Notify renderer when window is resized (for titlebar maximize state)
  win.on("resize", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("window:resized");
    }
  });

  win.on("closed", async () => {
    closeAllPtysForWindow(win.id);
    const watcher = await getWatcher();
    watcher.stopWatcher(win.id);
    const fileWatcher = await getFileWatcher();
    fileWatcher.stopAllFileWatchers();
  });

  const params = new URLSearchParams();
  if (projectPath) params.set("path", projectPath);
  if (workspaceId) params.set("workspace", workspaceId);
  const queryString = params.toString() ? `?${params.toString()}` : "";

  if (isDev) {
    win.loadURL(`${VITE_DEV_URL}${queryString}`);
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    win.loadURL(
      pathToFileURL(indexPath).toString() + queryString
    );
  }

  return win;
}

// Guard webviews: enforce security settings before they are attached.
// This prevents a compromised renderer from spawning webviews with elevated
// privileges (nodeIntegration, custom preloads, dangerous partition names).
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (_e, webPreferences, _params) => {
    // Strip any preload scripts injected by the renderer — the webview must
    // not have access to Node.js or the contextBridge APIs.
    delete webPreferences.preload;

    // Enforce hard security boundaries.
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;

    // Allow sandbox to remain as-is (Electron's default for webviews is false;
    // enabling it can break some content, but disabling nodeIntegration above
    // is the critical protection).
  });
});

// CSP headers for production
app.whenReady().then(async () => {
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';",
          ],
        },
      });
    });
  }

  const userSettings = await getUserSettings();
  await userSettings.loadUserSettings();

  await createWindow();

  userSettings.startSettingsWatcher(() => {
    return BrowserWindow.getAllWindows().map((w) => w.webContents);
  });

  // Register IPC handlers for demand-driven metrics subscription.
  // The loop starts only when the frontend registers a subscriber,
  // avoiding wasted CPU cycles when no component displays metrics.
  ipcMain.handle("register_metrics_subscriber", async () => {
    const appMetricsMod = await getAppMetrics();
    const liteModeConfig = getLiteModeConfig(resolvedPerfMode);
    appMetricsMod.registerMetricsSubscriber(
      () => BrowserWindow.getAllWindows().map((w) => w.webContents),
      liteModeConfig.metricsIntervalMs,
    );
  });

  ipcMain.handle("unregister_metrics_subscriber", async () => {
    const appMetricsMod = await getAppMetrics();
    appMetricsMod.unregisterMetricsSubscriber();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  const appMetricsMod = await getAppMetrics();
  // Force-stop the loop as a safety net when all windows close,
  // regardless of subscriber count (e.g., renderer crash without cleanup).
  appMetricsMod.stopAppMetricsLoop();
  const userSettings = await getUserSettings();
  userSettings.stopSettingsWatcher();
  if (process.platform !== "darwin") app.quit();
});

// ---- IPC Handlers ----

// Check if `claude` CLI is installed
ipcMain.handle("check_claude_installed", async () => {
  return new Promise<void>((resolve, reject) => {
    execFile("claude", ["--version"], { timeout: 5000 }, (err) => {
      if (err) reject(new Error("claude CLI not found"));
      else resolve();
    });
  });
});

// Batch check which CLI IDs are installed (handles special cases like gh-copilot)
ipcMain.handle("detect_installed_clis", async (_event, args: { cliIds: string[] }) => {
  const cliDetector = await getCliDetector();
  return cliDetector.detectInstalledClis(args.cliIds);
});

// Project icon detection
ipcMain.handle("detect_project_icon", async (_event, args: { path: string }) => {
  const projectIcon = await getProjectIcon();
  return projectIcon.detectProjectIcon(args.path);
});

// Read a specific icon file as a base64 data URL
ipcMain.handle("read_icon_as_data_url", async (_event, args: { path: string }) => {
  const projectIcon = await getProjectIcon();
  return projectIcon.readIconAsDataUrl(args.path);
});

// Recent projects
ipcMain.handle("get_recent_projects", async () => {
  const config = await getConfig();
  return config.getRecentProjects();
});

ipcMain.handle("add_recent_project", async (_event, args: { path: string }) => {
  const config = await getConfig();
  config.addRecentProject(args.path);
});

ipcMain.handle("remove_recent_project", async (_event, args: { path: string }) => {
  const config = await getConfig();
  config.removeRecentProject(args.path);
});

ipcMain.handle("reorder_recent_projects", async (_event, args: { paths: string[] }) => {
  const config = await getConfig();
  config.reorderRecentProjects(args.paths);
});

ipcMain.handle("update_recent_project", async (_event, args: {
  path: string;
  name?: string;
  icon_path?: string | null;
}) => {
  const config = await getConfig();
  config.updateRecentProject(args.path, {
    name: args.name,
    icon_path: args.icon_path,
  });
});

// Open project in a new window
ipcMain.handle("open_project_in_new_window", async (_event, args: { path: string }) => {
  await createWindow(args.path);
});

// Workspace CRUD
ipcMain.handle("get_workspaces", async () => {
  const config = await getConfig();
  return config.getWorkspaces();
});

ipcMain.handle("create_workspace", async (_event, args: { name: string; initialProject?: string }) => {
  const config = await getConfig();
  return config.createWorkspace(args.name, args.initialProject);
});

ipcMain.handle("update_workspace", async (_event, args: { id: string; name: string }) => {
  const config = await getConfig();
  return config.updateWorkspace(args.id, { name: args.name });
});

ipcMain.handle("delete_workspace", async (_event, args: { id: string }) => {
  const config = await getConfig();
  return config.deleteWorkspace(args.id);
});

ipcMain.handle("add_project_to_workspace", async (_event, args: { workspaceId: string; projectPath: string }) => {
  const config = await getConfig();
  return config.addProjectToWorkspace(args.workspaceId, args.projectPath);
});

ipcMain.handle("remove_project_from_workspace", async (_event, args: { workspaceId: string; projectPath: string }) => {
  const config = await getConfig();
  return config.removeProjectFromWorkspace(args.workspaceId, args.projectPath);
});

ipcMain.handle("set_active_workspace", async (_event, args: { id: string | null }) => {
  const config = await getConfig();
  config.setActiveWorkspace(args.id);
});

ipcMain.handle("get_active_workspace", async () => {
  const config = await getConfig();
  return config.getActiveWorkspace();
});

// UI Preferences
ipcMain.handle("get_ui_preferences", async () => {
  const config = await getConfig();
  return config.getUiPreferences();
});

ipcMain.handle("save_ui_preferences", async (_event, args: Partial<UiPreferences>) => {
  const config = await getConfig();
  config.saveUiPreferences(args);
});

// Open workspace in a new window
ipcMain.handle("open_workspace_in_new_window", async (_event, args: { workspaceId: string }) => {
  await createWindow(undefined, args.workspaceId);
});

// User settings
ipcMain.handle("get_user_settings", async () => {
  const userSettings = await getUserSettings();
  return userSettings.loadUserSettings();
});

ipcMain.handle("get_settings_path", async () => {
  const userSettings = await getUserSettings();
  return userSettings.getUserSettingsPath();
});

ipcMain.handle("open_settings_file", async () => {
  const userSettings = await getUserSettings();
  return shell.openPath(userSettings.getUserSettingsPath());
});

ipcMain.handle("save_user_settings", async (_event, args: { content: string }) => {
  const userSettings = await getUserSettings();
  return userSettings.saveUserSettings(args.content);
});

ipcMain.handle("set_window_opacity", (event, args: { opacity: number }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const clamped = Math.min(Math.max(args.opacity, 0.3), 1.0);
  win.setOpacity(clamped);
});

ipcMain.handle("set_zoom_level", (event, args: { level: number }) => {
  const clamped = Math.min(Math.max(args.level, -5), 5);
  event.sender.setZoomLevel(clamped);
});

// PTY operations
ipcMain.handle("spawn_pty", async (event, args: { tabId: string; path: string; sessionType?: string; windowLabel?: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error("No window found for sender");

  // Inject session settings from user config
  const userSettings = await getUserSettings();
  const sessionType = args.sessionType || "claude";
  const sessionConfig = userSettings.getCachedSettings().sessions[sessionType];
  const extraArgs = sessionConfig?.args;
  const extraEnv = sessionConfig?.env;

  return spawnPty({
    tabId: args.tabId,
    path: args.path,
    sessionType: args.sessionType,
    windowLabel: args.windowLabel,
    windowId: win.id,
    sender: event.sender,
    extraArgs,
    extraEnv,
  });
});

ipcMain.handle("write_pty", (_event, args: { tabId: string; data: string }) => {
  writePty(args.tabId, args.data);
});

ipcMain.handle("resize_pty", (_event, args: { tabId: string; rows: number; cols: number }) => {
  resizePty(args.tabId, args.rows, args.cols);
});

ipcMain.handle("close_pty", (_event, args: { tabId: string }) => {
  closePty(args.tabId);
});

ipcMain.handle("pty:get-buffer", (_event, args: { tabId: string }) => {
  return getSessionBuffer(args.tabId);
});

ipcMain.handle(
  "pty:notify-session-finished",
  async (
    _event,
    args: { projectPath: string; sessionType: string; activeProjectPath: string | null },
  ) => {
    const { showSessionFinishedNotification } = await import("./pty-notifications.js");
    const mainWindow = BrowserWindow.getAllWindows()[0] ?? null;
    showSessionFinishedNotification(args, mainWindow);
  },
);

// Git info
ipcMain.handle("get_git_info_command", async (_event, args: { path: string }) => {
  const gitInfo = await getGitInfo();
  return gitInfo.getGitInfo(args.path);
});

ipcMain.handle("get_git_file_statuses", async (_event, args: { path: string }) => {
  const gitInfo = await getGitInfo();
  return gitInfo.getGitFileStatuses(args.path);
});

ipcMain.handle("get_git_changed_files", async (_event, args: { path: string }) => {
  const gitInfo = await getGitInfo();
  return gitInfo.getGitChangedFiles(args.path);
});

ipcMain.handle(
  "get_git_file_diff",
  async (
    _event,
    args: {
      path: string;
      relativePath: string;
      stage?: "combined" | "staged" | "unstaged";
      maxBytes?: number;
    },
  ) => {
    const gitInfo = await getGitInfo();
    return gitInfo.getGitFileDiff(args.path, args.relativePath, {
      stage: args.stage,
      maxBytes: args.maxBytes,
    });
  },
);

ipcMain.handle(
  "get_git_file_content_at_head",
  async (_event, args: { path: string; relativePath: string }) => {
    const gitInfo = await getGitInfo();
    return gitInfo.getFileContentAtHead(args.path, args.relativePath);
  }
);

// File watcher
ipcMain.handle("start_watcher", async (event, args: { path: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const watcher = await getWatcher();
  watcher.startWatcher(win.id, args.path, event.sender);
});

ipcMain.handle("stop_watcher", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const watcher = await getWatcher();
  watcher.stopWatcher(win.id);
});

// File system watcher (project directory changes)
ipcMain.handle("start_file_watcher", async (event, args: { path: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const fileWatcher = await getFileWatcher();
  const liteModeConfig = getLiteModeConfig(resolvedPerfMode);
  fileWatcher.startFileWatcher(win.id, args.path, event.sender, {
    depth: liteModeConfig.fileWatcherDepth,
  });
});

ipcMain.handle("stop_file_watcher", async (event, args: { path: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const fileWatcher = await getFileWatcher();
  fileWatcher.stopFileWatcher(win.id, args.path);
});

// File system
ipcMain.handle("read_directory_tree_command", async (_event, args: { path: string; maxDepth?: number }) => {
  const fileTree = await getFileTree();
  return fileTree.readDirectoryTree(args.path, args.maxDepth ?? 3);
});

ipcMain.handle("read_file_command", async (_event, args: { path: string; projectPath?: string; maxSizeMb?: number; skipCache?: boolean }) => {
  if (args.projectPath) {
    assertPathWithinScope(args.projectPath, args.path);
  }
  const fileCacheMod = await getFileCache();
  if (!args.skipCache) {
    const cached = fileCacheMod.getFileFromCache(args.path);
    if (cached) {
      return { path: args.path, content: cached.content, size: cached.size };
    }
  }
  const fileReader = await getFileReader();
  const result = await fileReader.readFile(args.path, args.maxSizeMb ?? 10);
  if (!result.encoding) {
    fileCacheMod.putFileInCache(args.path, result.content);
  }
  return result;
});

ipcMain.handle("write_file", async (_event, args: { path: string; content: string }) => {
  const fileWriter = await getFileWriter();
  await fileWriter.writeFile(args.path, args.content);
  const fileCacheMod = await getFileCache();
  fileCacheMod.invalidateFileCache(args.path);
  return { success: true };
});

// File operations: rename and delete
ipcMain.handle(
  "rename_file_or_dir",
  async (
    _event,
    args: { projectPath: string; oldPath: string; newPath: string }
  ) => {
    const fileOps = await getFileOperations();
    await fileOps.renameFileOrDir(args.projectPath, args.oldPath, args.newPath);
    return { success: true };
  }
);

ipcMain.handle(
  "delete_file_or_dir",
  async (
    _event,
    args: { projectPath: string; targetPath: string }
  ) => {
    const fileOps = await getFileOperations();
    await fileOps.deleteFileOrDir(args.projectPath, args.targetPath);
    return { success: true };
  }
);

// Window controls
ipcMain.handle("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.handle("window:maximize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.maximize();
});

ipcMain.handle("window:unmaximize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.unmaximize();
});

ipcMain.handle("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("window:isMaximized", (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

ipcMain.handle("window:getLabel", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? String(win.id) : "main";
});

// Dialog
ipcMain.handle("dialog:open", async (event, opts: { directory?: boolean; multiple?: boolean; title?: string; filters?: { name: string; extensions: string[] }[] }) => {
  const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const properties: Electron.OpenDialogOptions["properties"] = [];

  if (opts.directory) properties.push("openDirectory");
  else properties.push("openFile");
  if (opts.multiple) properties.push("multiSelections");

  const result = await dialog.showOpenDialog(win!, {
    title: opts.title,
    properties,
    filters: opts.filters,
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return opts.multiple ? result.filePaths : result.filePaths[0];
});

// Shell – only allow http(s) URLs to prevent javascript:/file: scheme attacks
ipcMain.handle("shell:openExternal", (_event, url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Blocked URL scheme: ${parsed.protocol}`);
  }
  return shell.openExternal(url);
});

// App info
ipcMain.handle("app:getName", () => app.getName());
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getElectronVersion", () => process.versions.electron);
ipcMain.handle("app:is_tiling_desktop", () => isTilingDesktopSession());
ipcMain.handle("app:isDev", () => isDev);
ipcMain.handle("app:getForjaConfigPath", () =>
  path.join(os.homedir(), ".config", "forja")
);

ipcMain.handle("get_performance_mode", () => {
  const config = getLiteModeConfig(resolvedPerfMode);
  return {
    resolved: config.resolved,
    tabHibernation: config.tabHibernation,
    tabHibernationTimeoutMs: config.tabHibernationTimeoutMs,
  };
});

// Browser screenshot to clipboard
ipcMain.handle("browser:screenshot", async (_event, args: { webContentsId: number }) => {
  const wc = webContents.fromId(args.webContentsId);
  if (!wc) throw new Error(`WebContents not found for id: ${args.webContentsId}`);
  const image = await wc.capturePage();
  clipboard.writeImage(image);
  return { success: true };
});

// Context Hub
getContextIpc().then(({ createContextHandlers }) => {
  for (const [channel, handler] of createContextHandlers()) {
    ipcMain.handle(channel, handler);
  }
}).catch((err) => console.error("[main] Failed to load context-ipc:", err));

// Agent Chat
getAgentChatIpc().then(({ createChatHandlers }) => {
  for (const [channel, handler] of createChatHandlers()) {
    ipcMain.handle(channel, handler);
  }
}).catch((err) => console.error("[main] Failed to load agent-chat-ipc:", err));
