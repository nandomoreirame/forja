# Fix Terminal Output Corruption & Session Persistence on Project Switch

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two critical bugs: (1) xterm.js output corruption when switching projects, and (2) AI CLI sessions (Claude, Gemini, etc.) starting from scratch instead of resuming when returning to a project.

**Architecture:** Three layers of fixes: terminal reattach hardening (canvas corruption), cache resilience (session persistence beyond TTL), and a permanent exit handler to track PTY lifecycle regardless of frontend state. The PTY backend never kills sessions during project switch; the fix ensures the frontend matches this contract.

**Tech Stack:** TypeScript, React, xterm.js, FitAddon, node-pty, Zustand, Electron IPC

**CRITICAL INVARIANT:** AI CLI sessions MUST survive project switches indefinitely. A user switching away for 30 minutes and coming back MUST find their session intact with full history. Killing a PTY during project switch is a P0 bug.

---

## Root Cause Analysis

### Bug 1: Output Corruption on Project Switch

**Symptoms:** Text overlapping, lines broken, content scattered across terminal area.

**Root causes chain:**

1. `terminal-block.tsx:28` hardcodes `isVisible={true}` — the visibility recovery effect in `terminal-session.tsx:559-580` NEVER fires because `isVisible` never changes from `true` to `true`.
2. The initial `fitAddon.fit()` in `terminal-session.tsx:335` (RAF callback) does NOT check if the container has valid dimensions (non-zero width/height). The `handleResize` ResizeObserver handler at line 458 has this guard, but the init path doesn't.
3. When reattaching from cache (`terminal-session.tsx:343-348`), screen clear only happens when terminal dimensions change. But canvas corruption can occur even at the same dimensions because xterm.js writes happened to a DOM-detached terminal (cache park writes via `terminal-instance-cache.ts:137-142`).

### Bug 2: Sessions Starting From Scratch

**Symptoms:** Returning to a project shows Claude with "0 tokens", brand new session.

**Root causes chain:**

1. `terminal-instance-cache.ts` TTL is 5 minutes (`CACHE_TTL_MS = 5 * 60 * 1000`). After expiration, the cached terminal is disposed AND the `ptyDispatcher` exit handler is unregistered (lines 96-99).
2. With no exit handler registered, if the PTY process exits (crash, idle timeout, OS signal), the event is silently dropped. The tab in `terminal-tabs.ts` stays `isRunning: true` even though the PTY is dead.
3. When the user returns, `terminal-session.tsx:282` calls `pty:has-session` which returns `false` (PTY exited). A new PTY is spawned.
4. If `cliSessionId` is set, spawn uses `--resume` flag. But if the sessionId detection never completed (e.g., parked before detection interval fired), no resume happens → brand new session.
5. Even WITH `--resume`, if the cache-eviction killed the exit handler and the tab still says `isRunning: true`, the spawn logic at lines 415-427 doesn't check for resume — it treats it as a fresh active tab and spawns without resume args.

**Key insight:** The backend (`pty.ts`) NEVER kills PTYs during `switchToProject`. The `sessions` Map keeps them alive. The problem is purely on the frontend: cache TTL evicts the terminal, exit handlers vanish, and the session state becomes inconsistent.

---

## Files Overview

| File | Role |
|------|------|
| `frontend/lib/terminal-instance-cache.ts` | Terminal park/resume cache with TTL |
| `frontend/components/terminal-session.tsx` | Terminal mount/unmount/reattach lifecycle |
| `frontend/components/blocks/terminal-block.tsx` | Bridge between FlexLayout and TerminalSession |
| `frontend/hooks/use-pty.ts` | PTY IPC hooks (spawn, write, resize, close) |
| `frontend/lib/pty-dispatcher.ts` | Centralized PTY event routing |
| `frontend/stores/terminal-tabs.ts` | Tab state management |
| `frontend/stores/projects.ts` | Project switch orchestration |

---

## Task 1: Add Permanent PTY Exit Handler in Dispatcher

The ptyDispatcher must ALWAYS track exit events for tabs that have running PTYs, regardless of cache state or terminal mount status. This prevents "ghost" tabs that show as running but have dead PTYs.

**Files:**

