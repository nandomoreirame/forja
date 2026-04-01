# Session Lifecycle And Restoration Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make session lifecycle deterministic and project-scoped so Forja never kills PTY sessions during project/workspace switching, and always restores each session in the exact project and layout position where the user created it.

**Architecture:** Treat PTY lifetime and UI lifetime as separate concerns. Project/workspace switching only detaches UI state from a live PTY and persists enough project-scoped metadata to restore it later; only window close and project removal are allowed to finalize a session handoff from memory to persisted state. Restoration must always be driven by per-project persisted tab metadata plus per-project layout JSON, never by heuristics that can remap tabs or projects.

**Tech Stack:** React, Zustand, Electron IPC, FlexLayout, xterm.js, Vitest

## Requirements Lock

These behaviors are mandatory and override the current implementation:

1. Switching project must not kill any PTY.
2. Switching workspace must not kill any PTY.
3. Hiding a tab/tabset must not kill any PTY.
4. Closing a window may tear down the live PTY, but only after persisting project-scoped restore metadata.
5. Removing a project from a workspace may tear down the live PTY for that project, but only after persisting restore metadata if the product still needs it elsewhere, or intentionally clearing it if removal means “forget this project”.
6. Session restoration must be exact: same project, same tab ID, same layout block ID, same tabset position.
7. Renaming via `/rename` or UI rename must never break persistence or restoration.
8. Behavior must be provider-consistent for all AI CLIs, with Claude Code treated as the primary compatibility target.
9. Tests must cover both happy paths and all known regression paths discussed in review.

## Task 1: Normalize The Session Lifecycle Contract

**Files:**
- Modify: `apps/desktop/frontend/stores/workspace.ts`
- Modify: `apps/desktop/frontend/stores/projects.ts`
- Modify: `apps/desktop/frontend/App.tsx`
- Test: `apps/desktop/frontend/stores/__tests__/workspace.test.ts`
- Test: `apps/desktop/frontend/stores/__tests__/projects.test.ts`

**Step 1: Write the failing tests**

Add tests asserting:

- `activateWorkspace()` never calls `close_pty`.
- `switchToProject()` never calls `close_pty`.
- window-close save path still persists `tabs`, `cliSessionId`, `customName`, `activeTabIndex`, and `layoutJson`.
- project removal is the only project-scoped flow allowed to clean up tab state aggressively.

Suggested test names:

```ts
it("does not call close_pty during workspace activation")
it("does not call close_pty during project switch")
it("persists restore metadata before window unload")
it("removing a project clears only that project's in-memory state")
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/workspace.test.ts frontend/stores/__tests__/projects.test.ts --project frontend
```

Expected: FAIL on assertions that `close_pty` should not be called during workspace activation.

**Step 3: Write minimal implementation**

Change the lifecycle contract:

- Remove the `close_pty` loop from `activateWorkspace()` in `apps/desktop/frontend/stores/workspace.ts`.
- Keep `isSwitchingProject` as a save guard, but do not equate “UI reset” with “session termination”.
- Keep clearing renderer-local stores when the window is switching context, but leave backend PTY ownership untouched.
- Ensure any cleanup performed during workspace activation is only store cleanup, not PTY cleanup.

Implementation sketch:

```ts
// workspace.ts
const existingTabs = useTerminalTabsStore.getState().tabs;
for (const tab of existingTabs) {
  useSessionStateStore.getState().cleanup(tab.id);
}

// Do not close PTYs here.
useTerminalTabsStore.setState({ tabs: [], activeTabId: null });
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/workspace.test.ts frontend/stores/__tests__/projects.test.ts --project frontend
```

