# Plan: Fix PTY Session Persistence

## Problem

Terminal sessions (especially AI CLI sessions like Claude/Gemini/Codex) are being killed and restarted when switching between projects or workspaces. The root cause is a 30-second frontend cache TTL that destroys xterm instances without killing backend PTY processes, combined with missing reconnection logic.

## 5 Bugs Identified

1. **CRITICAL** - `terminal-instance-cache.ts:76-84`: Cache TTL eviction disposes xterm but does NOT kill backend PTY
2. **CRITICAL** - `electron/pty.ts:122`: `spawnPty` overwrites existing sessions without killing old PTY (process leak)
3. **HIGH** - `stores/workspace.ts:208`: `activateWorkspace` clears tabs without closing PTYs
4. **HIGH** - `stores/tiling-layout.ts:385-413`: Layout restore creates new Model, unmounting everything (relies on 30s cache)
5. **MEDIUM** - `terminal-instance-cache.ts:87-96`: Dispatcher handlers not cleaned up on cache eviction

## Implementation Steps

### Step 1: Fix backend `spawnPty` to kill existing session first

**File:** `electron/pty.ts`

In `spawnPty()`, before `sessions.set(tabId, session)`, check if a session already exists for that tabId. If so, kill it first:

```typescript
// Before creating new session, kill any existing one with same tabId
const existing = sessions.get(tabId);
if (existing) {
  try {
    existing.process.kill();
  } catch {
    // already dead
  }
  sessions.delete(tabId);
}
```

Add this right before the `pty.spawn()` call (around line 83).

**Tests:** `electron/__tests__/pty-spawn.test.ts` - add test that spawning with existing tabId kills old PTY first.

### Step 2: Add `hasPty` IPC handler to check if a backend PTY is alive

**File:** `electron/pty.ts` - add new export:

```typescript
export function hasPty(tabId: string): boolean {
  return sessions.has(tabId);
}
```

**File:** `electron/main.ts` - register IPC handler:

```typescript
ipcMain.handle("pty:has-session", (_event, args: { tabId: string }) => {
  return hasPty(args.tabId);
});
```

**File:** `electron/preload.ts` - expose in contextBridge (check existing pattern).

**File:** `frontend/lib/ipc.ts` - no changes needed, `invoke` is generic.

**Tests:** Unit test for `hasPty` in pty tests.

### Step 3: Fix `terminal-instance-cache.ts` eviction to kill PTY and clean dispatcher

**File:** `frontend/lib/terminal-instance-cache.ts`

The TTL eviction handler must:
1. Call `invoke("close_pty", { tabId })` to kill the backend PTY
2. Unregister ptyDispatcher handlers
3. Then dispose the xterm Terminal

```typescript
ttlTimers.set(
  tabId,
  setTimeout(() => {
    const entry = cache.get(tabId);
    if (entry) {
      // Kill backend PTY process
      invoke("close_pty", { tabId }).catch(() => {});
      // Unregister dispatcher handlers
      ptyDispatcher.unregisterData(tabId);
      ptyDispatcher.unregisterExit(tabId);
      // Dispose frontend terminal
      entry.terminal.dispose();
      cache.delete(tabId);
    }
    ttlTimers.delete(tabId);
  }, CACHE_TTL_MS),
);
```

Also add cleanup in `evictOldest()`:
```typescript
function evictOldest(): void {
  const oldest = cache.keys().next().value;
  if (oldest !== undefined) {
    const entry = cache.get(oldest);
    if (entry) {
      invoke("close_pty", { tabId: oldest }).catch(() => {});
      ptyDispatcher.unregisterData(oldest);
      ptyDispatcher.unregisterExit(oldest);
      entry.terminal.dispose();
    }
    cache.delete(oldest);
    clearTtlTimer(oldest);
  }
}
```

And add cleanup in `clear()`:
```typescript
clear(): void {
  for (const timer of ttlTimers.values()) {
    clearTimeout(timer);
  }
  ttlTimers.clear();
  for (const [tabId, entry] of cache) {
    invoke("close_pty", { tabId }).catch(() => {});
    ptyDispatcher.unregisterData(tabId);
    ptyDispatcher.unregisterExit(tabId);
    entry.terminal.dispose();
  }
  cache.clear();
}
```

**Tests:** `frontend/lib/__tests__/terminal-instance-cache.test.ts` - test that eviction calls close_pty and unregisters dispatcher.

### Step 4: Implement PTY reconnection (the core fix)

**File:** `frontend/components/terminal-session.tsx`

When the component mounts and there's NO cached terminal but the tab still exists in the store, check if a backend PTY is alive for this tabId. If so, reconnect by:
1. Creating a new xterm Terminal
2. Fetching the buffer from the backend via `pty:get-buffer`
3. Writing the buffer to the new terminal (replays recent output)
4. Re-registering with ptyDispatcher (already happens in use-pty)
5. NOT spawning a new PTY

Replace the mount effect logic (around line 74-204):

