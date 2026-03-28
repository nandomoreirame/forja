# External API — Programmatic Control of Forja

Forja exposes a local Unix socket server (named pipe on Windows) that allows external tools, shell scripts, and automation hooks to control the application programmatically. This API is useful for integrating Forja with Claude Code hooks, CI/CD pipelines, or any tool that runs in a terminal alongside your development workflow.

---

## Overview

When Forja starts, it creates a socket server in the main process. External clients connect to this socket and send JSON commands over a simple line-delimited protocol. Forja processes each command and sends back a JSON response.

**Key properties:**

- Local-only (no network exposure)
- JSON-line protocol (one object per line)
- Synchronous request/response model
- The companion `forja` CLI wraps the socket for shell convenience

---

## Socket Location

| Platform | Path |
|----------|------|
| Linux / macOS | `/tmp/forja.sock` |
| Windows | `\\.\pipe\forja` |

The socket file is created when Forja starts and removed when Forja quits. On Unix, if a stale socket file exists from a previous crash, Forja removes it automatically on startup.

---

## Protocol

The protocol is JSON-line (newline-delimited JSON):

- **Request**: Send one JSON object followed by a newline (`\n`)
- **Response**: Receive one JSON object followed by a newline (`\n`)

**Success response shape:**

```json
{"ok": true, "data": {...}}
```

**Error response shape:**

```json
{"ok": false, "error": "Human-readable error message"}
```

The `data` field is present only when the command returns payload (e.g., `ping`, `list-projects`). Commands like `notify` and `open-project` return `{"ok": true}` with no `data`.

---

## Available Commands

### `ping`

Checks if Forja is running and returns the current version.

**Request:**

```json
{"type": "ping"}
```

**Response:**

```json
{"ok": true, "data": {"version": "1.8.6"}}
```

---

### `notify`

Displays a notification in Forja's sidebar. Optionally targets a specific project.

**Request:**

```json
{"type": "notify", "message": "Build completed successfully"}
```

With an optional project path:

```json
{"type": "notify", "message": "Tests passed", "projectPath": "/home/user/projects/my-app"}
```

**Response:**

```json
{"ok": true}
```

If `projectPath` is omitted, the notification appears for the currently active project.

---

### `open-project`

Switches Forja to the specified project. If the project is not already loaded, Forja adds it to the project list and switches to it.

**Request:**

```json
{"type": "open-project", "projectPath": "/home/user/projects/my-app"}
```

**Response:**

```json
{"ok": true}
```

---

### `list-projects`

Returns the list of all projects currently loaded in Forja.

**Request:**

```json
{"type": "list-projects"}
```

**Response:**

```json
{"ok": true, "data": [{"path": "/home/user/projects/my-app", "name": "my-app"}, ...]}
```

---

### `screenshot`

Triggers a screenshot of the active browser pane. The capture is handled asynchronously by the renderer.

**Request:**

```json
{"type": "screenshot"}
```

**Response:**

```json
{"ok": true, "data": {"message": "Screenshot triggered"}}
```

---

## Using the CLI

Forja ships a companion `forja` CLI that wraps the socket for use in shell scripts and hooks. Install it by ensuring `scripts/forja` (or `scripts/forja-cli.js`) is on your `PATH`.

### Check if Forja is running

```sh
forja ping
```

Output:

```
{
  "version": "1.8.6"
}
```

### Send a notification

```sh
forja notify "Build completed successfully"
```

### Send a notification to a specific project

```sh
forja notify "Tests passed" /home/user/projects/my-app
```

### Switch to a project

```sh
forja open-project /home/user/projects/my-app
```

### List all projects

```sh
forja list-projects
```

Output:

```json
[
  {"path": "/home/user/projects/my-app", "name": "my-app"},
  {"path": "/home/user/projects/other-app", "name": "other-app"}
]
```

### Take a screenshot

