# Deterministic AI Session IDs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate random session mixing by generating deterministic session IDs at spawn time instead of using heuristic filesystem detection.

**Architecture:** Add a `sessionIdFlag` to CliDefinition so CLIs that support it (Claude via `--session-id`, Cursor via `create-chat`) get a Forja-generated UUID at spawn time, set on the tab immediately. Filesystem polling remains as fallback for CLIs without this flag (Codex). Gemini already works via `resumeIdType: "latest"`. Also fix the tmuxSessionName restore bug found during code review.

**Tech Stack:** TypeScript, React, Zustand, Vitest, Electron IPC

---

## Bug Context

### Bug 1 (CRITICAL): `findAvailableSession` assigns sessions randomly
- `use-pty.ts:62-79` picks "first available by mtime" with no process correlation
- Multiple Claude tabs get each other's sessions

### Bug 2 (MEDIUM): `loadProjectFromDisk` drops `tmuxSessionName`
- `projects.ts:66` type doesn't include `tmuxSessionName`
- `workspace.ts:262` and `App.tsx:285` same issue

### Bug 3 (MINOR): `electron/config.ts` `ProjectUiState.tabs` missing `tmuxSessionName`

---

### Task 1: Add `sessionIdFlag` to CliDefinition and CLI_REGISTRY

**Files:**
- Modify: `frontend/lib/cli-registry.ts:6-24` (CliDefinition interface)
- Modify: `frontend/lib/cli-registry.ts:28-40` (claude entry)
- Test: `frontend/lib/__tests__/cli-registry.test.ts`

**Step 1: Write the failing test**

In `frontend/lib/__tests__/cli-registry.test.ts`, add inside the existing describe:

```typescript
it("claude has sessionIdFlag set to '--session-id'", () => {
  expect(CLI_REGISTRY.claude.sessionIdFlag).toBe("--session-id");
});

it("gemini does not have sessionIdFlag (uses resumeIdType latest)", () => {
  expect(CLI_REGISTRY.gemini.sessionIdFlag).toBeUndefined();
});

it("codex does not have sessionIdFlag", () => {
  expect(CLI_REGISTRY.codex.sessionIdFlag).toBeUndefined();
});

it("cursor-agent has sessionIdFlag set to 'create-chat'", () => {
  expect(CLI_REGISTRY["cursor-agent"].sessionIdFlag).toBe("create-chat");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/lib/__tests__/cli-registry.test.ts --reporter=verbose`
Expected: FAIL — `sessionIdFlag` property doesn't exist

**Step 3: Write minimal implementation**

In `frontend/lib/cli-registry.ts`, add to `CliDefinition` interface:

```typescript
/**
 * CLI flag to set session ID at spawn time (deterministic ID).
 * - "--session-id": pass as `--session-id <uuid>` (Claude)
 * - "create-chat": run `cursor-agent create-chat` first to get ID (Cursor)
 * When set, Forja generates a UUID and passes it at spawn, eliminating
 * heuristic filesystem detection for this CLI.
 */
sessionIdFlag?: string;
```

Add to claude entry: `sessionIdFlag: "--session-id",`
Add to cursor-agent entry: `sessionIdFlag: "create-chat",`

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/lib/__tests__/cli-registry.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```
feat(frontend): add sessionIdFlag to CliDefinition for deterministic session IDs
```

---

### Task 2: Generate session ID at spawn time in terminal-session.tsx

**Files:**
- Modify: `frontend/components/terminal-session.tsx:290-325`
- Test: `frontend/components/__tests__/terminal-session.test.tsx`

**Step 1: Write the failing test**

Add a new describe block in `terminal-session.test.tsx`:

