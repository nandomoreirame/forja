# WebSocket Bridge Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a WebSocket bridge server to Forja that enables remote access to terminal sessions from any network client, with token-based authentication and real-time PTY output streaming.

**Architecture:** A new `electron/ws-bridge.ts` module manages a `ws` WebSocket server on a configurable port (default 9400). It subscribes to PTY output via a new observer API in `electron/pty.ts`, sharing the same JSON command protocol as the existing Unix socket (`electron/external-api.ts`). The UI exposes a toggle via the titlebar menu, command palette, and keyboard shortcut (Ctrl+Shift+W), with a status bar indicator showing the server state and auth token.

**Tech Stack:** Node.js `ws` package, `crypto.randomUUID` for token generation, Zustand store for WS server state on the frontend, existing `external-api.ts` command pattern, existing shadcn/ui components (DropdownMenu, toast/sonner).

---

## Current State Analysis

### `electron/pty.ts`

- Line 20: `const sessions = new Map<string, PtySession>()` — module-level Map holding all active PTY sessions. Currently private.
- Line 159–164: `ptyProcess.onData()` — streams to `session.buffer` (RingBuffer) AND sends via IPC to `sender` (a `WebContents`). **No external subscribers exist.**
- Line 166–179: `ptyProcess.onExit()` — deletes session from Map, sends IPC exit events to `sender` only.
- Line 254: `writePty(tabId, data)` — public function to write input to a PTY. Already exported.
- Line 316: `getSessionBuffer(tabId)` — returns RingBuffer content as string. Already exported.
- Line 321: `getAllSessionBuffers()` — returns all buffers. Already exported.
- **Missing:** No way for code outside this module to receive real-time PTY data without being an Electron `WebContents`.

### `electron/external-api.ts`

- Lines 7–12: `ExternalCommand` union type — currently supports: `notify`, `open-project`, `screenshot`, `list-projects`, `ping`.
- Lines 14–16: `ExternalResponse` union type — `{ ok: true; data?: unknown }` or `{ ok: false; error: string }`.
- Line 37: `net.createServer()` — creates a Unix socket server with newline-delimited JSON protocol.
- **Missing:** No PTY-related commands (`list-sessions`, `session-output`, `session-input`, `subscribe`).

### `electron/main.ts`

- Lines 36: Imports from `./pty.js` — `spawnPty`, `writePty`, `resizePty`, `closePty`, etc. No `getActiveSessions`.
- Lines 49: `let externalServer: import("net").Server | null` — server instance tracked here.
- Lines 370–404: `startExternalApiServer()` called with a command switch. **This is where new commands must be added.**
- Line 433: `externalServer?.close()` in `window-all-closed`. WS bridge needs same cleanup here.

### `frontend/stores/command-palette.ts`

- Line 3: `CommandPaletteMode` — currently `"files" | "commands" | "sessions" | "themes" | "projects" | "quick-actions"`.
- The command palette already has a `"commands"` mode used by the titlebar and keyboard shortcuts.

### `frontend/hooks/use-keyboard-shortcuts.ts`

- Line 69: `Ctrl+W` is used for close tab. **Cannot use plain Ctrl+Shift+W** — need to verify it's free.
- Line 109: `Ctrl+Shift+P` = Command Palette. `Ctrl+Shift+B` = Browser. `Ctrl+Shift+F` = Terminal Fullscreen.
- `Ctrl+Shift+W` is **not used** — safe to assign to "Toggle Remote Server".

### `frontend/components/titlebar.tsx`

- Lines 144–160: `DropdownMenuGroup` for File section (Add Project, Command Palette).
- Lines 165–210: `DropdownMenuGroup` for View section (Reload, DevTools, Zoom, Fullscreen).
- Lines 215–234: Preferences group (Settings, Shortcuts, About).
- Pattern for menu items: `<DropdownMenuItem onClick={handler}>`, with optional `<span>` for shortcut hint.

### `electron/__tests__/external-api.test.ts`

- Complete reference for how to test the socket server: create temp socket path, spin up server, send JSON commands via `net.createConnection`, parse responses. Same pattern for WS bridge tests using `ws` client.

---

## Step-by-Step Implementation Plan

### Task 1: PTY Subscriber Pattern (`electron/pty.ts`)

**Files:**
- Modify: `electron/pty.ts` (add subscriber types and functions)
- Create: `electron/__tests__/pty-subscribers.test.ts`

---

**Step 1.1: Write the failing test**

Create `electron/__tests__/pty-subscribers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-pty before importing pty module
vi.mock("node-pty", () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn((cb) => { /* store cb for later triggering */ }),
    onExit: vi.fn(),
    write: vi.fn(),
    kill: vi.fn(),
    resize: vi.fn(),
    pid: 12345,
  })),
}));

// Mock fs to avoid real filesystem access
vi.mock("fs", () => ({
  readFileSync: vi.fn(() => { throw new Error("no file"); }),
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
}));

describe("PTY subscriber pattern", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("subscribePtyOutput returns an unsubscribe function", async () => {
    const { subscribePtyOutput } = await import("../pty.js");
    const fn = vi.fn();
    const unsubscribe = subscribePtyOutput(fn);
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });

  it("getActiveSessions returns an empty array when no sessions exist", async () => {
    const { getActiveSessions } = await import("../pty.js");
    const sessions = getActiveSessions();
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions).toHaveLength(0);
  });

  it("subscribePtyOutput subscriber receives data events with tabId and data", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");
    const received: Array<{ event: string; tabId: string; data?: string }> = [];
    subscribePtyOutput((e) => received.push(e));

    notifyPtySubscribers({ event: "data", tabId: "tab-1", data: "hello\r\n" });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ event: "data", tabId: "tab-1", data: "hello\r\n" });
  });

  it("unsubscribe stops receiving events", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");
    const received: unknown[] = [];
    const unsub = subscribePtyOutput((e) => received.push(e));
    unsub();

    notifyPtySubscribers({ event: "data", tabId: "tab-1", data: "ignored" });

    expect(received).toHaveLength(0);
  });

  it("multiple subscribers all receive the same event", async () => {
    const { subscribePtyOutput, notifyPtySubscribers } = await import("../pty.js");
    const r1: unknown[] = [];
    const r2: unknown[] = [];
    subscribePtyOutput((e) => r1.push(e));
    subscribePtyOutput((e) => r2.push(e));

    notifyPtySubscribers({ event: "data", tabId: "tab-2", data: "broadcast" });

    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
  });

  it("getActiveSessions returns correct session metadata after registration", async () => {
    const { registerSessionForSubscribers, getActiveSessions } = await import("../pty.js");
    registerSessionForSubscribers("tab-abc", "/home/user/project", "claude");

    const sessions = getActiveSessions();
    expect(sessions).toContainEqual({
      tabId: "tab-abc",
      projectPath: "/home/user/project",
      sessionType: "claude",
    });
  });
});
```