Expected: PASS for the new lifecycle assertions.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/stores/workspace.ts apps/desktop/frontend/stores/projects.ts apps/desktop/frontend/App.tsx apps/desktop/frontend/stores/__tests__/workspace.test.ts apps/desktop/frontend/stores/__tests__/projects.test.ts
git commit -m "fix(desktop): preserve PTY sessions across workspace and project switches"
```

## Task 2: Restore The Active Project Exactly On Workspace Activation

**Files:**
- Modify: `apps/desktop/frontend/stores/workspace.ts`
- Test: `apps/desktop/frontend/stores/__tests__/workspace.test.ts`

**Step 1: Write the failing test**

Add a test proving that when `lastActiveProjectPath` is not `workspace.projects[0].path`, workspace activation opens the last active project in the file tree and restores tabs for that same project.

Suggested test:

```ts
it("opens the workspace lastActiveProjectPath before restoring tabs")
```

The assertion should verify:

- `openProjectPath("/project/beta")` is called when `lastActiveProjectPath === "/project/beta"`.
- `get_project_ui_state` is requested for `/project/beta`.
- restored tabs all belong to `/project/beta`.

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: FAIL because current code opens `workspace.projects[0].path`.

**Step 3: Write minimal implementation**

Replace:

```ts
if (workspace.projects.length > 0) {
  fileTreeState.openProjectPath(workspace.projects[0].path);
}
```

With:

```ts
const targetProjectPath = workspace.lastActiveProjectPath || workspace.projects[0]?.path;
if (targetProjectPath) {
  await fileTreeState.openProjectPath(targetProjectPath);
}
```

Use the same `targetProjectPath` consistently for:

- `activeProjectPath`
- `openProjectPath`
- `get_ui_preferences`
- `get_project_ui_state`
- restored tab `path` fallback

**Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/stores/workspace.ts apps/desktop/frontend/stores/__tests__/workspace.test.ts
git commit -m "fix(desktop): restore the correct active project on workspace activation"
```

## Task 3: Unify Project Restore Semantics Across Boot, Project Switch, And Workspace Activation

**Files:**
- Modify: `apps/desktop/frontend/App.tsx`
- Modify: `apps/desktop/frontend/stores/projects.ts`
- Modify: `apps/desktop/frontend/stores/workspace.ts`
- Test: `apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx`
- Test: `apps/desktop/frontend/stores/__tests__/projects.test.ts`
- Test: `apps/desktop/frontend/stores/__tests__/workspace.test.ts`

**Step 1: Write the failing tests**

Add tests covering:

- boot restore preserves `exited` and does not silently mark restored exited AI sessions as running.
- boot restore preserves `customName`.
- boot restore preserves `cliSessionId`.
- boot restore preserves exact tab IDs from saved tabs when matching layout blocks exist.
- project switch, workspace activation, and boot all restore the same metadata shape.

Suggested test names:

```ts
it("boot restore preserves exited state for restored tabs")
it("boot restore preserves customName and cliSessionId")
it("all restore flows use the same persisted tab metadata contract")
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/components/__tests__/session-restore-integration.test.tsx frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: FAIL because `App.tsx` currently ignores `exited`.

**Step 3: Write minimal implementation**

Refactor the restore logic so all entry points consume the same tab payload:

```ts
type PersistedTab = {
  id?: string;
  path?: string;
  sessionType: string;
  cliSessionId?: string;
  exited?: boolean;
  customName?: string;
};
```

Required implementation details:

- Extend the `uiState` typing in `App.tsx` to include `exited`.
- During boot restore, call `markTabExited(id)` when the saved tab has `exited: true`.
- Reuse one helper for “register/add restored tab + reapply metadata” so boot, project switch, and workspace activation do not drift again.
- Keep exact saved IDs whenever the layout already contains the block; only mint a new ID when the saved ID is unusable.

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/components/__tests__/session-restore-integration.test.tsx frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/App.tsx apps/desktop/frontend/stores/projects.ts apps/desktop/frontend/stores/workspace.ts apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx apps/desktop/frontend/stores/__tests__/projects.test.ts apps/desktop/frontend/stores/__tests__/workspace.test.ts
git commit -m "fix(desktop): unify restore semantics for persisted sessions"
```

## Task 4: Guarantee Exact Layout Restoration For Each Project

**Files:**
- Modify: `apps/desktop/frontend/stores/projects.ts`
- Modify: `apps/desktop/frontend/stores/tiling-layout.ts`
- Modify: `apps/desktop/frontend/App.tsx`
- Test: `apps/desktop/frontend/stores/__tests__/projects.test.ts`
- Test: `apps/desktop/frontend/stores/__tests__/tiling-layout.test.ts`

**Step 1: Write the failing tests**

Add tests that enforce:

- a restored tab returns to the same tabset/block ID it was saved with.
- no orphan terminal block from project A can appear when loading project B.
- if a layout contains a terminal block whose ID is missing from saved tabs, that block is removed before render.
- if saved tabs contain valid IDs and matching layout blocks, those IDs are preserved exactly.

Suggested test names:

```ts
it("restores each terminal tab to its saved block id and tabset")
it("strips foreign terminal blocks before rendering another project")
it("does not remap saved tab ids when a matching block exists")
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/tiling-layout.test.ts --project frontend
```

Expected: FAIL if any restore flow is still remapping IDs or loading contaminated layout first.

