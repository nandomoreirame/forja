# Remove TMUX and Simplify PTY Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all TMUX integration from the terminal PTY layer, eliminating session persistence/restoration bugs and leaving a stable, simple PTY that spawns the user's default shell directly via node-pty with working copy/paste and mouse scroll.

**Architecture:** The terminal currently uses TMUX as an intermediary for `sessionType === "terminal"` on Linux/macOS: it creates a detached tmux session, then attaches via node-pty. This adds complexity (orphan detection, reattach, session name management) and causes bugs with TMUX-inside-TMUX scenarios, mouse capture, and scroll. The plan removes all TMUX code paths and makes terminal sessions use direct `pty.spawn(shell, [], ...)` — identical to what Windows already does. AI CLI sessions (claude, gemini, etc.) are unaffected since they never used TMUX.

**Tech Stack:** Electron (Node.js), node-pty, xterm.js, React, Zustand, Vitest

---

## Summary of Changes

| Area | What Changes |
|------|-------------|
| `electron/pty.ts` | Remove tmux import, tmux branch in `spawnPty()`, entire `reattachPty()`, `closePtyAndTmux()`. Remove `tmuxSessionName` from `PtySession`. |
| `electron/tmux.ts` | **Delete file** |
| `electron/pty-tmux.ts` | **Delete file** |
| `electron/tmux-restore.ts` | **Delete file** |
| `electron/main.ts` | Remove IPC handlers: `pty:get-orphaned-sessions`, `pty:get-pane-command`, `pty:reattach-tmux`. Simplify `close_pty` handler. |
| `frontend/components/terminal-session.tsx` | Remove tmux session name polling (lines 587-611). Remove `spawnResult.tmuxSessionName` handling. |
| `frontend/hooks/use-pty.ts` | No changes needed (spawn already returns `tmuxSessionName: null` for non-tmux). |
| `frontend/stores/terminal-tabs.ts` | Remove `tmuxSessionName` from `TerminalTab` interface, `setTmuxSessionName()`, serialization of tmuxSessionName. |
| Tests | Delete tmux test files. Update affected tests. |

---

### Task 1: Delete TMUX Backend Files

**Files:**
- Delete: `apps/desktop/electron/tmux.ts`
- Delete: `apps/desktop/electron/pty-tmux.ts`
- Delete: `apps/desktop/electron/tmux-restore.ts`
- Delete: `apps/desktop/electron/__tests__/tmux.test.ts`
- Delete: `apps/desktop/electron/__tests__/tmux-integration.test.ts`
- Delete: `apps/desktop/electron/__tests__/tmux-restore.test.ts`

**Step 1: Delete the files**

```bash
cd apps/desktop
rm electron/tmux.ts electron/pty-tmux.ts electron/tmux-restore.ts
rm electron/__tests__/tmux.test.ts electron/__tests__/tmux-integration.test.ts electron/__tests__/tmux-restore.test.ts
```

**Step 2: Verify no dangling imports**

```bash
grep -r "tmux" electron/ --include="*.ts" --include="*.cts" -l
```