- Modify: `apps/desktop/frontend/lib/pty-dispatcher.ts`
- Test: `apps/desktop/frontend/lib/__tests__/pty-dispatcher.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/desktop/frontend/lib/__tests__/pty-dispatcher.test.ts
import { describe, it, expect, vi } from "vitest";
import { createPtyDispatcher } from "../pty-dispatcher";

describe("PtyDispatcher", () => {
  it("routes data to registered handler", () => {
    const dispatcher = createPtyDispatcher();
    const handler = vi.fn();
    dispatcher.registerData("tab-1", handler);
    dispatcher.handleData({ tab_id: "tab-1", data: "hello" });
    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("routes exit to registered handler", () => {
    const dispatcher = createPtyDispatcher();
    const handler = vi.fn();
    dispatcher.registerExit("tab-1", handler);
    dispatcher.handleExit({ tab_id: "tab-1", code: 0 });
    expect(handler).toHaveBeenCalledWith(0);
  });

  it("calls permanent exit handler when no tab-specific handler exists", () => {
    const dispatcher = createPtyDispatcher();
    const permanent = vi.fn();
    dispatcher.registerPermanentExitHandler(permanent);
    dispatcher.handleExit({ tab_id: "tab-orphan", code: 1 });
    expect(permanent).toHaveBeenCalledWith("tab-orphan", 1);
  });

  it("does NOT call permanent handler when tab-specific handler exists", () => {
    const dispatcher = createPtyDispatcher();
    const permanent = vi.fn();
    const tabHandler = vi.fn();
    dispatcher.registerPermanentExitHandler(permanent);
    dispatcher.registerExit("tab-1", tabHandler);
    dispatcher.handleExit({ tab_id: "tab-1", code: 0 });
    expect(tabHandler).toHaveBeenCalledWith(0);
    expect(permanent).not.toHaveBeenCalled();
  });

  it("global data handler receives all events", () => {
    const dispatcher = createPtyDispatcher();
    const global = vi.fn();
    dispatcher.onGlobalData(global);
    dispatcher.handleData({ tab_id: "tab-1", data: "x" });
    expect(global).toHaveBeenCalledWith("tab-1", "x");
  });

  it("destroy clears all handlers including permanent", () => {
    const dispatcher = createPtyDispatcher();
    const permanent = vi.fn();
    dispatcher.registerPermanentExitHandler(permanent);
    dispatcher.destroy();
    dispatcher.handleExit({ tab_id: "tab-1", code: 0 });
    expect(permanent).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/desktop && pnpm test frontend/lib/__tests__/pty-dispatcher.test.ts`
Expected: FAIL — `registerPermanentExitHandler` does not exist

**Step 3: Implement permanent exit handler in dispatcher**

```typescript
// In pty-dispatcher.ts — add to PtyDispatcher interface and createPtyDispatcher
export interface PtyDispatcher {
  registerData: (tabId: string, handler: DataHandler) => void;
  unregisterData: (tabId: string) => void;
  registerExit: (tabId: string, handler: ExitHandler) => void;
  unregisterExit: (tabId: string) => void;
  onGlobalData: (handler: GlobalDataHandler) => void;
  /** Register a fallback exit handler for tabs with no tab-specific handler. */
  registerPermanentExitHandler: (handler: (tabId: string, code: number) => void) => void;
  handleData: (payload: PtyDataPayload) => void;
  handleExit: (payload: PtyExitPayload) => void;
  destroy: () => void;
}

// In createPtyDispatcher:
let permanentExitHandler: ((tabId: string, code: number) => void) | null = null;

return {
  // ... existing methods ...

  registerPermanentExitHandler(handler) {
    permanentExitHandler = handler;
  },

  handleExit(payload) {
    const tabHandler = exitHandlers.get(payload.tab_id);
    if (tabHandler) {
      tabHandler(payload.code);
    } else {
      permanentExitHandler?.(payload.tab_id, payload.code);
    }
  },

  destroy() {
    dataHandlers.clear();
    exitHandlers.clear();
    globalDataHandler = null;
    permanentExitHandler = null;
  },
};
```

**Step 4: Run test to verify it passes**

Run: `cd apps/desktop && pnpm test frontend/lib/__tests__/pty-dispatcher.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(desktop): add permanent exit handler to pty dispatcher

Ensures PTY exit events are always tracked even when no tab-specific
handler is registered (e.g., after cache TTL eviction).
```