```sh
forja screenshot
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Command succeeded |
| `1` | Error (Forja not running, unknown command, invalid arguments) |

---

## Integration with Claude Code Hooks

The most common use case is triggering Forja notifications from Claude Code's `Stop` hook, so you get a visual indicator in the Forja sidebar whenever Claude finishes a task.

### Basic `Stop` hook

```sh
# ~/.claude/hooks/notify.sh
#!/usr/bin/env bash
if command -v forja &> /dev/null; then
  forja notify "Claude finished: $(echo "$CLAUDE_TASK" | head -c 80)"
fi
```

Register this in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/notify.sh"
          }
        ]
      }
    ]
  }
}
```

### Notify with project context

If your hook knows the current project path, pass it explicitly so the notification appears under the right project even if Forja is focused on a different one:

```sh
#!/usr/bin/env bash
PROJECT_PATH="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if command -v forja &> /dev/null; then
  forja notify "Claude finished: $(echo "$CLAUDE_TASK" | head -c 80)" "$PROJECT_PATH"
fi
```

### Auto-switch project on session start

```sh
# ~/.claude/hooks/session-start.sh (add to existing hook)
#!/usr/bin/env bash
PROJECT_PATH="$(git rev-parse --show-toplevel 2>/dev/null)"

if [ -n "$PROJECT_PATH" ] && command -v forja &> /dev/null; then
  forja open-project "$PROJECT_PATH" 2>/dev/null || true
fi
```

---

## Direct Socket Access

If you prefer not to use the CLI, you can communicate with the socket directly using standard Unix tools.

### Using `socat`

```sh
# Ping
echo '{"type":"ping"}' | socat - UNIX-CONNECT:/tmp/forja.sock

# Send a notification
echo '{"type":"notify","message":"Hello from socat"}' | socat - UNIX-CONNECT:/tmp/forja.sock

# Open a project
echo '{"type":"open-project","projectPath":"/home/user/projects/my-app"}' | socat - UNIX-CONNECT:/tmp/forja.sock

# List projects
echo '{"type":"list-projects"}' | socat - UNIX-CONNECT:/tmp/forja.sock
```

### Using `nc` (netcat)

```sh
# Ping (GNU netcat with Unix socket support)
echo '{"type":"ping"}' | nc -U /tmp/forja.sock

# Send a notification
echo '{"type":"notify","message":"Hello from nc"}' | nc -U /tmp/forja.sock
```

### Using Node.js directly

```js
const net = require("net");

const client = net.createConnection("/tmp/forja.sock", () => {
  client.write(JSON.stringify({ type: "ping" }) + "\n");
});

client.on("data", (data) => {
  console.log(JSON.parse(data.toString().trim()));
  client.end();
});
```

### Windows named pipe

On Windows, use `\\.\pipe\forja` in place of the socket path. PowerShell example:

```powershell
$pipe = New-Object System.IO.Pipes.NamedPipeClientStream(".", "forja", "InOut")
$pipe.Connect(1000)
$writer = New-Object System.IO.StreamWriter($pipe)
$reader = New-Object System.IO.StreamReader($pipe)
$writer.WriteLine('{"type":"ping"}')
$writer.Flush()
$response = $reader.ReadLine()
Write-Output $response
$pipe.Close()
```

---

## Error Handling

### Common error responses

| Error | Cause |
|-------|-------|
| `"Invalid JSON command"` | Malformed JSON in the request |
| `"Unknown command"` | The `type` field is not recognized |
| `"No Forja window open"` | Forja process is running but no window is visible |

### Forja not running

When Forja is not running, the socket file does not exist (Unix) or the pipe is unavailable (Windows). The CLI reports a clear message and exits with code 1:

```
Forja is not running or the socket is unavailable.
```

When writing shell scripts, check the exit code before proceeding:

```sh
if forja ping &> /dev/null; then
  forja notify "Task completed"
else
  echo "Forja is not running, skipping notification"
fi
```

### Stale socket file

On Linux/macOS, if Forja crashes without cleaning up, the socket file at `/tmp/forja.sock` may remain on disk. Forja automatically removes stale socket files when it starts. If you encounter `ECONNREFUSED` on a file that exists, it means Forja is not running — delete the file manually or wait for Forja to start and clean it up:

```sh
rm -f /tmp/forja.sock
```

---

## Security

The socket server binds to a local Unix socket (or Windows named pipe), which means:

- **No network exposure** — the socket is not accessible over TCP/IP or from other machines
- **Local user access only** — on Unix, the socket file inherits the permissions of the user running Forja; other users on the same machine cannot connect without appropriate file system permissions
- **No authentication** — any local process running as the same user can send commands; this matches the threat model of a developer desktop tool

If you are running in a shared environment, ensure your `/tmp` directory has appropriate permissions or consider whether this API surface is appropriate for your use case.

---

## WebSocket Bridge

In addition to the Unix socket / named pipe, Forja optionally exposes a **WebSocket server** that speaks the same JSON protocol. This makes it possible to control Forja from other machines on the same local network — useful for remote scripting, mobile dashboards, or multi-machine development setups.

**Key properties:**

- Default port: **9400** (configurable in Settings)
- Binds to `0.0.0.0` — accessible from any device on the local network
- Same JSON protocol as the Unix socket (one JSON object per message)
- **Token authentication required** for every message
- Supports real-time PTY event streaming via `subscribe`

The server is **opt-in** — it is not started automatically. See [UI Toggle](#ui-toggle) below for how to enable it.

---

## Authentication

When the WebSocket server starts, Forja generates a **random token** unique to that session. The token is:

- Displayed as a toast notification in the Forja UI when the server starts
- Shown in the status bar alongside the port number
- Kept **in memory only** — never written to disk or logged in full

**Every WebSocket message must include the token:**

```json
{"token": "your-token-here", "type": "ping"}
```

If the first message from a client does not include a valid token, the connection is immediately closed with an error response:

```json
{"ok": false, "error": "Unauthorized"}
```

The token **changes each time the server is restarted**. If you restart the server (toggle it off and on), all existing clients are disconnected and must obtain the new token from the Forja UI.

---

## PTY Session Commands

These commands are available on both the Unix socket and the WebSocket bridge. They allow external tools to inspect and interact with active terminal sessions running inside Forja.

### `list-sessions`

Returns all currently active terminal tabs (PTY sessions).

**Request:**

```json
{"type": "list-sessions"}
```

**Response:**

```json
{
  "ok": true,
  "data": [
    {"tabId": "tab-abc123", "projectPath": "/home/user/projects/my-app", "sessionType": "claude"},
    {"tabId": "tab-def456", "projectPath": "/home/user/projects/other-app", "sessionType": "terminal"}
  ]
}
```

Each entry includes `tabId` (unique identifier for the tab), `projectPath` (the working directory), and `sessionType` (e.g., `claude`, `gemini`, `terminal`).

---

### `session-output`

Reads the buffered output of a specific terminal session (up to the last 512 KB of the ring buffer).

**Request:**

```json
{"type": "session-output", "tabId": "tab-abc123"}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "tabId": "tab-abc123",
    "content": "...terminal output as plain text..."
  }
}
```

---

### `session-input`

Sends text input to a specific terminal session, as if it were typed by the user.

**Request:**

```json
{"type": "session-input", "tabId": "tab-abc123", "text": "ls -la\n"}
```

Include `\n` at the end to submit the command (equivalent to pressing Enter).

**Response:**

```json
{"ok": true}
```

---

### `subscribe`

**WebSocket only.** Subscribes to real-time PTY output events for a specific terminal tab. After a successful subscription, the server streams PTY events to the client as they occur.

**Request:**

```json
{"token": "your-token-here", "type": "subscribe", "tabId": "tab-abc123"}
```

**Confirmation response:**

```json
{"ok": true, "data": {"subscribed": true, "tabId": "tab-abc123"}}
```

**Streaming events (pushed by server):**

```json
{"type": "pty-event", "event": "data", "tabId": "tab-abc123", "data": "...output chunk..."}
```

The subscription remains active until the client disconnects or the tab is closed.

---

## WebSocket Examples

### Connect and authenticate

```bash
# Install websocat: https://github.com/vi/websocat
websocat ws://192.168.1.100:9400

# Check connectivity — include token in every message
{"token":"your-token-here","type":"ping"}
# Response: {"ok":true,"data":{"version":"1.8.6"}}
```

### List active terminal sessions

```bash
{"token":"your-token-here","type":"list-sessions"}
# Response:
# {"ok":true,"data":[{"tabId":"tab-abc123","projectPath":"/home/user/projects/my-app","sessionType":"claude"}]}
```

### Read session output

```bash
{"token":"your-token-here","type":"session-output","tabId":"tab-abc123"}
# Response:
# {"ok":true,"data":{"tabId":"tab-abc123","content":"...last 512KB of terminal output..."}}
```

### Send input to an AI session

```bash
{"token":"your-token-here","type":"session-input","tabId":"tab-abc123","text":"explain this code\n"}
# Response: {"ok":true}
```

### Subscribe to real-time output

```bash
{"token":"your-token-here","type":"subscribe","tabId":"tab-abc123"}
# Confirmation: {"ok":true,"data":{"subscribed":true,"tabId":"tab-abc123"}}
# Then streaming events:
# {"type":"pty-event","event":"data","tabId":"tab-abc123","data":"...output..."}
# {"type":"pty-event","event":"data","tabId":"tab-abc123","data":"...more output..."}
```

---

## Python Client Example

```python
import asyncio
import websockets
import json

FORJA_URI = "ws://192.168.1.100:9400"
TOKEN = "your-token-here"

async def main():
    async with websockets.connect(FORJA_URI) as ws:
        # List active sessions
        await ws.send(json.dumps({"token": TOKEN, "type": "list-sessions"}))
        response = json.loads(await ws.recv())
        sessions = response.get("data", [])
        print("Active sessions:", sessions)

        if not sessions:
            print("No active sessions found.")
            return

        tab_id = sessions[0]["tabId"]

        # Subscribe to real-time output from the first session
        await ws.send(json.dumps({"token": TOKEN, "type": "subscribe", "tabId": tab_id}))
        confirmation = json.loads(await ws.recv())
        print("Subscribed:", confirmation)

        # Stream PTY output until disconnected
        async for message in ws:
            event = json.loads(message)
            if event.get("type") == "pty-event":
                print(event["data"], end="", flush=True)

asyncio.run(main())
```

Install the dependency with:

```bash
pip install websockets
```

---

## UI Toggle

The WebSocket server is controlled entirely from within Forja — no config file editing required.

| Method | Action |
|--------|--------|
| **Keyboard shortcut** | `Ctrl+Shift+R` — toggles the server on/off |
| **Titlebar menu** | View > Start Remote Server / Stop Remote Server |
| **Status bar** | Green radio icon with the port number when the server is running; click to stop |

When the server starts, a **toast notification** displays the token. Copy it immediately — it will not be shown again without restarting the server.

---

## Security Considerations

The WebSocket bridge expands the attack surface compared to the local Unix socket. Keep the following in mind:

- **Token-based authentication** — the token is generated per session, kept in memory only, and never logged in full. Treat it like a password.
- **Rate limiting** — each WebSocket client is limited to **10 messages per second**. Clients that exceed this are disconnected.
- **Connection limit** — a maximum of **5 concurrent WebSocket clients** are allowed. New connections beyond this limit are rejected.
- **Local network only by default** — the server binds to `0.0.0.0` but does not expose a public IP unless your machine is directly reachable from the internet. Use a firewall to restrict access if needed.
- **Token is displayed in Forja UI only** — the token is shown as a toast notification and never written to logs, config files, or stdout. Do not share your screen while the token is visible.
- **No TLS** — traffic between clients and the WebSocket server is not encrypted. Do not use this feature over untrusted networks (e.g., public Wi-Fi). For remote access, consider tunneling through SSH (`ssh -L 9400:localhost:9400 user@host`).
