# Terminal Session Split (Horizontal/Vertical) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow splitting the terminal session area into two panes (horizontal and vertical) using keyboard shortcuts, while preserving compatibility with current tabs and PTY behavior.

**Architecture:** We will implement a 2-pane split layout inside `TerminalPane`, controlled by a new layout state in a store (`none`, `horizontal`, `vertical`) plus the currently focused pane. Each pane points to an existing `tabId`; when creating a split, we open a new tab in the same project and attach it to the second pane. Layout state and ratio will be persisted in UI/session preferences so it can be restored when reopening the app.

**Tech Stack:** React 19, TypeScript, Zustand, `react-resizable-panels`, xterm.js, Electron IPC config store, Vitest (frontend + electron).

---

## UX Decision (MVP scope)

1. Supported split: only 2 panes at a time.
2. Orientations: `vertical` (side by side) and `horizontal` (stacked).
3. Proposed shortcuts:

- `Mod+Alt+V`: vertical split
- `Mod+Alt+H`: horizontal split
- `Mod+Alt+W`: close split (back to 1 pane)
- `Mod+Alt+[` and `Mod+Alt+]`: focus previous/next split pane

4. When creating split:

- duplicate project context from the active tab,
- open a new `terminal` tab,
- keep the current tab in the focused pane and send the new tab to the other pane.

5. No nested split support in this cycle (YAGNI).

---

## Task 1: Define split layout types and store

**Files:**

- Create: `frontend/stores/terminal-split-layout.ts`
- Test: `frontend/stores/__tests__/terminal-split-layout.test.ts`

**Step 1: Write the failing test**

- Create tests for initial state (`none`), opening horizontal/vertical split, focus switching between panes, closing split, and reset.

**Step 2: Run test to verify it fails**

- Run: `pnpm test frontend/stores/__tests__/terminal-split-layout.test.ts --project frontend`
- Expected: FAIL (store does not exist yet).

**Step 3: Write minimal implementation**

- Create types:
- `SplitOrientation = "none" | "horizontal" | "vertical"`
- `SplitPaneId = "primary" | "secondary"`
- Create state:
- `orientation`
- `ratio` (primary pane percentage)
- `primaryTabId`
- `secondaryTabId`
- `focusedPane`
- Create actions:
- `openSplit(orientation, primaryTabId, secondaryTabId)`
- `closeSplit()`
- `setFocusedPane(paneId)`
- `setPaneTab(paneId, tabId)`
- `setRatio(ratio)`
- `resetForProjectSwitch()`

**Step 4: Run test to verify it passes**

- Run: `pnpm test frontend/stores/__tests__/terminal-split-layout.test.ts --project frontend`
- Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/stores/terminal-split-layout.ts frontend/stores/__tests__/terminal-split-layout.test.ts
git commit -m "feat(terminal): add split layout store for two-pane sessions"
```

---

## Task 2: Persist split preferences in Electron config

**Files:**

- Modify: `electron/config.ts`
- Modify: `electron/main.ts`
- Test: `electron/__tests__/config.test.ts`

**Step 1: Write the failing test**

- Add `UiPreferences` coverage for fields:
- `terminalSplitOrientation`
- `terminalSplitRatio`
- `terminalSplitEnabled`

**Step 2: Run test to verify it fails**

- Run: `pnpm test electron/__tests__/config.test.ts --project electron`
- Expected: FAIL (new fields are not defined yet).

**Step 3: Write minimal implementation**

- Extend `UiPreferences` and defaults in `electron-store`.
- Ensure backward-compatible merge behavior in `saveUiPreferences`.
- Do not break existing `sidebarSize`/`previewSize` consumers.

**Step 4: Run test to verify it passes**

- Run: `pnpm test electron/__tests__/config.test.ts --project electron`
- Expected: PASS.

**Step 5: Commit**

```bash
git add electron/config.ts electron/main.ts electron/__tests__/config.test.ts
git commit -m "feat(config): persist terminal split preferences in ui settings"
```

---

## Task 3: Expose split preferences in panel preferences hook

**Files:**

- Modify: `frontend/hooks/use-panel-preferences.ts`
- Test: `frontend/hooks/__tests__/use-panel-preferences.test.ts`

**Step 1: Write the failing test**

- Cover reading/writing new split fields over IPC:
- `terminalSplitOrientation`
- `terminalSplitRatio`
- `terminalSplitEnabled`

**Step 2: Run test to verify it fails**

- Run: `pnpm test frontend/hooks/__tests__/use-panel-preferences.test.ts --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**