```typescript
describe("deterministic session ID generation", () => {
  it("generates UUID and passes --session-id for new Claude sessions", async () => {
    // Setup: tab has NO cliSessionId (new session, not restored)
    mockStoreTabs.push({ id: "tab-1", sessionType: "claude" });

    render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
    await waitFor(() => expect(mockSpawn).toHaveBeenCalled());

    // The spawn should include --session-id <uuid> in resumeArgs
    const spawnCall = mockSpawn.mock.calls[0];
    const resumeArgs = spawnCall[2] as string[] | undefined;
    expect(resumeArgs).toBeDefined();
    expect(resumeArgs![0]).toBe("--session-id");
    // UUID v4 format
    expect(resumeArgs![1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // cliSessionId should have been set on the tab immediately
    expect(mockSetCliSessionId).toHaveBeenCalledWith("tab-1", resumeArgs![1]);
  });

  it("does NOT generate session ID for restored tabs that already have cliSessionId", async () => {
    // Setup: tab has cliSessionId (restored from disk)
    mockStoreTabs.push({ id: "tab-1", sessionType: "claude", cliSessionId: "existing-uuid" });

    render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} />);
    await waitFor(() => expect(mockSpawn).toHaveBeenCalled());

    // Should use --resume with existing ID, not --session-id
    const spawnCall = mockSpawn.mock.calls[0];
    const resumeArgs = spawnCall[2] as string[] | undefined;
    expect(resumeArgs).toEqual(["--resume", "existing-uuid"]);
  });

  it("does NOT generate session ID for terminal sessions", async () => {
    mockStoreTabs.push({ id: "tab-1", sessionType: "terminal" });

    render(<TerminalSession tabId="tab-1" path="/test" isVisible={true} sessionType="terminal" />);
    await waitFor(() => expect(mockSpawn).toHaveBeenCalled());

    const spawnCall = mockSpawn.mock.calls[0];
    const resumeArgs = spawnCall[2] as string[] | undefined;
    expect(resumeArgs).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/components/__tests__/terminal-session.test.tsx --reporter=verbose --grep "deterministic"`
Expected: FAIL — spawn doesn't include --session-id

**Step 3: Write minimal implementation**

In `terminal-session.tsx`, inside `spawnWithResume`, BEFORE the existing resume args block (line ~293), add:

```typescript
// For CLIs with sessionIdFlag and NO existing cliSessionId,
// generate a deterministic UUID and pass it at spawn time.
// This eliminates heuristic filesystem detection.
const def = sessionType && sessionType !== "terminal"
  ? CLI_REGISTRY[sessionType as import("@/lib/cli-registry").CliId]
  : undefined;

if (!cliSessionId && def?.sessionIdFlag && def.sessionIdFlag !== "create-chat") {
  const newSessionId = crypto.randomUUID();
  useTerminalTabsStore.getState().setCliSessionId(tabId, newSessionId);
  resumeArgs = [def.sessionIdFlag, newSessionId];
}
```

