import * as os from "os";
import * as path from "path";
import * as pty from "node-pty";
import type { IPty } from "node-pty";
import type { WebContents } from "electron";

interface PtySession {
  process: IPty;
  tabId: string;
  windowId: number;
}

const sessions = new Map<string, PtySession>();

export interface SpawnOptions {
  tabId: string;
  path: string;
  sessionType?: string;
  windowLabel?: string;
  windowId: number;
  sender: WebContents;
}

export function spawnPty(opts: SpawnOptions): string {
  const { tabId, path: cwd, sessionType, windowId, sender } = opts;

  const shell = sessionType === "terminal" ? getUserShell() : (sessionType || "claude");
  const args: string[] = [];

  const ptyProcess = pty.spawn(shell, args, {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    },
  });

  ptyProcess.onData((data: string) => {
    if (!sender.isDestroyed()) {
      sender.send("pty:data", { tab_id: tabId, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    sessions.delete(tabId);
    if (!sender.isDestroyed()) {
      sender.send("pty:exit", { tab_id: tabId, code: exitCode });
    }
  });

  sessions.set(tabId, { process: ptyProcess, tabId, windowId });
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