- Extend the preference type returned by the hook.
- Add persistence helpers for split state without changing existing APIs.

**Step 4: Run test to verify it passes**

- Run: `pnpm test frontend/hooks/__tests__/use-panel-preferences.test.ts --project frontend`
- Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/hooks/use-panel-preferences.ts frontend/hooks/__tests__/use-panel-preferences.test.ts
git commit -m "feat(ui): extend panel preferences with terminal split settings"
```

---

## Task 4: Render split in TerminalPane with focus and resize

**Files:**

- Modify: `frontend/components/terminal-pane.tsx`
- Modify: `frontend/components/terminal-session.tsx`
- Modify: `frontend/components/__tests__/terminal-pane.test.tsx`
- Create: `frontend/components/__tests__/terminal-pane-split.test.tsx`

**Step 1: Write the failing test**

- Test render without split (current behavior preserved).
- Test vertical and horizontal split with two `TerminalSession` instances.
- Test pane visibility/focus without incorrectly hiding active sessions.
- Test `ratio` updates after resize.

**Step 2: Run test to verify it fails**

- Run: `pnpm test frontend/components/__tests__/terminal-pane.test.tsx frontend/components/__tests__/terminal-pane-split.test.tsx --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**

- Use `ResizablePanelGroup` in `TerminalPane` when split is active.
- Map `primaryTabId`/`secondaryTabId` to rendered sessions.
- Pass `isVisible=true` for both visible split panes.
- Mark focused pane with subtle visual styling (border).
- In `terminal-session.tsx`, ensure `ResizeObserver` and `fit()` behave correctly in resizable split panes.

**Step 4: Run test to verify it passes**

- Run: `pnpm test frontend/components/__tests__/terminal-pane.test.tsx frontend/components/__tests__/terminal-pane-split.test.tsx --project frontend`
- Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/components/terminal-pane.tsx frontend/components/terminal-session.tsx frontend/components/__tests__/terminal-pane.test.tsx frontend/components/__tests__/terminal-pane-split.test.tsx
git commit -m "feat(terminal): render horizontal and vertical split panes"
```

---

## Task 5: Keyboard shortcuts for split and focus

**Files:**

- Modify: `frontend/hooks/use-keyboard-shortcuts.ts`
- Create: `frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts`
- Modify: `frontend/components/keyboard-shortcuts-dialog.tsx`
- Create: `frontend/components/__tests__/keyboard-shortcuts-dialog.test.tsx`

**Step 1: Write the failing test**

- Cover shortcuts:
- `Mod+Alt+V` creates vertical split
- `Mod+Alt+H` creates horizontal split
- `Mod+Alt+W` closes split
- `Mod+Alt+[` and `Mod+Alt+]` move pane focus
- Validate `preventDefault` behavior and no conflicts with existing shortcuts.
- Validate the shortcut dialog shows new split shortcuts.

**Step 2: Run test to verify it fails**

- Run: `pnpm test frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts frontend/components/__tests__/keyboard-shortcuts-dialog.test.tsx --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**

- Inject new store actions into `use-keyboard-shortcuts`.
- Create `createSplit(orientation)` flow:
- validate project/active tab,
- open a new `terminal` tab,
- set `secondaryTabId`,
- move focus to the new pane.
- Update `keyboard-shortcuts-dialog.tsx` with split section/rows.

**Step 4: Run test to verify it passes**

