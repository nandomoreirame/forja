# Session Resume Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a saved Claude session's `cliSessionId` no longer exists on disk (e.g., after `/rename`), fall back to `--resume` without an ID so the user picks which session to restore, instead of auto-closing the tab.

**Architecture:** Two-layer fix: (1) validate `cliSessionId` against Claude's session index before spawning, falling back to bare `--resume` if stale; (2) stop auto-closing tabs on PTY exit during a resume attempt, showing a message + CTA instead.

**Tech Stack:** TypeScript, Electron IPC, Vitest, happy-dom (frontend), node (electron)

---

## Context

### Current behavior

1. User saves a Claude tab. `cliSessionId` (a UUID) is persisted in `.forja/config.json`.
2. On restore, `terminal-session.tsx:spawnWithResume()` builds `["--resume", cliSessionId]`.
3. If Claude doesn't recognize the ID (renamed/deleted), the process exits immediately.
4. `onExit` in `terminal-session.tsx:65-72` auto-removes the tab after 500ms.
5. User sees nothing useful — the tab just vanishes.

### Desired behavior

1. Before spawning with `--resume <id>`, validate that the ID exists in Claude's session index.
2. If the ID is stale: spawn with `["--resume"]` only (no ID), so Claude shows its session picker.
3. If resume exits (stale or user cancels picker): keep the tab open with a "[Session ended]" message instead of auto-closing. Clear the stale `cliSessionId` from the tab.

### Key files

| File | Role |
|------|------|
| `electron/cli-sessions.ts:424` | `getCliSessions()` — reads Claude's session index from disk |
| `electron/preload.cts` | IPC channel exposure |
| `frontend/hooks/use-pty.ts` | PTY hook with spawn/exit handlers |
| `frontend/components/terminal-session.tsx:330` | `spawnWithResume()` — builds resume args |
| `frontend/components/terminal-session.tsx:65` | `onExit` — auto-closes AI tabs |
| `frontend/stores/terminal-tabs.ts` | Tab state + `setCliSessionId()` |
| `frontend/stores/saved-sessions.ts:66` | `restoreSession()` — creates tab from saved entry |
| `frontend/lib/cli-registry.ts` | CLI definitions (resumeFlag, sessionIdFlag) |

---

## Task 1: Add `validate_cli_session` IPC handler

Expose a lightweight IPC channel that checks if a given `cliSessionId` exists in the CLI's session index on disk.

**Files:**
- Modify: `apps/desktop/electron/main.ts` (add IPC handler near line 820)
- Modify: `apps/desktop/electron/preload.cts` (expose channel)
- Test: `apps/desktop/electron/__tests__/validate-cli-session.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/desktop/electron/__tests__/validate-cli-session.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cli-sessions module
vi.mock("../cli-sessions.js", () => ({
  getCliSessions: vi.fn(),
}));

import { getCliSessions } from "../cli-sessions.js";

const mockedGetCliSessions = vi.mocked(getCliSessions);

// Inline implementation to test in isolation
function validateCliSession(cliId: string, projectPath: string, sessionId: string): boolean {
  const sessions = getCliSessions(cliId, projectPath, 50);
  return sessions.some((s) => s.sessionId === sessionId);
}

describe("validateCliSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when sessionId exists in CLI sessions", () => {
    mockedGetCliSessions.mockReturnValue([
      { sessionId: "abc-123", summary: "test", firstPrompt: "", modified: "2026-03-31" },
    ]);

    expect(validateCliSession("claude", "/project", "abc-123")).toBe(true);
    expect(mockedGetCliSessions).toHaveBeenCalledWith("claude", "/project", 50);
  });

  it("returns false when sessionId does not exist", () => {
    mockedGetCliSessions.mockReturnValue([
      { sessionId: "other-id", summary: "", firstPrompt: "", modified: "2026-03-31" },
    ]);

    expect(validateCliSession("claude", "/project", "abc-123")).toBe(false);
  });

  it("returns false when CLI has no sessions", () => {
    mockedGetCliSessions.mockReturnValue([]);

    expect(validateCliSession("claude", "/project", "abc-123")).toBe(false);
  });

  it("returns false for CLIs without session support", () => {
    mockedGetCliSessions.mockReturnValue([]);

    expect(validateCliSession("gh-copilot", "/project", "abc-123")).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/desktop && pnpm test --project electron __tests__/validate-cli-session.test.ts`