**Step 3: Write minimal implementation**

Implementation requirements:

- Keep `stripOrphanTerminalBlocksFromJson()` exported and use it before `loadFromJson()`.
- Ensure `App.tsx` boot restore performs the same orphan stripping that `loadProjectFromDisk()` already performs.
- Ensure active-project-only cleanup never removes valid blocks for tabs in the saved project.
- Never generate a random replacement ID when the saved block ID is valid and present in the layout.

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/tiling-layout.test.ts --project frontend
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/stores/projects.ts apps/desktop/frontend/stores/tiling-layout.ts apps/desktop/frontend/App.tsx apps/desktop/frontend/stores/__tests__/projects.test.ts apps/desktop/frontend/stores/__tests__/tiling-layout.test.ts
git commit -m "fix(desktop): restore sessions into exact saved layout positions"
```

## Task 5: Harden Rename Persistence And Identity Separation

**Files:**
- Modify: `apps/desktop/frontend/stores/terminal-tabs.ts`
- Modify: `apps/desktop/frontend/stores/tiling-layout.ts`
- Test: `apps/desktop/frontend/stores/__tests__/terminal-tabs.test.ts`
- Test: `apps/desktop/frontend/stores/__tests__/tiling-layout.test.ts`
- Test: `apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx`

**Step 1: Write the failing tests**

Add tests covering:

- renaming a tab changes only `customName`, not `id`, `cliSessionId`, or `path`.
- saving and restoring a renamed Claude tab preserves the same `id`, `customName`, and `cliSessionId`.
- clearing a custom name restores display naming without changing identity.

Suggested test names:

```ts
it("rename only changes customName and preserves tab identity")
it("renamed claude session restores with same id and cliSessionId")
it("clearing customName does not remap the tab id")
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/terminal-tabs.test.ts frontend/stores/__tests__/tiling-layout.test.ts frontend/components/__tests__/session-restore-integration.test.tsx --project frontend
```

Expected: FAIL if any rename path accidentally couples tab identity to display naming.

**Step 3: Write minimal implementation**

Implementation requirements:

- Keep `renameTab()` limited to `customName`.
- Keep `renameBlock()` limited to visual label + `customName` sync.
- Audit save/restore serialization to ensure `customName` is additive metadata only.
- Add inline comments where identity separation is easy to regress:

```ts
// customName is presentation only; tab identity is id + path + cliSessionId.
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/terminal-tabs.test.ts frontend/stores/__tests__/tiling-layout.test.ts frontend/components/__tests__/session-restore-integration.test.tsx --project frontend
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/stores/terminal-tabs.ts apps/desktop/frontend/stores/tiling-layout.ts apps/desktop/frontend/stores/__tests__/terminal-tabs.test.ts apps/desktop/frontend/stores/__tests__/tiling-layout.test.ts apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx
git commit -m "fix(desktop): keep session identity stable across tab renames"
```

## Task 6: Define Explicit PTY Termination Points

**Files:**
- Modify: `apps/desktop/frontend/App.tsx`
- Modify: `apps/desktop/frontend/stores/projects.ts`
- Modify: `apps/desktop/frontend/stores/workspace.ts`
- Modify: `apps/desktop/frontend/hooks/use-pty.ts`
- Test: `apps/desktop/frontend/stores/__tests__/projects.test.ts`
- Test: `apps/desktop/frontend/stores/__tests__/workspace.test.ts`
- Test: `apps/desktop/frontend/hooks/__tests__/use-pty.test.ts`

**Step 1: Write the failing tests**

Add tests proving:

- window close persists restore metadata before any PTY teardown path.
- project removal is allowed to remove only that project’s tabs and PTY attachment.
- tab hide/unmount parks terminals instead of closing PTYs.
- workspace switch does not become a hidden PTY termination path.

Suggested test names:

```ts
it("window unload persists restore metadata before teardown")
it("project removal is an explicit PTY termination boundary")
it("unmount due to hidden layout parks instead of closing")
it("workspace activation is not a PTY termination boundary")
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/workspace.test.ts frontend/hooks/__tests__/use-pty.test.ts --project frontend
```

Expected: FAIL where current behavior is still ambiguous.

**Step 3: Write minimal implementation**

Make PTY teardown explicit and auditable:

- centralize “allowed PTY termination reasons” in comments and helper names.
- only call `close(true)` for:
  - true tab deletion
  - project removal cleanup
  - window shutdown flow if the PTY cannot remain attached to a live renderer
- never call PTY close inside project/workspace activation paths.

If needed, add a small helper:

```ts
function isTerminalTerminationBoundary(reason: "tab-delete" | "project-remove" | "window-close" | "project-switch" | "workspace-switch"): boolean {
  return reason === "tab-delete" || reason === "project-remove" || reason === "window-close";
}
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/workspace.test.ts frontend/hooks/__tests__/use-pty.test.ts --project frontend
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/App.tsx apps/desktop/frontend/stores/projects.ts apps/desktop/frontend/stores/workspace.ts apps/desktop/frontend/hooks/use-pty.ts apps/desktop/frontend/stores/__tests__/projects.test.ts apps/desktop/frontend/stores/__tests__/workspace.test.ts apps/desktop/frontend/hooks/__tests__/use-pty.test.ts
git commit -m "refactor(desktop): make PTY termination boundaries explicit"
```

## Task 7: Add Full Regression Matrix For Providers And Edge Cases

**Files:**
- Modify: `apps/desktop/frontend/components/__tests__/terminal-session.test.tsx`
- Modify: `apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx`
- Modify: `apps/desktop/frontend/stores/__tests__/projects.test.ts`
- Modify: `apps/desktop/frontend/stores/__tests__/workspace.test.ts`

**Step 1: Write the failing tests**

Add a regression matrix covering at least:

- Claude:
  - new session gets deterministic ID when appropriate
  - switched project preserves session alive
  - workspace activation does not kill session
  - window-close path persists and restore reuses exact `cliSessionId`
  - renamed tab still restores correctly
- Codex:
  - persisted `cliSessionId` is restored and used for resume
  - rename does not affect identity
- Gemini:
  - restore preserves metadata even if resume uses `"latest"`
- Terminal:
  - plain terminal never auto-closes on restore just because `exited` was saved

Suggested test names:

```ts
describe("claude session lifecycle regression matrix", ...)
describe("codex session lifecycle regression matrix", ...)
describe("gemini session lifecycle regression matrix", ...)
describe("terminal session lifecycle regression matrix", ...)
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/components/__tests__/terminal-session.test.tsx frontend/components/__tests__/session-restore-integration.test.tsx frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: FAIL until every lifecycle path is normalized.