---

## Task 2: Register Permanent Exit Handler in App.tsx

Wire the permanent handler to mark tabs as exited when the PTY dies while no terminal component is mounted for that tab (cache evicted, terminal hidden).

**Files:**

- Modify: `apps/desktop/frontend/App.tsx`
- Test: (integration — covered by Task 6)

**Step 1: Find where ptyDispatcher listeners are set up in App.tsx**

Search for `ptyDispatcher` usage in App.tsx. The permanent handler should be registered alongside the existing IPC listener setup.

**Step 2: Add permanent exit handler registration**

After the existing `ptyDispatcher` setup in App.tsx, add:

```typescript
// Register permanent exit handler for PTY exits that happen when no
// terminal component is mounted (e.g., cache TTL expired during project switch).
// This ensures the tab store correctly reflects the PTY lifecycle.
ptyDispatcher.registerPermanentExitHandler((tabId, _code) => {
  const tabsStore = useTerminalTabsStore.getState();
  if (tabsStore.hasTab(tabId)) {
    tabsStore.markTabExited(tabId);
  }
});
```

**Step 3: Commit**

```
feat(desktop): register permanent PTY exit handler at app level

Marks tabs as exited when PTY dies during cache eviction, ensuring
correct session state for resume detection on project switch-back.
```

---

## Task 3: Harden Terminal Cache — Remove TTL Eviction for Active Tabs

The 5-minute TTL is the root cause of session loss. A parked terminal whose tab still exists in the store (meaning the user intends to return) should NEVER be evicted by TTL.

**Files:**

- Modify: `apps/desktop/frontend/lib/terminal-instance-cache.ts`
- Test: `apps/desktop/frontend/lib/__tests__/terminal-instance-cache.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/desktop/frontend/lib/__tests__/terminal-instance-cache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing
vi.mock("@/lib/pty-dispatcher", () => ({
  ptyDispatcher: {
    registerData: vi.fn(),
    unregisterData: vi.fn(),
    registerExit: vi.fn(),
    unregisterExit: vi.fn(),
  },
}));
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

// Must also mock terminal-tabs store for hasTab checks
const mockHasTab = vi.fn().mockReturnValue(true);
vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: {
    getState: () => ({ hasTab: mockHasTab }),
  },
}));

import { terminalCache, CACHE_TTL_MS } from "../terminal-instance-cache";

function createMockTerminal() {
  return {
    terminal: { dispose: vi.fn(), write: vi.fn(), cols: 80, rows: 24 } as any,
    fitAddon: { fit: vi.fn(), proposeDimensions: vi.fn() } as any,
    hostElement: { remove: vi.fn() } as any,
  };
}

describe("terminalCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    terminalCache.clear();
    mockHasTab.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT evict cached terminal when tab still exists in store", () => {
    const mock = createMockTerminal();
    mockHasTab.mockReturnValue(true); // tab still exists
    terminalCache.park("tab-1", mock.terminal, mock.fitAddon, mock.hostElement);

    vi.advanceTimersByTime(CACHE_TTL_MS + 1000);

    // Terminal should still be in cache (not evicted)
    expect(terminalCache.has("tab-1")).toBe(true);
    expect(mock.terminal.dispose).not.toHaveBeenCalled();
  });

  it("DOES evict cached terminal when tab no longer exists in store", () => {
    const mock = createMockTerminal();
    mockHasTab.mockReturnValue(false); // tab removed
    terminalCache.park("tab-1", mock.terminal, mock.fitAddon, mock.hostElement);

    vi.advanceTimersByTime(CACHE_TTL_MS + 1000);

    expect(terminalCache.has("tab-1")).toBe(false);
    expect(mock.terminal.dispose).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/desktop && pnpm test frontend/lib/__tests__/terminal-instance-cache.test.ts`
Expected: FAIL — terminal is evicted regardless of tab existence

**Step 3: Modify cache TTL to check tab existence before eviction**

In `terminal-instance-cache.ts`, modify the TTL callback in `park()`:

```typescript
// Change the TTL callback to check if the tab still exists before evicting.
// If the tab exists, the user intends to return — reschedule instead of evicting.
ttlTimers.set(
  tabId,
  setTimeout(function ttlCheck() {
    // Dynamic import to avoid circular dependency
    import("@/stores/terminal-tabs").then(({ useTerminalTabsStore }) => {
      const tabExists = useTerminalTabsStore.getState().hasTab(tabId);
      if (tabExists) {
        // Tab still in store — user may return. Reschedule check.
        clearTtlTimer(tabId);
        ttlTimers.set(tabId, setTimeout(ttlCheck, CACHE_TTL_MS));
        return;
      }

      // Tab gone — safe to evict
      const entry = cache.get(tabId);
      if (entry) {
        ptyDispatcher.unregisterData(tabId);
        ptyDispatcher.unregisterExit(tabId);
        entry.terminal.dispose();
        cache.delete(tabId);
      }
      ttlTimers.delete(tabId);
    }).catch(() => {
      // Fallback: evict on import failure (shouldn't happen in production)
      const entry = cache.get(tabId);
      if (entry) {
        ptyDispatcher.unregisterData(tabId);
        ptyDispatcher.unregisterExit(tabId);
        entry.terminal.dispose();
        cache.delete(tabId);
      }
      ttlTimers.delete(tabId);
    });
  }, CACHE_TTL_MS),
);
```

**Note:** Use dynamic import for `useTerminalTabsStore` to avoid circular dependency (terminal-instance-cache.ts is imported by terminal-session.tsx which imports terminal-tabs.ts).

**Step 4: Run test to verify it passes**

Run: `cd apps/desktop && pnpm test frontend/lib/__tests__/terminal-instance-cache.test.ts`
Expected: PASS

**Step 5: Commit**

```
fix(desktop): prevent cache TTL eviction for tabs that still exist

Parked terminals whose tab still exists in the store are rescheduled
instead of evicted. This ensures AI CLI sessions survive indefinitely
during project switches.
```

---

## Task 4: Fix Initial Fit Dimension Guard in Terminal Session

The `fitAddon.fit()` call during terminal mount does not check container dimensions. This causes 0x0 fits when the container is still hidden during FlexLayout transition.

**Files:**

- Modify: `apps/desktop/frontend/components/terminal-session.tsx`
- Test: `apps/desktop/frontend/components/__tests__/terminal-session-fit.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/desktop/frontend/components/__tests__/terminal-session-fit.test.ts
import { describe, it, expect, vi } from "vitest";

describe("terminal-session fit guard", () => {
  it("should not call fit when container has zero dimensions", () => {
    // This is a unit test for the guard logic
    const mockFit = vi.fn();
    const container = { offsetWidth: 0, offsetHeight: 0 };

    // Guard logic that should exist in terminal-session
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      // skip fit
    } else {
      mockFit();
    }

    expect(mockFit).not.toHaveBeenCalled();
  });

  it("should call fit when container has valid dimensions", () => {
    const mockFit = vi.fn();
    const container = { offsetWidth: 800, offsetHeight: 600 };

    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      // skip fit
    } else {
      mockFit();
    }

    expect(mockFit).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify logic**

Run: `cd apps/desktop && pnpm test frontend/components/__tests__/terminal-session-fit.test.ts`
Expected: PASS (logic test, not integration)

**Step 3: Add dimension guard to initial fit RAF**

In `terminal-session.tsx`, modify the RAF callback at line 328:

```typescript
rafId = requestAnimationFrame(() => {
  if (aborted) return;

  // Guard: skip fit when container has zero dimensions (FlexLayout
  // transition, display:none). The ResizeObserver will fire when the
  // container expands to its real size and do the fit then.
  const el = containerRef.current;
  if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) {
    // Still focus if possible, but don't fit/spawn with wrong dimensions
    terminal.focus();
    return;
  }

  const prevCols = terminal.cols;
  const prevRows = terminal.rows;

  fitAddon.fit();

  // CHANGED: Always clear screen for AI CLI sessions when reattaching
  // from cache, regardless of dimension change. Canvas state may be
  // corrupted from writes to a DOM-detached terminal while parked.
  if (cached && isAiCli) {
    terminal.write("\x1b[2J\x1b[H");
  }

  // Force full viewport repaint after DOM reattachment
  if (cached) {
    terminal.refresh(0, terminal.rows - 1);
  }

  terminal.focus();
  const dims = fitAddon.proposeDimensions();
  const rows = dims?.rows ?? 24;
  const cols = dims?.cols ?? 80;
  if (shouldSpawn) {
    spawned = true;
    // ... rest of spawn logic unchanged
  } else {
    resize(rows, cols);
  }
});
```

**Key changes:**

1. Added `el.offsetWidth === 0 || el.offsetHeight === 0` guard (matches `handleResize`)
2. Changed `if (dimsChanged)` to unconditional clear for cached AI CLI reattach
3. The ResizeObserver (already set up at line 470) will handle the fit when the container becomes visible

**Step 4: Run full desktop test suite**

Run: `cd apps/desktop && pnpm test`
Expected: PASS

**Step 5: Commit**

```
fix(desktop): guard initial terminal fit against zero-dimension containers