```typescript
if (cached) {
  // REATTACH: move cached DOM + terminal instance
  terminal = cached.terminal;
  fitAddon = cached.fitAddon;
  hostElement = cached.hostElement;
  containerRef.current.appendChild(hostElement);
  shouldSpawn = false;
} else {
  // NEW: create terminal + host element
  hostElement = document.createElement("div");
  hostElement.className = "h-full w-full";
  containerRef.current.appendChild(hostElement);
  // ... create terminal, addons, etc ...

  // Check if a backend PTY is still alive for this tabId
  const ptyAlive = await invoke<boolean>("pty:has-session", { tabId });
  if (ptyAlive) {
    shouldSpawn = false; // Don't spawn new PTY
    // Replay buffer from backend
    const buffer = await invoke<string | null>("pty:get-buffer", { tabId });
    if (buffer) {
      terminal.write(buffer);
    }
  }
}
```

Note: the current effect is synchronous. This will need to be wrapped in an async IIFE inside the effect, or use a state machine approach.

**Approach for async in useEffect:** Use a flag to check if the component was unmounted before applying the result:

```typescript
useEffect(() => {
  if (!containerRef.current) return;
  let aborted = false;

  const init = async () => {
    const cached = terminalCache.get(tabId);
    let terminal: Terminal;
    let fitAddon: FitAddon;
    let hostElement: HTMLDivElement;
    let shouldSpawn = true;

    if (cached) {
      // ... reattach logic (same as before) ...
      shouldSpawn = false;
    } else {
      // ... create new terminal ...

      // KEY: Check if backend PTY exists (reconnection)
      try {
        const ptyAlive = await invoke<boolean>("pty:has-session", { tabId });
        if (ptyAlive && !aborted) {
          shouldSpawn = false;
          const buffer = await invoke<string | null>("pty:get-buffer", { tabId });
          if (buffer && !aborted) {
            terminal.write(buffer);
          }
        }
      } catch {
        // Fallback: spawn new PTY
      }
    }

    if (aborted) {
      terminal.dispose();
      hostElement.remove();
      return;
    }

    // ... rest of setup (WebGL, resize observer, fit, spawn if needed) ...
  };

  init();

  return () => {
    aborted = true;
    // ... cleanup ...
  };
}, [tabId]);
```

**Tests:** `frontend/hooks/__tests__/use-pty.test.ts` and component tests.

### Step 5: Fix `activateWorkspace` to close PTYs before clearing tabs

**File:** `frontend/stores/workspace.ts`

Before clearing tabs at line 208, close all existing PTYs:

```typescript
// Close all existing PTYs before clearing tabs
const existingTabs = useTerminalTabsStore.getState().tabs;
for (const tab of existingTabs) {
  invoke("close_pty", { tabId: tab.id }).catch(() => {});
}

// Clear terminal cache to prevent stale reattachments
const { terminalCache } = await import("@/lib/terminal-instance-cache");
terminalCache.clear();

// Clear terminal tabs
useTerminalTabsStore.setState({ tabs: [], activeTabId: null });
```

**Tests:** `frontend/stores/__tests__/workspace.test.ts` - test that activateWorkspace closes PTYs.

### Step 6: Increase cache TTL for AI CLI sessions

**File:** `frontend/lib/terminal-instance-cache.ts`

Consider making the TTL configurable or much longer. AI CLI sessions should survive indefinitely while the app is running. Change:

```typescript
export const CACHE_TTL_MS = 30_000; // current: 30 seconds
```

To:

```typescript
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

Or better, with Step 4's reconnection in place, the TTL only affects xterm memory usage, not session survival. So 5 minutes is a reasonable balance.

Also increase `CACHE_MAX_SIZE`:

```typescript
export const CACHE_MAX_SIZE = 10; // current
```

To:

```typescript
export const CACHE_MAX_SIZE = 20; // support more concurrent sessions
```

### Step 7: Add preload bridge for new IPC channel

**File:** `electron/preload.ts`

Add `pty:has-session` to the contextBridge expose list (follow existing pattern for IPC channels).

## Test Strategy

Each step requires TDD (Red-Green-Refactor):

1. **Step 1:** Test `spawnPty` kills existing session before creating new one
2. **Step 2:** Test `hasPty` returns correct boolean
3. **Step 3:** Test cache eviction calls `close_pty` and unregisters dispatcher
4. **Step 4:** Test terminal reconnection when cache miss but PTY alive
5. **Step 5:** Test workspace activation closes PTYs
6. **Step 6:** Test new TTL and cache size values

## Execution Order

Steps 1 → 2 → 7 → 3 → 4 → 5 → 6

Step 1 and 2 are backend fixes (no frontend deps).
Step 7 bridges the new IPC channel.
Steps 3, 4, 5, 6 are frontend fixes that depend on Step 2.

## Files Modified

- `electron/pty.ts` (Steps 1, 2)
- `electron/main.ts` (Step 2)
- `electron/preload.ts` (Step 7)
- `frontend/lib/terminal-instance-cache.ts` (Steps 3, 6)
- `frontend/components/terminal-session.tsx` (Step 4)
- `frontend/stores/workspace.ts` (Step 5)
- Test files for each