**Step 3: Write minimal implementation**

Only add production changes if a regression test reveals a real gap. Prefer tightening the tests first, then fixing the smallest missing behavior.

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @forja/desktop exec vitest run frontend/components/__tests__/terminal-session.test.tsx frontend/components/__tests__/session-restore-integration.test.tsx frontend/stores/__tests__/projects.test.ts frontend/stores/__tests__/workspace.test.ts --project frontend
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/desktop/frontend/components/__tests__/terminal-session.test.tsx apps/desktop/frontend/components/__tests__/session-restore-integration.test.tsx apps/desktop/frontend/stores/__tests__/projects.test.ts apps/desktop/frontend/stores/__tests__/workspace.test.ts
git commit -m "test(desktop): add session lifecycle regression matrix"
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

Expected: PASS, or only fail on unrelated pre-existing tests that are documented before merge.

## Test Coverage Checklist

The implementation is not done until tests exist for all of these:

- project switch preserves live PTY
- workspace switch preserves live PTY
- hidden tab/tabset preserves live PTY
- boot restore preserves `id`
- boot restore preserves `cliSessionId`
- boot restore preserves `customName`
- boot restore preserves `exited`
- project restore preserves layout position
- workspace restore opens the correct last active project
- foreign project blocks are stripped from restored layout
- `/rename` does not alter session identity
- Claude restore works with persisted session ID
- Codex restore works with persisted session ID
- Gemini restore preserves metadata semantics
- plain terminal behavior remains stable
- window close persists project-scoped restore metadata
- project removal is the only non-window path allowed to discard live project state

## Open Decisions To Resolve During Implementation

1. On project removal, should persisted project UI state be deleted immediately, or retained for re-adding the same path later?
2. On window close, does the backend intentionally kill PTYs, or can PTYs survive across renderer/process restarts in some environments?
3. If a workspace has multiple projects with saved tabs, should non-active projects preload metadata only, or remain fully lazy until selected?

Use the current product rule from this discussion unless a hidden platform constraint makes it impossible:

- workspace/project switch: never kill PTY
- window close: persist and allow teardown
- project removal: explicit teardown boundary

Plan complete and saved to `docs/plans/2026-03-31-session-lifecycle-and-restoration-hardening.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
