# Session Lifecycle Review Follow-ups Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address the gaps and improvements identified during code review of the session lifecycle hardening implementation: unify restore logic between workspace activation and boot, add missing test coverage for edge cases, and integrate the PTY termination boundary helper into production code.

**Architecture:** Three focused tasks that tighten existing code without changing behavior: (1) unify the tab restore path so workspace activation uses the same `hasBlock` guard as boot restore, (2) add targeted tests for the two untested edge paths, (3) wire `shouldForceClosePty` into production call sites for auditability.

**Tech Stack:** React, Zustand, Electron IPC, Vitest

---

## Task 1: Unify Workspace Activation Restore With Boot Restore

The workspace activation path (`workspace.ts:265-273`) restores tabs using `tab.id || tabsStore.nextTabId()` without checking whether the layout actually contains a block with that ID. The boot restore path (`App.tsx:191-192`) correctly checks `hasBlock(tab.id)` before deciding whether to preserve the saved ID or mint a new one. This divergence means workspace activation may create duplicate blocks when a saved tab ID collides with a stale layout.

**Files:**
- Modify: `apps/desktop/frontend/stores/workspace.ts:265-273`
- Test: `apps/desktop/frontend/stores/__tests__/workspace.test.ts`

**Step 1: Write the failing test**

Add a test in `workspace.test.ts` proving that workspace activation uses `hasBlock` to decide whether to preserve or replace a saved tab ID.