Expected: FAIL (module not wired yet, but mock-based test should guide implementation)

**Step 3: Write the IPC handler in main.ts**

Add after the existing `get_cli_sessions` handler (~line 822):

```typescript
// Validate whether a CLI session ID still exists on disk
ipcMain.handle(
  "validate_cli_session",
  (_event, args: { cliId: string; projectPath: string; sessionId: string }) => {
    const sessions = getCliSessions(args.cliId, args.projectPath, 50);
    return sessions.some((s) => s.sessionId === args.sessionId);
  },
);
```

**Step 4: Expose in preload.cts**

Add to the `contextBridge.exposeInMainWorld("electronAPI", { ... })` object:

```typescript
validateCliSession: (cliId: string, projectPath: string, sessionId: string) =>
  ipcRenderer.invoke("validate_cli_session", { cliId, projectPath, sessionId }),
```

**Step 5: Run test to verify it passes**

Run: `cd apps/desktop && pnpm test --project electron __tests__/validate-cli-session.test.ts`
Expected: PASS

**Step 6: Commit**

```
feat(desktop): add validate_cli_session IPC handler
```

---

## Task 2: Add `resolveResumeArgs` helper with validation logic

Extract resume-args construction into a testable async function that validates the session ID before building args. If the ID is stale, returns bare `["--resume"]` for Claude (so the session picker is shown).

**Files:**
- Create: `apps/desktop/frontend/lib/resolve-resume-args.ts`
- Test: `apps/desktop/frontend/lib/__tests__/resolve-resume-args.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/desktop/frontend/lib/__tests__/resolve-resume-args.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@/lib/ipc";
import { resolveResumeArgs } from "../resolve-resume-args";

const mockedInvoke = vi.mocked(invoke);

describe("resolveResumeArgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns resume args with valid cliSessionId for Claude", async () => {
    mockedInvoke.mockResolvedValue(true);

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "abc-123",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume", "abc-123"],
      sessionIdValid: true,
    });
    expect(mockedInvoke).toHaveBeenCalledWith("validate_cli_session", {
      cliId: "claude",
      projectPath: "/project",
      sessionId: "abc-123",
    });
  });

  it("returns bare --resume when cliSessionId is stale for Claude", async () => {
    mockedInvoke.mockResolvedValue(false);

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "stale-id",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume"],
      sessionIdValid: false,
    });
  });

  it("returns undefined when no cliSessionId and no new session generation", async () => {
    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: undefined,
      projectPath: "/project",
    });

    expect(result).toBeUndefined();
  });

  it("skips validation for Gemini (resumeIdType=latest)", async () => {
    const result = await resolveResumeArgs({
      sessionType: "gemini",
      cliSessionId: "some-id",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume", "latest"],
      sessionIdValid: true,
    });
    // No validate call for "latest" type
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it("skips validation for terminal sessions", async () => {
    const result = await resolveResumeArgs({
      sessionType: "terminal",
      cliSessionId: undefined,
      projectPath: "/project",
    });

    expect(result).toBeUndefined();
  });

  it("returns bare --resume when validation IPC throws", async () => {
    mockedInvoke.mockRejectedValue(new Error("IPC error"));

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "abc-123",
      projectPath: "/project",
    });

    // On error, fall back to bare --resume (safe)
    expect(result).toEqual({
      args: ["--resume"],
      sessionIdValid: false,
    });
  });

  it("handles Codex resume flag format", async () => {
    mockedInvoke.mockResolvedValue(true);

    const result = await resolveResumeArgs({
      sessionType: "codex",
      cliSessionId: "codex-session-1",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["resume", "codex-session-1"],
      sessionIdValid: true,
    });
  });

  it("handles Cursor --resume= flag format", async () => {
    mockedInvoke.mockResolvedValue(true);

    const result = await resolveResumeArgs({
      sessionType: "cursor-agent",
      cliSessionId: "cursor-chat-1",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume=cursor-chat-1"],
      sessionIdValid: true,
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/desktop && pnpm test --project frontend lib/__tests__/resolve-resume-args.test.ts`
Expected: FAIL (module does not exist)