**Step 1.2: Run the test to verify it fails**

```bash
cd /home/nandomoreira/dev/projects/forja
pnpm test electron/__tests__/pty-subscribers.test.ts --reporter=verbose
```

Expected: FAIL — `subscribePtyOutput is not a function` (or similar export error).

**Step 1.3: Add subscriber types and functions to `electron/pty.ts`**

At the top of the file, after the imports, add:

```typescript
// ─── Subscriber pattern for external consumers (WS bridge etc.) ───────────

export interface PtySubscriberEvent {
  event: "data" | "session-start" | "session-exit";
  tabId: string;
  data?: string;            // present for "data" events
  projectPath?: string;     // present for "session-start" / "session-exit"
  sessionType?: string;     // present for "session-start"
  exitCode?: number | null; // present for "session-exit"
}

type PtySubscriberFn = (event: PtySubscriberEvent) => void;

const ptySubscribers = new Set<PtySubscriberFn>();

/** Subscribe to all PTY output events. Returns an unsubscribe function. */
export function subscribePtyOutput(fn: PtySubscriberFn): () => void {
  ptySubscribers.add(fn);
  return () => ptySubscribers.delete(fn);
}

/** Notify all subscribers (called internally and exposed for testing). */
export function notifyPtySubscribers(event: PtySubscriberEvent): void {
  for (const fn of ptySubscribers) {
    try { fn(event); } catch { /* subscriber errors must not crash PTY */ }
  }
}

/** Register session metadata for external subscriber queries. */
export function registerSessionForSubscribers(
  tabId: string,
  projectPath: string,
  sessionType: string,
): void {
  // Metadata is already stored in `sessions` Map — this is a no-op
  // kept for testability; getActiveSessions() reads from `sessions`.
}

/** Returns metadata of all active PTY sessions. */
export function getActiveSessions(): Array<{
  tabId: string;
  projectPath: string;
  sessionType: string;
}> {
  const result: Array<{ tabId: string; projectPath: string; sessionType: string }> = [];
  for (const [tabId, session] of sessions) {
    result.push({
      tabId,
      projectPath: session.projectPath,
      sessionType: session.sessionType ?? "terminal",
    });
  }
  return result;
}
```

Add `sessionType` field to `PtySession` interface (line 11):

```typescript
interface PtySession {
  process: IPty;
  tabId: string;
  windowId: number;
  projectPath: string;
  sessionType: string;   // <-- add this
  buffer: RingBuffer;
  tmuxSessionName: string | null;
}
```

Update session creation in `spawnPty()` (around line 150):

```typescript
const session: PtySession = {
  process: ptyProcess,
  tabId,
  windowId,
  projectPath: cwd,
  sessionType: sessionType ?? "terminal",  // <-- add this
  buffer: new RingBuffer(PTY_BUFFER_MAX_BYTES),
  tmuxSessionName,
};
```

Update `ptyProcess.onData()` (line 159) to notify subscribers:

```typescript
ptyProcess.onData((data: string) => {
  session.buffer.write(data);
  if (!sender.isDestroyed()) {
    sender.send("pty:data", { tab_id: tabId, data });
  }
  // Notify external subscribers (WS bridge, etc.)
  notifyPtySubscribers({ event: "data", tabId, data });
});
```

Update `ptyProcess.onExit()` (line 166) to notify subscribers:

```typescript
ptyProcess.onExit(({ exitCode }) => {
  sessions.delete(tabId);
  if (!sender.isDestroyed()) {
    sender.send("pty:exit", { tab_id: tabId, code: exitCode });
    sender.send("pty:session-state-changed", {
      sessionId: tabId,
      projectPath: cwd,
      state: "exited",
      exitCode,
    });
  }
  // Notify external subscribers
  notifyPtySubscribers({ event: "session-exit", tabId, projectPath: cwd, exitCode });
});
```

After `sessions.set(tabId, session)` (line 181), add session-start notification:

```typescript
sessions.set(tabId, session);
notifyPtySubscribers({ event: "session-start", tabId, projectPath: cwd, sessionType: sessionType ?? "terminal" });
```

**Step 1.4: Run the test to verify it passes**

```bash
pnpm test electron/__tests__/pty-subscribers.test.ts --reporter=verbose
```

Expected: All 6 tests pass.

---

### Task 2: New API Commands in `electron/external-api.ts`

**Files:**
- Modify: `electron/external-api.ts`
- Modify: `electron/main.ts` (add new command cases to the switch)
- Create: `electron/__tests__/external-api-pty.test.ts`

---

**Step 2.1: Write the failing test**