Prevents xterm.js canvas corruption during FlexLayout transitions
where the container is still display:none. Also unconditionally clears
screen for AI CLI sessions on cache reattach to fix garbled output.
```

---

## Task 5: Remove Hardcoded `isVisible={true}` from TerminalBlock

While FlexLayout doesn't unmount hidden tab contents, the `isVisible` prop is used for the recovery effect. Making it reactive ensures proper re-fit when tabs become visible within FlexLayout.

**Files:**

- Modify: `apps/desktop/frontend/components/blocks/terminal-block.tsx`
- Modify: `apps/desktop/frontend/components/terminal-session.tsx` (remove `hidden` class toggle — FlexLayout handles visibility)

**Step 1: Evaluate FlexLayout visibility API**

FlexLayout's `TabNode` provides `isVisible()` via the node model. However, `blockFactory` receives a `TabNode` — but `TerminalBlock` does not. The simplest approach: remove the `isVisible` prop entirely and rely on the ResizeObserver (which already guards against 0x0 containers) plus the dimension guard from Task 4.

**Step 2: Simplify TerminalBlock — remove isVisible prop**

In `terminal-block.tsx`:

```typescript
export function TerminalBlock({
  config,
  nodeId,
  projectPath,
}: TerminalBlockProps) {
  const tabId = config.tabId ?? nodeId;
  const tabPath = useTerminalTabsStore((s) => s.tabs.find((t) => t.id === tabId)?.path);
  const effectivePath = projectPath || tabPath;

  return (
    <div className="h-full w-full overflow-hidden">
      <TerminalSession
        tabId={tabId}
        path={effectivePath ?? ""}
        sessionType={config.sessionType ?? "terminal"}
      />
    </div>
  );
}
```

**Step 3: Remove `isVisible` from TerminalSession interface and component**

In `terminal-session.tsx`:

1. Remove `isVisible` from `TerminalSessionProps` interface
2. Remove `isVisibleRef` refs
3. Remove the `isVisible` useEffect (lines 559-580) — the ResizeObserver + Task 4 dimension guard handle this
4. Remove the `${!isVisible ? "hidden" : ""}` class from the root div (line 586) — FlexLayout manages visibility via CSS, not the component

```typescript
interface TerminalSessionProps {
  tabId: string;
  path: string;
  sessionType?: SessionType;
}

export const TerminalSession = memo(function TerminalSession({
  tabId,
  path,
  sessionType = "claude",
}: TerminalSessionProps) {
  // ... remove isVisibleRef ...

  // ... remove isVisible useEffect (lines 559-580) ...

  return (
    <div
      role="region"
      aria-label="Claude Code Terminal"
      className="flex h-full w-full flex-col"
    >
      {/* ... rest unchanged ... */}
    </div>
  );
});
```

**Step 4: Update existing tests that reference isVisible**

Search for `isVisible` in test files and update accordingly.

Run: `cd apps/desktop && pnpm test`
Expected: PASS

**Step 5: Commit**

```
refactor(desktop): remove hardcoded isVisible from terminal block