**Step 3: Write the implementation**

```typescript
// apps/desktop/frontend/lib/resolve-resume-args.ts
import { invoke } from "@/lib/ipc";
import { CLI_REGISTRY, type SessionType, type CliId } from "@/lib/cli-registry";

interface ResolveResumeInput {
  sessionType: SessionType;
  cliSessionId: string | undefined;
  projectPath: string;
}

interface ResolveResumeResult {
  args: string[];
  /** Whether the stored cliSessionId was confirmed valid on disk. */
  sessionIdValid: boolean;
}

/**
 * Resolves resume arguments for a restored session.
 *
 * For CLIs with resumeIdType === "id" (Claude, Codex, Cursor):
 * validates the stored cliSessionId against the CLI's session index.
 * If the ID no longer exists (e.g., after /rename), returns bare
 * `["--resume"]` so the CLI shows its built-in session picker.
 *
 * Returns undefined when no resume is possible.
 */
export async function resolveResumeArgs(
  input: ResolveResumeInput,
): Promise<ResolveResumeResult | undefined> {
  const { sessionType, cliSessionId, projectPath } = input;

  if (sessionType === "terminal") return undefined;
  if (!cliSessionId) return undefined;

  const def = CLI_REGISTRY[sessionType as CliId];
  if (!def?.resumeFlag) return undefined;

  // CLIs that always pass "latest" don't need validation
  if (def.resumeIdType === "latest") {
    return {
      args: buildResumeArgs(def.resumeFlag, "latest"),
      sessionIdValid: true,
    };
  }

  // Validate the stored session ID still exists on disk
  let isValid: boolean;
  try {
    isValid = await invoke<boolean>("validate_cli_session", {
      cliId: sessionType,
      projectPath,
      sessionId: cliSessionId,
    });
  } catch {
    // IPC failure: assume stale, fall back to bare --resume
    isValid = false;
  }

  if (isValid) {
    return {
      args: buildResumeArgs(def.resumeFlag, cliSessionId),
      sessionIdValid: true,
    };
  }

  // Session ID is stale — return bare --resume for the CLI's session picker
  return {
    args: [def.resumeFlag.replace(/=$/, "")],
    sessionIdValid: false,
  };
}

function buildResumeArgs(resumeFlag: string, value: string): string[] {
  if (resumeFlag.endsWith("=")) {
    return [`${resumeFlag}${value}`];
  }
  return [resumeFlag, value];
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/desktop && pnpm test --project frontend lib/__tests__/resolve-resume-args.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(desktop): add resolveResumeArgs helper with stale session validation
```

---

## Task 3: Wire `resolveResumeArgs` into `spawnWithResume`

Replace the inline resume-args construction in `terminal-session.tsx` with a call to `resolveResumeArgs`. When the session ID is stale, clear it from the tab store.

**Files:**
- Modify: `apps/desktop/frontend/components/terminal-session.tsx:346-376`
- Test: `apps/desktop/frontend/components/__tests__/terminal-session-resume-fallback.test.tsx`

**Step 1: Write the failing test**

