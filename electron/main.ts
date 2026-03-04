import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
  shell,
} from "electron";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { resolveShellPath, spawnPty, writePty, resizePty, closePty, closeAllPtysForWindow } from "./pty.js";
import { startWatcher, stopWatcher } from "./watcher.js";
import { startMetricsLoop, stopMetricsLoop } from "./metrics.js";
import { getRecentProjects, addRecentProject, getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace, addProjectToWorkspace, removeProjectFromWorkspace, setActiveWorkspace, getActiveWorkspace, getUiPreferences, saveUiPreferences, type UiPreferences } from "./config.js";
import { getGitInfo, getGitFileStatuses } from "./git-info.js";
import { readDirectoryTree } from "./file-tree.js";
import { readFile } from "./file-reader.js";
import { loadUserSettings, getUserSettingsPath, getCachedSettings, saveUserSettings, startSettingsWatcher, stopSettingsWatcher } from "./user-settings.js";

const isDev = !app.isPackaged;
const VITE_DEV_URL = "http://localhost:1420";

// Disable forced HiDPI scaling — use system's native scale factor
app.commandLine.appendSwitch("force-device-scale-factor", "1");

// Augment PATH for finding `claude` and other tools
process.env.PATH = resolveShellPath();

function createWindow(projectPath?: string, workspaceId?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, "..", "assets", "icons", "icon.png"),
    show: false,
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  // Notify renderer when window is resized (for titlebar maximize state)
  win.on("resize", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("window:resized");
    }
  });

  win.on("closed", () => {
    closeAllPtysForWindow(win.id);
    stopWatcher(win.id);
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

// CSP headers for production
app.whenReady().then(() => {
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';",
          ],
        },
      });
    });
  }

  loadUserSettings();

  createWindow();

  startMetricsLoop(() => {
    return BrowserWindow.getAllWindows().map((w) => w.webContents);
  });

  startSettingsWatcher(() => {
    return BrowserWindow.getAllWindows().map((w) => w.webContents);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopMetricsLoop();
  stopSettingsWatcher();
  if (process.platform !== "darwin") app.quit();
});

// ---- IPC Handlers ----

// Check if `claude` CLI is installed
ipcMain.handle("check_claude_installed", async () => {
  return new Promise<void>((resolve, reject) => {
    exec("claude --version", { timeout: 5000 }, (err) => {
      if (err) reject(new Error("claude CLI not found"));
      else resolve();
    });
  });
});

// Batch check which CLI binaries are installed
ipcMain.handle("detect_installed_clis", async (_event, args: { binaries: string[] }) => {
  const results: Record<string, boolean> = {};
  const checks = args.binaries.map((binary) =>
    new Promise<void>((resolve) => {
      exec(`which ${binary}`, { timeout: 3000 }, (err) => {
        results[binary] = !err;
        resolve();
      });
    })
  );
  await Promise.all(checks);
  return results;
});

// Recent projects
ipcMain.handle("get_recent_projects", () => {
  return getRecentProjects();
});

ipcMain.handle("add_recent_project", (_event, args: { path: string }) => {
  addRecentProject(args.path);
});

// Open project in a new window
ipcMain.handle("open_project_in_new_window", (_event, args: { path: string }) => {
  createWindow(args.path);
});

// Workspace CRUD
ipcMain.handle("get_workspaces", () => getWorkspaces());

ipcMain.handle("create_workspace", (_event, args: { name: string; initialProject?: string }) => {
  return createWorkspace(args.name, args.initialProject);
});

ipcMain.handle("update_workspace", (_event, args: { id: string; name: string }) => {
  return updateWorkspace(args.id, { name: args.name });
});

ipcMain.handle("delete_workspace", (_event, args: { id: string }) => {
  return deleteWorkspace(args.id);
});

ipcMain.handle("add_project_to_workspace", (_event, args: { workspaceId: string; projectPath: string }) => {
  return addProjectToWorkspace(args.workspaceId, args.projectPath);
});

ipcMain.handle("remove_project_from_workspace", (_event, args: { workspaceId: string; projectPath: string }) => {
  return removeProjectFromWorkspace(args.workspaceId, args.projectPath);
});

ipcMain.handle("set_active_workspace", (_event, args: { id: string | null }) => {
  setActiveWorkspace(args.id);
});

ipcMain.handle("get_active_workspace", () => {
  return getActiveWorkspace();
});

// UI Preferences
ipcMain.handle("get_ui_preferences", () => getUiPreferences());

ipcMain.handle("save_ui_preferences", (_event, args: Partial<UiPreferences>) => {
  saveUiPreferences(args);
});

// Open workspace in a new window
ipcMain.handle("open_workspace_in_new_window", (_event, args: { workspaceId: string }) => {
  createWindow(undefined, args.workspaceId);
});

// User settings
ipcMain.handle("get_user_settings", () => {
  return loadUserSettings();
});

ipcMain.handle("open_settings_file", () => {
  return shell.openPath(getUserSettingsPath());
});

ipcMain.handle("save_user_settings", (_event, args: { content: string }) => {
  return saveUserSettings(args.content);
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
ipcMain.handle("spawn_pty", (event, args: { tabId: string; path: string; sessionType?: string; windowLabel?: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error("No window found for sender");

  // Inject session settings from user config
  const sessionType = args.sessionType || "claude";
  const sessionConfig = getCachedSettings().sessions[sessionType];
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

// Git info
ipcMain.handle("get_git_info_command", (_event, args: { path: string }) => {
  return getGitInfo(args.path);
});

ipcMain.handle("get_git_file_statuses", (_event, args: { path: string }) => {
  return getGitFileStatuses(args.path);
});

// File watcher
ipcMain.handle("start_watcher", (event, args: { path: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  startWatcher(win.id, args.path, event.sender);
});

ipcMain.handle("stop_watcher", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  stopWatcher(win.id);
});

// File system
ipcMain.handle("read_directory_tree_command", (_event, args: { path: string; maxDepth?: number }) => {
  return readDirectoryTree(args.path, args.maxDepth ?? 3);
});

ipcMain.handle("read_file_command", (_event, args: { path: string; maxSizeMb?: number }) => {
  return readFile(args.path, args.maxSizeMb ?? 10);
});

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
ipcMain.handle("dialog:open", async (event, opts: { directory?: boolean; multiple?: boolean; title?: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const properties: Electron.OpenDialogOptions["properties"] = [];

  if (opts.directory) properties.push("openDirectory");
  else properties.push("openFile");
  if (opts.multiple) properties.push("multiSelections");

  const result = await dialog.showOpenDialog(win!, {
    title: opts.title,
    properties,
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return opts.multiple ? result.filePaths : result.filePaths[0];
});

// Shell
ipcMain.handle("shell:openExternal", (_event, url: string) => {
  return shell.openExternal(url);
});

// App info
ipcMain.handle("app:getName", () => app.getName());
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getElectronVersion", () => process.versions.electron);