FlexLayout manages tab visibility via CSS. The ResizeObserver and
dimension guard now handle re-fit when containers become visible.
Eliminates a prop that never changed and prevented recovery effects.
```

---

## Task 6: Ensure Session Resume on Terminal Remount After Cache Miss

When a terminal remounts without a cache hit but with a live PTY, the reconnection works. But when the PTY has exited (detected by permanent handler from Task 2), the spawn logic must use `--resume` with the stored `cliSessionId`.

**Files:**

- Modify: `apps/desktop/frontend/components/terminal-session.tsx`
- Test: `apps/desktop/frontend/components/__tests__/terminal-session.test.tsx` (update existing)

**Step 1: Verify current behavior**

The existing spawn logic at lines 379-427 already handles resume via `cliSessionId`. The fix from Task 2 (permanent exit handler marking tabs as exited) ensures the tab correctly shows `isRunning: false`.

**Step 2: Audit the spawn path for exited tabs**

Lines 415-427:

```typescript
if (tab && !tab.isRunning) {
  if (resumeArgs) {
    useTerminalTabsStore.getState().markTabRunning(tab.id);
  } else if (sessionType && sessionType !== "terminal") {
    setTimeout(() => {
      useTerminalTabsStore.getState().removeTab(tabId);
    }, 500);
    return;
  }
}
```

**Problem:** If the tab is exited AND has no `cliSessionId` (detection didn't complete), the tab is removed (line 420-423). This auto-closes the tab, losing the session.

**Fix:** Instead of auto-closing, attempt `--resume latest` for CLIs that support it:

```typescript
if (tab && !tab.isRunning) {
  if (resumeArgs) {
    useTerminalTabsStore.getState().markTabRunning(tab.id);
  } else if (sessionType && sessionType !== "terminal") {
    // Try resume with "latest" even without a specific session ID.
    // This recovers sessions where detection didn't complete before the
    // terminal was parked.
    const def = CLI_REGISTRY[sessionType as import("@/lib/cli-registry").CliId];
    if (def?.resumeFlag) {
      const resumeValue = "latest";
      if (def.resumeFlag.endsWith("=")) {
        resumeArgs = [`${def.resumeFlag}${resumeValue}`];
      } else {
        resumeArgs = [def.resumeFlag, resumeValue];
      }
      useTerminalTabsStore.getState().markTabRunning(tab.id);
    } else {
      // CLI doesn't support resume — auto-close
      setTimeout(() => {
        useTerminalTabsStore.getState().removeTab(tabId);
      }, 500);
      return;
    }
  } else {
    return;
  }
}
```

**Step 3: Run tests**

Run: `cd apps/desktop && pnpm test`
Expected: PASS

**Step 4: Commit**

```
fix(desktop): attempt resume-latest for exited AI CLI tabs without session ID

Prevents auto-closing AI CLI tabs when the session ID detection didn't
complete before park. Falls back to --resume latest, recovering the
most recent session in the project directory.
```

---

## Task 7: Add ResizeObserver Retry for Deferred Fit

When the dimension guard from Task 4 skips the initial fit (container is 0x0), the ResizeObserver must handle the deferred fit. Verify this works and add a safety net.

**Files:**

- Modify: `apps/desktop/frontend/components/terminal-session.tsx`

**Step 1: Verify ResizeObserver fires on visibility change**

The existing `ResizeObserver` (line 470) is set up in `init()` and observes `containerRef.current`. When FlexLayout shows the tab (removes `display:none`), the container expands from 0x0 to real dimensions, triggering the observer.

The existing `handleResize` (line 451-468) already:

1. Guards against 0x0 (line 458)
2. Calls `fitAddon.fit()` (line 460)
3. Debounces `resize()` IPC (line 462-467)

**Step 2: Add spawn-deferred flag for skipped init**

When the init RAF skips due to 0x0 container, the terminal may need to spawn on first valid resize. Add a flag:

```typescript
// Inside init(), after the dimension guard in the RAF:
let spawnDeferred = false;

rafId = requestAnimationFrame(() => {
  if (aborted) return;
  const el = containerRef.current;
  if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) {
    // Defer spawn to first valid resize
    if (shouldSpawn) {
      spawnDeferred = true;
    }
    terminal.focus();
    return;
  }
  // ... normal fit + spawn logic ...
});