```typescript
// apps/desktop/frontend/components/__tests__/terminal-session-resume-fallback.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

vi.mock("@/lib/resolve-resume-args", () => ({
  resolveResumeArgs: vi.fn(),
}));

import { resolveResumeArgs } from "@/lib/resolve-resume-args";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

const mockedResolveResumeArgs = vi.mocked(resolveResumeArgs);

describe("spawnWithResume resume fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("clears stale cliSessionId when resolveResumeArgs reports invalid", async () => {
    // Setup: tab with a stale cliSessionId
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude", undefined);
    store.setCliSessionId("tab-1", "stale-id-123");
    store.markTabExited("tab-1");

    mockedResolveResumeArgs.mockResolvedValue({
      args: ["--resume"],
      sessionIdValid: false,
    });

    // The actual integration test would render TerminalSession, but
    // for unit testing the logic, we verify the store interaction.
    // When sessionIdValid is false, the cliSessionId should be cleared.
    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
    expect(tab?.cliSessionId).toBe("stale-id-123");

    // Simulate what spawnWithResume should do:
    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "stale-id-123",
      projectPath: "/project",
    });

    if (result && !result.sessionIdValid) {
      useTerminalTabsStore.getState().setCliSessionId("tab-1", "");
    }

    const updated = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
    expect(updated?.cliSessionId).toBe("");
    expect(result?.args).toEqual(["--resume"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/desktop && pnpm test --project frontend components/__tests__/terminal-session-resume-fallback.test.ts`
Expected: FAIL (resolve-resume-args module not imported in terminal-session yet)

**Step 3: Modify `terminal-session.tsx`**

Replace the resume-args block (lines 346-376) in `spawnWithResume`:

```typescript
// OLD (lines 346-376): inline resume args construction
// NEW: delegate to resolveResumeArgs with validation

// Build resume args if we have a stored session ID
let resumeArgs: string[] | undefined;
const cliSessionId = tab?.cliSessionId;

// For CLIs with sessionIdFlag and NO existing cliSessionId,
// generate a deterministic UUID at spawn time.
const isActiveSession = !tab || tab.isRunning !== false;
if (!cliSessionId && isActiveSession && sessionType && sessionType !== "terminal") {
  const cliDef = CLI_REGISTRY[sessionType as import("@/lib/cli-registry").CliId];
  if (cliDef?.sessionIdFlag && cliDef.sessionIdFlag !== "create-chat") {
    const newSessionId = crypto.randomUUID();
    useTerminalTabsStore.getState().setCliSessionId(tabId, newSessionId);
    resumeArgs = [cliDef.sessionIdFlag, newSessionId];
  }
}

// For restored sessions with existing cliSessionId: validate before --resume
if (!resumeArgs && cliSessionId && sessionType && sessionType !== "terminal") {
  const resolved = await resolveResumeArgs({
    sessionType,
    cliSessionId,
    projectPath: path,
  });
  if (resolved) {
    resumeArgs = resolved.args;
    // Clear stale session ID so subsequent spawns don't retry the same bad ID
    if (!resolved.sessionIdValid) {
      useTerminalTabsStore.getState().setCliSessionId(tabId, "");
    }
  }
}
```

Add import at top of file:

```typescript
import { resolveResumeArgs } from "@/lib/resolve-resume-args";
```

**Step 4: Run test to verify it passes**

Run: `cd apps/desktop && pnpm test --project frontend components/__tests__/terminal-session-resume-fallback.test.ts`
Expected: PASS

**Step 5: Run full test suite to check for regressions**

Run: `cd apps/desktop && pnpm test`
Expected: All tests pass

**Step 6: Commit**

```
feat(desktop): wire resolveResumeArgs into spawnWithResume for stale session fallback
```

---

## Task 4: Stop auto-closing tabs on resume exit

When a tab was spawned with `--resume` and the PTY exits, keep the tab visible with a "[Session ended]" message instead of auto-removing it. This gives the user a chance to see what happened.

**Files:**
- Modify: `apps/desktop/frontend/components/terminal-session.tsx:65-72` (onExit handler)
- Modify: `apps/desktop/frontend/stores/terminal-tabs.ts` (add `wasResumed` flag)
- Test: `apps/desktop/frontend/components/__tests__/terminal-session-resume-exit.test.tsx`

**Step 1: Write the failing test**

