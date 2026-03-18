import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as pty from "node-pty";
import type { IPty } from "node-pty";
import type { WebContents } from "electron";
import { RingBuffer } from "./ring-buffer.js";

const PTY_BUFFER_MAX_BYTES = 512 * 1024; // 512KB

interface PtySession {
  process: IPty;
  tabId: string;
  windowId: number;
  projectPath: string;
  buffer: RingBuffer;
}

const sessions = new Map<string, PtySession>();

export interface SpawnOptions {
  tabId: string;
  path: string;
  sessionType?: string;
  windowLabel?: string;
  windowId: number;
  sender: WebContents;
  extraArgs?: string[];
  extraEnv?: Record<string, string>;
  resumeArgs?: string[];
}

const SAFE_ENV_KEYS = new Set([
  "PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "LC_CTYPE",
  "EDITOR", "VISUAL", "PAGER", "XDG_RUNTIME_DIR", "XDG_CONFIG_HOME",
  "XDG_DATA_HOME", "XDG_CACHE_HOME", "DISPLAY", "WAYLAND_DISPLAY",
  "DBUS_SESSION_BUS_ADDRESS", "SSH_AUTH_SOCK", "MISE_SHELL",
]);

if (process.platform === "win32") {
  for (const key of [
    "USERPROFILE", "APPDATA", "LOCALAPPDATA", "COMSPEC",
    "TEMP", "TMP", "PATHEXT", "USERNAME", "SystemRoot",
    "SystemDrive", "ProgramFiles", "ProgramFiles(x86)", "CommonProgramFiles",
  ]) {
    SAFE_ENV_KEYS.add(key);
  }
}

export function getSafeEnvKeys(): string[] {
  return Array.from(SAFE_ENV_KEYS);
}

function buildSafeEnv(extraEnv?: Record<string, string>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    if (process.env[key]) safe[key] = process.env[key]!;
  }
  return {
    ...safe,
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    ...(extraEnv ?? {}),
  };
}