Expected: only `pty.ts` and `main.ts` (will be cleaned in next tasks).

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(pty): delete tmux backend files (tmux.ts, pty-tmux.ts, tmux-restore.ts) and their tests"
```

---

### Task 2: Simplify `pty.ts` — Remove TMUX Code Paths

**Files:**
- Modify: `apps/desktop/electron/pty.ts`

**Step 1: Remove `tmuxSessionName` from `PtySession` interface**

Replace the `PtySession` interface (lines 11-19):

```typescript
interface PtySession {
  process: IPty;
  tabId: string;
  windowId: number;
  projectPath: string;
  buffer: RingBuffer;
  sessionType: string;
}
```

**Step 2: Remove `tmuxSessionName` from `SpawnResult`**

Replace `SpawnResult` (lines 94-97):

```typescript
export interface SpawnResult {
  tabId: string;
}
```

**Step 3: Simplify `spawnPty()` — remove tmux branch**

Replace the entire `spawnPty` function body. The terminal branch should use direct `pty.spawn()` just like the AI CLI branch. The key change is replacing the tmux conditional (lines 165-203) with a simple direct spawn:

```typescript
export async function spawnPty(opts: SpawnOptions): Promise<SpawnResult> {
  const { tabId, path: cwd, sessionType, windowId, sender, extraArgs, extraEnv, resumeArgs } = opts;

  // Before creating new session, kill any existing one with same tabId (prevents process leaks)
  const existing = sessions.get(tabId);
  if (existing) {
    try {
      existing.process.kill();
    } catch {
      // already dead
    }
    sessions.delete(tabId);
  }

  let ptyProcess: IPty;

  if (sessionType === "terminal") {
    const shell = getUserShell();
    const args = [...(extraArgs ?? [])];
    ptyProcess = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: buildSafeEnv(extraEnv),
    });
  } else {
    let shell: string;
    let args: string[];

    if (sessionType === "gh-copilot") {
      shell = "copilot";
      args = [...(extraArgs ?? []), ...(resumeArgs ?? [])];
    } else {
      shell = sessionType || "claude";
      args = [...(extraArgs ?? []), ...(resumeArgs ?? [])];
    }

    ptyProcess = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: buildSafeEnv(extraEnv),
    });
  }

  const session: PtySession = {
    process: ptyProcess,
    tabId,
    windowId,
    projectPath: cwd,
    buffer: new RingBuffer(PTY_BUFFER_MAX_BYTES),
    sessionType: sessionType ?? "terminal",
  };

  ptyProcess.onData((data: string) => {
    session.buffer.write(data);
    if (!sender.isDestroyed()) {
      sender.send("pty:data", { tab_id: tabId, data });
    }
    notifyPtySubscribers({ event: "data", tabId, data });
  });

  ptyProcess.onExit(({ exitCode }) => {
    sessions.delete(tabId);
    if (!sender.isDestroyed()) {
      sender.send("pty:exit", { tab_id: tabId, code: exitCode });
      sender.send("pty:session-state-changed", {
        sessionId: tabId,
        projectPath: cwd,
        state: "exited",
        exitCode,
      });
    }
    notifyPtySubscribers({ event: "session-exit", tabId, projectPath: cwd, exitCode });
  });

  sessions.set(tabId, session);
  notifyPtySubscribers({ event: "session-start", tabId, projectPath: cwd, sessionType: sessionType ?? "terminal" });

  if (sessionType !== "terminal" && !sender.isDestroyed()) {
    sender.send("pty:session-state-changed", {
      sessionId: tabId,
      projectPath: cwd,
      state: "running",
      exitCode: null,
    });
  }

  return { tabId };
}
```

**Step 4: Remove `reattachPty()` entirely** (lines 275-335)

Delete the entire `reattachPty` function.

**Step 5: Remove `closePtyAndTmux()` entirely** (lines 365-381)

Delete the entire `closePtyAndTmux` function.

**Step 6: Update exports**

Remove `reattachPty` and `closePtyAndTmux` from all export references. The `closePty` function stays as-is (it just kills the node-pty process).

**Step 7: Run tests**

```bash
pnpm test:desktop -- --project electron
```

Expected: tmux tests are gone, remaining tests pass. Some tests may need minor updates if they referenced `tmuxSessionName` in spawn results.

**Step 8: Commit**

```bash
git add apps/desktop/electron/pty.ts
git commit -m "refactor(pty): remove tmux code paths from pty.ts, simplify to direct shell spawn"
```

---

### Task 3: Clean Up `main.ts` IPC Handlers

**Files:**
- Modify: `apps/desktop/electron/main.ts`

**Step 1: Update import** (line 44)

Remove `closePtyAndTmux` and `reattachPty` from the import:

```typescript
import { resolveShellPath, spawnPty, writePty, resizePty, closePty, closeAllPtysForWindow, getSessionBuffer, hasPty, getAllSessionBuffers, getActiveSessions, setTabDisplayName } from "./pty.js";
```

**Step 2: Remove tmux IPC handlers**

Delete these three handlers entirely:

1. `pty:get-orphaned-sessions` (lines 1015-1022)
2. `pty:get-pane-command` (lines 1024-1031)
3. `pty:reattach-tmux` (lines 1033-1052)

**Step 3: Simplify `close_pty` handler** (lines 994-1001)

Replace with:

```typescript
ipcMain.handle("close_pty", (_event, args: { tabId: string }) => {
  tabsWithUserInput.delete(args.tabId);
  closePty(args.tabId);
});
```

The `force` flag was only needed to distinguish "kill tmux too" vs "just detach". Now there's only one path.

**Step 4: Run tests**

```bash
pnpm test:desktop -- --project electron
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/electron/main.ts
git commit -m "refactor(pty): remove tmux IPC handlers from main.ts, simplify close_pty"
```

---

### Task 4: Clean Up Frontend — Terminal Session Component

**Files:**
- Modify: `apps/desktop/frontend/components/terminal-session.tsx`

**Step 1: Remove tmux session name polling** (lines 587-611)

Delete the entire `useEffect` block that polls `pty:get-pane-command` via tmux. This removes:
- `tmuxSessionName` selector from store
- `renameBlock` usage for foreground process name
- The 2-second polling interval

```typescript
// DELETE this entire block:
const tmuxSessionName = useTerminalTabsStore((s) => s.tabs.find((t) => t.id === tabId)?.tmuxSessionName);
const renameBlock = useTilingLayoutStore((s) => s.renameBlock);
useEffect(() => {
  if (sessionType !== "terminal" || !tmuxSessionName) return;
  // ... entire polling logic ...
}, [tabId, sessionType, tmuxSessionName, renameBlock]);
```

Also remove the `useTilingLayoutStore` import if it's no longer used elsewhere in the file.

**Step 2: Remove tmux session name handling in spawn callback** (lines 431-432)

In the `spawnWithResume` async function, remove:

```typescript
// DELETE:
if (spawnResult?.tmuxSessionName) {
  useTerminalTabsStore.getState().setTmuxSessionName(tabId, spawnResult.tmuxSessionName);
}
```

**Step 3: Remove `useTilingLayoutStore` import** (line 18, if no longer used)

Check if `useTilingLayoutStore` is used elsewhere in the file. If only used for the tmux polling, remove the import.

**Step 4: Run tests**

```bash
pnpm test:desktop -- --project frontend
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop/frontend/components/terminal-session.tsx
git commit -m "refactor(pty): remove tmux polling and session name handling from terminal-session"
```

---

### Task 5: Clean Up Frontend — Terminal Tabs Store

**Files:**
- Modify: `apps/desktop/frontend/stores/terminal-tabs.ts`

**Step 1: Remove `tmuxSessionName` from `TerminalTab` interface** (line 21)

Delete:
```typescript
/** Tmux session name for persistent terminal sessions. */
tmuxSessionName?: string;
```

**Step 2: Remove `setTmuxSessionName` from `TerminalTabsState` interface** (line 72)

Delete:
```typescript
/** Stores the tmux session name on the specified tab for session persistence. */
setTmuxSessionName: (tabId: string, sessionName: string) => void;
```

**Step 3: Remove `setTmuxSessionName` implementation** (lines 279-284)

Delete:
```typescript
setTmuxSessionName: (tabId: string, sessionName: string) =>
  set((state) => ({
    tabs: state.tabs.map((t) =>
      t.id === tabId ? { ...t, tmuxSessionName: sessionName } : t
    ),
  })),
