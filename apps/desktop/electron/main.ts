// CLI mode: if the binary is invoked with a known CLI command (e.g. `forja ping`),
// handle it via the Unix socket and exit before Electron/Chromium initializes.
import { tryCliMode } from "./cli-mode.js";
if (await tryCliMode()) {
  // CLI command was handled — process.exit() already called inside tryCliMode.
  // This line is unreachable but satisfies TypeScript control flow.
  process.exit(0);
}

// Ozone platform hint must be set before Electron/Chromium initializes.
// Covers all packaging formats (dev, .deb, AppImage).
if (process.platform === "linux" && !process.env.ELECTRON_OZONE_PLATFORM_HINT) {
  process.env.ELECTRON_OZONE_PLATFORM_HINT = "auto";
}

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  session,
  shell,
  webContents,
} from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath, pathToFileURL } from "url";
import { execFile, spawn } from "child_process";
import { assertPathWithinScope } from "./path-validation.js";
import { resolveImeConfig, remapDeadKeyResult } from "./ime-config.js";
import { readSettingsModeSync, resolveModeSyncFromHardware, getLiteModeConfig } from "./lite-mode.js";
import { detectEditor } from "./editor-detector.js";
import { getForjaConfigDir } from "./paths.js";
import { startExternalApiServer } from "./external-api.js";
import type { ExternalCommand } from "./external-api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PTY must be eager (resolveShellPath used at module scope)
import { resolveShellPath, spawnPty, writePty, resizePty, closePty, closePtyAndTmux, closeAllPtysForWindow, getSessionBuffer, hasPty, getAllSessionBuffers, reattachPty, getActiveSessions } from "./pty.js";
import { isUiSaveSuspended, suspendUiSaves, resumeUiSaves } from "./ui-save-gate.js";
import { attachWebviewKeyboardBridge } from "./webview-keyboard-bridge.js";
import { getCliSessions, getActiveSessionModel } from "./cli-sessions.js";
import { getSessionTelemetry } from "./session-telemetry.js";

// Type-only imports for signatures
import type { UiPreferences, ProjectUiState, WorkspaceProject } from "./config.js";
import { getQuickActions, saveQuickActions } from "./config.js";

// Track which BrowserWindow belongs to which workspace
const windowWorkspaceMap = new Map<number, string>();

// External API server instance (started in app.whenReady, cleaned up in window-all-closed)
let externalServer: import("net").Server | null = null;