export function spawnPty(opts: SpawnOptions): string {
  const { tabId, path: cwd, sessionType, windowId, sender, extraArgs, extraEnv, resumeArgs } = opts;

  let shell: string;
  let args: string[];

  if (sessionType === "terminal") {
    shell = getUserShell();
    // Terminal sessions do not support resume — resumeArgs intentionally excluded
    args = [...(extraArgs ?? [])];
  } else if (sessionType === "gh-copilot") {
    // gh-copilot is a standalone binary: `copilot [args...]`
    shell = "copilot";
    args = [...(extraArgs ?? []), ...(resumeArgs ?? [])];
  } else {
    shell = sessionType || "claude";
    args = [...(extraArgs ?? []), ...(resumeArgs ?? [])];
  }

  // Before creating new session, kill any existing one with same tabId (prevents process leaks)
  const existing = sessions.get(tabId);
  if (existing) {
    try {
      existing.process.kill();
    } catch {
      // already dead
    }
    sessions.delete(tabId);
  }

  const ptyProcess = pty.spawn(shell, args, {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd,
    env: buildSafeEnv(extraEnv),
  });

  const session: PtySession = {
    process: ptyProcess,
    tabId,
    windowId,
    projectPath: cwd,
    buffer: new RingBuffer(PTY_BUFFER_MAX_BYTES),
  };

  ptyProcess.onData((data: string) => {
    session.buffer.write(data); // accumulate in buffer
    if (!sender.isDestroyed()) {
      sender.send("pty:data", { tab_id: tabId, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    sessions.delete(tabId);
    if (!sender.isDestroyed()) {
      sender.send("pty:exit", { tab_id: tabId, code: exitCode });

      // Send session state change to frontend (for sidebar indicators)
      sender.send("pty:session-state-changed", {
        sessionId: tabId,
        projectPath: cwd,
        state: "exited",
        exitCode,
      });
    }

  });

  sessions.set(tabId, session);

  // After spawning, emit running state (only for AI CLI sessions, not plain terminals)
  if (sessionType !== "terminal" && !sender.isDestroyed()) {
    sender.send("pty:session-state-changed", {
      sessionId: tabId,
      projectPath: cwd,
      state: "running",
      exitCode: null,
    });
  }

  return tabId;
}

export function writePty(tabId: string, data: string): void {
  const session = sessions.get(tabId);
  if (session) {
    session.process.write(data);
  }
}

export function resizePty(tabId: string, rows: number, cols: number): void {
  const session = sessions.get(tabId);
  if (session) {
    session.process.resize(cols, rows);
  }
}

export function closePty(tabId: string): void {
  const session = sessions.get(tabId);
  if (session) {
    try {
      session.process.kill();
    } catch {
      // already dead
    }
    sessions.delete(tabId);
  }
}

export function closeAllPtysForWindow(windowId: number): void {
  for (const [tabId, session] of sessions) {
    if (session.windowId === windowId) {
      try {
        session.process.kill();
      } catch {
        // already dead
      }
      sessions.delete(tabId);
    }
  }
}

export function hasPty(tabId: string): boolean {
  return sessions.has(tabId);
}

export function getSessionBuffer(tabId: string): string | null {
  const session = sessions.get(tabId);
  return session?.buffer.read() ?? null;
}

export function getAllSessionBuffers(): Array<{ tabId: string; projectPath: string; content: string }> {
  const result: Array<{ tabId: string; projectPath: string; content: string }> = [];
  for (const [tabId, session] of sessions) {
    const content = session.buffer.read();
    if (content) {
      result.push({ tabId, projectPath: session.projectPath, content });
    }
  }
  return result;
}

function getUserShell(): string {
  if (process.platform === "win32") return "powershell.exe";
  return process.env.SHELL || "/bin/bash";
}

/**
 * Detects the bin directory for the active Node version managed by nvm, fnm, or similar.
 * When launched from a desktop entry (not a terminal), the shell profile that sets up
 * the version manager hasn't run, so these paths are missing from PATH.
 */
export function resolveNodeManagerPaths(): string[] {
  const home = os.homedir();
  const found: string[] = [];

  // nvm: ~/.nvm/versions/node/<version>/bin
  const nvmDir = process.env.NVM_DIR || path.join(home, ".nvm");
  try {
    const aliasDefault = path.join(nvmDir, "alias", "default");
    const defaultAlias = fs.readFileSync(aliasDefault, "utf-8").trim();
    // Resolve alias like "22" or "lts/*" to actual directory
    const versionsDir = path.join(nvmDir, "versions", "node");
    const versions = fs.readdirSync(versionsDir).sort();
    let match: string | undefined;
    if (defaultAlias.startsWith("lts/")) {
      // Just pick the latest version available
      match = versions[versions.length - 1];
    } else {
      // Match by prefix (e.g. "22" matches "v22.1.0")
      match = versions.reverse().find((v) => v.startsWith(`v${defaultAlias}`)) || versions[0];
    }
    if (match) {
      const binDir = path.join(versionsDir, match, "bin");
      if (fs.existsSync(binDir)) found.push(binDir);
    }
  } catch {
    // nvm not installed or no default alias — try current node's directory
    try {
      const versionsDir = path.join(nvmDir, "versions", "node");
      const versions = fs.readdirSync(versionsDir).sort();
      const latest = versions[versions.length - 1];
      if (latest) {
        const binDir = path.join(versionsDir, latest, "bin");
        if (fs.existsSync(binDir)) found.push(binDir);
      }
    } catch {
      // nvm not installed at all
    }
  }

  // fnm: ~/.local/share/fnm/aliases/default/bin
  const fnmDir = process.env.FNM_DIR || path.join(home, ".local", "share", "fnm");
  const fnmDefaultBin = path.join(fnmDir, "aliases", "default", "bin");
  if (fs.existsSync(fnmDefaultBin)) found.push(fnmDefaultBin);

  // volta: ~/.volta/bin (uses shims)
  const voltaBin = path.join(home, ".volta", "bin");
  if (fs.existsSync(voltaBin)) found.push(voltaBin);

  // asdf: ~/.asdf/shims
  const asdfShims = path.join(home, ".asdf", "shims");
  if (fs.existsSync(asdfShims)) found.push(asdfShims);

  // mise: ~/.local/share/mise/shims
  const miseDir = process.env.MISE_DATA_DIR || path.join(home, ".local", "share", "mise");
  const miseShims = path.join(miseDir, "shims");
  if (fs.existsSync(miseShims)) found.push(miseShims);

  return found;
}

export function resolveShellPath(): string {
  const extraPaths: string[] = [];

  if (process.platform === "win32") {
    extraPaths.push(
      path.join(os.homedir(), "AppData", "Roaming", "npm"),
      path.join(os.homedir(), "AppData", "Local", "Programs", "Python"),
      path.join(os.homedir(), ".local", "bin"),
    );
  } else {
    extraPaths.push(
      ...resolveNodeManagerPaths(),
      path.join(os.homedir(), ".local", "bin"),
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/usr/bin",
      "/bin",
    );
  }

  const currentPath = process.env.PATH || "";
  const pathParts = currentPath.split(path.delimiter);

  for (const extra of extraPaths) {
    if (!pathParts.includes(extra)) {
      pathParts.push(extra);
    }
  }

  return pathParts.join(path.delimiter);
}
