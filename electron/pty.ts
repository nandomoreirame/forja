import * as os from "os";
import * as path from "path";
import * as pty from "node-pty";
import type { IPty } from "node-pty";
import type { WebContents } from "electron";
import { RingBuffer } from "./ring-buffer.js";

const PTY_BUFFER_MAX_BYTES = 2 * 1024 * 1024; // 2MB

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
}

const SAFE_ENV_KEYS = new Set([
  "PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "LC_CTYPE",
  "EDITOR", "VISUAL", "PAGER", "XDG_RUNTIME_DIR", "XDG_CONFIG_HOME",
  "XDG_DATA_HOME", "XDG_CACHE_HOME", "DISPLAY", "WAYLAND_DISPLAY",
  "DBUS_SESSION_BUS_ADDRESS", "SSH_AUTH_SOCK", "MISE_SHELL",
]);

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
  const { tabId, path: cwd, sessionType, windowId, sender, extraArgs, extraEnv } = opts;

  let shell: string;
  let args: string[];

  if (sessionType === "terminal") {
    shell = getUserShell();
    args = [...(extraArgs ?? [])];
  } else if (sessionType === "gh-copilot") {
    // gh copilot is a gh extension: `gh copilot [args...]`
    shell = "gh";
    args = ["copilot", ...(extraArgs ?? [])];
  } else {
    shell = sessionType || "claude";
    args = [...(extraArgs ?? [])];
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

export function getSessionBuffer(tabId: string): string | null {
  const session = sessions.get(tabId);
  return session?.buffer.read() ?? null;
}

function getUserShell(): string {
  if (process.platform === "win32") return "powershell.exe";
  return process.env.SHELL || "/bin/bash";
}

export function resolveShellPath(): string {
  const extraPaths = [
    path.join(os.homedir(), ".local", "bin"),
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
  ];

  const currentPath = process.env.PATH || "";
  const pathParts = currentPath.split(path.delimiter);

  for (const extra of extraPaths) {
    if (!pathParts.includes(extra)) {
      pathParts.push(extra);
    }
  }

  return pathParts.join(path.delimiter);
}