```

**Step 4: Remove tmuxSessionName from `serializeTabsForSave`** (line 266)

In the `serializeTabsForSave` method, remove:
```typescript
...(tab.tmuxSessionName ? { tmuxSessionName: tab.tmuxSessionName } : {}),
```

Also update the return type to remove `tmuxSessionName`:
```typescript
serializeTabsForSave: (projectPath: string) => {
  tabs: Array<{ id: string; sessionType: string; cliSessionId?: string; exited?: boolean; customName?: string }>;
  activeTabIndex: number;
};
```

**Step 5: Run tests**

```bash
pnpm test:desktop -- --project frontend
```

Expected: PASS (some tests may need tmuxSessionName references removed)

**Step 6: Commit**

```bash
git add apps/desktop/frontend/stores/terminal-tabs.ts
git commit -m "refactor(pty): remove tmuxSessionName from terminal tabs store"
```

---

### Task 6: Clean Up Remaining Frontend References

**Files:**
- Modify: various frontend files that reference tmux

**Step 1: Find all remaining tmux references**

```bash
grep -r "tmux\|orphan\|reattach" apps/desktop/frontend/ --include="*.ts" --include="*.tsx" -l
```

**Step 2: Clean each file**

Expected files and changes:

- **`frontend/stores/projects.ts`**: Remove tmuxSessionName from serialization/deserialization. It may be stored in the persisted project state.
- **`frontend/stores/workspace.ts`**: May reference orphaned sessions in restore logic.
- **`frontend/stores/__tests__/terminal-tabs.test.ts`**: Remove tests for `setTmuxSessionName`.
- **`frontend/components/settings-dialog.tsx`**: May have a tmux status display.
- **`frontend/components/session-status-bar.tsx`**: May display tmux info.
- **`frontend/components/about-dialog.tsx`**: May list tmux version.
- **`frontend/App.tsx`**: May have orphan session restoration on startup.
- **`frontend/components/__tests__/session-restore-integration.test.tsx`**: Remove tmux reattach tests.

For each file: read it, identify the tmux-specific code, remove it. Be careful not to break non-tmux functionality.

**Step 3: Run full test suite**

```bash
pnpm test:desktop
```

Expected: ALL PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(pty): remove all remaining tmux references from frontend"
```

