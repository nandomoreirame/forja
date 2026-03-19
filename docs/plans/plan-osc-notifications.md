# Plan: OSC Sequence Support para Notificações

**Priority:** Medium
**Date:** 2026-03-19

---

## 1. Overview and Motivation

OSC (Operating System Command) escape sequences are a standard mechanism in terminals for applications to communicate with the terminal emulator. Several modern terminals (iTerm2, WezTerm, Kitty, Windows Terminal) support notification sequences:

- **OSC 9** (ConEmu/Windows Terminal): `\e]9;message\007`
- **OSC 99** (custom, some CLIs): `\e]99;i=0;body=message\007`
- **OSC 777** (Urxvt): `\e]777;notify;title;message\007`

AI CLIs and shell scripts can emit these sequences to request native notifications. By parsing these in Forja's xterm.js terminal, we can:
1. Trigger Forja's visual notification system (sidebar ring, badge) automatically
2. Allow any CLI/script to communicate with Forja's UI without needing the external API socket

### Example from Claude Code

A Claude Code `Stop` hook could do:
```sh
printf '\e]9;Claude finished task\007'
```
And Forja would automatically show a notification for that project.

---

## 2. Current State Analysis

### `electron/pty.ts`

- Spawns PTY processes with `node-pty`
- Streams raw terminal output via `pty:data` events to the frontend
- Does **not** parse OSC sequences — raw data goes directly to xterm.js

```ts
ptyProcess.onData((data: string) => {
  session.buffer.write(data);
  sender.send("pty:data", { tab_id: tabId, data });
});
```

### `frontend` — xterm.js integration

The terminal frontend uses xterm.js 6. xterm.js has a parser API that allows registering custom OSC handlers:

```ts
// xterm.js v5+ parser API
terminal.parser.registerOscHandler(9, (data) => {
  // data is the OSC parameter string (e.g., "Hello from Claude")
  return true; // handled
});
```

This allows intercepting OSC sequences **before** xterm.js would try to handle them (xterm.js ignores unknown OSC codes).

### xterm.js version

From `package.json`, xterm.js 6 is used. The `parser.registerOscHandler` API is available in xterm 4+.

### Current notification flow

1. PTY exits → `pty:exit` event → frontend `setProjectSessionState("exited")`
2. `setProjectSessionState` → adds to `unreadProjects` if not active project
3. `markProjectNotified` → adds to `notifiedProjects`
4. Sidebar shows green badge

### What is missing

1. OSC parser registration in the xterm.js terminal initialization
2. Mapping from terminal tab ID → project path (to know which project to notify)
3. Passing notification text from the OSC sequence to the projects store
4. Handling multiple OSC formats (9, 99, 777)

---

## 3. Step-by-Step Implementation Plan

### Step 1: Add OSC handler registration to the terminal component

Find where xterm.js `Terminal` instances are created (likely in `frontend/components/terminal-pane.tsx` or a custom hook like `use-pty.ts`).

Register OSC handlers after terminal initialization:

```ts
// In the terminal initialization useEffect
const osc9Handler = terminal.parser.registerOscHandler(9, (data) => {
  // OSC 9: ConEmu/Windows Terminal format: "\e]9;message\007"
  handleOscNotification(data);
  return true; // prevent default xterm handling
});

const osc99Handler = terminal.parser.registerOscHandler(99, (data) => {
  // OSC 99: Custom format: "\e]99;i=0;body=message\007"
  // Parse the key=value format
  const params: Record<string, string> = {};
  for (const part of data.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) {
      params[part.slice(0, eqIdx)] = part.slice(eqIdx + 1);
    }
  }
  handleOscNotification(params["body"] ?? params["title"] ?? data);
  return true;
});

const osc777Handler = terminal.parser.registerOscHandler(777, (data) => {
  // OSC 777: Urxvt format: "\e]777;notify;title;message\007"
  const parts = data.split(";");
  // parts[0] = "notify", parts[1] = title, parts[2] = message
  const message = parts[2] ?? parts[1] ?? data;
  handleOscNotification(message);
  return true;
});

// Cleanup
return () => {
  osc9Handler.dispose();
  osc99Handler.dispose();
  osc777Handler.dispose();
};
```

**File:** wherever xterm.js `Terminal` is initialized (find the exact component)

### Step 2: Find the terminal initialization file

Search for where `new Terminal(...)` is called to identify the correct file.

**Expected:** `frontend/hooks/use-pty.ts` or `frontend/components/terminal-pane.tsx`

### Step 3: Implement `handleOscNotification` callback

The OSC handler needs access to the terminal's tab ID and project path context. Pass these via closure:

```ts
// In use-pty.ts or terminal-pane.tsx, where tabId and projectPath are available

const handleOscNotification = useCallback((message: string) => {
  const projectsStore = useProjectsStore.getState();
  const currentProjectPath = /* the project path for this terminal */;

  if (!currentProjectPath) return;

  // Don't notify if this project is currently active and user is looking at it
  const { activeProjectPath } = projectsStore;
  if (activeProjectPath !== currentProjectPath) {
    projectsStore.markProjectNotified(currentProjectPath);
    // Store the notification message if the plan-notification-rings feature is implemented
    if (message && "setProjectNotificationMessage" in projectsStore) {
      (projectsStore as any).setProjectNotificationMessage(currentProjectPath, message);
    }
  } else {
    // Project is active — show a toast or subtle in-app notification instead
    // (or simply no-op — the user is already looking at it)
  }
}, [/* projectPath dependency */]);
```

**File:** `frontend/hooks/use-pty.ts` or `frontend/components/terminal-pane.tsx`

### Step 4: Filter OSC sequences from the ring buffer and display output

OSC sequences like `\e]9;message\007` should NOT be rendered as visible text in the terminal. xterm.js 6 handles this automatically when a handler returns `true` (the sequence is consumed). Verify that:
1. The notification message does NOT appear as visible terminal output
2. The bell character (`\007` / BEL) does NOT trigger an audible beep

xterm.js behavior: when `registerOscHandler` returns `true`, the sequence is fully consumed and not rendered.

**Note:** For the ring buffer (used for session persistence), OSC sequences are stored as raw escape codes. This is acceptable — the buffer is for replay and the terminal will consume them again on replay.

### Step 5: Add an OSC test command to the terminal via shell integration (optional)

For development/testing, document how to test:

```sh
# Test OSC 9 (ConEmu format)
printf '\e]9;Task completed!\007'

# Test OSC 777 (Urxvt format)
printf '\e]777;notify;Forja;Claude is done\007'
```

### Step 6: Handle edge cases

1. **Rate limiting:** If a CLI emits many OSC sequences rapidly, debounce the notification:
   ```ts
   const lastNotifyTime = useRef<number>(0);
   const handleOscNotification = (message: string) => {
     const now = Date.now();
     if (now - lastNotifyTime.current < 1000) return; // 1s debounce
     lastNotifyTime.current = now;
     // ... notify ...
   };
   ```

2. **Empty messages:** Treat empty OSC bodies as generic "Activity" notifications

3. **Non-UTF8 content:** The OSC data parameter may contain non-UTF8 bytes. Sanitize with a try/catch around any text operations.

---

## 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `frontend/hooks/use-pty.ts` (or equivalent) | Modify | Register OSC 9/99/777 handlers on terminal init |
| `frontend/stores/projects.ts` | Modify | Depends on plan-notification-rings — add `setProjectNotificationMessage` |

**Note:** No changes to `electron/pty.ts` are required. OSC parsing happens entirely in the xterm.js renderer, not in the Node.js PTY process.

---

## 5. Test Strategy

The xterm.js parser API is difficult to test in jsdom. Tests will mock the parser registration and verify the callbacks are called with the correct data.

### Unit tests

**`frontend/hooks/__tests__/use-pty.test.ts`** (or equivalent):

Mock the xterm.js `Terminal`:
```ts
const mockOscHandlers: Record<number, (data: string) => boolean> = {};
const mockParser = {
  registerOscHandler: vi.fn((code: number, handler: (data: string) => boolean) => {
    mockOscHandlers[code] = handler;
    return { dispose: vi.fn() };
  }),
};
const mockTerminal = {
  parser: mockParser,
  // ... other mocks
};
```

Tests:
- `OSC 9` handler is registered on terminal init
- `OSC 99` handler is registered on terminal init
- `OSC 777` handler is registered on terminal init
- Calling OSC 9 handler with a message calls `markProjectNotified` for the correct project
- Calling OSC 777 handler with `notify;Title;Message` extracts "Message"
- OSC notification is debounced (two rapid calls → only one notification)
- Handler returns `true` (sequence is consumed)
- Handlers are disposed on component unmount

### Manual testing checklist

1. Open Forja, create/open a terminal session in a project
2. Run: `printf '\e]9;Test notification!\007'`
3. Switch to another project
4. Run: `printf '\e]9;Background notification\007'`
5. Verify: notification badge appears on the other project's sidebar icon
6. Switch back — badge clears

---

## 6. Acceptance Criteria

- [ ] xterm.js registers OSC handlers for codes 9, 99, and 777 on terminal initialization
- [ ] Emitting `printf '\e]9;message\007'` in a terminal triggers a notification for that project
- [ ] OSC 777 format (`notify;title;message`) correctly extracts the message
- [ ] OSC 99 format (`body=message;title=...`) correctly extracts the body
- [ ] The OSC sequence does NOT appear as visible garbage in the terminal output
- [ ] Notifications from active project terminals are silently suppressed (user is already looking)
- [ ] Rapid OSC emissions (< 1s apart) are debounced to prevent notification flooding
- [ ] OSC handlers are properly disposed when the terminal component unmounts
- [ ] All new tests pass; existing terminal tests continue to pass