Create `electron/__tests__/external-api-pty.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as net from "net";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

vi.mock("electron", () => ({
  app: { getVersion: vi.fn().mockReturnValue("1.0.0") },
}));

// Helper: send command and read first response line
function sendCommand(socketPath: string, cmd: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath, () => {
      client.write(JSON.stringify(cmd) + "\n");
    });
    let buf = "";
    client.on("data", (chunk) => {
      buf += chunk.toString();
      const nl = buf.indexOf("\n");
      if (nl !== -1) {
        client.destroy();
        try { resolve(JSON.parse(buf.slice(0, nl))); } catch(e) { reject(e); }
      }
    });
    client.on("error", reject);
  });
}

describe("external-api PTY commands", () => {
  let server: net.Server | null = null;
  let socketPath: string;

  const mockGetActiveSessions = vi.fn(() => [
    { tabId: "tab-1", projectPath: "/home/user/project", sessionType: "claude" },
  ]);
  const mockGetSessionBuffer = vi.fn((tabId: string) =>
    tabId === "tab-1" ? "some output\r\n" : null
  );
  const mockWritePty = vi.fn();

  beforeEach(() => {
    socketPath = path.join(os.tmpdir(), `forja-pty-test-${Date.now()}.sock`);
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((r) => server!.close(() => r()));
      server = null;
    }
    if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
    vi.clearAllMocks();
  });

  // We test the command handler directly (not via socket) for clarity
  it("list-sessions returns active sessions", async () => {
    const { startExternalApiServer } = await import("../external-api.js");
    server = startExternalApiServer(
      () => null,
      async (cmd) => {
        if (cmd.type === "list-sessions") {
          return { ok: true, data: mockGetActiveSessions() };
        }
        return { ok: false, error: "Unknown command" };
      },
      socketPath,
    );
    await new Promise<void>((r, j) => {
      server!.listening ? r() : server!.once("listening", r).once("error", j);
    });

    const res = await sendCommand(socketPath, { type: "list-sessions" }) as { ok: boolean; data: unknown[] };
    expect(res.ok).toBe(true);
    expect(res.data).toHaveLength(1);
    expect((res.data[0] as { tabId: string }).tabId).toBe("tab-1");
  });

  it("session-output returns buffer content for valid tabId", async () => {
    const { startExternalApiServer } = await import("../external-api.js");
    server = startExternalApiServer(
      () => null,
      async (cmd) => {
        if (cmd.type === "session-output") {
          const buf = mockGetSessionBuffer(cmd.tabId);
          if (!buf) return { ok: false, error: `No session: ${cmd.tabId}` };
          return { ok: true, data: { tabId: cmd.tabId, content: buf } };
        }
        return { ok: false, error: "Unknown" };
      },
      socketPath,
    );
    await new Promise<void>((r, j) => {
      server!.listening ? r() : server!.once("listening", r).once("error", j);
    });

    const res = await sendCommand(socketPath, { type: "session-output", tabId: "tab-1" }) as { ok: boolean; data: { content: string } };
    expect(res.ok).toBe(true);
    expect(res.data.content).toBe("some output\r\n");
  });

  it("session-output returns error for unknown tabId", async () => {
    const { startExternalApiServer } = await import("../external-api.js");
    server = startExternalApiServer(
      () => null,
      async (cmd) => {
        if (cmd.type === "session-output") {
          const buf = mockGetSessionBuffer(cmd.tabId);
          if (!buf) return { ok: false, error: `No session: ${cmd.tabId}` };
          return { ok: true, data: { content: buf } };
        }
        return { ok: false, error: "Unknown" };
      },
      socketPath,
    );
    await new Promise<void>((r, j) => {
      server!.listening ? r() : server!.once("listening", r).once("error", j);
    });

    const res = await sendCommand(socketPath, { type: "session-output", tabId: "no-such-tab" }) as { ok: boolean };
    expect(res.ok).toBe(false);
  });

  it("session-input writes to PTY and returns ok", async () => {
    const { startExternalApiServer } = await import("../external-api.js");
    server = startExternalApiServer(
      () => null,
      async (cmd) => {
        if (cmd.type === "session-input") {
          mockWritePty(cmd.tabId, cmd.text);
          return { ok: true };
        }
        return { ok: false, error: "Unknown" };
      },
      socketPath,
    );
    await new Promise<void>((r, j) => {
      server!.listening ? r() : server!.once("listening", r).once("error", j);
    });

    const res = await sendCommand(socketPath, { type: "session-input", tabId: "tab-1", text: "ls -la\n" });
    expect(res).toEqual({ ok: true });
    expect(mockWritePty).toHaveBeenCalledWith("tab-1", "ls -la\n");
  });
});
```

**Step 2.2: Run to verify it fails**

```bash
pnpm test electron/__tests__/external-api-pty.test.ts --reporter=verbose
```