---

### Task 7: Verify Mouse Scroll Works Correctly

**Files:**
- Verify: `apps/desktop/frontend/components/terminal-session.tsx` (lines 232-242)
- Verify: `apps/desktop/frontend/lib/terminal-theme.ts`

**Step 1: Verify wheel handler exists**

The existing wheel handler (lines 237-242) should work correctly without tmux:

```typescript
hostElement.addEventListener("wheel", (e) => {
  const lines = e.deltaY > 0 ? 3 : -3;
  terminal.scrollLines(lines);
  e.preventDefault();
  e.stopPropagation();
}, { passive: false });
```

This intercepts all wheel events and routes them to xterm.js scroll. With tmux removed, there's no risk of tmux capturing the mouse (`mouse off` was a workaround).

**Step 2: Verify scrollback config**

In `terminal-theme.ts`, confirm `scrollback: 10000` is set in `TERMINAL_OPTIONS`.

**Step 3: Manual test checklist**

- [ ] Open a terminal tab
- [ ] Run a command that produces lots of output (e.g., `seq 1 500`)
- [ ] Scroll up with mouse wheel — should scroll the buffer
- [ ] Scroll down with mouse wheel — should scroll back down
- [ ] Shift+mouse wheel — should scroll faster (fastScrollModifier: "shift")
- [ ] Scroll should work in both active and inactive panes

**Step 4: Commit (if any fixes needed)**

```bash
git commit -m "fix(pty): verify and fix mouse scroll behavior after tmux removal"
```

---

### Task 8: Verify Copy/Paste Works Correctly

**Files:**
- Verify: `apps/desktop/frontend/components/terminal-session.tsx`

**Step 1: Verify copy-on-select**

Lines 320-325: `onSelectionChange` auto-copies to clipboard. This should work as-is.

**Step 2: Verify keyboard shortcuts**

Lines 257-264:
- `Ctrl+Shift+C` — triggers `handleCopy()` (manual copy)
- `Ctrl+Shift+V` — lets browser paste flow through

**Step 3: Verify context menu**

The `TerminalContextMenu` component wraps the terminal and provides right-click copy/paste.

**Step 4: Manual test checklist**

- [ ] Select text with mouse — should auto-copy to clipboard
- [ ] Ctrl+Shift+C — copies current selection
- [ ] Ctrl+Shift+V — pastes from clipboard into terminal
- [ ] Right-click context menu — Copy and Paste options work
- [ ] Paste multiline text — should paste correctly without tmux interference

---

### Task 9: Run Full Test Suite and Build

**Step 1: Run all desktop tests**

```bash
pnpm test:desktop
```

Expected: ALL PASS (no tmux test files, no tmux references in remaining tests)

**Step 2: Run full monorepo tests**

```bash
pnpm test
```

Expected: ALL PASS

**Step 3: Build the desktop app**

```bash
pnpm build
```

Expected: Clean build, no TypeScript errors about missing tmux types/functions

**Step 4: Verify no dead imports**

```bash
grep -r "tmux" apps/desktop/ --include="*.ts" --include="*.tsx" --include="*.cts"
```

Expected: Zero matches

**Step 5: Commit any remaining fixes**

```bash
git commit -m "chore(pty): final cleanup — verify build and tests pass without tmux"
```

---

## Post-Implementation Notes

### What Users Lose
- **Session persistence across app restarts** for plain terminal tabs. When Forja closes, terminal sessions die. AI CLI sessions were never affected (they have their own `--resume` mechanism).

### What Users Gain
- **Stability**: No tmux-inside-tmux conflicts
- **Reliable mouse scroll**: Direct xterm.js scroll without tmux mouse interception
- **Reliable copy/paste**: No tmux buffer interference
- **Simpler architecture**: ~400 lines of tmux code removed
- **Windows parity**: All platforms now use the same direct PTY path

### Files Deleted (6)
- `electron/tmux.ts`
- `electron/pty-tmux.ts`
- `electron/tmux-restore.ts`
- `electron/__tests__/tmux.test.ts`
- `electron/__tests__/tmux-integration.test.ts`
- `electron/__tests__/tmux-restore.test.ts`

### Files Modified (~10-15)
- `electron/pty.ts` — major simplification
- `electron/main.ts` — remove 3 IPC handlers
- `frontend/components/terminal-session.tsx` — remove tmux polling
- `frontend/stores/terminal-tabs.ts` — remove tmuxSessionName
- Various frontend files with minor tmux reference cleanup
