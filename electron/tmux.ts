import { execFile } from "child_process";

let cachedAvailable: boolean | null = null;

export async function isTmuxAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable;

  return new Promise((resolve) => {
    execFile("tmux", ["-V"], { timeout: 3000 }, (err) => {
      cachedAvailable = !err;
      resolve(!err);
    });
  });
}

export async function getTmuxVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("tmux", ["-V"], { timeout: 3000 }, (err, stdout) => {
      if (err) return resolve(null);
      // "tmux 3.4\n" -> "3.4"
      const match = stdout.trim().match(/^tmux\s+(.+)$/);
      resolve(match ? match[1] : null);
    });
  });
}

/** Reset cached availability (for testing). */
export function resetTmuxCache(): void {
  cachedAvailable = null;
}

const FORJA_SESSION_PREFIX = "forja-";

export interface TmuxSessionOptions {
  sessionName: string;
  cwd: string;
  shell: string;
  cols: number;
  rows: number;
  env?: Record<string, string>;
}

export function tmuxSessionName(tabId: string): string {
  // Tmux session names cannot contain dots or colons
  return `${FORJA_SESSION_PREFIX}${tabId.replace(/[.:]/g, "-")}`;
}

export function tabIdFromTmuxSession(sessionName: string): string | null {
  if (!sessionName.startsWith(FORJA_SESSION_PREFIX)) return null;
  return sessionName.slice(FORJA_SESSION_PREFIX.length);
}

export async function createTmuxSession(opts: TmuxSessionOptions): Promise<void> {
  const { sessionName, cwd, shell, cols, rows, env } = opts;

  const args = [
    "new-session", "-d",
    "-s", sessionName,
    "-x", String(cols),
    "-y", String(rows),
    shell,
  ];

  return new Promise((resolve, reject) => {
    execFile("tmux", args, { cwd, timeout: 5000, env }, (err) => {
      if (err) {
        // "duplicate session" means the session survived from a previous run — reuse it
        if (err.message?.includes("duplicate session")) {
          return resolve();
        }
        return reject(err);
      }
      // Hide tmux status bar — Forja provides its own UI chrome
      execFile("tmux", ["set-option", "-t", sessionName, "status", "off"], { timeout: 3000 }, () => {
        resolve(); // Ignore errors — status bar is cosmetic
      });
    });
  });
}

export async function listForjaSessions(): Promise<string[]> {
  return new Promise((resolve) => {
    execFile(
      "tmux",
      ["list-sessions", "-F", "#{session_name}"],
      { timeout: 3000 },
      (err, stdout) => {
        if (err) return resolve([]);
        const sessions = stdout
          .trim()
          .split("\n")
          .filter((name) => name.startsWith(FORJA_SESSION_PREFIX));
        resolve(sessions);
      },
    );
  });
}

export async function killTmuxSession(sessionName: string): Promise<void> {
  return new Promise((resolve) => {
    execFile("tmux", ["kill-session", "-t", sessionName], { timeout: 3000 }, () => {
      resolve(); // Ignore errors (session may already be dead)
    });
  });
}

export async function resizeTmuxSession(
  sessionName: string,
  cols: number,
  rows: number,
): Promise<void> {
  return new Promise((resolve) => {
    execFile(
      "tmux",
      ["resize-window", "-t", sessionName, "-x", String(cols), "-y", String(rows)],
      { timeout: 3000 },
      () => resolve(),
    );
  });
}

export async function getTmuxSessionCwd(sessionName: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "tmux",
      ["display-message", "-t", sessionName, "-p", "#{pane_current_path}"],
      { timeout: 3000 },
      (err, stdout) => {
        if (err) return resolve(null);
        const cwd = stdout.trim();
        resolve(cwd || null);
      },
    );
  });
}

export async function killAllForjaSessions(): Promise<void> {
  const sessions = await listForjaSessions();
  await Promise.all(sessions.map((name) => killTmuxSession(name)));
}

export async function getTmuxPaneCommand(sessionName: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "tmux",
      ["display-message", "-t", sessionName, "-p", "#{pane_current_command}"],
      { timeout: 3000 },
      (err, stdout) => {
        if (err) return resolve(null);
        const command = stdout.trim();
        resolve(command || null);
      },
    );
  });
}

/** Shell process names that indicate an idle terminal (no foreground app running). */
const SHELL_NAMES = new Set(["zsh", "bash", "sh", "fish", "ksh", "tcsh", "csh", "dash"]);

/**
 * Maps a raw tmux pane command to a user-friendly display name.
 * Returns null when the shell is idle (pane command is a shell).
 * Returns the command name as-is for all other processes.
 */
export function formatPaneCommandForDisplay(command: string): string | null {
  if (!command) return null;
  if (SHELL_NAMES.has(command.toLowerCase())) return null;

  // Normalize known aliases
  const normalized = command.toLowerCase();
  if (normalized === "python3" || normalized === "python2") return "python";

  return command;
}