- Run: `pnpm test frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts frontend/components/__tests__/keyboard-shortcuts-dialog.test.tsx --project frontend`
- Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/hooks/use-keyboard-shortcuts.ts frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts frontend/components/keyboard-shortcuts-dialog.tsx frontend/components/__tests__/keyboard-shortcuts-dialog.test.tsx
git commit -m "feat(shortcuts): add terminal split shortcuts and focus cycling"
```

---

## Task 6: App integration + session restore

**Files:**

- Modify: `frontend/App.tsx`
- Modify: `frontend/lib/session-persistence.ts`
- Modify: `frontend/lib/__tests__/session-persistence.test.ts`

**Step 1: Write the failing test**

- Cover persisted split parse/save:
- orientation,
- ratio,
- active tab per pane.
- Cover safe fallback for older snapshots without split fields.

**Step 2: Run test to verify it fails**

- Run: `pnpm test frontend/lib/__tests__/session-persistence.test.ts --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**

- Extend `PersistedSessionState.terminal` schema with split fields.
- Integrate restore in `App.tsx` session bootstrap.
- Integrate persistence in snapshot-saving effect.
- Ensure split reset when switching project without compatible tabs.

**Step 4: Run test to verify it passes**

- Run: `pnpm test frontend/lib/__tests__/session-persistence.test.ts --project frontend`
- Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/App.tsx frontend/lib/session-persistence.ts frontend/lib/__tests__/session-persistence.test.ts
git commit -m "feat(session): persist and restore terminal split layout"
```

---

## Task 7: Consistency rules with tab lifecycle

**Files:**

- Modify: `frontend/stores/terminal-tabs.ts`
- Modify: `frontend/stores/__tests__/terminal-tabs.test.ts`
- Modify: `frontend/components/tab-bar.tsx`
- Modify: `frontend/components/__tests__/tab-bar.test.tsx`

**Step 1: Write the failing test**

- If a split tab is closed, layout adjusts without pointing to a missing tab.
- If only 1 tab remains, split closes automatically.
- TabBar selection updates focused pane only (not both panes).

**Step 2: Run test to verify it fails**

- Run: `pnpm test frontend/stores/__tests__/terminal-tabs.test.ts frontend/components/__tests__/tab-bar.test.tsx --project frontend`
- Expected: FAIL.

**Step 3: Write minimal implementation**

- Expose helpers in store to validate tab existence by `id`.
- Adjust TabBar + split integration for predictable behavior.
- Auto-close split when no valid `secondaryTabId` remains.

**Step 4: Run test to verify it passes**

- Run: `pnpm test frontend/stores/__tests__/terminal-tabs.test.ts frontend/components/__tests__/tab-bar.test.tsx --project frontend`
- Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/stores/terminal-tabs.ts frontend/stores/__tests__/terminal-tabs.test.ts frontend/components/tab-bar.tsx frontend/components/__tests__/tab-bar.test.tsx
git commit -m "fix(terminal): keep split layout consistent with tab lifecycle"
```

---

## Task 8: Final verification (regression + smoke)

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Run targeted frontend tests**

- Run:

```bash
pnpm test --project frontend --reporter=verbose
```

- Expected: PASS.

**Step 2: Run targeted electron tests**

- Run:

```bash
pnpm test --project electron --reporter=verbose
```

- Expected: PASS.

**Step 3: Build sanity check**

- Run:

```bash
pnpm build
```

- Expected: build passes without TypeScript errors.

**Step 4: Manual smoke checklist**

- Open project and create vertical/horizontal split via shortcut.
- Switch focus between panes via shortcut.
- Resize split and restart app to validate restore behavior.
- Close a tab from one pane and validate fallback behavior.

**Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): document terminal split shortcuts and behavior"
```

---

## Risks and mitigations

1. `xterm` in two simultaneous panes may cause extra resize churn.

- Mitigation: existing debounce + split resize tests.

2. Shortcut conflicts with OS/WM.

- Mitigation: keep shortcuts under `Mod+Alt` and document command-palette fallback in next cycle.

3. Regression for old snapshots.

- Mitigation: backward-compatible parse in `session-persistence`.

---

## Acceptance criteria

1. User can create vertical and horizontal split via shortcuts in an active session.
2. Two terminals are visible and functional within the same tab context.
3. Pane focus switches via shortcut and correctly controls which pane receives tab changes.
4. Split state (orientation + ratio + pane tabs) persists across reloads.
5. Closing a tab in split mode does not break layout or leave an orphan invisible session.
6. Frontend/electron tests and `pnpm build` pass.