The existing resume args block stays as-is for restored tabs (which already have `cliSessionId`).

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/components/__tests__/terminal-session.test.tsx --reporter=verbose --grep "deterministic"`
Expected: PASS

**Step 5: Commit**

```
feat(frontend): generate deterministic session ID at spawn for Claude CLI
```

---

### Task 3: Skip filesystem polling for tabs that already have cliSessionId

**Files:**
- Modify: `frontend/hooks/use-pty.ts:164-196` (interval block)
- Test: `frontend/hooks/__tests__/use-pty.test.ts`

The interval already has `if (!tab || tab.cliSessionId || ...)` guard at line 166, so tabs with deterministic IDs are already skipped. This task validates that behavior with an explicit test.

**Step 1: Write the failing test (verification test)**

Add in `use-pty.test.ts` inside the "lazy filesystem session detection" describe:

```typescript
it("skips filesystem polling for tabs that already have a cliSessionId from spawn", async () => {
  // Tab already has cliSessionId (set by deterministic spawn)
  useTerminalTabsStore.setState({
    tabs: [{
      id: "tab-1", name: "Claude", path: "/project",
      isRunning: true, sessionType: "claude",
      cliSessionId: "pre-assigned-uuid",
    }],
  });

  renderHook(() => usePty({ tabId: "tab-1" }));

  // Advance past the interval
  await vi.advanceTimersByTimeAsync(SESSION_DETECT_INTERVAL_MS + 100);

  // get_cli_sessions should NOT have been called
  expect(mockInvoke).not.toHaveBeenCalledWith(
    "get_cli_sessions",
    expect.anything(),
  );
});
```

**Step 2: Run test to verify it passes (this is a verification test)**

Run: `pnpm test frontend/hooks/__tests__/use-pty.test.ts --reporter=verbose --grep "skips filesystem polling for tabs that already have"`
Expected: PASS (existing guard already handles this)

**Step 3: No implementation needed — existing guard works**

**Step 4: Commit**

```
test(frontend): add verification test for filesystem polling skip with pre-assigned session ID
```

---

### Task 4: Fix tmuxSessionName restore in loadProjectFromDisk (Bug 2)

**Files:**
- Modify: `frontend/stores/projects.ts:66` (type in invoke)
- Modify: `frontend/stores/projects.ts:129-138` (restore loop)
- Test: `frontend/stores/__tests__/projects.test.ts`

**Step 1: Write the failing test**

In `frontend/stores/__tests__/projects.test.ts`, find the `loadProjectFromDisk` describe and add:

```typescript
it("restores tmuxSessionName for terminal tabs loaded from disk", async () => {
  mockInvoke.mockResolvedValueOnce({
    tabs: [
      {
        id: "tab-1",
        sessionType: "terminal",
        tmuxSessionName: "forja-main-tab-1",
        customName: "btop",
      },
    ],
  });

  await loadProjectFromDisk("/test/project");

  const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
  expect(tab?.tmuxSessionName).toBe("forja-main-tab-1");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose --grep "tmuxSessionName"`
Expected: FAIL — `tmuxSessionName` is `undefined`

**Step 3: Write minimal implementation**

In `projects.ts:66`, add `tmuxSessionName?: string` to the type:

```typescript
tabs?: Array<{ id?: string; sessionType: string; cliSessionId?: string; exited?: boolean; customName?: string; tmuxSessionName?: string }>;
```

In `projects.ts`, after line 138 (`if (tab.exited) tabsStore.markTabExited(id);`), add:

```typescript
if (tab.tmuxSessionName) tabsStore.setTmuxSessionName(id, tab.tmuxSessionName);
```

**Step 4: Run test to verify it passes**

Run: `pnpm test frontend/stores/__tests__/projects.test.ts --reporter=verbose --grep "tmuxSessionName"`
Expected: PASS

**Step 5: Commit**

```
fix(frontend): restore tmuxSessionName in loadProjectFromDisk
```

---

### Task 5: Fix tmuxSessionName restore in workspace.ts activateWorkspace (Bug 2b)

**Files:**
- Modify: `frontend/stores/workspace.ts:262` (type in invoke)
- Modify: `frontend/stores/workspace.ts:270-281` (restore loop)
- Test: `frontend/stores/__tests__/workspace.test.ts`

**Step 1: Write the failing test**

In `frontend/stores/__tests__/workspace.test.ts`, find an appropriate describe for activateWorkspace and add:

```typescript
it("restores tmuxSessionName for tabs during workspace activation", async () => {
  // Setup workspace with a terminal tab that has tmuxSessionName
  mockInvoke.mockImplementation(async (channel: string) => {
    if (channel === "get_project_ui_state") {
      return {
        tabs: [{
          id: "tab-1",
          sessionType: "terminal",
          tmuxSessionName: "forja-main-tab-1",
          customName: "shell",
        }],
      };
    }
    // ... other mocks as needed by activateWorkspace
  });

  // After activateWorkspace, check tmuxSessionName
  const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "tab-1");
  expect(tab?.tmuxSessionName).toBe("forja-main-tab-1");
});
```

Note: Adapt the test to match the existing mock patterns in `workspace.test.ts`.

**Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/workspace.test.ts --reporter=verbose --grep "tmuxSessionName"`
Expected: FAIL

**Step 3: Write minimal implementation**

In `workspace.ts:262`, add `tmuxSessionName?: string` to the tabs type.

In the for loop at `workspace.ts:270-281`, after `if (tab.exited) { tabsStore.markTabExited(id); }`, add:

```typescript
if (tab.tmuxSessionName) {
  tabsStore.setTmuxSessionName(id, tab.tmuxSessionName);
}
```

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```
fix(frontend): restore tmuxSessionName in activateWorkspace
```

---

### Task 6: Fix tmuxSessionName restore in App.tsx (Bug 2c)

**Files:**
- Modify: `frontend/App.tsx:285` (type in invoke)
- Modify: `frontend/App.tsx:334-349` (restore loop)

**Step 1: Modify the type**

In `App.tsx:285`, add `tmuxSessionName?: string` to the tabs type:

```typescript
tabs?: Array<{ id?: string; path?: string; sessionType: string; cliSessionId?: string; customName?: string; tmuxSessionName?: string }>;
```

**Step 2: Add tmuxSessionName restore in both branches**

In the `isActiveProject` branch (after line 341 `tabsStore.setCliSessionId(id, tab.cliSessionId);`):

```typescript
if (tab.tmuxSessionName) {
  tabsStore.setTmuxSessionName(id, tab.tmuxSessionName);
}
```

In the `else` branch (after line 347 `tabsStore.setCliSessionId(id, tab.cliSessionId);`):

```typescript
if (tab.tmuxSessionName) {
  tabsStore.setTmuxSessionName(id, tab.tmuxSessionName);
}
```

**Step 3: Commit**

```
fix(frontend): restore tmuxSessionName in App.tsx session restore
```

---

### Task 7: Add tmuxSessionName to ProjectUiState in electron/config.ts (Bug 3)

**Files:**
- Modify: `electron/config.ts:49-56`
- Test: `electron/__tests__/config.test.ts` (if exists, or skip test)

**Step 1: Add tmuxSessionName to the interface**

In `electron/config.ts`, inside `ProjectUiState.tabs` type:

```typescript
tabs?: Array<{
    id?: string;
    path?: string;
    sessionType: string;
    cliSessionId?: string;
    exited?: boolean;
    customName?: string;
    tmuxSessionName?: string;  // Tmux session name for persistent terminal sessions
}>;
```

**Step 2: Commit**

```
fix(electron): add tmuxSessionName to ProjectUiState type
```

---

### Task 8: Backend passthrough for --session-id args in pty spawn

**Files:**
- Review: `electron/pty.ts:129-147` (AI CLI spawn path)
- Test: `electron/__tests__/pty-spawn.test.ts`

The `--session-id` flag is passed via `resumeArgs` which is already handled at `pty.ts:138`:

```typescript
args = [...(extraArgs ?? []), ...(resumeArgs ?? [])];
```

This means `["--session-id", "<uuid>"]` flows through correctly. No backend changes needed.

**Step 1: Write verification test**

In `electron/__tests__/pty-spawn.test.ts`, add:

```typescript
it("passes --session-id args through resumeArgs for new Claude sessions", async () => {
  const newUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  await spawnPty({
    tabId: "test-session-id",
    path: "/test",
    sessionType: "claude",
    windowId: 1,
    sender: mockSender,
    resumeArgs: ["--session-id", newUuid],
  });

  const spawnedArgs = mockPtySpawn.mock.calls[0][1];
  expect(spawnedArgs).toContain("--session-id");
  expect(spawnedArgs).toContain(newUuid);
});
```

**Step 2: Run test to verify it passes**

Run: `pnpm test electron/__tests__/pty-spawn.test.ts --reporter=verbose --grep "session-id"`
Expected: PASS (existing passthrough works)

**Step 3: Commit**

```
test(electron): add verification test for --session-id passthrough in pty spawn
```

---

### Task 9: Integration test — full save/restore cycle with deterministic ID

**Files:**
- Create: `frontend/components/__tests__/session-restore-integration.test.tsx`

**Step 1: Write the integration test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

describe("session ID save/restore cycle", () => {
  beforeEach(() => {
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
  });

  it("serializeTabsForSave includes deterministic cliSessionId", () => {
    const store = useTerminalTabsStore.getState();

    // Simulate what terminal-session.tsx does for new Claude tabs
    const tabId = "main-test-tab-1";
    store.addTab(tabId, "/project", "claude", "MY SESSION");
    store.setCliSessionId(tabId, "aaaaaaaa-1111-2222-3333-444444444444");

    const serialized = useTerminalTabsStore.getState().serializeTabsForSave("/project");

    expect(serialized.tabs).toHaveLength(1);
    expect(serialized.tabs[0].id).toBe(tabId);
    expect(serialized.tabs[0].cliSessionId).toBe("aaaaaaaa-1111-2222-3333-444444444444");
    expect(serialized.tabs[0].customName).toBe("MY SESSION");
  });

  it("restored tab preserves exact same cliSessionId for --resume", () => {
    const store = useTerminalTabsStore.getState();

    // Simulate restore: registerTab + setCliSessionId (what loadProjectFromDisk does)
    store.registerTab("main-test-tab-1", "/project", "claude", "MY SESSION");
    store.setCliSessionId("main-test-tab-1", "aaaaaaaa-1111-2222-3333-444444444444");

    const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === "main-test-tab-1");
    expect(tab?.cliSessionId).toBe("aaaaaaaa-1111-2222-3333-444444444444");
    expect(tab?.customName).toBe("MY SESSION");
  });

  it("two Claude tabs get independent session IDs that survive serialize/restore", () => {
    const store = useTerminalTabsStore.getState();

    store.addTab("tab-A", "/project", "claude", "SESSION A");
    store.setCliSessionId("tab-A", "uuid-aaaa");
    store.addTab("tab-B", "/project", "claude", "SESSION B");
    store.setCliSessionId("tab-B", "uuid-bbbb");

    // Serialize
    const saved = useTerminalTabsStore.getState().serializeTabsForSave("/project");
    expect(saved.tabs[0].cliSessionId).toBe("uuid-aaaa");
    expect(saved.tabs[1].cliSessionId).toBe("uuid-bbbb");

    // Simulate restore in a fresh store
    useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });
    const freshStore = useTerminalTabsStore.getState();
    for (const tab of saved.tabs) {
      freshStore.registerTab(tab.id, "/project", tab.sessionType as any, tab.customName);
      if (tab.cliSessionId) freshStore.setCliSessionId(tab.id, tab.cliSessionId);
    }

    const restoredTabs = useTerminalTabsStore.getState().tabs;
    expect(restoredTabs[0].cliSessionId).toBe("uuid-aaaa");
    expect(restoredTabs[1].cliSessionId).toBe("uuid-bbbb");
    // NOT swapped
    expect(restoredTabs[0].cliSessionId).not.toBe(restoredTabs[1].cliSessionId);
  });
});
```

**Step 2: Run test**

Run: `pnpm test frontend/components/__tests__/session-restore-integration.test.tsx --reporter=verbose`
Expected: PASS

**Step 3: Commit**

```
test(frontend): add integration test for deterministic session ID save/restore cycle
```

---

## Summary of changes

| File | Change | Bug Fixed |
|------|--------|-----------|
| `frontend/lib/cli-registry.ts` | Add `sessionIdFlag` to interface + claude/cursor entries | Bug 1 |
| `frontend/components/terminal-session.tsx` | Generate UUID + pass `--session-id` for new sessions | Bug 1 |
| `frontend/hooks/use-pty.ts` | No changes needed (existing guard works) | — |
| `frontend/stores/projects.ts` | Add `tmuxSessionName` to type + restore call | Bug 2 |
| `frontend/stores/workspace.ts` | Add `tmuxSessionName` to type + restore call | Bug 2 |
| `frontend/App.tsx` | Add `tmuxSessionName` to type + restore call | Bug 2 |
| `electron/config.ts` | Add `tmuxSessionName` to `ProjectUiState` | Bug 3 |
| Test files (4) | New tests for each task | — |
