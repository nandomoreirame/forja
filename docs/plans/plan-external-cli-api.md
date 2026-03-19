# Plan: CLI Programática para Controle Externo

**Priority:** Medium
**Date:** 2026-03-19

---

## 1. Overview and Motivation

Forja runs as an Electron desktop app without any external API surface. This means it cannot be controlled by:
- Claude Code hooks (e.g., `UserPromptSubmit`, `Stop`)
- Shell scripts or automation tools
- CI/CD pipelines
- Other desktop tools wanting to trigger Forja actions

The goal is to implement a **Unix socket server** (or named pipe on Windows) inside Forja's main process that listens for simple JSON commands. A companion `forja` CLI binary (or shell script) wraps this socket to provide a user-friendly command interface.

### Use Cases

1. **`forja notify "Claude finished task X"`** — display a notification in Forja's sidebar from a Claude Code hook
2. **`forja open-project /path/to/project`** — switch Forja to a specific project (or open it if not loaded)
3. **`forja screenshot`** — take a screenshot of the active browser pane and return the path
4. **`forja list-projects`** — list all loaded projects as JSON (useful for scripts)

---

## 2. Current State Analysis

### `electron/main.ts`

- Large file with all IPC handlers
- Uses `app`, `BrowserWindow`, `ipcMain` from Electron
- No socket server code exists
- `app.whenReady()` is the correct place to start the socket server
- `app.on("window-all-closed")` is the correct place to close it

### `electron/paths.ts`

- `getForjaConfigDir()` — returns cross-platform config directory
- Can be used to determine socket path:
  - Linux/macOS: `/tmp/forja-XXXXXX.sock` or `${os.tmpdir()}/forja.sock`
  - Windows: `\\.\pipe\forja`

### Project Structure

No CLI binary exists. The plan is to create either:
- A Node.js script at `scripts/forja-cli.js` (shipped with the app or installed separately)
- Or document that users can use `nc` / `socat` directly for the socket

For maximum usability, a standalone shell script `scripts/forja` or a Node.js thin wrapper will be created.

### IPC bridge to renderer

The socket server runs in the main process. To trigger renderer actions (like switching projects, showing notifications), we need to:
1. Get the focused BrowserWindow
2. Call `win.webContents.send("external:command", payload)` to dispatch to the renderer
3. The renderer listens and executes the action via Zustand stores

---

## 3. Step-by-Step Implementation Plan

### Step 1: Create `electron/external-api.ts` — the socket server

```ts
// electron/external-api.ts
import * as net from "net";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import type { WebContents } from "electron";

export type ExternalCommand =
  | { type: "notify"; message: string; projectPath?: string }
  | { type: "open-project"; projectPath: string }
  | { type: "screenshot" }
  | { type: "list-projects" }
  | { type: "ping" };

export type ExternalResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string };

export function getSocketPath(): string {
  if (process.platform === "win32") {
    return "\\\\.\\pipe\\forja";
  }
  return path.join(os.tmpdir(), "forja.sock");
}

export function startExternalApiServer(
  getWebContents: () => WebContents | null,
  onCommand: (cmd: ExternalCommand) => Promise<ExternalResponse>
): net.Server {
  const socketPath = getSocketPath();

  // Remove stale socket file on Unix
  if (process.platform !== "win32" && fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }

  const server = net.createServer((socket) => {
    let buffer = "";

    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const cmd = JSON.parse(trimmed) as ExternalCommand;
          onCommand(cmd)
            .then((response) => {
              socket.write(JSON.stringify(response) + "\n");
            })
            .catch((err: Error) => {
              socket.write(JSON.stringify({ ok: false, error: err.message }) + "\n");
            });
        } catch {
          socket.write(JSON.stringify({ ok: false, error: "Invalid JSON command" }) + "\n");
        }
      }
    });

    socket.on("error", () => {/* ignore disconnects */});
  });

  server.listen(socketPath, () => {
    console.log(`[ExternalAPI] Listening on ${socketPath}`);
  });

  return server;
}
```

**File:** `electron/external-api.ts` (new)

### Step 2: Start the server in `electron/main.ts`

In `app.whenReady()`, after `createWindow()`:

```ts
import { startExternalApiServer, type ExternalCommand } from "./external-api.js";

// Start external API socket server
const externalServer = startExternalApiServer(
  () => BrowserWindow.getFocusedWindow()?.webContents ?? null,
  async (cmd: ExternalCommand) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    if (!win) return { ok: false, error: "No Forja window open" };

    switch (cmd.type) {
      case "ping":
        return { ok: true, data: { version: app.getVersion() } };

      case "list-projects": {
        // Ask renderer for project list via IPC
        const projects = await win.webContents.executeJavaScript(
          `window.__forjaExternalGetProjects()`
        );
        return { ok: true, data: projects };
      }

      case "open-project":
        win.webContents.send("external:command", cmd);
        win.focus();
        return { ok: true };

      case "notify":
        win.webContents.send("external:command", cmd);
        return { ok: true };

      case "screenshot": {
        // Capture the focused webview screenshot via existing screenshot IPC
        win.webContents.send("external:command", cmd);
        return { ok: true, data: { message: "Screenshot triggered" } };
      }

      default:
        return { ok: false, error: "Unknown command" };
    }
  }
);

// Cleanup on exit
app.on("will-quit", () => {
  externalServer.close();
});
```

**File:** `electron/main.ts`

### Step 3: Handle `external:command` in the renderer (`frontend/App.tsx`)

Add a `useEffect` to listen for external commands:

