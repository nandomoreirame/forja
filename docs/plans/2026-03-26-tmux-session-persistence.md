# Terminal Session Persistence via tmux

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep terminal PTY processes alive across Forja app restarts by using tmux as an intermediary session manager, so running processes (servers, btop, etc.) survive close/reopen cycles and terminal scrollback is fully preserved.

**Architecture:** Instead of spawning shells directly via node-pty, Forja spawns shells inside named tmux sessions. On app close, tmux sessions persist. On reopen, Forja detects orphaned tmux sessions and reattaches. A fallback to direct PTY spawning is used when tmux is not available. AI CLI sessions (claude, gemini, etc.) continue using direct PTY since they have their own resume mechanism.

**Tech Stack:** node-pty, tmux (system dependency), child_process (for tmux commands), Electron IPC

**Scope:** This feature applies ONLY to `sessionType === "terminal"` tabs. AI CLI sessions already have `--resume` and don't benefit from tmux wrapping.

---

## Task 1: Create tmux detection utility

**Files:**
- Create: `electron/tmux.ts`
- Test: `electron/__tests__/tmux.test.ts`

**Step 1: Write the failing test**

```typescript
// electron/__tests__/tmux.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as childProcess from "child_process";

vi.mock("child_process");

describe("tmux", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("isTmuxAvailable", () => {
    it("returns true when tmux is installed", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(null, "tmux 3.4\n", "");
          return {} as any;
        },
      );

      const { isTmuxAvailable } = await import("../tmux.js");
      const result = await isTmuxAvailable();
      expect(result).toBe(true);
    });

    it("returns false when tmux is not installed", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(new Error("not found"), "", "");
          return {} as any;
        },
      );

      const { isTmuxAvailable } = await import("../tmux.js");
      const result = await isTmuxAvailable();
      expect(result).toBe(false);
    });
  });

  describe("getTmuxVersion", () => {
    it("parses tmux version string", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(null, "tmux 3.4\n", "");
          return {} as any;
        },
      );

      const { getTmuxVersion } = await import("../tmux.js");
      const version = await getTmuxVersion();
      expect(version).toBe("3.4");
    });

    it("returns null when tmux is not installed", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(new Error("not found"), "", "");
          return {} as any;
        },
      );

      const { getTmuxVersion } = await import("../tmux.js");
      const version = await getTmuxVersion();
      expect(version).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/tmux.test.ts -v`
Expected: FAIL — `../tmux.js` does not exist

**Step 3: Write minimal implementation**

```typescript
// electron/tmux.ts
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/tmux.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): add tmux detection utility
```

---

## Task 2: Add tmux session lifecycle management (create, attach, detach, kill, list)

**Files:**
- Modify: `electron/tmux.ts`
- Modify: `electron/__tests__/tmux.test.ts`

**Step 1: Write the failing tests**

Add to `electron/__tests__/tmux.test.ts`:

```typescript
describe("tmux session management", () => {
  describe("createTmuxSession", () => {
    it("creates a named tmux session with the correct shell and cwd", async () => {
      const mockExecFile = vi.mocked(childProcess.execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
        if (cb) cb(null, "", "");
        return {} as any;
      });

      const { createTmuxSession } = await import("../tmux.js");
      await createTmuxSession({
        sessionName: "forja-tab-1",
        cwd: "/home/user/project",
        shell: "/bin/zsh",
        cols: 120,
        rows: 40,
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        "tmux",
        expect.arrayContaining(["new-session", "-d", "-s", "forja-tab-1"]),
        expect.objectContaining({ cwd: "/home/user/project" }),
        expect.any(Function),
      );
    });
  });

  describe("listForjaSessions", () => {
    it("returns only forja-prefixed sessions", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, args, _opts, cb: any) => {
          if (args && args[0] === "list-sessions") {
            cb(null, "forja-tab-1: 1 windows\nother-session: 1 windows\nforja-tab-2: 1 windows\n", "");
          } else {
            cb(null, "", "");
          }
          return {} as any;
        },
      );

      const { listForjaSessions } = await import("../tmux.js");
      const sessions = await listForjaSessions();
      expect(sessions).toEqual(["forja-tab-1", "forja-tab-2"]);
    });

    it("returns empty array when no tmux server is running", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          cb(new Error("no server running"), "", "");
          return {} as any;
        },
      );

      const { listForjaSessions } = await import("../tmux.js");
      const sessions = await listForjaSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe("killTmuxSession", () => {
    it("kills a specific tmux session by name", async () => {
      const mockExecFile = vi.mocked(childProcess.execFile);
      mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
        cb(null, "", "");
        return {} as any;
      });

      const { killTmuxSession } = await import("../tmux.js");
      await killTmuxSession("forja-tab-1");

      expect(mockExecFile).toHaveBeenCalledWith(
        "tmux",
        ["kill-session", "-t", "forja-tab-1"],
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe("getTmuxSessionCwd", () => {
    it("returns the working directory of a tmux session", async () => {
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, args, _opts, cb: any) => {
          if (args && args[0] === "display-message") {
            cb(null, "/home/user/project\n", "");
          } else {
            cb(null, "", "");
          }
          return {} as any;
        },
      );

      const { getTmuxSessionCwd } = await import("../tmux.js");
      const cwd = await getTmuxSessionCwd("forja-tab-1");
      expect(cwd).toBe("/home/user/project");
    });
  });
});
```

