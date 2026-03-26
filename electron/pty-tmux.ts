import * as pty from "node-pty";
import type { IPty } from "node-pty";
import { createTmuxSession, type TmuxSessionOptions } from "./tmux.js";

export interface TmuxPtyResult {
  process: IPty;
  sessionName: string;
}

/**
 * Creates a new tmux session and spawns a node-pty process attached to it.
 * The node-pty process runs `tmux attach -t <session>`, which connects
 * xterm.js to the tmux session's PTY. When Forja closes, the node-pty
 * process dies but the tmux session (and its shell/processes) survive.
 */
export async function spawnTmuxPty(
  opts: TmuxSessionOptions,
): Promise<TmuxPtyResult> {
  // Step 1: Create the detached tmux session
  await createTmuxSession(opts);

  // Step 2: Attach to it via node-pty
  return reattachTmuxPty({
    sessionName: opts.sessionName,
    cols: opts.cols,
    rows: opts.rows,
    env: opts.env,
  });
}

/**
 * Reattaches to an existing tmux session via node-pty.
 * Used on app restart to reconnect to orphaned tmux sessions.
 */
export function reattachTmuxPty(opts: {
  sessionName: string;
  cols: number;
  rows: number;
  env?: Record<string, string>;
}): TmuxPtyResult {
  const { sessionName, cols, rows, env } = opts;

  const process = pty.spawn(
    "tmux",
    ["attach-session", "-t", sessionName],
    {
      name: "xterm-256color",
      cols,
      rows,
      env: {
        ...filterEnv(),
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        ...(env ?? {}),
      },
    },
  );

  return { process, sessionName };
}

function filterEnv(): Record<string, string> {
  // Minimal env for the tmux attach process itself.
  // The actual shell env is managed by tmux's session.
  const safe: Record<string, string> = {};
  for (const key of ["PATH", "HOME", "USER", "LANG", "DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR"]) {
    if (process.env[key]) safe[key] = process.env[key]!;
  }
  return safe;
}