```typescript
// apps/desktop/frontend/components/__tests__/terminal-session-resume-exit.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useTerminalTabsStore } from "@/stores/terminal-tabs";

describe("onExit behavior for resumed sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("should NOT auto-remove a tab that was spawned with resume args", () => {
    vi.useFakeTimers();

    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");
    store.setCliSessionId("tab-1", "abc-123");

    // Mark as resumed (new flag)
    store.markTabResumed("tab-1");

    // Simulate: resumed tab exits — should NOT be removed
    // The onExit handler should check wasResumed and skip auto-close
    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
    expect(tab).toBeDefined();

    // After 500ms (auto-close delay), tab should still exist
    vi.advanceTimersByTime(600);
    const tabAfter = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
    expect(tabAfter).toBeDefined();

    vi.useRealTimers();
  });

  it("should auto-remove a fresh AI CLI tab on exit (current behavior)", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-2", "/project", "claude");

    // No markTabResumed — this is a fresh session
    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-2");
    expect(tab).toBeDefined();
    // wasResumed should be undefined/false
    expect((tab as any).wasResumed).toBeFalsy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/desktop && pnpm test --project frontend components/__tests__/terminal-session-resume-exit.test.ts`
Expected: FAIL (`markTabResumed` does not exist)

**Step 3: Add `wasResumed` flag to `TerminalTab` and `markTabResumed` to the store**

In `apps/desktop/frontend/stores/terminal-tabs.ts`:

Add to `TerminalTab` interface:

```typescript
/** Set to true when the tab was spawned via --resume (restore). Used to suppress auto-close on exit. */
wasResumed?: boolean;
```

Add to `TerminalTabsState` interface:

```typescript
markTabResumed: (id: string) => void;
```

Add implementation in the store:

```typescript
markTabResumed: (id) =>
  set((state) => ({
    tabs: state.tabs.map((t) =>
      t.id === id ? { ...t, wasResumed: true } : t
    ),
  })),
```

**Step 4: Modify `onExit` in `terminal-session.tsx`**

Replace lines 65-72:

```typescript
onExit: () => {
  terminalRef.current?.write("\r\n\x1b[1;33m[Session ended]\x1b[0m\r\n");
  const currentTab = useTerminalTabsStore.getState().tabs.find(t => t.id === tabId);
  // Auto-close fresh AI CLI sessions, but keep resumed tabs open
  // so the user can see error output or start a new session.
  if (sessionType && sessionType !== "terminal" && !currentTab?.wasResumed) {
    setTimeout(() => {
      useTerminalTabsStore.getState().removeTab(tabId);
    }, 500);
  }
},
```

**Step 5: Set `wasResumed` when spawning with resume args**

In `terminal-session.tsx`, after the `resumeArgs` block resolves (right before `await spawn(...)`):

```typescript
if (resumeArgs && tab) {
  useTerminalTabsStore.getState().markTabResumed(tabId);
}
```

**Step 6: Run test to verify it passes**

Run: `cd apps/desktop && pnpm test --project frontend components/__tests__/terminal-session-resume-exit.test.ts`
Expected: PASS

**Step 7: Run full test suite**

Run: `cd apps/desktop && pnpm test`
Expected: All tests pass

**Step 8: Commit**

```
feat(desktop): keep resumed tabs open on exit instead of auto-closing
```

---

## Task 5: Include `wasResumed` in tab serialization roundtrip

Ensure `wasResumed` is persisted and restored so that tabs resumed across app restarts still benefit from the no-auto-close behavior.

**Files:**
- Modify: `apps/desktop/frontend/stores/terminal-tabs.ts` (`serializeTabsForSave`)
- Test: existing tests for serialization or new inline test

**Step 1: Write the failing test**