**Step 2: Run test to verify they fail**

Run: `pnpm test electron/__tests__/tmux.test.ts -v`
Expected: FAIL — functions not exported

**Step 3: Write minimal implementation**

Add to `electron/tmux.ts`:

```typescript
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
      if (err) return reject(err);
      resolve();
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
    // Resize the tmux client to match xterm dimensions
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
  await Promise.all(sessions.map(killTmuxSession));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/tmux.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): add tmux session lifecycle management
```

---

## Task 3: Create tmux PTY adapter that wraps node-pty around tmux attach

**Files:**
- Create: `electron/pty-tmux.ts`
- Test: `electron/__tests__/pty-tmux.test.ts`

**Step 1: Write the failing test**

```typescript
// electron/__tests__/pty-tmux.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as childProcess from "child_process";
import * as ptyModule from "node-pty";

vi.mock("child_process");
vi.mock("node-pty");

describe("pty-tmux", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe("spawnTmuxPty", () => {
    it("creates a tmux session then spawns node-pty attached to it", async () => {
      // Mock tmux session creation
      vi.mocked(childProcess.execFile).mockImplementation(
        (_cmd, _args, _opts, cb: any) => {
          if (cb) cb(null, "", "");
          return {} as any;
        },
      );

      // Mock node-pty spawn
      const mockPty = {
        onData: vi.fn(),
        onExit: vi.fn(),
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
        pid: 1234,
      };
      vi.mocked(ptyModule.spawn).mockReturnValue(mockPty as any);

      const { spawnTmuxPty } = await import("../pty-tmux.js");
      const result = await spawnTmuxPty({
        sessionName: "forja-tab-1",
        cwd: "/home/user/project",
        shell: "/bin/zsh",
        cols: 120,
        rows: 40,
      });

      expect(result.process).toBe(mockPty);
      expect(ptyModule.spawn).toHaveBeenCalledWith(
        "tmux",
        expect.arrayContaining(["attach-session", "-t", "forja-tab-1"]),
        expect.objectContaining({ cols: 120, rows: 40 }),
      );
    });
  });

  describe("reattachTmuxPty", () => {
    it("attaches to an existing tmux session without creating a new one", async () => {
      const mockPty = {
        onData: vi.fn(),
        onExit: vi.fn(),
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
        pid: 5678,
      };
      vi.mocked(ptyModule.spawn).mockReturnValue(mockPty as any);

      const { reattachTmuxPty } = await import("../pty-tmux.js");
      const result = await reattachTmuxPty({
        sessionName: "forja-tab-1",
        cols: 120,
        rows: 40,
      });

      expect(result.process).toBe(mockPty);
      expect(ptyModule.spawn).toHaveBeenCalledWith(
        "tmux",
        expect.arrayContaining(["attach-session", "-t", "forja-tab-1"]),
        expect.objectContaining({ cols: 120, rows: 40 }),
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/pty-tmux.test.ts -v`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// electron/pty-tmux.ts
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/pty-tmux.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): add tmux PTY adapter for session persistence
```

---

## Task 4: Add `persistentPty` setting to user settings

**Files:**
- Modify: `electron/user-settings.ts` (add `terminal.persistSessions` boolean, default `true`)
- Modify: `electron/__tests__/user-settings.test.ts`

**Step 1: Write the failing test**

Add a test that verifies the new setting exists and defaults to `true`:

```typescript
it("defaults terminal.persistSessions to true", () => {
  const settings = getDefaultSettings();
  expect(settings.terminal.persistSessions).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/user-settings.test.ts -v`
Expected: FAIL — `terminal` property doesn't exist or `persistSessions` is undefined

**Step 3: Add the setting to the defaults**

In `electron/user-settings.ts`, add to the `UserSettings` type and defaults:

```typescript
terminal: {
  persistSessions: boolean;
};
```

Default value: `{ persistSessions: true }`

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/user-settings.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): add terminal.persistSessions user setting
```

---

## Task 5: Integrate tmux backend into pty.ts spawn flow

This is the core task. Modify `spawnPty` so that when `sessionType === "terminal"` and tmux is available and `persistSessions` is enabled, it spawns via tmux instead of directly.

**Files:**
- Modify: `electron/pty.ts`
- Modify: `electron/__tests__/pty.test.ts`

**Step 1: Write the failing test**

```typescript
describe("spawnPty with tmux", () => {
  it("spawns terminal sessions via tmux when available and enabled", async () => {
    // Mock tmux as available
    vi.doMock("../tmux.js", () => ({
      isTmuxAvailable: vi.fn().mockResolvedValue(true),
      tmuxSessionName: vi.fn((id: string) => `forja-${id}`),
    }));
    vi.doMock("../pty-tmux.js", () => ({
      spawnTmuxPty: vi.fn().mockResolvedValue({
        process: mockPtyProcess,
        sessionName: "forja-tab-1",
      }),
    }));

    // ... spawn with sessionType: "terminal"
    // Assert spawnTmuxPty was called instead of pty.spawn
  });

  it("falls back to direct pty when tmux is not available", async () => {
    vi.doMock("../tmux.js", () => ({
      isTmuxAvailable: vi.fn().mockResolvedValue(false),
    }));

    // ... spawn with sessionType: "terminal"
    // Assert pty.spawn was called directly
  });

  it("uses direct pty for AI CLI sessions even when tmux is available", async () => {
    // ... spawn with sessionType: "claude"
    // Assert pty.spawn was called directly (not tmux)
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/pty.test.ts -v`
Expected: FAIL

**Step 3: Modify spawnPty implementation**

Key changes to `electron/pty.ts`:

1. Add a `tmuxSessionName` field to `PtySession` interface (nullable)
2. In `spawnPty()`, when `sessionType === "terminal"`:
   - Check `isTmuxAvailable()` and user setting
   - If both true: call `spawnTmuxPty()` instead of `pty.spawn()`
   - Store `tmuxSessionName` in the session entry
3. In `closePty()`, when session has `tmuxSessionName`:
   - Kill the node-pty attach process (disconnects from tmux)
   - Do NOT kill the tmux session (it stays alive)
4. Add new `closePtyAndTmux()` for explicit tab close:
   - Kill both the node-pty process AND the tmux session
5. In `closeAllPtysForWindow()`:
   - Only detach (kill node-pty), don't kill tmux sessions

```typescript
// Modified PtySession interface
interface PtySession {
  process: IPty;
  tabId: string;
  windowId: number;
  projectPath: string;
  buffer: RingBuffer;
  tmuxSessionName: string | null; // null = direct PTY
}

// New export for explicit close (user closes tab)
export async function closePtyAndTmux(tabId: string): Promise<void> {
  const session = sessions.get(tabId);
  if (!session) return;

  try {
    session.process.kill();
  } catch { /* already dead */ }

  // Also kill the tmux session if this is a tmux-backed PTY
  if (session.tmuxSessionName) {
    const { killTmuxSession } = await import("./tmux.js");
    await killTmuxSession(session.tmuxSessionName);
  }

  sessions.delete(tabId);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/pty.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): integrate tmux backend into PTY spawn flow
```

---

## Task 6: Add orphan session detection and reattach on app startup

**Files:**
- Create: `electron/tmux-restore.ts`
- Test: `electron/__tests__/tmux-restore.test.ts`

**Step 1: Write the failing test**

```typescript
// electron/__tests__/tmux-restore.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../tmux.js");

describe("tmux-restore", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe("getOrphanedSessions", () => {
    it("returns tmux sessions that match saved tab state", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue([
        "forja-main-abc-tab-1",
        "forja-main-abc-tab-2",
        "forja-main-abc-tab-3",
      ]);
      vi.mocked(tmux.getTmuxSessionCwd).mockResolvedValue("/home/user/project");

      const { getOrphanedSessions } = await import("../tmux-restore.js");
      const orphans = await getOrphanedSessions();

      expect(orphans).toHaveLength(3);
      expect(orphans[0]).toEqual({
        sessionName: "forja-main-abc-tab-1",
        cwd: "/home/user/project",
      });
    });

    it("returns empty array when no forja sessions exist", async () => {
      const tmux = await import("../tmux.js");
      vi.mocked(tmux.listForjaSessions).mockResolvedValue([]);

      const { getOrphanedSessions } = await import("../tmux-restore.js");
      const orphans = await getOrphanedSessions();
      expect(orphans).toEqual([]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/tmux-restore.test.ts -v`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// electron/tmux-restore.ts
import { listForjaSessions, getTmuxSessionCwd, tabIdFromTmuxSession } from "./tmux.js";

export interface OrphanedSession {
  sessionName: string;
  cwd: string | null;
  tabId: string | null;
}

/**
 * Discovers tmux sessions created by Forja that are still running
 * but have no connected Forja app instance.
 */
export async function getOrphanedSessions(): Promise<OrphanedSession[]> {
  const sessionNames = await listForjaSessions();
  if (sessionNames.length === 0) return [];

  const results = await Promise.all(
    sessionNames.map(async (sessionName) => ({
      sessionName,
      cwd: await getTmuxSessionCwd(sessionName),
      tabId: tabIdFromTmuxSession(sessionName),
    })),
  );

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test electron/__tests__/tmux-restore.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): add orphaned tmux session detection for restore
```

---

## Task 7: Add IPC handler for orphan detection and reattach

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/pty.ts` (add `reattachPty` function)

**Step 1: Write the failing test**

Add to existing PTY tests:

```typescript
describe("reattachPty", () => {
  it("attaches to existing tmux session and registers in session map", async () => {
    // ... mock reattachTmuxPty
    // Assert session is registered and IPC events are wired
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test electron/__tests__/pty.test.ts -v`
Expected: FAIL

**Step 3: Implementation**

Add to `electron/pty.ts`:

```typescript
export async function reattachPty(opts: {
  tabId: string;
  tmuxSessionName: string;
  windowId: number;
  projectPath: string;
  sender: WebContents;
  cols: number;
  rows: number;
}): Promise<string> {
  const { tabId, tmuxSessionName, windowId, projectPath, sender, cols, rows } = opts;

  // Kill any existing session for this tab
  const existing = sessions.get(tabId);
  if (existing) {
    try { existing.process.kill(); } catch { /* already dead */ }
    sessions.delete(tabId);
  }

  const { reattachTmuxPty } = await import("./pty-tmux.js");
  const { process: ptyProcess } = reattachTmuxPty({
    sessionName: tmuxSessionName,
    cols,
    rows,
  });

  const session: PtySession = {
    process: ptyProcess,
    tabId,
    windowId,
    projectPath,
    buffer: new RingBuffer(PTY_BUFFER_MAX_BYTES),
    tmuxSessionName,
  };

  ptyProcess.onData((data: string) => {
    session.buffer.write(data);
    if (!sender.isDestroyed()) {
      sender.send("pty:data", { tab_id: tabId, data });
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    sessions.delete(tabId);
    if (!sender.isDestroyed()) {
      sender.send("pty:exit", { tab_id: tabId, code: exitCode });
      sender.send("pty:session-state-changed", {
        sessionId: tabId,
        projectPath,
        state: "exited",
        exitCode,
      });
    }
  });

  sessions.set(tabId, session);
  return tabId;
}
```

Add IPC handlers in `electron/main.ts`:

```typescript
ipcMain.handle("pty:get-orphaned-sessions", async () => {
  const tmux = await import("./tmux.js");
  const available = await tmux.isTmuxAvailable();
  if (!available) return [];

  const restore = await import("./tmux-restore.js");
  return restore.getOrphanedSessions();
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
```

**Step 4: Run tests**

Run: `pnpm test electron/__tests__/pty.test.ts -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): add IPC handlers for tmux session reattach
```

---

## Task 8: Update close_pty IPC to distinguish detach vs kill

**Files:**
- Modify: `electron/main.ts`

**Step 1: Write the failing test**

```typescript
describe("close_pty IPC handler", () => {
  it("kills tmux session when force=true", async () => {
    // ... mock closePtyAndTmux
    // Assert tmux session is killed
  });

  it("only detaches from tmux when force=false (default)", async () => {
    // ... mock closePty
    // Assert tmux session survives
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implementation**

Modify the `close_pty` handler:

```typescript
ipcMain.handle("close_pty", async (_event, args: { tabId: string; force?: boolean }) => {
  if (args.force) {
    await closePtyAndTmux(args.tabId);
  } else {
    closePty(args.tabId);
  }
});
```

Update the frontend `use-pty.ts` hook to pass `force: true` when the user explicitly closes a tab (Tab X button):

```typescript
// In use-pty.ts close function
const close = useCallback(async (force = false) => {
  await invoke("close_pty", { tabId, force });
}, [tabId]);
```

**Step 4: Run tests**

Run: `pnpm test -v`
Expected: PASS

**Step 5: Commit**

```
feat(electron): distinguish detach vs kill for tmux-backed PTY close
```

---

## Task 9: Modify shutdown flow to detach instead of kill for tmux sessions

**Files:**
- Modify: `electron/main.ts` (line 212-214, line 178-189)
- Modify: `electron/pty.ts`

**Step 1: Write the failing test**

```typescript
describe("closeAllPtysForWindow", () => {
  it("only kills node-pty attach process, not tmux session, for tmux-backed PTYs", () => {
    // Assert: ptyProcess.kill() is called
    // Assert: killTmuxSession is NOT called
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implementation**

`closeAllPtysForWindow` already only calls `process.kill()` which kills the `tmux attach` node-pty process. The tmux session survives. No changes needed to the core logic.

However, ensure the `window-all-closed` handler saves buffer state for tmux sessions too:

```typescript
app.on("window-all-closed", async () => {
  // Save all PTY buffers to disk before quitting (applies to both tmux and direct PTY)
  try {
    const bp = await getBufferPersistence();
    const buffers = getAllSessionBuffers();
    for (const { tabId, projectPath, content } of buffers) {
      bp.saveBuffer(projectPath, tabId, content);
    }
  } catch {
    // Non-fatal
  }
  // ... rest of shutdown
});
```

**Step 4: Run tests**

Run: `pnpm test -v`
Expected: PASS

**Step 5: Commit**

```
refactor(electron): preserve tmux sessions on window close
```

---

## Task 10: Frontend — restore tmux sessions on app startup

**Files:**
- Modify: `frontend/components/terminal-session.tsx`
- Modify: `frontend/stores/terminal-tabs.ts` (add `tmuxSessionName` to `TerminalTab`)

**Step 1: Write the failing test**

```typescript
describe("TerminalTab tmux metadata", () => {
  it("serializes tmuxSessionName for persistence", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "terminal");
    store.setTmuxSessionName("tab-1", "forja-tab-1");

    const serialized = store.serializeTabsForSave("/project");
    expect(serialized.tabs[0].tmuxSessionName).toBe("forja-tab-1");
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implementation**

Add to `TerminalTab` interface:

```typescript
export interface TerminalTab {
  // ... existing fields
  /** Tmux session name for persistent terminal sessions */
  tmuxSessionName?: string;
}
```

Add to `TerminalTabsState`:

```typescript
setTmuxSessionName: (tabId: string, sessionName: string) => void;
```

Update `serializeTabsForSave` to include `tmuxSessionName`.

In `terminal-session.tsx`, modify the spawn flow:

```typescript
// In spawnWithResume:
// For terminal sessions, check if we have a tmux session to reattach
const tab = useTerminalTabsStore.getState().tabs?.find(t => t.id === tabId);

if (sessionType === "terminal" && tab?.tmuxSessionName) {
  // Reattach to existing tmux session
  await invoke("pty:reattach-tmux", {
    tabId,
    tmuxSessionName: tab.tmuxSessionName,
    projectPath: path,
    cols,
    rows,
  });
} else {
  // Normal spawn (direct PTY or new tmux session)
  await spawn(path, sessionType, resumeArgs);
}
```

**Step 4: Run tests**

Run: `pnpm test -v`
Expected: PASS

**Step 5: Commit**

```
feat(frontend): support tmux session restore on app startup
```

---

## Task 11: Store tmux session name after spawn in frontend

**Files:**
- Modify: `electron/pty.ts` (return tmuxSessionName in spawn response)
- Modify: `frontend/hooks/use-pty.ts`
- Modify: `frontend/components/terminal-session.tsx`

**Step 1: Write the failing test**

```typescript
describe("spawn response includes tmux metadata", () => {
  it("returns tmuxSessionName when spawned via tmux", async () => {
    // Mock spawn to return { tabId, tmuxSessionName }
    const result = await invoke("spawn_pty", { ... });
    expect(result.tmuxSessionName).toBe("forja-tab-1");
  });
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implementation**

Modify `spawnPty` to return an object instead of just `tabId`:

```typescript
export interface SpawnResult {
  tabId: string;
  tmuxSessionName: string | null;
}

export function spawnPty(opts: SpawnOptions): SpawnResult {
  // ... existing logic
  return { tabId, tmuxSessionName: session.tmuxSessionName };
}
```

In `terminal-session.tsx`, after spawn:

```typescript
const result = await spawn(path, sessionType, resumeArgs);
if (result?.tmuxSessionName) {
  useTerminalTabsStore.getState().setTmuxSessionName(tabId, result.tmuxSessionName);
}
```

**Step 4: Run tests**

Run: `pnpm test -v`
Expected: PASS

**Step 5: Commit**

```
feat: propagate tmux session name from spawn to frontend state
```

---

## Task 12: Add tmux status indicator to session status bar

**Files:**
- Modify: `frontend/components/session-status-bar.tsx`
- Modify: `frontend/components/__tests__/session-status-bar.test.tsx`

**Step 1: Write the failing test**

```typescript
it("shows tmux indicator for tmux-backed terminal sessions", async () => {
  // Setup tab with tmuxSessionName
  useTerminalTabsStore.getState().addTab("tab-1", "/project", "terminal");
  useTerminalTabsStore.getState().setTmuxSessionName("tab-1", "forja-tab-1");

  render(<SessionStatusBar tabId="tab-1" path="/project" sessionType="terminal" />);

  expect(screen.getByText(/tmux/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

**Step 3: Implementation**

In the status bar, when the tab has a `tmuxSessionName`, show a small `[tmux]` badge:

```tsx
// In the terminal status bar section
const tab = useTerminalTabsStore((s) => s.tabs.find((t) => t.id === tabId));
const isTmux = !!tab?.tmuxSessionName;

// Render:
{isTmux && (
  <span className="text-ctp-green text-[10px] font-medium uppercase">tmux</span>
)}
```

**Step 4: Run tests**

Run: `pnpm test frontend/components/__tests__/session-status-bar.test.tsx -v`
Expected: PASS

**Step 5: Commit**

```
feat(frontend): show tmux indicator in session status bar
```

---

## Task 13: Handle explicit tab close to kill tmux session

**Files:**
- Modify: `frontend/components/terminal-session.tsx`
- Modify: `frontend/hooks/use-pty.ts`

**Step 1: Write the failing test**

```typescript
describe("tab close behavior", () => {
  it("passes force=true to close_pty when user explicitly closes tab", () => {
    // Verify that removeTab triggers close with force=true
  });
});
```

**Step 2: Implementation**

In `terminal-session.tsx` cleanup:

```typescript
if (!useTerminalTabsStore.getState().hasTab(tabId)) {
  // Tab truly removed — force-kill PTY and tmux session
  close(true); // force=true kills tmux session
  terminal.dispose();
  terminalCache.dispose(tabId);
}
```

**Step 3: Run tests**

Run: `pnpm test -v`
Expected: PASS

**Step 4: Commit**

```
feat(frontend): force-kill tmux session on explicit tab close
```

---

## Task 14: Add settings UI toggle for session persistence

**Files:**
- Modify the settings dialog component to include a toggle for `terminal.persistSessions`

**Step 1: Write the failing test**

```typescript
it("renders terminal session persistence toggle", () => {
  render(<SettingsDialog />);
  expect(screen.getByLabelText(/persist terminal sessions/i)).toBeInTheDocument();
});
```

**Step 2: Implementation**

Add a toggle in the Terminal section of settings:

```tsx
<SettingRow
  label="Persist terminal sessions"
  description="Keep terminal processes alive when closing Forja (requires tmux)"
>
  <Switch
    checked={settings.terminal.persistSessions}
    onCheckedChange={(checked) => updateSetting("terminal.persistSessions", checked)}
  />
</SettingRow>
```

**Step 3: Run tests**

Run: `pnpm test -v`
Expected: PASS

**Step 4: Commit**

```
feat(frontend): add settings toggle for terminal session persistence
```

---

## Task 15: Cleanup stale tmux sessions on startup

**Files:**
- Modify: `electron/tmux-restore.ts`
- Modify: `electron/main.ts`

**Step 1: Write the failing test**

```typescript
describe("cleanupStaleSessions", () => {
  it("kills tmux sessions that have no matching saved tab state", async () => {
    // Orphaned tmux sessions that the user never reopened
    // Should be cleaned up after a configurable timeout (e.g., 24h)
  });
});
```

**Step 2: Implementation**

Add a cleanup mechanism that runs on app startup:

```typescript
export async function cleanupStaleSessions(
  activeTmuxNames: Set<string>,
): Promise<void> {
  const allSessions = await listForjaSessions();
  const stale = allSessions.filter((name) => !activeTmuxNames.has(name));

  // Don't kill sessions that are less than 24h old (user might reopen soon)
  // For now, just kill any forja session not referenced by saved tabs
  await Promise.all(stale.map(killTmuxSession));
}
```

Register in `main.ts` app startup:

```typescript
// After window creation, clean up stale tmux sessions
const savedTabs = config.getSavedTabs(); // tabs from last session
const activeTmuxNames = new Set(
  savedTabs
    .filter((t) => t.tmuxSessionName)
    .map((t) => t.tmuxSessionName!),
);
await cleanupStaleSessions(activeTmuxNames);
```

**Step 3: Run tests**

Run: `pnpm test -v`
Expected: PASS

**Step 4: Commit**

```
feat(electron): cleanup stale tmux sessions on app startup
```

---

## Task 16: End-to-end integration test

**Files:**
- Create: `electron/__tests__/tmux-integration.test.ts`

**Step 1: Write integration test**

```typescript
describe("tmux session persistence (integration)", () => {
  it("full lifecycle: spawn -> detach -> reattach", async () => {
    // 1. Spawn a terminal PTY with tmux
    // 2. Verify tmux session exists (listForjaSessions)
    // 3. Close the PTY (detach only)
    // 4. Verify tmux session still exists
    // 5. Reattach to the tmux session
    // 6. Verify data flows through
    // 7. Force-close (kill tmux)
    // 8. Verify tmux session is gone
  });
});
```

Note: This test can be skipped in CI if tmux is not available using `describe.skipIf(!hasTmux)`.

**Step 2: Run test**

Run: `pnpm test electron/__tests__/tmux-integration.test.ts -v`
Expected: PASS (or SKIP if no tmux)

**Step 3: Commit**

```
test(electron): add tmux session persistence integration test
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | tmux detection utility | `electron/tmux.ts` |
| 2 | tmux session lifecycle (create, list, kill, cwd) | `electron/tmux.ts` |
| 3 | tmux PTY adapter (node-pty wraps tmux attach) | `electron/pty-tmux.ts` |
| 4 | User setting `terminal.persistSessions` | `electron/user-settings.ts` |
| 5 | **Core**: integrate tmux into `spawnPty` flow | `electron/pty.ts` |
| 6 | Orphan session detection | `electron/tmux-restore.ts` |
| 7 | IPC handlers for reattach | `electron/main.ts`, `electron/pty.ts` |
| 8 | Distinguish detach vs kill on close | `electron/main.ts` |
| 9 | Shutdown flow preserves tmux sessions | `electron/main.ts` |
| 10 | Frontend restore from tmux | `frontend/components/terminal-session.tsx` |
| 11 | Propagate tmux session name to frontend | `electron/pty.ts`, `frontend/` |
| 12 | Status bar tmux indicator | `frontend/components/session-status-bar.tsx` |
| 13 | Force-kill tmux on explicit tab close | `frontend/components/terminal-session.tsx` |
| 14 | Settings UI toggle | Settings dialog component |
| 15 | Cleanup stale sessions on startup | `electron/tmux-restore.ts` |
| 16 | Integration test | `electron/__tests__/tmux-integration.test.ts` |

### Windows Note

This feature is **Linux and macOS only**. On Windows, tmux is not available natively. The fallback (direct PTY) will be used automatically. A future enhancement could use Windows ConPTY with a background daemon, but that's out of scope for this plan.