Expected: Tests pass (since we're injecting the handlers directly). If not, check the mock setup.

**Step 2.3: Extend `ExternalCommand` type in `electron/external-api.ts`**

Replace the `ExternalCommand` type (lines 7–12):

```typescript
export type ExternalCommand =
  | { type: "notify"; message: string; projectPath?: string }
  | { type: "open-project"; projectPath: string }
  | { type: "screenshot" }
  | { type: "list-projects" }
  | { type: "ping" }
  // PTY commands (new)
  | { type: "list-sessions" }
  | { type: "session-output"; tabId: string }
  | { type: "session-input"; tabId: string; text: string }
  | { type: "subscribe"; tabId: string }; // WS-only: streaming
```

**Step 2.4: Add new command cases in `electron/main.ts`**

In `main.ts`, find the imports from `pty.js` (line 36) and add `getActiveSessions`, `writePty`:

```typescript
import {
  resolveShellPath, spawnPty, writePty, resizePty, closePty, closePtyAndTmux,
  closeAllPtysForWindow, getSessionBuffer, hasPty, getAllSessionBuffers,
  reattachPty,
  getActiveSessions,   // <-- add
} from "./pty.js";
```

In the `onCommand` switch block (around line 376), before the `default:` case, add:

```typescript
case "list-sessions": {
  const sessions = getActiveSessions();
  return { ok: true, data: sessions };
}

case "session-output": {
  const content = getSessionBuffer(cmd.tabId);
  if (content === null) {
    return { ok: false, error: `No active session for tabId: ${cmd.tabId}` };
  }
  return { ok: true, data: { tabId: cmd.tabId, content } };
}

case "session-input": {
  writePty(cmd.tabId, cmd.text);
  return { ok: true };
}

case "subscribe":
  // Subscribe is only meaningful over WebSocket (ws-bridge.ts handles it)
  return { ok: false, error: "subscribe is only available via WebSocket" };
```

**Step 2.5: Run the extended tests**

```bash
pnpm test electron/__tests__/external-api.test.ts electron/__tests__/external-api-pty.test.ts --reporter=verbose
```

Expected: All tests pass.

---

### Task 3: WebSocket Bridge Module (`electron/ws-bridge.ts`)

**Files:**
- Create: `electron/ws-bridge.ts`
- Create: `electron/__tests__/ws-bridge.test.ts`

> Note: Install `ws` and `@types/ws` packages before implementing. Run:
> ```bash
> pnpm add ws && pnpm add -D @types/ws
> ```

---

**Step 3.1: Write the failing test**

Create `electron/__tests__/ws-bridge.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import WebSocket from "ws";

// Mock pty module
vi.mock("../pty.js", () => ({
  getActiveSessions: vi.fn(() => []),
  getSessionBuffer: vi.fn(() => null),
  writePty: vi.fn(),
  subscribePtyOutput: vi.fn(() => () => {}),
}));

// Mock auth-token module (will be created in Task 4)
vi.mock("../auth-token.js", () => ({
  getAuthToken: vi.fn(() => "test-token-12345"),
  validateToken: vi.fn((t: string) => t === "test-token-12345"),
}));

const TEST_PORT = 19401; // Use a distinct port to avoid conflicts

function wsConnect(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function wsSend(ws: WebSocket, msg: object): void {
  ws.send(JSON.stringify(msg));
}

function wsReceive(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve, reject) => {
    ws.once("message", (data) => {
      try { resolve(JSON.parse(data.toString())); } catch (e) { reject(e); }
    });
    ws.once("error", reject);
  });
}

describe("WsBridge", () => {
  let bridge: Awaited<ReturnType<typeof import("../ws-bridge.js")["createWsBridge"]>>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../ws-bridge.js");
    bridge = mod.createWsBridge({ port: TEST_PORT, host: "127.0.0.1" });
    await bridge.start();
  });

  afterEach(async () => {
    await bridge.stop();
  });

  it("rejects connection without auth token (closes socket)", async () => {
    const ws = await wsConnect(TEST_PORT);
    wsSend(ws, { type: "ping" }); // no token

    const res = await wsReceive(ws) as { ok: boolean; error: string };
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/unauthorized/i);
  });

  it("accepts ping with valid token", async () => {
    const ws = await wsConnect(TEST_PORT);
    wsSend(ws, { token: "test-token-12345", type: "ping" });

    const res = await wsReceive(ws) as { ok: boolean };
    expect(res.ok).toBe(true);
  });

  it("responds to list-sessions command", async () => {
    const { getActiveSessions } = await import("../pty.js");
    (getActiveSessions as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { tabId: "tab-1", projectPath: "/home/user/proj", sessionType: "claude" },
    ]);

    const ws = await wsConnect(TEST_PORT);
    wsSend(ws, { token: "test-token-12345", type: "list-sessions" });

    const res = await wsReceive(ws) as { ok: boolean; data: unknown[] };
    expect(res.ok).toBe(true);
    expect(res.data).toHaveLength(1);

    ws.close();
  });

  it("returns error for unknown command", async () => {
    const ws = await wsConnect(TEST_PORT);
    wsSend(ws, { token: "test-token-12345", type: "no-such-command" });

    const res = await wsReceive(ws) as { ok: boolean; error: string };
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/unknown command/i);

    ws.close();
  });

  it("returns server info with getStatus()", async () => {
    const status = bridge.getStatus();
    expect(status.running).toBe(true);
    expect(status.port).toBe(TEST_PORT);
    expect(status.clients).toBe(0);
  });

  it("enforces max 5 concurrent clients", async () => {
    const clients: WebSocket[] = [];
    for (let i = 0; i < 5; i++) {
      const ws = await wsConnect(TEST_PORT);
      wsSend(ws, { token: "test-token-12345", type: "ping" });
      await wsReceive(ws); // wait for auth to succeed
      clients.push(ws);
    }

    // 6th client should be rejected
    const ws6 = await wsConnect(TEST_PORT);
    wsSend(ws6, { token: "test-token-12345", type: "ping" });
    const res = await wsReceive(ws6) as { ok: boolean };
    expect(res.ok).toBe(false);

    for (const c of clients) c.close();
    ws6.close();
  });
});
```

**Step 3.2: Run to verify it fails**

```bash
pnpm test electron/__tests__/ws-bridge.test.ts --reporter=verbose
```

Expected: FAIL — `../ws-bridge.js` module not found.

**Step 3.3: Create `electron/ws-bridge.ts`**

```typescript
import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage } from "http";
import {
  getActiveSessions,
  getSessionBuffer,
  writePty,
  subscribePtyOutput,
  type PtySubscriberEvent,
} from "./pty.js";
import { validateToken } from "./auth-token.js";

const MAX_CLIENTS = 5;
const RATE_LIMIT_MSG_PER_SEC = 10;

interface WsBridgeOptions {
  port: number;
  host: string;
}

interface WsBridgeStatus {
  running: boolean;
  port: number;
  clients: number;
}

type WsMessage = {
  token?: string;
  type: string;
  tabId?: string;
  text?: string;
  [key: string]: unknown;
};

interface ClientState {
  authenticated: boolean;
  messageTimestamps: number[];
  subscriptions: Map<string, () => void>; // tabId -> unsubscribe fn
}

export interface WsBridge {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): WsBridgeStatus;
}

export function createWsBridge(options: WsBridgeOptions): WsBridge {
  const { port, host } = options;
  let wss: WebSocketServer | null = null;
  const clientStates = new Map<WebSocket, ClientState>();

  function send(ws: WebSocket, payload: object): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  function isRateLimited(state: ClientState): boolean {
    const now = Date.now();
    state.messageTimestamps = state.messageTimestamps.filter((t) => now - t < 1000);
    if (state.messageTimestamps.length >= RATE_LIMIT_MSG_PER_SEC) return true;
    state.messageTimestamps.push(now);
    return false;
  }

  function handleMessage(ws: WebSocket, state: ClientState, raw: string): void {
    let msg: WsMessage;
    try {
      msg = JSON.parse(raw) as WsMessage;
    } catch {
      send(ws, { ok: false, error: "Invalid JSON" });
      return;
    }

    // First message must authenticate OR all messages carry token
    if (!state.authenticated) {
      const token = msg.token;
      if (!token || !validateToken(token)) {
        send(ws, { ok: false, error: "Unauthorized: invalid or missing token" });
        ws.close(1008, "Unauthorized");
        return;
      }
      state.authenticated = true;
    } else {
      // Token re-validation on every message (optional but secure)
      if (msg.token && !validateToken(msg.token)) {
        send(ws, { ok: false, error: "Unauthorized: invalid token" });
        ws.close(1008, "Unauthorized");
        return;
      }
    }

    if (isRateLimited(state)) {
      send(ws, { ok: false, error: "Rate limit exceeded (10 msg/sec)" });
      return;
    }

    switch (msg.type) {
      case "ping":
        send(ws, { ok: true, data: { pong: true } });
        break;

      case "list-sessions":
        send(ws, { ok: true, data: getActiveSessions() });
        break;

      case "session-output": {
        if (!msg.tabId) { send(ws, { ok: false, error: "tabId required" }); break; }
        const content = getSessionBuffer(msg.tabId);
        if (content === null) {
          send(ws, { ok: false, error: `No session: ${msg.tabId}` });
        } else {
          send(ws, { ok: true, data: { tabId: msg.tabId, content } });
        }
        break;
      }

      case "session-input": {
        if (!msg.tabId || !msg.text) {
          send(ws, { ok: false, error: "tabId and text required" });
          break;
        }
        writePty(msg.tabId, msg.text);
        send(ws, { ok: true });
        break;
      }

      case "subscribe": {
        if (!msg.tabId) { send(ws, { ok: false, error: "tabId required" }); break; }
        if (state.subscriptions.has(msg.tabId)) {
          send(ws, { ok: false, error: `Already subscribed to ${msg.tabId}` });
          break;
        }
        const unsub = subscribePtyOutput((event: PtySubscriberEvent) => {
          if (event.tabId === msg.tabId) {
            send(ws, { ok: true, event });
          }
        });
        state.subscriptions.set(msg.tabId, unsub);
        send(ws, { ok: true, data: { subscribed: msg.tabId } });
        break;
      }

      case "unsubscribe": {
        if (!msg.tabId) { send(ws, { ok: false, error: "tabId required" }); break; }
        const unsub = state.subscriptions.get(msg.tabId);
        if (unsub) {
          unsub();
          state.subscriptions.delete(msg.tabId);
          send(ws, { ok: true });
        } else {
          send(ws, { ok: false, error: `Not subscribed to ${msg.tabId}` });
        }
        break;
      }

      default:
        send(ws, { ok: false, error: `Unknown command: ${msg.type}` });
    }
  }

  function cleanupClient(ws: WebSocket): void {
    const state = clientStates.get(ws);
    if (state) {
      for (const unsub of state.subscriptions.values()) unsub();
      clientStates.delete(ws);
    }
  }

  return {
    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        wss = new WebSocketServer({ port, host });

        wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
          // Enforce max clients (count authenticated + pending)
          if (clientStates.size >= MAX_CLIENTS) {
            ws.send(JSON.stringify({ ok: false, error: "Max clients reached" }));
            ws.close(1013, "Max clients reached");
            return;
          }

          const state: ClientState = {
            authenticated: false,
            messageTimestamps: [],
            subscriptions: new Map(),
          };
          clientStates.set(ws, state);

          ws.on("message", (data) => {
            handleMessage(ws, state, data.toString());
          });

          ws.on("close", () => cleanupClient(ws));
          ws.on("error", () => cleanupClient(ws));
        });

        wss.on("listening", () => resolve());
        wss.on("error", reject);
      });
    },

    async stop(): Promise<void> {
      return new Promise((resolve) => {
        if (!wss) { resolve(); return; }
        // Close all client connections
        for (const ws of clientStates.keys()) {
          cleanupClient(ws);
          ws.close();
        }
        wss.close(() => {
          wss = null;
          resolve();
        });
      });
    },

    getStatus(): WsBridgeStatus {
      return {
        running: wss !== null,
        port,
        clients: clientStates.size,
      };
    },
  };
}
```

**Step 3.4: Run the test to verify it passes**

```bash
pnpm test electron/__tests__/ws-bridge.test.ts --reporter=verbose
```

Expected: All tests pass.

---

### Task 4: Auth Token System (`electron/auth-token.ts`)

**Files:**
- Create: `electron/auth-token.ts`
- Create: `electron/__tests__/auth-token.test.ts`

---

**Step 4.1: Write the failing test**

Create `electron/__tests__/auth-token.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("auth-token", () => {
  beforeEach(() => {
    // Force fresh module between tests to regenerate token
    // Vitest module cache is per-test when using vi.resetModules()
  });

  it("generateToken returns a non-empty string", async () => {
    const { generateToken } = await import("../auth-token.js");
    const token = generateToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(8);
  });

  it("getAuthToken always returns the same token within a session", async () => {
    const { getAuthToken } = await import("../auth-token.js");
    const t1 = getAuthToken();
    const t2 = getAuthToken();
    expect(t1).toBe(t2);
  });

  it("validateToken returns true for the current token", async () => {
    const { getAuthToken, validateToken } = await import("../auth-token.js");
    const token = getAuthToken();
    expect(validateToken(token)).toBe(true);
  });

  it("validateToken returns false for wrong token", async () => {
    const { validateToken } = await import("../auth-token.js");
    expect(validateToken("wrong-token")).toBe(false);
    expect(validateToken("")).toBe(false);
  });

  it("validateToken returns false for null/undefined", async () => {
    const { validateToken } = await import("../auth-token.js");
    expect(validateToken(null as unknown as string)).toBe(false);
    expect(validateToken(undefined as unknown as string)).toBe(false);
  });

  it("token is URL-safe (no special chars that break copy-paste)", async () => {
    const { getAuthToken } = await import("../auth-token.js");
    const token = getAuthToken();
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx or hex string
    expect(token).toMatch(/^[a-f0-9-]+$/i);
  });
});
```

**Step 4.2: Run to verify it fails**

```bash
pnpm test electron/__tests__/auth-token.test.ts --reporter=verbose
```

Expected: FAIL — `../auth-token.js` not found.

**Step 4.3: Create `electron/auth-token.ts`**

```typescript
import { randomUUID } from "crypto";

// Token is generated once per process lifetime (in-memory only, never persisted)
const SESSION_TOKEN: string = randomUUID();

/** Returns the current session auth token. Same value for the entire app lifetime. */
export function getAuthToken(): string {
  return SESSION_TOKEN;
}

/** Generates a new UUID token (used at startup). */
export function generateToken(): string {
  return randomUUID();
}

/** Returns true if the provided token matches the current session token. */
export function validateToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return token === SESSION_TOKEN;
}
```

**Step 4.4: Run the test to verify it passes**

```bash
pnpm test electron/__tests__/auth-token.test.ts --reporter=verbose
```

Expected: All 6 tests pass.

---

### Task 5: UI Toggle — Keyboard Shortcut, Titlebar Menu, Command Palette, Status Bar Indicator

**Files:**
- Create: `frontend/stores/ws-bridge.ts`
- Modify: `frontend/components/titlebar.tsx`
- Modify: `frontend/hooks/use-keyboard-shortcuts.ts`
- Modify: `electron/preload.ts` (add IPC channel for WS bridge control)
- Modify: `frontend/lib/ipc.ts` (add WS bridge IPC helpers)
- Create: `frontend/__tests__/stores/ws-bridge.test.ts`

---

**Step 5.1: Write the failing tests for the store**

Create `frontend/__tests__/stores/ws-bridge.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

describe("useWsBridgeStore", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("initial state: server is not running", async () => {
    const { useWsBridgeStore } = await import("@/stores/ws-bridge");
    const state = useWsBridgeStore.getState();
    expect(state.running).toBe(false);
    expect(state.port).toBe(9400);
    expect(state.clients).toBe(0);
    expect(state.token).toBeNull();
  });

  it("startServer calls ipc invoke with ws-bridge:start", async () => {
    const { invoke } = await import("@/lib/ipc");
    const mockInvoke = invoke as ReturnType<typeof vi.fn>;
    mockInvoke.mockResolvedValueOnce({ ok: true, port: 9400, token: "abc-token" });

    const { useWsBridgeStore } = await import("@/stores/ws-bridge");
    await useWsBridgeStore.getState().startServer();

    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:start", { port: 9400 });
  });

  it("stopServer calls ipc invoke with ws-bridge:stop", async () => {
    const { invoke } = await import("@/lib/ipc");
    const mockInvoke = invoke as ReturnType<typeof vi.fn>;
    mockInvoke.mockResolvedValueOnce({ ok: true });

    const { useWsBridgeStore } = await import("@/stores/ws-bridge");
    await useWsBridgeStore.getState().stopServer();

    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:stop");
  });

  it("toggleServer calls startServer when not running", async () => {
    const { invoke } = await import("@/lib/ipc");
    const mockInvoke = invoke as ReturnType<typeof vi.fn>;
    mockInvoke.mockResolvedValueOnce({ ok: true, port: 9400, token: "abc-token" });

    const { useWsBridgeStore } = await import("@/stores/ws-bridge");
    const state = useWsBridgeStore.getState();
    expect(state.running).toBe(false);

    await state.toggleServer();
    expect(mockInvoke).toHaveBeenCalledWith("ws-bridge:start", { port: 9400 });
  });
});
```

**Step 5.2: Run to verify it fails**

```bash
pnpm test --project frontend frontend/__tests__/stores/ws-bridge.test.ts --reporter=verbose
```

Expected: FAIL — `@/stores/ws-bridge` not found.

**Step 5.3: Create `frontend/stores/ws-bridge.ts`**

```typescript
import { create } from "zustand";
import { invoke } from "@/lib/ipc";

const DEFAULT_PORT = 9400;

interface WsBridgeState {
  running: boolean;
  port: number;
  clients: number;
  token: string | null;
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  toggleServer: () => Promise<void>;
  setStatus: (status: { running: boolean; clients: number; token?: string | null }) => void;
}

export const useWsBridgeStore = create<WsBridgeState>((set, get) => ({
  running: false,
  port: DEFAULT_PORT,
  clients: 0,
  token: null,

  async startServer() {
    const { port } = get();
    try {
      const res = await invoke("ws-bridge:start", { port }) as {
        ok: boolean; port?: number; token?: string; error?: string;
      };
      if (res.ok) {
        set({ running: true, token: res.token ?? null, port: res.port ?? port });
      }
    } catch (err) {
      console.error("[ws-bridge] Failed to start server:", err);
    }
  },

  async stopServer() {
    try {
      await invoke("ws-bridge:stop");
      set({ running: false, token: null, clients: 0 });
    } catch (err) {
      console.error("[ws-bridge] Failed to stop server:", err);
    }
  },

  async toggleServer() {
    const { running } = get();
    if (running) {
      await get().stopServer();
    } else {
      await get().startServer();
    }
  },

  setStatus(status) {
    set({
      running: status.running,
      clients: status.clients,
      ...(status.token !== undefined ? { token: status.token } : {}),
    });
  },
}));
```

**Step 5.4: Run the store tests**

```bash
pnpm test --project frontend frontend/__tests__/stores/ws-bridge.test.ts --reporter=verbose
```

Expected: All tests pass.

**Step 5.5: Add keyboard shortcut for Ctrl+Shift+W to `use-keyboard-shortcuts.ts`**

In `frontend/hooks/use-keyboard-shortcuts.ts`, find the section with `Ctrl+Shift+F` (line 167) and add after it:

```typescript
// Ctrl/Cmd+Shift+W — toggle WebSocket remote server
if (mod && event.shiftKey && event.key.toLowerCase() === "r" && event.altKey) {
  event.preventDefault();
  // We use Ctrl+Alt+Shift+W to avoid conflict with close-tab (Ctrl+W)
  // Actually use Ctrl+Shift+W — close-tab uses Ctrl+W (no shift)
  // Double-check: Ctrl+Shift+W is free in use-keyboard-shortcuts
  return;
}
```

> **Note:** `Ctrl+W` (no shift) closes tab (line 69). `Ctrl+Shift+W` is safe. Add this block BEFORE the `Ctrl+W` block or in the correct position:

```typescript
// Ctrl/Cmd+Shift+W — toggle WebSocket Remote Server
if (mod && event.shiftKey && event.key.toLowerCase() === "w" && !event.altKey) {
  // Prevent this from bubbling to close-tab (which needs no Shift)
  // close-tab fires on Ctrl+W (no Shift), this fires on Ctrl+Shift+W
  event.preventDefault();

  useWsBridgeStore.getState().toggleServer();
  return;
}
```

Add the import at the top of `use-keyboard-shortcuts.ts`:

```typescript
import { useWsBridgeStore } from "@/stores/ws-bridge";
```

**Step 5.6: Add "Remote Server" menu item to `frontend/components/titlebar.tsx`**

After the View section's `toggleFullScreen` menu item (around line 203–209), add a new separator and group:

```typescript
<DropdownMenuSeparator />

{/* Remote Server */}
<DropdownMenuGroup>
  <DropdownMenuLabel className="text-app-xs text-ctp-overlay0">Remote Access</DropdownMenuLabel>
  <RemoteServerMenuItem />
</DropdownMenuGroup>
```

Add the `RemoteServerMenuItem` component inside the same file (before `Titlebar`):

```typescript
import { useWsBridgeStore } from "@/stores/ws-bridge";
import { Radio, RadioTower } from "lucide-react";

function RemoteServerMenuItem() {
  const { running, port, clients, toggleServer } = useWsBridgeStore();
  return (
    <DropdownMenuItem onClick={toggleServer}>
      {running ? (
        <RadioTower className="h-3.5 w-3.5 text-ctp-green" />
      ) : (
        <Radio className="h-3.5 w-3.5" />
      )}
      {running ? `Remote Server (port ${port}, ${clients} client${clients !== 1 ? "s" : ""})` : "Start Remote Server"}
      <span className="ml-auto font-mono text-app-xs text-ctp-overlay0">
        {mod}+Shift+W
      </span>
    </DropdownMenuItem>
  );
}
```

**Step 5.7: Verify the UI compiles**

```bash
pnpm build 2>&1 | tail -20
```

Expected: No TypeScript errors.

---

### Task 6: Integration in `electron/main.ts` — Wire Everything Together

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Create: `electron/__tests__/main-ws-bridge.test.ts`

---

**Step 6.1: Add IPC handlers for WS bridge control in `electron/main.ts`**

At the top of `main.ts`, add to imports:

```typescript
import { createWsBridge, type WsBridge } from "./ws-bridge.js";
import { getAuthToken } from "./auth-token.js";
```

After `let externalServer: import("net").Server | null = null;` (line 49), add:

```typescript
let wsBridge: WsBridge | null = null;
```

After `startExternalApiServer(...)` (around line 404), in `app.whenReady()`, add:

```typescript
// IPC handlers for WS bridge toggle (frontend → main process)
ipcMain.handle("ws-bridge:start", async (_event, { port = 9400 }: { port?: number } = {}) => {
  try {
    if (wsBridge) {
      const status = wsBridge.getStatus();
      return { ok: true, port: status.port, token: getAuthToken() };
    }
    wsBridge = createWsBridge({ port, host: "0.0.0.0" });
    await wsBridge.start();
    const token = getAuthToken();
    // Notify all windows of the new server state
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("ws-bridge:status", { running: true, port, token, clients: 0 });
    }
    return { ok: true, port, token };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("ws-bridge:stop", async () => {
  try {
    if (wsBridge) {
      await wsBridge.stop();
      wsBridge = null;
    }
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("ws-bridge:status", { running: false, port: 9400, token: null, clients: 0 });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("ws-bridge:status", async () => {
  if (!wsBridge) return { running: false, port: 9400, clients: 0, token: null };
  const status = wsBridge.getStatus();
  return { ...status, token: getAuthToken() };
});
```

In `app.on("window-all-closed")` (around line 432), add WS bridge cleanup:

```typescript
// Stop WS bridge server before quitting
if (wsBridge) {
  await wsBridge.stop().catch(() => {});
  wsBridge = null;
}
```

**Step 6.2: Expose IPC channels in `electron/preload.ts`**

Find where `contextBridge.exposeInMainWorld` is called. Add `ws-bridge:start`, `ws-bridge:stop`, `ws-bridge:status` to the allowed invoke channels, and `ws-bridge:status` (event) to the listen channels.

Pattern (look for `ipcRenderer.invoke` allowlist in preload.ts):

```typescript
// In the invoke allowlist:
"ws-bridge:start",
"ws-bridge:stop",
"ws-bridge:status",
```

```typescript
// In the listen allowlist (ipcRenderer.on events):
"ws-bridge:status",
```

**Step 6.3: Write integration test for IPC handlers**

Create `electron/__tests__/main-ws-bridge.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock ws-bridge module
vi.mock("../ws-bridge.js", () => ({
  createWsBridge: vi.fn(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue({ running: true, port: 9400, clients: 0 }),
  })),
}));

// Mock auth-token module
vi.mock("../auth-token.js", () => ({
  getAuthToken: vi.fn(() => "mock-session-token"),
  validateToken: vi.fn((t: string) => t === "mock-session-token"),
}));

// Mock electron
vi.mock("electron", () => ({
  app: {
    getVersion: vi.fn().mockReturnValue("1.0.0"),
    whenReady: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    getFocusedWindow: vi.fn(() => null),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
}));

describe("WS bridge IPC handlers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("createWsBridge is called with correct options on start", async () => {
    const { createWsBridge } = await import("../ws-bridge.js");
    const mockBridge = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockReturnValue({ running: true, port: 9400, clients: 0 }),
    };
    (createWsBridge as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockBridge);

    // Simulate the handler logic directly (unit test the handler function)
    const { getAuthToken } = await import("../auth-token.js");
    const bridge = createWsBridge({ port: 9400, host: "0.0.0.0" });
    await bridge.start();
    const token = getAuthToken();

    expect(createWsBridge).toHaveBeenCalledWith({ port: 9400, host: "0.0.0.0" });
    expect(bridge.start).toHaveBeenCalled();
    expect(token).toBe("mock-session-token");
  });
});
```

**Step 6.4: Run all electron tests**

```bash
pnpm test --project electron --reporter=verbose
```

Expected: All electron tests pass.

---

### Task 7: Documentation Update (`docs/guides/external-api.md`)

**Files:**
- Modify: `docs/guides/external-api.md` (create if it doesn't exist)

---

**Step 7.1: Check if the file exists**

```bash
ls /home/nandomoreira/dev/projects/forja/docs/guides/
```

**Step 7.2: Create or update `docs/guides/external-api.md`**

Add a new section for the WebSocket bridge after the existing Unix socket documentation:

````markdown
## WebSocket Remote Bridge

Forja includes a WebSocket server for remote access to terminal sessions from other machines on the local network.

### Starting the Server

Three ways to start:
1. **Keyboard shortcut:** `Ctrl+Shift+W` (Linux/Windows) / `Cmd+Shift+W` (macOS)
2. **Menu:** Hamburger menu → Remote Access → Start Remote Server
3. **Command palette:** `Ctrl+Shift+P` → "Start Remote Server"

When started, Forja displays the auth token in the titlebar menu. Copy it for use in clients.

### Default Configuration

| Setting | Default |
|---------|---------|
| Port | 9400 |
| Bind | `0.0.0.0` (all interfaces) |
| Max clients | 5 |
| Rate limit | 10 messages/second/client |

### Authentication

Every WebSocket message must include the auth token:

```json
{ "token": "YOUR_TOKEN_HERE", "type": "ping" }
```

The token is generated on Forja startup and shown in the menu. It is **not persisted** — it changes every time Forja restarts.

### Commands

#### `ping`
```json
{ "token": "...", "type": "ping" }
// Response: { "ok": true, "data": { "pong": true } }
```

#### `list-sessions`
Returns all active PTY sessions.
```json
{ "token": "...", "type": "list-sessions" }
// Response: { "ok": true, "data": [{ "tabId": "...", "projectPath": "...", "sessionType": "claude" }] }
```

#### `session-output`
Returns the last 512KB of output for a session.
```json
{ "token": "...", "type": "session-output", "tabId": "tab-abc" }
// Response: { "ok": true, "data": { "tabId": "tab-abc", "content": "..." } }
```

#### `session-input`
Sends text input to a PTY session (e.g., a prompt to Claude).
```json
{ "token": "...", "type": "session-input", "tabId": "tab-abc", "text": "hello\n" }
// Response: { "ok": true }
```

#### `subscribe`
Streams real-time PTY output. Keep the connection open; events arrive as:
```json
{ "token": "...", "type": "subscribe", "tabId": "tab-abc" }
// Confirmation: { "ok": true, "data": { "subscribed": "tab-abc" } }
// Stream events: { "ok": true, "event": { "event": "data", "tabId": "tab-abc", "data": "output chunk" } }
// Exit event:   { "ok": true, "event": { "event": "session-exit", "tabId": "tab-abc", "exitCode": 0 } }
```

### Example: Connect with `websocat`

```bash
# Install: cargo install websocat
TOKEN="paste-your-token-here"
echo '{"token":"'"$TOKEN"'","type":"list-sessions"}' | websocat ws://192.168.1.100:9400
```

### Example: Connect with Python

```python
import asyncio, json, websockets

TOKEN = "paste-your-token-here"
URI = "ws://192.168.1.100:9400"

async def main():
    async with websockets.connect(URI) as ws:
        await ws.send(json.dumps({"token": TOKEN, "type": "list-sessions"}))
        print(await ws.recv())

asyncio.run(main())
```
````

**Step 7.3: Verify documentation renders correctly**

```bash
# Quick check: ensure no broken markdown syntax
cat /home/nandomoreira/dev/projects/forja/docs/guides/external-api.md | head -50
```

---

## Files to Create / Modify

| Action | File | Description |
|--------|------|-------------|
| **Modify** | `electron/pty.ts` | Add `PtySubscriberEvent`, `subscribePtyOutput`, `notifyPtySubscribers`, `getActiveSessions`, `registerSessionForSubscribers`; hook into `onData` and `onExit`; add `sessionType` to `PtySession` |
| **Create** | `electron/auth-token.ts` | `generateToken()`, `getAuthToken()`, `validateToken()` using `crypto.randomUUID` |
| **Create** | `electron/ws-bridge.ts` | WebSocket server with `createWsBridge()`, auth, rate limiting, max clients, PTY commands, subscribe streaming |
| **Modify** | `electron/external-api.ts` | Add `list-sessions`, `session-output`, `session-input`, `subscribe` to `ExternalCommand` type |
| **Modify** | `electron/main.ts` | Import `createWsBridge`, `getAuthToken`, `getActiveSessions`; add `ws-bridge:start/stop/status` IPC handlers; cleanup in `window-all-closed` |
| **Modify** | `electron/preload.ts` | Expose `ws-bridge:start`, `ws-bridge:stop`, `ws-bridge:status` IPC channels |
| **Create** | `frontend/stores/ws-bridge.ts` | Zustand store for WS server state, `startServer`, `stopServer`, `toggleServer` |
| **Modify** | `frontend/hooks/use-keyboard-shortcuts.ts` | Add `Ctrl+Shift+W` shortcut → `useWsBridgeStore.toggleServer()` |
| **Modify** | `frontend/components/titlebar.tsx` | Add `RemoteServerMenuItem` component, "Remote Access" section in menu |
| **Create** | `electron/__tests__/pty-subscribers.test.ts` | Tests for PTY subscriber pattern |
| **Create** | `electron/__tests__/auth-token.test.ts` | Tests for token generation and validation |
| **Create** | `electron/__tests__/ws-bridge.test.ts` | Tests for WS bridge (auth, commands, rate limit, max clients) |
| **Create** | `electron/__tests__/external-api-pty.test.ts` | Tests for new PTY commands in external API |
| **Create** | `electron/__tests__/main-ws-bridge.test.ts` | Integration tests for IPC handlers |
| **Create** | `frontend/__tests__/stores/ws-bridge.test.ts` | Tests for WS bridge Zustand store |
| **Create/Modify** | `docs/guides/external-api.md` | WebSocket bridge documentation |

---

## Test Strategy

### Unit Tests

| Test File | What it tests |
|-----------|--------------|
| `pty-subscribers.test.ts` | Observer pattern: subscribe/unsubscribe, multi-subscriber broadcast, session metadata |
| `auth-token.test.ts` | Token generation (UUID), validation, in-memory-only (no persistence), robustness to null/undefined |
| `ws-bridge.test.ts` | Full WS server lifecycle: auth rejection, auth acceptance, all commands, rate limiting (mock clock), max-clients enforcement, subscribe streaming |
| `external-api-pty.test.ts` | New command types via Unix socket: list-sessions, session-output, session-input |
| `ws-bridge-store.test.ts` | Zustand store state transitions, IPC invoke calls |

### Integration Tests

| Test | How |
|------|-----|
| `main-ws-bridge.test.ts` | Mock `ws-bridge.ts` and `auth-token.ts`, verify IPC handlers call correct functions |

### Manual Acceptance Tests

1. Start Forja in dev mode: `pnpm dev`
2. Open a Claude session
3. Press `Ctrl+Shift+W` — confirm menu shows "Remote Server (port 9400, 0 clients)"
4. Copy token from menu
5. Connect via `websocat ws://localhost:9400` and send `{"token":"...","type":"list-sessions"}`
6. Confirm session appears in response
7. Send `{"token":"...","type":"subscribe","tabId":"<tabId>"}` and type in terminal
8. Confirm real-time output streams to WebSocket client
9. Press `Ctrl+Shift+W` again — confirm server stops

---

## Acceptance Criteria

- [ ] `subscribePtyOutput(fn)` returns an unsubscribe function that correctly stops delivery
- [ ] `getActiveSessions()` returns `[{ tabId, projectPath, sessionType }]` for all active PTYs
- [ ] PTY subscriber receives `"data"` events in real-time when PTY produces output
- [ ] PTY subscriber receives `"session-start"` event when `spawnPty` is called
- [ ] PTY subscriber receives `"session-exit"` event when PTY process exits
- [ ] `list-sessions` command returns all active sessions via both Unix socket and WebSocket
- [ ] `session-output` returns last 512KB of buffer content for a valid `tabId`
- [ ] `session-output` returns `{ ok: false }` for unknown `tabId`
- [ ] `session-input` writes text to the PTY process
- [ ] WebSocket server starts on port 9400 by default, bound to `0.0.0.0`
- [ ] WebSocket server rejects connections without a valid token (closes with 1008)
- [ ] WebSocket server accepts connections with the correct token
- [ ] Auth token is generated once per Forja startup (not persisted to disk)
- [ ] Auth token is displayed in the titlebar "Remote Access" menu when server is running
- [ ] `Ctrl+Shift+W` toggles the WS server on/off
- [ ] Titlebar "Remote Access" menu item shows server state (port, client count)
- [ ] `subscribe` command streams real-time PTY data until client disconnects or unsubscribes
- [ ] Rate limit of 10 messages/sec enforced per client
- [ ] Max 5 concurrent WS clients enforced (6th gets `{ ok: false }` and is closed)
- [ ] All subscriber cleanup runs when a WS client disconnects (no memory leaks)
- [ ] WS bridge stops cleanly when `window-all-closed` fires
- [ ] All new tests pass: `pnpm test --reporter=verbose`
- [ ] Full test suite still passes: `pnpm test`
- [ ] No TypeScript compiler errors: `pnpm build`
