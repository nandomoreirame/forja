# Plan: Session Save & Restore

**Date**: 2026-03-31
**Status**: Ready for implementation (reviewed 2026-03-31)
**Scope**: Large (3 parallel phases, 5 subagents)
**Review**: See [Code Review Fixes](#code-review-fixes) section for post-review corrections

## Overview

When closing an AI session tab (not terminal), prompt the user to save it for later restoration. Saved sessions persist per-project with `cliSessionId` for CLI resume, `customName`, and `sessionType`. A "Restore session" item in the command palette and `Ctrl+Shift+T` shortcut allow restoring saved sessions.

## Requirements

### REQ-1: Save prompt on AI tab close

When the user closes a tab (click X, `Ctrl+W`, or any close action) whose `sessionType` is an AI CLI (not `"terminal"`):

- **REQ-1.1**: Show a confirmation dialog: "Save this session to restore later?"
- **REQ-1.2**: Dialog has three actions: **Save & Close**, **Close without saving**, **Cancel**
- **REQ-1.3**: If "Save & Close", persist the session metadata and close the tab
- **REQ-1.4**: If "Close without saving", close the tab normally (current behavior)
- **REQ-1.5**: If "Cancel", do nothing (tab stays open)
- **REQ-1.6**: Terminal tabs (`sessionType === "terminal"`) close without prompt (current behavior)

### REQ-2: Saved session data model

Each saved session entry contains:

- **REQ-2.1**: `id` — unique identifier (UUID)
- **REQ-2.2**: `sessionType` — the CLI type (`claude`, `gemini`, `codex`, etc.)
- **REQ-2.3**: `customName` — user-defined tab name (if any)
- **REQ-2.4**: `cliSessionId` — CLI session ID for `--resume` restoration
- **REQ-2.5**: `savedAt` — ISO timestamp of when the session was saved

### REQ-3: Persistence & lifecycle

- **REQ-3.1**: Saved sessions stored per-project in `.forja/config.json` under `savedSessions` key
- **REQ-3.2**: Maximum 20 saved sessions per project (FIFO eviction)
- **REQ-3.3**: Sessions expire after 7 days (checked on load, expired entries pruned)
- **REQ-3.4**: When a project is removed from workspace, saved sessions remain in `.forja/config.json`

### REQ-4: Restore via command palette

- **REQ-4.1**: Add "Restore session" item in the Sessions group of command palette (mode `commands`)
- **REQ-4.2**: Clicking opens sub-view (mode `saved-sessions`) listing saved sessions for current project
- **REQ-4.3**: Each entry shows: CLI icon + type name + custom name (if set) + relative time
- **REQ-4.4**: Selecting restores the tab with `sessionType`, `customName`, and spawns CLI with `--resume <cliSessionId>`
- **REQ-4.5**: After restoring, entry is removed from saved sessions list
- **REQ-4.6**: "Restore session" item hidden when no saved sessions exist

### REQ-5: Restore via keyboard shortcut

- **REQ-5.1**: `Ctrl+Shift+T` restores the most recently saved session (last `savedAt`)
- **REQ-5.2**: Falls back to current `restoreLastClosedTab()` in-memory behavior when no saved sessions

### REQ-6: Block tabset/pane close

- **REQ-6.1**: Remove "Close pane" option from tabset context menu
- **REQ-6.2**: `closeTabset` method remains available internally (not removed from store)

## Architecture

```
Frontend (Renderer)
  save-session-dialog.tsx ─────┐
  command-palette.tsx ─────────┤
  use-keyboard-shortcuts.ts ───┤
                               ▼
  stores/saved-sessions.ts (Zustand)
    - sessions: SavedSession[]
    - saveSession(tab) → IPC
    - restoreSession(id) → create tab + remove entry
    - restoreLastSaved() → restore most recent
    - loadSessions(projectPath) → IPC
                               │ IPC
Electron (Main Process)        ▼
  main.ts — IPC handlers
    saved_sessions:save   → project-config.ts
    saved_sessions:load   → project-config.ts
    saved_sessions:delete → project-config.ts

  project-config.ts
    ForjaProjectConfig.savedSessions?: SavedSessionEntry[]
```

### Data Model

```typescript
// electron/project-config.ts — sessionType typed as string (electron layer doesn't import frontend types)
interface SavedSessionEntry {
  id: string;              // crypto.randomUUID()
  sessionType: string;     // "claude" | "gemini" | "codex" | etc. (string, not SessionType)
  customName?: string;     // user-defined tab name
  cliSessionId?: string;   // for --resume
  savedAt: string;         // ISO 8601 timestamp
}

interface ForjaProjectConfig {
  // ... existing fields ...
  savedSessions?: SavedSessionEntry[];
}
```

### IPC Channels

| Channel | Payload | Response |
|---------|---------|----------|
| `saved_sessions:save` | `{ projectPath, entry: SavedSessionEntry }` | `void` |
| `saved_sessions:load` | `{ projectPath }` | `SavedSessionEntry[]` |
| `saved_sessions:delete` | `{ projectPath, id: string }` | `void` |

### Expiry & Eviction

**On load**: filter entries where `savedAt` older than 7 days, write back if pruned.
**On save**: prune expired, if `length >= 20` remove oldest (FIFO), append new entry.

### Edge Cases

- **Tab has no cliSessionId**: Save anyway; restore creates fresh session of that type
- **CLI no longer installed**: Restore shows item, spawn fails gracefully (existing PTY error handling)
- **Project path no longer exists**: `saved_sessions:load` returns empty array

## UI Mockup

### Save dialog (on AI tab close)

```
┌─────────────────────────────────────────┐
│  Save session before closing?           │
│                                         │
│  Claude Code - "my-feature-work"        │
│                                         │
│  [Cancel]  [Close]  [Save & Close]      │
└─────────────────────────────────────────┘
```

### Command palette — Sessions group (mode "commands")

```
Sessions
  ✦ Claude Code
  ◆ Codex CLI
  ✦ Gemini CLI
  ▶ Cursor Agent
  ✡ GitHub Copilot
  ☐ Terminal
  ──────────────────────────────
  ↩ Restore session     Ctrl+Shift+T
```

### Saved sessions sub-view (mode "saved-sessions")

```
Saved Sessions
  ✦ Claude Code — "my-feature-work"         2h ago
  ◆ Codex CLI                                1 day ago
  ✦ Claude Code — "refactor-auth"            3 days ago
```

## Out of Scope

- Saving terminal buffer/output content
- Global (cross-project) saved sessions
- Saving/restoring tiling layout position of the tab
- Auto-save on app quit (only manual save via dialog)

---

## Implementation Plan — Parallel Subagents

### Execution Strategy

3 sequential phases. Within each phase, independent work runs in parallel subagents.

```
Phase 1: Foundation (sequential — shared files)
  Agent A: Data model + IPC handlers + preload
           T1 + T2 merged — both touch electron/ files

Phase 2: Frontend core (parallel — independent files)
  Agent B: Zustand store + save dialog + close interception
           T4 + T5 + T6 — stores/saved-sessions.ts, save-session-dialog.tsx, App.tsx
  Agent C: Block tabset close
           T3 — tabset-context-menu.tsx + tests

Phase 3: UI integration (parallel — independent files)
  Agent D: Command palette restore
           T7 — command-palette.ts, command-palette.tsx
  Agent E: Keyboard shortcut
           T8 — use-keyboard-shortcuts.ts
```

---

### Phase 1 — Agent A: Data Model + IPC Handlers

**Files**:
- `apps/desktop/electron/project-config.ts`
- `apps/desktop/electron/main.ts`
- `apps/desktop/electron/preload.cts`
- `apps/desktop/electron/__tests__/project-config-saved-sessions.test.ts` (new)

**Steps**:

1. Add `SavedSessionEntry` interface and `savedSessions?` field to `ForjaProjectConfig` in `project-config.ts`
2. Add helper functions:
   - `readSavedSessions(projectPath): SavedSessionEntry[]` — reads from config, prunes expired (7-day TTL), writes back if pruned
   - `addSavedSession(projectPath, entry: SavedSessionEntry): void` — prunes expired, enforces 20-entry FIFO limit, appends
   - `removeSavedSession(projectPath, id: string): void` — removes by ID
3. Add 3 IPC handlers in `main.ts`:
   - `saved_sessions:save` → `addSavedSession`
   - `saved_sessions:load` → `readSavedSessions`
   - `saved_sessions:delete` → `removeSavedSession`
4. Register channels in `preload.cts` allowlist
5. Write unit tests for all helper functions (expiry, FIFO, CRUD)

**Verification**:
- [ ] `SavedSessionEntry` type exported
- [ ] `readSavedSessions` returns `[]` when no config
- [ ] `readSavedSessions` prunes entries older than 7 days
- [ ] `addSavedSession` caps at 20 entries (removes oldest)
- [ ] `removeSavedSession` removes by ID
- [ ] IPC channels registered in preload
- [ ] Tests pass: `pnpm test:desktop -- apps/desktop/electron/__tests__/project-config-saved-sessions.test.ts`

---

### Phase 2 — Agent B: Zustand Store + Save Dialog + Close Interception

**Files**:
- `apps/desktop/frontend/stores/saved-sessions.ts` (new)
- `apps/desktop/frontend/stores/__tests__/saved-sessions.test.ts` (new)
- `apps/desktop/frontend/components/save-session-dialog.tsx` (new)
- `apps/desktop/frontend/components/__tests__/save-session-dialog.test.tsx` (new)
- `apps/desktop/frontend/stores/app-dialogs.ts` (extend)
- `apps/desktop/frontend/stores/__tests__/app-dialogs.test.ts` (update — CR-W3)
- `apps/desktop/frontend/App.tsx` (modify closeTab)
- `apps/desktop/frontend/lib/ipc.ts` (register new IPC types — CR-W2)

**Steps**:

1. **Zustand store** (`stores/saved-sessions.ts`):
   - `SavedSession` interface (frontend mirror)
   - State: `sessions: SavedSession[]`, `loading: boolean`
   - Actions:
     - `loadSessions(projectPath)` — calls `invoke("saved_sessions:load", { projectPath })`
     - `saveSession(tab: TerminalTab)` — builds entry, calls `invoke("saved_sessions:save", ...)`, updates local state
     - `restoreSession(id)` — finds entry, creates tab via `terminalTabsStore.addTab()` with `customName`, sets `cliSessionId`, calls `invoke("saved_sessions:delete", ...)`, removes from local state, returns `true`
     - `restoreLastSaved()` — sorts by `savedAt` desc, calls `restoreSession` on first, returns `true/false`
     - `deleteSession(id)` — calls `invoke("saved_sessions:delete", ...)`, removes from local state
   - Subscribe to `useProjectsStore` `activeProjectPath` changes to auto-reload
   - **CRITICAL (CR-1)**: The module-level `useProjectsStore.subscribe()` call will break existing tests that import `command-palette.tsx` transitively. The `saved-sessions.ts` module MUST be mockable. Ensure all tests that mock `@/stores/projects` also include `subscribe: vi.fn()` in their mock, OR mock `@/stores/saved-sessions` entirely.
   - Write tests with mocked IPC

2. **Save dialog** (`components/save-session-dialog.tsx`):
   - Extend `useAppDialogsStore` with:
     - `saveSessionOpen: boolean` (default `false`)
     - `saveSessionTabId: string | null` (default `null`)
     - `saveSessionResolve: ((action: "save" | "close" | "cancel") => void) | null`
     - `openSaveSessionDialog(tabId): Promise<"save" | "close" | "cancel">` — sets state, returns promise
     - `closeSaveSessionDialog(action)` — calls resolve, resets state
   - Component renders modal with:
     - Tab info: CLI icon (via `CliIcon`) + session type display name + custom name
     - 3 buttons: Cancel, Close, Save & Close (primary)
     - Escape = Cancel, Enter = Save & Close
   - Write tests

3. **Close tab interception** (`App.tsx`):
   - Modify `closeTab` callback:
     ```typescript
     const closeTab = useCallback(async (tabId: string) => {
       const tab = useTerminalTabsStore.getState().tabs.find(t => t.id === tabId);

       if (tab && tab.sessionType !== "terminal") {
         const action = await useAppDialogsStore.getState().openSaveSessionDialog(tabId);
         if (action === "cancel") return;
         if (action === "save") {
           await useSavedSessionsStore.getState().saveSession(tab);
         }
       }

       try { await invoke("close_pty", { tabId }); } catch {}
       removeTab(tabId);
     }, [removeTab]);
     ```
   - Mount `<SaveSessionDialog />` in App.tsx alongside other dialogs

**Verification**:
- [ ] Store loads sessions on project switch
- [ ] `saveSession` persists via IPC and updates local state
- [ ] `restoreSession` creates tab with correct type/name/cliSessionId
- [ ] `restoreLastSaved` picks most recent entry
- [ ] Dialog renders with tab info, 3 buttons work correctly
- [ ] Closing AI tab shows dialog; terminal tabs close directly
- [ ] "Save & Close" saves then closes; "Close" just closes; "Cancel" aborts
- [ ] Tests pass: `pnpm test:desktop -- --project frontend`

---

### Phase 2 — Agent C: Block Tabset Close

**Files**:
- `apps/desktop/frontend/components/tabset-context-menu.tsx`
- `apps/desktop/frontend/components/__tests__/tabset-context-menu.test.tsx`

**Steps**:

1. Remove the "Close pane" button from `TabsetContextMenu` component
2. Since the context menu only had one item ("Close pane"), the component becomes empty. Options:
   - Option A: Remove the entire context menu rendering (no right-click menu on tabset headers)
   - Option B: Keep the component but with no items (renders nothing)
   - Choose Option A — cleaner, the context menu trigger should also be disabled
3. Update tests to reflect removal

**Note**: `closeTabset` stays in the `tiling-layout` store — only the UI trigger is removed.

**Verification**:
- [ ] Right-clicking tabset header no longer shows "Close pane"
- [ ] `useTilingLayoutStore.getState().closeTabset` still exists and works
- [ ] Tests updated and passing
- [ ] `pnpm test:desktop -- apps/desktop/frontend/components/__tests__/tabset-context-menu.test.tsx`

---

### Phase 3 — Agent D: Command Palette Restore

**Files**:
- `apps/desktop/frontend/stores/command-palette.ts`
- `apps/desktop/frontend/components/command-palette.tsx`
- `apps/desktop/frontend/components/__tests__/command-palette-saved-sessions.test.tsx` (new)
- `apps/desktop/frontend/components/__tests__/command-palette.test.tsx` (fix — CR-1)
- `apps/desktop/frontend/components/__tests__/command-palette-quick-actions.test.tsx` (fix — CR-1)

**Steps**:

1. Add `"saved-sessions"` to `CommandPaletteMode` type in `command-palette.ts`

2. In `command-palette.tsx`, `mode === "commands"` Sessions group:
   - After the Terminal `CommandItem`, add "Restore session" item:
     ```tsx
     {savedSessions.length > 0 && (
       <CommandItem
         value="Restore session"
         onSelect={() => open("saved-sessions")}
       >
         <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
         Restore session
         <CommandShortcut>{mod}+Shift+T</CommandShortcut>
       </CommandItem>
     )}
     ```
   - Import `useSavedSessionsStore` and read `sessions`

3. Add `mode === "saved-sessions"` section:
   - Group heading: "Saved Sessions"
   - Each entry: `<CliIcon>` + display name + custom name (dimmed) + relative time (dimmed)
   - `onSelect` → `savedSessionsStore.restoreSession(id)` + `close()`
   - Helper function `formatRelativeTime(isoDate: string): string` for "2h ago", "3 days ago"

4. Update placeholder and empty text for saved-sessions mode

5. Write tests for new saved-sessions mode

6. **CRITICAL (CR-1): Fix existing command palette tests**:
   - `command-palette.test.tsx`: Add `vi.mock("@/stores/saved-sessions", ...)` to prevent module-level subscription from executing. The mock should export `useSavedSessionsStore` with `getState: () => ({ sessions: [], loading: false })`.
   - `command-palette-quick-actions.test.tsx`: Same mock needed. Also ensure `@/stores/projects` mock includes `subscribe: vi.fn()` if not already.
   - Run BOTH test files to confirm no regressions: `pnpm test:desktop -- apps/desktop/frontend/components/__tests__/command-palette.test.tsx apps/desktop/frontend/components/__tests__/command-palette-quick-actions.test.tsx`

**Verification**:
- [ ] "Restore session" appears when savedSessions.length > 0
- [ ] "Restore session" hidden when empty
- [ ] saved-sessions mode lists entries with icons and relative time
- [ ] Selecting entry restores and closes palette
- [ ] **Existing** command-palette.test.tsx passes (CR-1)
- [ ] **Existing** command-palette-quick-actions.test.tsx passes (CR-1)
- [ ] New command-palette-saved-sessions.test.tsx passes

---

### Phase 3 — Agent E: Keyboard Shortcut Enhancement

**Files**:
- `apps/desktop/frontend/hooks/use-keyboard-shortcuts.ts`
- `apps/desktop/frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts`

**Steps**:

1. Modify `Ctrl+Shift+T` handler (line 63-68):
   ```typescript
   if (mod && event.shiftKey && event.key.toLowerCase() === "t") {
     event.preventDefault();
     // Prioritize saved sessions, fall back to in-memory closed tabs
     const restored = useSavedSessionsStore.getState().restoreLastSaved();
     if (!restored) {
       useTerminalTabsStore.getState().restoreLastClosedTab();
     }
     return;
   }
   ```
   Use static import at top: `import { useSavedSessionsStore } from "@/stores/saved-sessions";` (no circular dependency exists — CR-W1).

2. Update existing tests for the new behavior
3. Add test: Ctrl+Shift+T with saved sessions available → restores saved
4. Add test: Ctrl+Shift+T without saved sessions → falls back to restoreLastClosedTab

**Verification**:
- [ ] Ctrl+Shift+T restores saved session when available
- [ ] Ctrl+Shift+T falls back to in-memory when no saved sessions
- [ ] Tests pass: `pnpm test:desktop -- apps/desktop/frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts`

---

## Summary

| Phase | Agent | Work | Files (new/modified) | Parallel? |
|-------|-------|------|---------------------|-----------|
| 1 | A | Data model + IPC + preload | 3 modified + 1 new test | Sequential |
| 2 | B | Store + dialog + close interception | 4 new + 4 modified | Parallel |
| 2 | C | Block tabset close | 2 modified | Parallel |
| 3 | D | Command palette restore + fix existing tests (CR-1) | 2 modified + 1 new test + 2 fixed tests | Parallel |
| 3 | E | Keyboard shortcut | 2 modified | Parallel |

**Total**: 6 new files, 13 modified files, 5 subagents across 3 phases.

---

## Code Review Fixes

Corrections applied from code review (2026-03-31):

| ID | Severity | Fix Applied |
|----|----------|-------------|
| CR-1 | CRITICAL | Agent D now includes fixing `command-palette.test.tsx` and `command-palette-quick-actions.test.tsx` — add `vi.mock("@/stores/saved-sessions")` to prevent module-level subscription breakage |
| CR-2 | CRITICAL | File counts corrected from "5 new + 9 modified" to "6 new + 13 modified" |
| CR-W1 | WARNING | Agent E uses static import instead of dynamic import (no circular dependency) |
| CR-W2 | WARNING | Agent B file list now includes `ipc.ts` (IPC type registration) |
| CR-W3 | WARNING | Agent B file list now includes `app-dialogs.test.ts` |
| CR-W4 | WARNING | Agent B steps include note about module-level side effects risk and mock strategy |
| CR-I1 | INFO | `SavedSessionEntry.sessionType` correctly typed as `string` in electron layer (not `SessionType`) |
| CR-I4 | INFO | Noted: preload uses `remove` method name but IPC channel is `saved_sessions:delete` — acceptable inconsistency |