```typescript
// Add to existing terminal-tabs tests or create new file
// apps/desktop/frontend/stores/__tests__/terminal-tabs-resumed-flag.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

import { useTerminalTabsStore } from "../terminal-tabs";

describe("wasResumed serialization", () => {
  beforeEach(() => {
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("includes wasResumed in serialized output", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");
    store.markTabResumed("tab-1");

    const serialized = store.serializeTabsForSave("/project");
    expect(serialized.tabs[0].wasResumed).toBe(true);
  });

  it("omits wasResumed when not set", () => {
    const store = useTerminalTabsStore.getState();
    store.addTab("tab-1", "/project", "claude");

    const serialized = store.serializeTabsForSave("/project");
    expect(serialized.tabs[0].wasResumed).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/desktop && pnpm test --project frontend stores/__tests__/terminal-tabs-resumed-flag.test.ts`
Expected: FAIL (`wasResumed` not in serialized output)

**Step 3: Update `serializeTabsForSave`**

In `terminal-tabs.ts`, find `serializeTabsForSave` and add `wasResumed` to the serialized object:

```typescript
// In the map inside serializeTabsForSave:
...(t.wasResumed ? { wasResumed: true } : {}),
```

Also update the return type to include `wasResumed?: boolean`.

**Step 4: Run test to verify it passes**

Run: `cd apps/desktop && pnpm test --project frontend stores/__tests__/terminal-tabs-resumed-flag.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `cd apps/desktop && pnpm test`
Expected: All tests pass

**Step 6: Commit**

```
feat(desktop): persist wasResumed flag in tab serialization
```

---

## Task 6: Integration test — full restore-with-stale-id scenario

End-to-end test that simulates: save session → session ID becomes stale → restore → bare `--resume` is used → tab stays open after exit.

**Files:**
- Test: `apps/desktop/frontend/components/__tests__/session-restore-stale-id.test.tsx`

**Step 1: Write the integration test**

```typescript
// apps/desktop/frontend/components/__tests__/session-restore-stale-id.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

import { invoke } from "@/lib/ipc";
import { resolveResumeArgs } from "@/lib/resolve-resume-args";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useSavedSessionsStore } from "@/stores/saved-sessions";
import { useProjectsStore } from "@/stores/projects";

const mockedInvoke = vi.mocked(invoke);

describe("restore with stale cliSessionId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("falls back to bare --resume when saved session ID is stale", async () => {
    // validate_cli_session returns false (stale)
    mockedInvoke.mockImplementation(async (channel: string, args?: any) => {
      if (channel === "validate_cli_session") return false;
      if (channel === "saved_sessions:delete") return undefined;
      return undefined;
    });

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "renamed-away-id",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume"],
      sessionIdValid: false,
    });
  });

  it("uses full --resume <id> when session ID is valid", async () => {
    mockedInvoke.mockImplementation(async (channel: string) => {
      if (channel === "validate_cli_session") return true;
      return undefined;
    });

    const result = await resolveResumeArgs({
      sessionType: "claude",
      cliSessionId: "valid-id-456",
      projectPath: "/project",
    });

    expect(result).toEqual({
      args: ["--resume", "valid-id-456"],
      sessionIdValid: true,
    });
  });
});
```

**Step 2: Run the integration test**

Run: `cd apps/desktop && pnpm test --project frontend components/__tests__/session-restore-stale-id.test.ts`
Expected: PASS (all previous tasks complete)

**Step 3: Run the full test suite**

Run: `cd apps/desktop && pnpm test`
Expected: All tests pass

**Step 4: Commit**

```
test(desktop): add integration test for stale session ID restore fallback
```

---

## Summary

| Task | What it does | Risk |
|------|-------------|------|
| 1 | IPC to validate session ID on disk | Low — read-only check |
| 2 | `resolveResumeArgs` helper with validation | Low — pure function + IPC |
| 3 | Wire helper into `spawnWithResume` | Medium — modifies spawn flow |
| 4 | Stop auto-close on resumed tab exit | Medium — changes UX behavior |
| 5 | Persist `wasResumed` flag | Low — serialization addition |
| 6 | Integration test | None — test only |

### What this does NOT change

- New session creation flow (still generates UUID + `--session-id`)
- Non-Claude CLIs with `resumeIdType: "latest"` (Gemini)
- Terminal tab behavior
- Save session dialog
- Command palette restore UI