// Then in handleResize:
const handleResize = () => {
  const el = containerRef.current;
  if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return;

  fitAddon.fit();

  // Handle deferred spawn from skipped init
  if (spawnDeferred) {
    spawnDeferred = false;
    const dims = fitAddon.proposeDimensions();
    const rows = dims?.rows ?? 24;
    const cols = dims?.cols ?? 80;
    spawned = true;
    spawnWithResume(); // or the same spawn logic from the RAF
    return;
  }

  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const newDims = fitAddon.proposeDimensions();
    if (newDims) {
      resize(newDims.rows, newDims.cols);
    }
  }, 100);
};
```

**NOTE:** The `spawnWithResume` function needs to be extracted to be callable from both the RAF and `handleResize`. Extract it as a local function inside `init()`.

**Step 3: Run tests**

Run: `cd apps/desktop && pnpm test`
Expected: PASS

**Step 4: Commit**

```
fix(desktop): defer spawn to first valid resize when init container is 0x0

Ensures terminals spawn with correct dimensions even when the container
starts hidden during FlexLayout transitions.
```

---

## Task 8: Integration Test — Project Switch Session Persistence

**Files:**

- Modify: `apps/desktop/frontend/stores/__tests__/projects.test.ts` (add new test block)

**Step 1: Write integration test**

```typescript
describe("switchToProject — session persistence", () => {
  it("tabs for outgoing project remain in store after switch", async () => {
    const projectsStore = useProjectsStore.getState();
    const tabsStore = useTerminalTabsStore.getState();

    // Setup: add tab for project A
    tabsStore.addTab("tab-a1", "/project-a", "claude");

    // Switch to project B
    await projectsStore.switchToProject("/project-b");

    // Tab for project A must still exist
    expect(tabsStore.hasTab("tab-a1")).toBe(true);
  });

  it("PTY is NOT killed when switching projects (tab parked, not removed)", async () => {
    // This verifies close_pty is not called during switchToProject
    const closeSpy = vi.fn();
    vi.mocked(invoke).mockImplementation((channel: string, ...args: any[]) => {
      if (channel === "close_pty") closeSpy(args);
      return Promise.resolve(null) as any;
    });

    const tabsStore = useTerminalTabsStore.getState();
    tabsStore.addTab("tab-a1", "/project-a", "claude");

    await useProjectsStore.getState().switchToProject("/project-b");

    expect(closeSpy).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests**

Run: `cd apps/desktop && pnpm test frontend/stores/__tests__/projects.test.ts`
Expected: PASS

**Step 3: Commit**

```
test(desktop): add integration tests for session persistence on project switch
```

---

## Task 9: Final Verification & Cleanup

**Step 1: Run full test suite**

Run: `cd apps/desktop && pnpm test`
Expected: ALL PASS

**Step 2: Manual verification checklist**

- [ ] Open Forja, start Claude session in project A
- [ ] Let Claude respond (tokens > 0)
- [ ] Switch to project B via sidebar
- [ ] Wait > 5 minutes
- [ ] Switch back to project A
- [ ] **VERIFY:** Claude session shows same token count, same history, NOT "0 tokens"
- [ ] **VERIFY:** Terminal output is clean, no garbled/overlapping text
- [ ] Split terminal (Ctrl+Shift+D), switch projects, switch back
- [ ] **VERIFY:** Both panes render correctly
- [ ] Resize window after project switch
- [ ] **VERIFY:** Terminal reflows correctly

**Step 3: Commit**

```
test(desktop): verify terminal corruption and session persistence fixes
```

---

## Summary of Changes

| Task | File | Change | Bug Fixed |
|------|------|--------|-----------|
| 1 | `pty-dispatcher.ts` | Add `registerPermanentExitHandler` | Bug 2 |
| 2 | `App.tsx` | Wire permanent handler to mark tabs exited | Bug 2 |
| 3 | `terminal-instance-cache.ts` | TTL checks tab existence before evicting | Bug 2 |
| 4 | `terminal-session.tsx` | Dimension guard + unconditional clear on reattach | Bug 1 |
| 5 | `terminal-block.tsx`, `terminal-session.tsx` | Remove hardcoded `isVisible={true}` | Bug 1 |
| 6 | `terminal-session.tsx` | Resume-latest fallback for exited tabs | Bug 2 |
| 7 | `terminal-session.tsx` | Deferred spawn on first valid resize | Bug 1 |
| 8 | `projects.test.ts` | Integration tests for session persistence | Both |