// WebSocket bridge instance (started on-demand via IPC, cleaned up in window-all-closed)
let wsBridge: Awaited<ReturnType<typeof import("./ws-bridge.js")["createWsBridge"]>> | null = null;

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
const getPluginIpc = lazyImport(() => import("./plugins/plugin-ipc.js"));
const getBufferPersistence = lazyImport(() => import("./buffer-persistence.js"));
const getWsBridge = lazyImport(() => import("./ws-bridge.js"));
const getAuthToken = lazyImport(() => import("./auth-token.js"));

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

  // Linux GPU acceleration features (VAAPI)
  if (process.platform === "linux") {
    const isWayland = !!process.env.WAYLAND_DISPLAY;
    if (isWayland) {
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
    trafficLightPosition: { x: 13, y: 9 },
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

  // Alt key menu toggle is handled in the renderer (titlebar.tsx)
  // via document keydown/keyup listeners.

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

  // Cedilla fix: Chromium/Ozone composes dead_acute+c as ć instead of ç
  // on Linux (both X11 and Wayland). Intercept at the application level and remap.
  if (process.platform === "linux") {
    win.webContents.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown") return;
      const replacement = remapDeadKeyResult(input.key);
      if (replacement) {
        event.preventDefault();
        win.webContents.insertText(replacement);
      }
    });
  }

  // Notify renderer when window is resized (for titlebar maximize state)
  win.on("resize", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("window:resized");
    }
  });

  // Track workspace-to-window mapping
  if (workspaceId) {
    windowWorkspaceMap.set(win.id, workspaceId);
  }

  // When a workspace window gains focus, persist it as the active workspace
  // so the app reopens to the last used workspace on next launch.
  win.on("focus", async () => {
    const wsId = windowWorkspaceMap.get(win.id);
    if (wsId) {
      const config = await getConfig();
      config.setActiveWorkspace(wsId);
    }
  });

  win.on("closed", async () => {
    windowWorkspaceMap.delete(win.id);
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
// Also bridges app-level keyboard shortcuts from webview webContents so
// Ctrl+Tab, Ctrl+W, etc. still work when a plugin/browser pane has focus.
app.on("web-contents-created", (_event, contents) => {
  // Keyboard bridge: forward app shortcuts from webview to renderer via IPC
  if (contents.getType() === "webview") {
    attachWebviewKeyboardBridge(contents, (payload) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send("webview:shortcut-forwarded", payload);
        }
      }
    });

    // Native context menu for browser pane webviews
    contents.on("context-menu", (_e, params) => {
      const menuItems: Electron.MenuItemConstructorOptions[] = [];

      if (params.selectionText) {
        menuItems.push(
          { label: "Copy", role: "copy" },
          { type: "separator" },
        );
      }

      if (params.isEditable) {
        menuItems.push(
          { label: "Cut", role: "cut" },
          { label: "Copy", role: "copy" },
          { label: "Paste", role: "paste" },
          { type: "separator" },
          { label: "Select All", role: "selectAll" },
          { type: "separator" },
        );
      }

      if (params.linkURL) {
        menuItems.push(
          {
            label: "Open Link in New Tab",
            click: () => { shell.openExternal(params.linkURL); },
          },
          {
            label: "Copy Link Address",
            click: () => { clipboard.writeText(params.linkURL); },
          },
          { type: "separator" },
        );
      }

      if (params.srcURL && (params.mediaType === "image" || params.mediaType === "video")) {
        menuItems.push(
          {
            label: "Copy Image Address",
            click: () => { clipboard.writeText(params.srcURL); },
          },
          { type: "separator" },
        );
      }

      menuItems.push(
        { label: "Back", enabled: contents.canGoBack(), click: () => { contents.goBack(); } },
        { label: "Forward", enabled: contents.canGoForward(), click: () => { contents.goForward(); } },
        { label: "Reload", click: () => { contents.reload(); } },
      );

      if (menuItems.length > 0) {
        const menu = Menu.buildFromTemplate(menuItems);
        menu.popup({ window: BrowserWindow.getFocusedWindow() ?? undefined });
      }
    });
  }

  contents.on("will-attach-webview", (_e, webPreferences, params) => {
    // Allow plugin webviews to use the plugin preload script
    const isPluginWebview = (params as Record<string, unknown>).partition?.toString().startsWith("persist:plugin-");
    if (!isPluginWebview) {
      // Strip any preload scripts injected by the renderer — the webview must
      // not have access to Node.js or the contextBridge APIs.
      delete webPreferences.preload;
    }

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

  // Check if a project path was passed via CLI (e.g. `forja /path/to/project`)
  let cliProjectPath = process.argv.slice(1)
    .filter((a) => !a.startsWith("--") && !a.endsWith(".js") && !a.endsWith(".ts"))
    .find((a) => a.startsWith("/") || a.startsWith("~") || a.startsWith("./") || a.startsWith("../"));
  if (cliProjectPath) {
    if (cliProjectPath.startsWith("~")) {
      cliProjectPath = path.join(os.homedir(), cliProjectPath.slice(1));
    } else if (!path.isAbsolute(cliProjectPath)) {
      cliProjectPath = path.resolve(cliProjectPath);
    }
  }

  await createWindow(cliProjectPath || undefined);

  // Resolve tabId: accepts full ID ("main-xxx-tab-2") or just the number ("2")
  function resolveTabId(input: string): string | null {
    const sessions = getActiveSessions();
    if (!sessions.length) return null;
    // If it's a pure number, treat as 1-based index
    if (/^\d+$/.test(input)) {
      const idx = parseInt(input, 10) - 1;
      return sessions[idx]?.tabId ?? null;
    }
    // If it ends with a number, try matching by tab suffix
    const match = sessions.find((s) => s.tabId === input || s.tabId.endsWith(`-${input}`));
    if (match) return match.tabId;
    // Direct match
    return sessions.find((s) => s.tabId === input)?.tabId ?? null;
  }

  externalServer = startExternalApiServer(
    () => BrowserWindow.getFocusedWindow()?.webContents ?? null,
    async (cmd: ExternalCommand) => {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      if (!win) return { ok: false, error: "No Forja window open" };

      switch (cmd.type) {
        case "ping":
          return { ok: true, data: { version: app.getVersion() } };

        case "list-projects": {
          const projects = await win.webContents.executeJavaScript(
            `window.__forjaExternalGetProjects?.()`
          );
          return { ok: true, data: projects ?? [] };
        }

        case "open-project":
          win.webContents.send("external:command", cmd);
          win.focus();
          return { ok: true };

        case "notify":
          win.webContents.send("external:command", cmd);
          return { ok: true };

        case "screenshot":
          win.webContents.send("external:command", cmd);
          return { ok: true, data: { message: "Screenshot triggered" } };

        case "list-sessions": {
          const activeSessions = getActiveSessions();
          return { ok: true, data: activeSessions };
        }

        case "session-output": {
          const tabId = resolveTabId(cmd.tabId);
          if (!tabId) return { ok: false, error: `No session found for: ${cmd.tabId}` };
          const content = getSessionBuffer(tabId);
          if (content === null) {
            return { ok: false, error: `No active session for tabId: ${tabId}` };
          }
          return { ok: true, data: { tabId, content } };
        }

        case "session-input": {
          const tabId = resolveTabId(cmd.tabId);
          if (!tabId || !hasPty(tabId)) {
            return { ok: false, error: `No active session for: ${cmd.tabId}` };
          }
          // Split text and CR so CLIs that distinguish typed vs pasted input
          // (e.g. Codex bracketed-paste) handle the submit correctly.
          const submitChar = cmd.text.endsWith("\r") ? "\r" : "";
          const body = submitChar ? cmd.text.slice(0, -1) : cmd.text;
          if (body) writePty(tabId, body);
          if (submitChar) {
            await new Promise((r) => setTimeout(r, 50));
            writePty(tabId, submitChar);
          }
          return { ok: true };
        }

        case "subscribe":
          return { ok: false, error: "subscribe is only available via WebSocket" };

        case "new-session": {
          const validTypes = ["claude", "gemini", "codex", "gh-copilot", "cursor-agent", "terminal"];
          if (!validTypes.includes(cmd.sessionType)) {
            return { ok: false, error: `Invalid session type. Valid: ${validTypes.join(", ")}` };
          }
          // Delegate to frontend which handles tab creation + PTY spawn
          win.webContents.send("external:command", cmd);
          win.focus();
          return { ok: true, data: { sessionType: cmd.sessionType } };
        }

        case "switch-project": {
          // Get project list from frontend, switch by 1-based index
          const projects = await win.webContents.executeJavaScript(
            `window.__forjaExternalGetProjects?.()`
          ) as Array<{ path: string; name: string }> | null;
          if (!projects?.length) {
            return { ok: false, error: "No projects open" };
          }
          const idx = cmd.index - 1;
          if (idx < 0 || idx >= projects.length) {
            return { ok: false, error: `Invalid index ${cmd.index}. Range: 1-${projects.length}` };
          }
          const target = projects[idx];
          // Switch via the same mechanism as open-project
          win.webContents.send("external:command", { type: "open-project", projectPath: target.path });
          win.focus();
          // Wait a bit for switch to complete, then return sessions
          await new Promise((r) => setTimeout(r, 300));
          const sessions = getActiveSessions();
          return { ok: true, data: { project: target, sessions } };
        }

        default:
          return { ok: false, error: "Unknown command" };
      }
    }
  );

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

  // WebSocket Bridge remote server controls
  ipcMain.handle("ws-bridge:start", async () => {
    const authMod = await getAuthToken();
    const wsMod = await getWsBridge();

    // Generate a fresh token for this server session
    const token = authMod.generateToken();

    // Create and start the bridge (lazy, only created when needed)
    if (!wsBridge) {
      wsBridge = wsMod.createWsBridge();
    }
    await wsBridge.start();

    const status = wsBridge.getStatus();
    console.log(`[WS Bridge] Started on ws://${status.host}:${status.port} (token: ${token.slice(0, 8)}...)`);

    return { ok: true, data: { port: status.port, host: status.host, token } };
  });

  ipcMain.handle("ws-bridge:stop", async () => {
    if (wsBridge) {
      await wsBridge.stop();
      const authMod = await getAuthToken();
      authMod.clearToken();
      console.log("[WS Bridge] Stopped");
    }
    return { ok: true };
  });

  ipcMain.handle("ws-bridge:status", async () => {
    if (!wsBridge) {
      return { running: false, port: 9400, host: "0.0.0.0", clients: 0, token: "" };
    }
    return wsBridge.getStatus();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  externalServer?.close();

  if (wsBridge) {
    wsBridge.stop().catch(() => {});
    wsBridge = null;
  }

  // Save all PTY buffers to disk before quitting
  try {
    const bp = await getBufferPersistence();
    const buffers = getAllSessionBuffers();
    for (const { tabId, projectPath, content } of buffers) {
      bp.saveBuffer(projectPath, tabId, content);
    }
  } catch {
    // Non-fatal: buffer persistence failure should not prevent quit
  }

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

ipcMain.handle("update_workspace", async (_event, args: {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
}) => {
  const config = await getConfig();
  const updates: Parameters<typeof config.updateWorkspace>[1] = {};
  if (args.name !== undefined) updates.name = args.name;
  if (args.color !== undefined) updates.color = args.color as import("./config.js").WorkspaceColor;
  if (args.icon !== undefined) updates.icon = args.icon as import("./config.js").WorkspaceIcon;
  return config.updateWorkspace(args.id, updates);
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

// Workspace-scoped project operations
ipcMain.handle("get_workspace_projects", async (_event, args: { workspaceId: string }) => {
  const config = await getConfig();
  return config.getWorkspaceProjects(args.workspaceId);
});

ipcMain.handle("update_workspace_project", async (_event, args: {
  workspaceId: string;
  path: string;
  name?: string;
  icon_path?: string | null;
}) => {
  const config = await getConfig();
  config.updateWorkspaceProject(args.workspaceId, args.path, {
    name: args.name,
    icon_path: args.icon_path,
  });
});

ipcMain.handle("reorder_workspace_projects", async (_event, args: { workspaceId: string; paths: string[] }) => {
  const config = await getConfig();
  config.reorderWorkspaceProjects(args.workspaceId, args.paths);
});

ipcMain.handle("set_active_workspace", async (_event, args: { id: string | null }) => {
  const config = await getConfig();
  config.setActiveWorkspace(args.id);
});

ipcMain.handle("get_active_workspace", async () => {
  const config = await getConfig();
  return config.getActiveWorkspace();
});

// UI Preferences (workspace-scoped, with optional projectPath for local config)
ipcMain.handle("get_ui_preferences", async (_event, args?: { workspaceId?: string; projectPath?: string }) => {
  const config = await getConfig();
  return config.getUiPreferences(args?.workspaceId, args?.projectPath);
});

ipcMain.handle("save_ui_preferences", async (_event, args: Partial<UiPreferences> & { workspaceId?: string; projectPath?: string }) => {
  if (isUiSaveSuspended()) return;
  const { workspaceId, projectPath, ...prefs } = args;
  const config = await getConfig();
  config.saveUiPreferences(prefs, workspaceId, projectPath);
});

// Project UI State (workspace-scoped, per-project layout persistence)
ipcMain.handle("get_project_ui_state", async (_event, args: { workspaceId: string; path: string }) => {
  const config = await getConfig();
  return config.getProjectUiState(args.workspaceId, args.path);
});

ipcMain.handle("save_project_ui_state", async (_event, args: { workspaceId: string; path: string; state: Partial<ProjectUiState> }) => {
  if (isUiSaveSuspended()) return;
  const config = await getConfig();
  config.saveProjectUiState(args.workspaceId, args.path, args.state);
});

// CLI session discovery (dispatches to per-CLI session reader)
ipcMain.handle("get_cli_sessions", (_event, args: { cliId: string; projectPath: string; limit?: number }) => {
  return getCliSessions(args.cliId, args.projectPath, args.limit);
});

ipcMain.handle("get_session_model", (_event, args: { cliId: string; projectPath: string; sessionId?: string }) => {
  return getActiveSessionModel(args.cliId, args.projectPath, args.sessionId);
});

ipcMain.handle("get_session_telemetry", (_event, args: { cliId: string; projectPath: string; sessionId: string }) => {
  return getSessionTelemetry(args.cliId, args.projectPath, args.sessionId);
});

// Last active project path (workspace-scoped)
ipcMain.handle("set_last_active_project_path", async (_event, args: { workspaceId: string; projectPath: string }) => {
  const config = await getConfig();
  config.setLastActiveProjectPath(args.workspaceId, args.projectPath);
});

// Quick Actions persistence
ipcMain.handle("get_quick_actions", () => {
  return getQuickActions();
});

ipcMain.handle("save_quick_actions", (_event, { actions }: { actions: Array<{ actionId: string }> }) => {
  saveQuickActions(actions);
});

// Focus existing workspace window or open a new one
ipcMain.handle("focus_workspace_window", (_event, args: { workspaceId: string }) => {
  for (const [winId, wsId] of windowWorkspaceMap) {
    if (wsId === args.workspaceId) {
      const win = BrowserWindow.fromId(winId);
      if (win && !win.isDestroyed()) {
        win.focus();
        return true;
      }
      // Clean up stale entry
      windowWorkspaceMap.delete(winId);
    }
  }
  return false;
});

// Open workspace in a new window (checks for existing window first)
ipcMain.handle("open_workspace_in_new_window", async (_event, args: { workspaceId: string }) => {
  // Check if workspace already has an open window
  for (const [winId, wsId] of windowWorkspaceMap) {
    if (wsId === args.workspaceId) {
      const win = BrowserWindow.fromId(winId);
      if (win && !win.isDestroyed()) {
        win.focus();
        return;
      }
      windowWorkspaceMap.delete(winId);
    }
  }
  await createWindow(undefined, args.workspaceId);
});

// Check whether a workspace already has an open window.
ipcMain.handle("is_workspace_window_open", (_event, args: { workspaceId: string }) => {
  for (const [winId, wsId] of windowWorkspaceMap) {
    if (wsId === args.workspaceId) {
      const win = BrowserWindow.fromId(winId);
      if (win && !win.isDestroyed()) return true;
      windowWorkspaceMap.delete(winId);
    }
  }
  return false;
});

// Register the calling window's workspace in the dedup map.
// The primary window (no initialWorkspaceId) uses this to register itself
// so that open_workspace_in_new_window can focus it instead of duplicating.
ipcMain.handle("register_window_workspace", async (event, args: { workspaceId: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  // Remove any stale entry for this workspace first
  for (const [winId, wsId] of windowWorkspaceMap) {
    if (wsId === args.workspaceId && winId !== win.id) {
      const old = BrowserWindow.fromId(winId);
      if (!old || old.isDestroyed()) windowWorkspaceMap.delete(winId);
    }
  }
  windowWorkspaceMap.set(win.id, args.workspaceId);
});

// Create a new workspace and open it in a new window
ipcMain.handle("create_and_open_workspace", async () => {
  const config = await getConfig();
  const ws = config.createWorkspace("New Workspace");
  // Add ID prefix to the name for uniqueness
  const nameWithId = `New Workspace (${ws.id.slice(0, 7)})`;
  config.updateWorkspace(ws.id, { name: nameWithId });
  ws.name = nameWithId;
  await createWindow(undefined, ws.id);
  return ws;
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

ipcMain.handle("set_zoom_level", (event, args: { level: number }) => {
  const clamped = Math.min(Math.max(args.level, -5), 5);
  event.sender.setZoomLevel(clamped);
});

ipcMain.handle("zoom:in", (event) => {
  const current = event.sender.getZoomLevel();
  event.sender.setZoomLevel(Math.min(current + 1, 5));
});

ipcMain.handle("zoom:out", (event) => {
  const current = event.sender.getZoomLevel();
  event.sender.setZoomLevel(Math.max(current - 1, -5));
});

// PTY operations
ipcMain.handle("spawn_pty", async (event, args: { tabId: string; path: string; sessionType?: string; windowLabel?: string; resumeArgs?: string[] }) => {
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
    resumeArgs: args.resumeArgs,
  });
});

ipcMain.handle("write_pty", (_event, args: { tabId: string; data: string }) => {
  writePty(args.tabId, args.data);
});

ipcMain.handle("resize_pty", (_event, args: { tabId: string; rows: number; cols: number }) => {
  resizePty(args.tabId, args.rows, args.cols);
});

ipcMain.handle("close_pty", async (_event, args: { tabId: string; force?: boolean }) => {
  if (args.force) {
    await closePtyAndTmux(args.tabId);
  } else {
    closePty(args.tabId);
  }
});

ipcMain.handle("pty:get-buffer", (_event, args: { tabId: string }) => {
  return getSessionBuffer(args.tabId);
});

ipcMain.handle("pty:has-session", (_event, args: { tabId: string }) => {
  return hasPty(args.tabId);
});

ipcMain.handle("pty:get-orphaned-sessions", async () => {
  const tmux = await import("./tmux.js");
  const available = await tmux.isTmuxAvailable();
  if (!available) return [];

  const restore = await import("./tmux-restore.js");
  return restore.getOrphanedSessions();
});

ipcMain.handle("pty:get-pane-command", async (_event, args: {
  tmuxSessionName: string;
}) => {
  const { getTmuxPaneCommand, formatPaneCommandForDisplay } = await import("./tmux.js");
  const raw = await getTmuxPaneCommand(args.tmuxSessionName);
  if (!raw) return null;
  return formatPaneCommandForDisplay(raw);
});

ipcMain.handle("pty:reattach-tmux", async (event, args: {
  tabId: string;
  tmuxSessionName: string;
  projectPath: string;
  cols: number;
  rows: number;
}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error("No window found for sender");

  return reattachPty({
    tabId: args.tabId,
    tmuxSessionName: args.tmuxSessionName,
    windowId: win.id,
    projectPath: args.projectPath,
    sender: event.sender,
    cols: args.cols,
    rows: args.rows,
  });
});

ipcMain.handle("pty:get-buffer-length", (_event, args: { tabId: string }) => {
  const buffer = getSessionBuffer(args.tabId);
  return buffer?.length ?? 0;
});

ipcMain.handle(
  "pty:notify-session-finished",
  async (
    _event,
    args: {
      projectPath: string;
      sessionType: string;
      activeProjectPath: string | null;
      tabId?: string;
      bufferSnapshotLength?: number;
    },
  ) => {
    const { showSessionFinishedNotification, extractNotificationSummary, maybeNotifyDiscord } =
      await import("./pty-notifications.js");
    const { cleanPtyOutput } = await import("./discord-notifications.js");

    // Extract delta content (only new output from this response)
    let deltaContent: string | undefined;
    let summary: string | undefined;
    if (args.tabId) {
      const fullBuffer = getSessionBuffer(args.tabId);
      if (fullBuffer) {
        const offset = args.bufferSnapshotLength ?? 0;
        deltaContent = offset > 0 ? fullBuffer.slice(offset) : fullBuffer;
        summary = extractNotificationSummary(deltaContent);
      }
    }

    // Gate: only notify if the delta has meaningful content.
    // Minimum 20 chars prevents noise from /clear, cursor blinks,
    // status bar redraws, and other non-response PTY data.
    if (!summary || summary.trim().length < 20) return;

    // OS notification (may be suppressed if focused on same project)
    const mainWindow = BrowserWindow.getAllWindows()[0] ?? null;
    showSessionFinishedNotification({ ...args, summary }, mainWindow);

    // Discord webhook (ALWAYS sends, uses cleaned delta for rich summary)
    if (deltaContent) {
      const cleanedDelta = cleanPtyOutput(deltaContent);
      if (cleanedDelta.trim()) {
        maybeNotifyDiscord({
          projectPath: args.projectPath,
          sessionType: args.sessionType,
          summary: cleanedDelta,
        }).catch((err: unknown) => console.warn("[main] Discord notify failed:", err));
      }
    }
  },
);

// Buffer persistence for session resume
ipcMain.handle("pty:load-persisted-buffer", async (_event, args: { projectPath: string; tabId: string }) => {
  const bp = await getBufferPersistence();
  return bp.loadBuffer(args.projectPath, args.tabId);
});

ipcMain.handle("pty:delete-persisted-buffer", async (_event, args: { projectPath: string; tabId: string }) => {
  const bp = await getBufferPersistence();
  bp.deleteBuffer(args.projectPath, args.tabId);
});

ipcMain.handle("pty:clean-stale-buffers", async (_event, args: { projectPath: string; activeTabIds: string[] }) => {
  const bp = await getBufferPersistence();
  bp.cleanStaleBuffers(args.projectPath, args.activeTabIds);
});

// Host info (for session status bar)
ipcMain.handle("get_session_host_info", () => {
  return {
    hostname: os.hostname(),
    username: os.userInfo().username,
  };
});

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

ipcMain.handle(
  "copy_file_or_dir",
  async (
    _event,
    args: { projectPath: string; sourcePath: string; targetDir: string }
  ) => {
    const fileOps = await getFileOperations();
    const destPath = await fileOps.copyFileOrDir(args.projectPath, args.sourcePath, args.targetDir);
    return { success: true, destPath };
  }
);

ipcMain.handle(
  "move_file_or_dir",
  async (
    _event,
    args: { projectPath: string; sourcePath: string; targetDir: string }
  ) => {
    const fileOps = await getFileOperations();
    const destPath = await fileOps.moveFileOrDir(args.projectPath, args.sourcePath, args.targetDir);
    return { success: true, destPath };
  }
);

ipcMain.handle(
  "create_file",
  async (
    _event,
    args: { projectPath: string; filePath: string }
  ) => {
    const fileOps = await getFileOperations();
    await fileOps.createFile(args.projectPath, args.filePath);
    return { success: true };
  }
);

ipcMain.handle(
  "create_directory",
  async (
    _event,
    args: { projectPath: string; dirPath: string }
  ) => {
    const fileOps = await getFileOperations();
    await fileOps.createDirectory(args.projectPath, args.dirPath);
    return { success: true };
  }
);

ipcMain.handle(
  "paste_clipboard_image",
  async (_event, args: { targetDir: string; filename?: string }) => {
    const { saveClipboardImage } = await import("./clipboard.js");
    return saveClipboardImage(args.targetDir, args.filename);
  }
);

ipcMain.handle("reveal_in_finder", async (_event, args: { path: string }) => {
  shell.showItemInFolder(args.path);
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

ipcMain.handle("window:toggleFullScreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setFullScreen(!win.isFullScreen());
});

ipcMain.handle("window:reload", (event) => {
  event.sender.reload();
});

ipcMain.handle("window:toggleDevTools", (event) => {
  event.sender.toggleDevTools();
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

// Shell – open a local path in the native file explorer.
// We use spawn + detach instead of shell.openPath because the latter blocks
// the Electron main process event loop on Linux until the file manager exits.
ipcMain.handle("shell:openPath", (_event, args: { path: string }) => {
  if (process.platform === "win32") {
    const child = spawn("explorer.exe", [args.path], { detached: true, stdio: "ignore" });
    child.unref();
    return;
  }
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  const child = spawn(cmd, [args.path], { detached: true, stdio: "ignore" });
  child.unref();
});

// Shell – open a project directory in the user's preferred code editor.
ipcMain.handle(
  "shell:openInEditor",
  async (_event, args: { path: string }) => {
    const editor = await detectEditor();
    if (!editor) return;
    const child = spawn(editor, [args.path], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  },
);

// App info
ipcMain.handle("app:getName", () => app.getName());
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getElectronVersion", () => process.versions.electron);
ipcMain.handle("app:is_tiling_desktop", () => isTilingDesktopSession());
ipcMain.handle("app:isDev", () => isDev);
ipcMain.handle("app:getForjaConfigPath", () => getForjaConfigDir());

ipcMain.handle("app:clearCache", async () => {
  suspendUiSaves();
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    closeAllPtysForWindow(win.id);
  }
  const ses = session.defaultSession;
  await ses.clearStorageData();
  await ses.clearCache();
  const configMod = await getConfig();
  configMod.clearUiCache();
  if (win) {
    win.webContents.reload();
    const resume = () => { resumeUiSaves(); };
    win.webContents.once("did-finish-load", resume);
    setTimeout(() => {
      win.webContents.removeListener("did-finish-load", resume);
      resumeUiSaves();
    }, 10_000);
  } else {
    resumeUiSaves();
  }
});

ipcMain.handle("get_performance_mode", () => {
  const config = getLiteModeConfig(resolvedPerfMode);
  return {
    resolved: config.resolved,
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

// Open DevTools for a specific browser pane webview
ipcMain.handle("browser:open-devtools", (_event, args: { webContentsId: number }) => {
  const wc = webContents.fromId(args.webContentsId);
  if (!wc) throw new Error(`WebContents not found for id: ${args.webContentsId}`);
  wc.openDevTools();
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

// Plugin System
getPluginIpc().then(({ createPluginHandlers }) => {
  for (const [channel, handler] of createPluginHandlers()) {
    ipcMain.handle(channel, handler);
  }
}).catch((err) => console.error("[main] Failed to load plugin-ipc:", err));