```ts
useEffect(() => {
  const unlisten = listen<ExternalCommand>("external:command", (cmd) => {
    const projectsStore = useProjectsStore.getState();

    switch (cmd.type) {
      case "open-project": {
        const existing = projectsStore.projects.find(p => p.path === cmd.projectPath);
        if (existing) {
          projectsStore.switchToProject(cmd.projectPath);
        } else {
          projectsStore.addProject(cmd.projectPath)
            .then(() => projectsStore.switchToProject(cmd.projectPath));
        }
        break;
      }

      case "notify": {
        const targetPath = cmd.projectPath ?? projectsStore.activeProjectPath;
        if (targetPath) {
          projectsStore.markProjectNotified(targetPath);
          if (cmd.message) {
            projectsStore.setProjectNotificationMessage(targetPath, cmd.message);
          }
        }
        break;
      }

      case "screenshot": {
        // Trigger screenshot on the active browser pane
        // This uses a pub/sub mechanism or a store action
        // (to be implemented alongside this feature)
        break;
      }
    }
  });

  return () => { unlisten.then(fn => fn()); };
}, []);
```

**File:** `frontend/App.tsx`

### Step 4: Write the `forja` CLI script

Create a thin Node.js script (or shell script) that connects to the socket:

```js
#!/usr/bin/env node
// scripts/forja-cli.js
const net = require("net");
const os = require("os");
const path = require("path");

const SOCKET_PATH =
  process.platform === "win32"
    ? "\\\\.\\pipe\\forja"
    : path.join(os.tmpdir(), "forja.sock");

const [,, commandName, ...args] = process.argv;

let command;
switch (commandName) {
  case "ping":
    command = { type: "ping" };
    break;
  case "notify":
    command = { type: "notify", message: args.join(" ") };
    break;
  case "open-project":
    command = { type: "open-project", projectPath: args[0] };
    break;
  case "list-projects":
    command = { type: "list-projects" };
    break;
  case "screenshot":
    command = { type: "screenshot" };
    break;
  default:
    console.error(`Unknown command: ${commandName}`);
    console.error("Usage: forja <ping|notify|open-project|list-projects|screenshot> [args...]");
    process.exit(1);
}

const client = net.createConnection(SOCKET_PATH, () => {
  client.write(JSON.stringify(command) + "\n");
});

client.on("data", (data) => {
  const response = JSON.parse(data.toString().trim());
  if (response.ok) {
    if (response.data) console.log(JSON.stringify(response.data, null, 2));
  } else {
    console.error(`Error: ${response.error}`);
    process.exit(1);
  }
  client.end();
});

client.on("error", (err) => {
  if (err.code === "ENOENT" || err.code === "ECONNREFUSED") {
    console.error("Forja is not running or the socket is unavailable.");
  } else {
    console.error(`Connection error: ${err.message}`);
  }
  process.exit(1);
});
```

**File:** `scripts/forja-cli.js` (new)

Also create a shell wrapper at `scripts/forja`:
```sh
#!/usr/bin/env bash
node "$(dirname "$0")/forja-cli.js" "$@"
```

### Step 5: Document the integration for Claude Code hooks

Add a note to `docs/guides/external-api.md` showing how to use in Claude Code hooks:

```sh
# ~/.claude/hooks/notify.sh
#!/usr/bin/env bash
# Notify Forja when a task completes
if command -v forja &> /dev/null; then
  forja notify "Claude finished: $(echo "$CLAUDE_TASK" | head -c 80)"
fi
```

**File:** `docs/guides/external-api.md` (new)

---

## 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `electron/external-api.ts` | Create | Unix socket server with JSON protocol |
| `electron/main.ts` | Modify | Start/stop socket server in `whenReady`/`will-quit` |
| `frontend/App.tsx` | Modify | Listen for `external:command` events and dispatch to stores |
| `scripts/forja-cli.js` | Create | Node.js CLI client for the socket |
| `scripts/forja` | Create | Shell wrapper for the CLI |
| `docs/guides/external-api.md` | Create | Integration documentation |

---

## 5. Test Strategy

### Unit tests

**`electron/__tests__/external-api.test.ts`:**
- Socket server starts and listens on the correct path
- `ping` command returns `{ ok: true, data: { version: "..." } }`
- Unknown command returns `{ ok: false, error: "Unknown command" }`
- Invalid JSON returns error response
- Multiple commands on a single connection are handled correctly
- Stale socket file is removed on startup (Unix)
- Server closes cleanly on `close()`

### Integration tests (manual)

1. Start Forja
2. `node scripts/forja-cli.js ping` → `{ "version": "1.x.x" }`
3. `node scripts/forja-cli.js notify "Hello from terminal"` → notification appears in sidebar
4. `node scripts/forja-cli.js open-project /path/to/project` → Forja switches project
5. `node scripts/forja-cli.js list-projects` → JSON array of project paths
6. Kill Forja, run `node scripts/forja-cli.js ping` → "Forja is not running" error

---

## 6. Acceptance Criteria

- [ ] Forja starts a Unix socket server at `/tmp/forja.sock` (or named pipe on Windows) on launch
- [ ] `ping` returns the current Forja version
- [ ] `notify "message"` displays a notification in the sidebar for the active project
- [ ] `notify "message" --project /path` displays notification for a specific project
- [ ] `open-project /path` switches Forja to that project (or adds it if not in the list)
- [ ] `list-projects` returns a JSON array of `{ path, name }` objects
- [ ] CLI exits with code 0 on success, 1 on error
- [ ] CLI prints helpful error when Forja is not running
- [ ] Socket is cleaned up properly when Forja quits
- [ ] All new tests pass