```ts
it("uses hasBlock to decide whether to preserve saved tab IDs on workspace activation", async () => {
  const ws = makeWorkspace({
    id: "ws-restore",
    projects: [makeProject("/project/restore")],
    lastActiveProjectPath: "/project/restore",
  });
  useWorkspaceStore.setState({ workspaces: [ws], activeWorkspaceId: "ws-old" });

  const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
  const mockOpenProjectPath = vi.fn();
  useFileTreeStore.setState({
    loadProjectTree: mockLoadProjectTree,
    openProjectPath: mockOpenProjectPath,
  });

  // Layout contains block "saved-tab-1" but NOT "saved-tab-2"
  const savedLayout = {
    global: {},
    layout: {
      type: "row",
      children: [
        {
          type: "tabset",
          children: [
            { type: "tab", id: "tab-file-tree", name: "Files", component: "file-tree" },
            { type: "tab", id: "saved-tab-1", name: "Claude", component: "terminal" },
          ],
        },
      ],
    },
  };

  mockInvoke
    .mockResolvedValueOnce(undefined) // set_active_workspace
    .mockResolvedValueOnce([])        // get_workspace_projects
    .mockResolvedValueOnce({ layoutJson: savedLayout }) // get_ui_preferences
    .mockResolvedValueOnce({          // get_project_ui_state
      tabs: [
        { id: "saved-tab-1", sessionType: "claude", cliSessionId: "cls-1" },
        { id: "saved-tab-2", sessionType: "terminal" },
      ],
      activeTabIndex: 0,
    });

  await useWorkspaceStore.getState().activateWorkspace("ws-restore");

  const tabs = useTerminalTabsStore.getState().tabs;
  expect(tabs).toHaveLength(2);

  // saved-tab-1 exists in layout -> ID preserved
  expect(tabs[0].id).toBe("saved-tab-1");
  // saved-tab-2 does NOT exist in layout -> new ID minted (not "saved-tab-2")
  expect(tabs[1].id).not.toBe("saved-tab-2");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: FAIL because current code uses `tab.id || tabsStore.nextTabId()` without checking `hasBlock`.

**Step 3: Write minimal implementation**

In `apps/desktop/frontend/stores/workspace.ts`, replace lines 265-273:

```ts
// Current (no hasBlock check):
for (const tab of uiState.tabs) {
  const id = restorePersistedProjectTab({
    addToLayout: true,
    projectPath: targetProjectPath,
    tab,
    tabId: tab.id || tabsStore.nextTabId(),
  });
  restoredIds.push(id);
}
```

With:

```ts
const tilingStore = useTilingLayoutStore.getState();
for (const tab of uiState.tabs) {
  // Preserve saved ID only when the loaded layout contains a matching
  // block — same guard that boot restore (App.tsx) uses. Otherwise
  // mint a new ID so addTab creates a fresh block.
  const tabId = tab.id && tilingStore.hasBlock(tab.id)
    ? tab.id
    : tabsStore.nextTabId();
  const id = restorePersistedProjectTab({
    addToLayout: true,
    projectPath: targetProjectPath,
    tab,
    tabId,
  });
  restoredIds.push(id);
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/stores/workspace.ts apps/desktop/frontend/stores/__tests__/workspace.test.ts
git commit -m "fix(desktop): unify workspace tab restore with boot hasBlock guard"
```

## Task 2: Add Missing Edge Case Tests

Two edge paths lack direct test coverage: (a) `beforeunload` handler persists project state, (b) `loadProjectFromDisk` skips tab restore when project already has in-memory tabs.

**Files:**
- Test: `apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx`

**Step 1: Write the tests**

Add these two tests to `session-restore-integration.test.tsx`:

```ts
describe("beforeunload persist behavior", () => {
  it("saves project UI state on beforeunload when active project exists", () => {
    // Setup stores with active project and tabs
    const { useProjectsStore } = require("@/stores/projects");
    const { useWorkspaceStore } = require("@/stores/workspace");
    const { useTerminalTabsStore } = require("@/stores/terminal-tabs");

    useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
    useProjectsStore.setState({
      activeProjectPath: "/project/alpha",
      isSwitchingProject: false,
    });
    useTerminalTabsStore.setState({
      tabs: [
        { id: "t1", name: "Claude", path: "/project/alpha", isRunning: true, sessionType: "claude", cliSessionId: "session-x" },
      ],
      activeTabId: "t1",
    });

    // Dispatch beforeunload
    window.dispatchEvent(new Event("beforeunload"));

    // Verify save_project_ui_state was called with correct data
    expect(mockInvoke).toHaveBeenCalledWith("save_project_ui_state", expect.objectContaining({
      workspaceId: "ws-test",
      path: "/project/alpha",
      state: expect.objectContaining({
        tabs: expect.arrayContaining([
          expect.objectContaining({ id: "t1", sessionType: "claude", cliSessionId: "session-x" }),
        ]),
      }),
    }));
  });

  it("skips save on beforeunload when isSwitchingProject is true", () => {
    const { useProjectsStore } = require("@/stores/projects");
    const { useWorkspaceStore } = require("@/stores/workspace");

    useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
    useProjectsStore.setState({
      activeProjectPath: "/project/alpha",
      isSwitchingProject: true,
    });

    window.dispatchEvent(new Event("beforeunload"));

    expect(mockInvoke).not.toHaveBeenCalledWith("save_project_ui_state", expect.anything());
  });
});
```

```ts
describe("loadProjectFromDisk existing tabs guard", () => {
  it("does not overwrite existing in-memory tabs when loading from disk", async () => {
    const { useTerminalTabsStore } = require("@/stores/terminal-tabs");
    const { loadProjectFromDisk } = require("@/stores/projects");

    // Simulate tabs already loaded in memory for this project
    useTerminalTabsStore.setState({
      tabs: [
        { id: "existing-1", name: "Claude", path: "/project/beta", isRunning: true, sessionType: "claude" },
      ],
      activeTabId: "existing-1",
    });

    // Disk has different tabs for the same project
    mockInvoke.mockResolvedValueOnce({
      tabs: [
        { id: "disk-tab-1", sessionType: "claude", cliSessionId: "from-disk" },
        { id: "disk-tab-2", sessionType: "terminal" },
      ],
    });

    await loadProjectFromDisk("/project/beta");

    // Existing tab must not be replaced by disk tabs
    const tabs = useTerminalTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe("existing-1");
  });
});
```

**Step 2: Run tests to verify they fail or pass**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/components/__tests__/session-restore-integration.test.tsx --project frontend
```

Expected: PASS (these test existing behavior, not new behavior). If any fail, it reveals a real bug.

**Step 3: No implementation changes needed**

These tests document existing behavior. If any test fails, investigate and fix the production code.

**Step 4: Commit**

```bash
git add apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx
git commit -m "test(desktop): add edge case tests for beforeunload and existing tabs guard"
```

## Task 3: Integrate shouldForceClosePty Into Production Call Site

`shouldForceClosePty()` is exported and tested but never consumed by production code. While the current implementation is safe (no PTY termination paths exist in switch/workspace activation), the helper should guard the one production call site that invokes `close_pty` to make the termination boundary auditable and prevent future regressions.

**Files:**
- Modify: `apps/desktop/frontend/hooks/use-pty.ts:259-263`
- Test: `apps/desktop/frontend/hooks/__tests__/use-pty.test.ts`

**Step 1: Write the failing test**

Add a test proving that the `close` function returned by `usePty` respects `shouldForceClosePty` when called with a reason:

```ts
it("close(reason) only invokes close_pty for explicit termination boundaries", async () => {
  const { result } = renderHook(() =>
    usePty({ tabId: "tab-reason", onData: vi.fn() }),
  );

  // "park" is not a termination boundary — close should be a no-op
  await result.current.close(false, "park");
  expect(mockInvoke).not.toHaveBeenCalledWith("close_pty", expect.anything());

  // "tab-delete" IS a termination boundary — close should invoke IPC
  await result.current.close(true, "tab-delete");
  expect(mockInvoke).toHaveBeenCalledWith("close_pty", { tabId: "tab-reason", force: true });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/hooks/__tests__/use-pty.test.ts --project frontend
```

Expected: FAIL because current `close` ignores the reason parameter.

**Step 3: Write minimal implementation**

In `apps/desktop/frontend/hooks/use-pty.ts`, change the `close` callback:

From:

```ts
const close = useCallback(async (force = false) => {
  // Only explicit teardown boundaries should pass force=true here.
  await invoke("close_pty", { tabId: tabIdRef.current, force });
  setIsRunning(false);
}, []);
```

To:

```ts
const close = useCallback(async (force = false, reason?: PtyTerminationReason) => {
  // When a reason is provided, only proceed if it is an explicit
  // termination boundary. This prevents accidental PTY kills from
  // park/remount/switch paths that should never close a PTY.
  if (reason && !shouldForceClosePty(reason)) return;
  await invoke("close_pty", { tabId: tabIdRef.current, force });
  setIsRunning(false);
}, []);
```

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/hooks/__tests__/use-pty.test.ts --project frontend
```

Expected: PASS.

**Step 5: Run full test suite to check for regressions**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run --project frontend
```

Expected: PASS. No existing call site passes a reason, so they all continue to work (reason is undefined, guard is skipped).

**Step 6: Commit**

```bash
git add apps/desktop/frontend/hooks/use-pty.ts apps/desktop/frontend/hooks/__tests__/use-pty.test.ts
git commit -m "refactor(desktop): integrate shouldForceClosePty guard into close callback"
```

## Final Verification

Run the full targeted frontend verification:

```bash
pnpm --filter @forja/desktop exec vitest run \
  frontend/stores/__tests__/projects.test.ts \
  frontend/stores/__tests__/workspace.test.ts \
  frontend/stores/__tests__/terminal-tabs.test.ts \
  frontend/stores/__tests__/tiling-layout.test.ts \
  frontend/components/__tests__/terminal-session.test.tsx \
  frontend/components/__tests__/session-restore-integration.test.tsx \
  frontend/hooks/__tests__/use-pty.test.ts \
  --project frontend
```

Expected: PASS.

Then run the broader desktop frontend project once:

```bash
pnpm --filter @forja/desktop exec vitest run --project frontend
```

Expected: PASS.

## Summary Of Changes

| Task | Type | Risk | Description |
|------|------|------|-------------|
| 1 | Bug fix | Low | Workspace restore now checks `hasBlock` like boot restore |
| 2 | Test only | None | Edge case tests for `beforeunload` and existing tabs guard |
| 3 | Refactor | Low | `close()` callback respects `shouldForceClosePty` reason |

## Review Note: S1 Gap Was False Positive

The code review identified "missing test for switchToProject does not call close_pty". This test already exists at `projects.test.ts:1906`: `it("close_pty is NOT called during project switch")`. No action needed.
