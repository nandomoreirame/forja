# Session Save & Restore — Tasks

## Task Dependency Graph

```
T1 (data model) ──┬── T2 (IPC handlers) ──┬── T4 (saved-sessions store)
                   │                       │
                   │                       ├── T5 (save dialog component)
                   │                       │
                   │                       ├── T6 (close tab interception)
                   │                       │
                   │                       ├── T7 (command palette)
                   │                       │
                   │                       └── T8 (keyboard shortcut)
                   │
                   └── T3 (block tabset close)
```

T1 → T2 → {T4, T5, T6, T7, T8} (T4-T8 can be parallelized after T2)
T3 is independent.

---

## T1: Data model — Extend ForjaProjectConfig

**File**: `apps/desktop/electron/project-config.ts`

**Changes**:
1. Add `SavedSessionEntry` interface to `project-config.ts`
2. Add `savedSessions?: SavedSessionEntry[]` to `ForjaProjectConfig`
3. Add helper functions:
   - `readSavedSessions(projectPath): SavedSessionEntry[]` — reads + prunes expired (7 days)
   - `writeSavedSessions(projectPath, sessions: SavedSessionEntry[]): void`
   - `addSavedSession(projectPath, entry: SavedSessionEntry): void` — prunes + enforces 20 limit + appends
   - `removeSavedSession(projectPath, id: string): void`

**Verification**:
- [ ] `SavedSessionEntry` type exported
- [ ] `readSavedSessions` returns empty array when no config exists
- [ ] `readSavedSessions` prunes entries older than 7 days
- [ ] `addSavedSession` enforces 20-entry FIFO limit
- [ ] `removeSavedSession` removes by ID
- [ ] Unit tests pass

---

## T2: IPC handlers — Saved sessions CRUD

**File**: `apps/desktop/electron/main.ts`

**Changes**:
1. Add IPC handler `saved_sessions:save` — calls `addSavedSession`
2. Add IPC handler `saved_sessions:load` — calls `readSavedSessions`
3. Add IPC handler `saved_sessions:delete` — calls `removeSavedSession`
4. Register channels in `apps/desktop/electron/preload.cts`

**Verification**:
- [ ] IPC channels registered in preload
- [ ] `saved_sessions:save` persists to `.forja/config.json`
- [ ] `saved_sessions:load` returns pruned list
- [ ] `saved_sessions:delete` removes entry
- [ ] Unit tests pass

---

## T3: Block tabset/pane close from UI

**Files**:
- `apps/desktop/frontend/components/tabset-context-menu.tsx`
- `apps/desktop/frontend/components/__tests__/tabset-context-menu.test.tsx`

**Changes**:
1. Remove the "Close pane" button from `TabsetContextMenu`
2. Update tests accordingly

**Verification**:
- [ ] Context menu no longer shows "Close pane"
- [ ] `closeTabset` is still callable programmatically (not removed from store)
- [ ] Tests updated and passing

---

## T4: Saved sessions Zustand store

**File**: `apps/desktop/frontend/stores/saved-sessions.ts` (new)

**Changes**:
1. Create `SavedSession` interface (frontend mirror of `SavedSessionEntry`)
2. Create `useSavedSessionsStore` with:
   - `sessions: SavedSession[]`
   - `loading: boolean`
   - `loadSessions(projectPath: string): Promise<void>` — IPC load
   - `saveSession(tab: TerminalTab): Promise<void>` — IPC save, updates local state
   - `restoreSession(id: string): boolean` — creates tab with resume, removes entry, returns true if restored
   - `restoreLastSaved(): boolean` — restores most recent, returns true if restored
   - `deleteSession(id: string): Promise<void>` — IPC delete
3. Hook into project switch to reload sessions (subscribe to `activeProjectPath` changes)

**Verification**:
- [ ] Store loads sessions on project switch
- [ ] `saveSession` adds to local state and persists via IPC
- [ ] `restoreSession` creates tab with correct sessionType, customName, cliSessionId
- [ ] `restoreLastSaved` picks the most recent `savedAt` entry
- [ ] `deleteSession` removes from local state and persists
- [ ] Unit tests pass with mocked IPC

---

## T5: Save session dialog component

**Files**:
- `apps/desktop/frontend/components/save-session-dialog.tsx` (new)
- `apps/desktop/frontend/stores/app-dialogs.ts` (extend)

**Changes**:
1. Extend `useAppDialogsStore`:
   - `saveSessionOpen: boolean`
   - `saveSessionTabId: string | null`
   - `saveSessionResolve: ((action: "save" | "close" | "cancel") => void) | null`
   - `openSaveSessionDialog(tabId: string): Promise<"save" | "close" | "cancel">`
   - `closeSaveSessionDialog(action): void`
2. Create `SaveSessionDialog` component:
   - Shows tab info (CLI icon, session type name, custom name)
   - Three buttons: Cancel, Close, Save & Close
   - Keyboard: Escape = Cancel, Enter = Save & Close
3. Mount in `App.tsx` alongside other dialogs

**Verification**:
- [ ] Dialog renders with correct tab info
- [ ] "Save & Close" resolves promise with "save"
- [ ] "Close" resolves with "close"
- [ ] "Cancel" resolves with "cancel"
- [ ] Escape key triggers cancel
- [ ] Unit tests pass

---

## T6: Close tab interception

**File**: `apps/desktop/frontend/App.tsx`

**Changes**:
1. Modify `closeTab` callback:
   - Look up the tab being closed from `terminal-tabs` store
   - If `sessionType !== "terminal"`: open SaveSessionDialog, await result
   - If "save": call `savedSessionsStore.saveSession(tab)`, then proceed with close
   - If "close": proceed with close (existing behavior)
   - If "cancel": return early (do not close)
   - If `sessionType === "terminal"`: close directly (no dialog)

**Verification**:
- [ ] Closing AI tab shows dialog
- [ ] "Save & Close" saves and closes
- [ ] "Close" closes without saving
- [ ] "Cancel" keeps tab open
- [ ] Terminal tabs close without dialog
- [ ] Unit tests pass

---

## T7: Command palette — Restore session

**Files**:
- `apps/desktop/frontend/stores/command-palette.ts` (extend mode type)
- `apps/desktop/frontend/components/command-palette.tsx`

**Changes**:
1. Add `"saved-sessions"` to `CommandPaletteMode` union
2. In `mode === "commands"` Sessions group:
   - Add "Restore session" `CommandItem` with `RotateCcw` icon and `Ctrl+Shift+T` shortcut
   - Only render when `savedSessions.length > 0`
   - `onSelect` opens `mode: "saved-sessions"`
3. Add `mode === "saved-sessions"` rendering:
   - Group heading "Saved Sessions"
   - Each entry: CLI icon + display name + custom name + relative time
   - `onSelect` calls `savedSessionsStore.restoreSession(id)` + close palette
4. Add empty state text for saved-sessions mode
5. Update placeholder text for saved-sessions mode

**Verification**:
- [ ] "Restore session" item appears when saved sessions exist
- [ ] "Restore session" item hidden when no saved sessions
- [ ] Saved sessions list renders correctly with icons and times
- [ ] Selecting a saved session restores it and closes palette
- [ ] Unit tests pass

---

## T8: Keyboard shortcut — Ctrl+Shift+T enhancement

**File**: `apps/desktop/frontend/hooks/use-keyboard-shortcuts.ts`

**Changes**:
1. Modify `Ctrl+Shift+T` handler:
   - First: call `useSavedSessionsStore.getState().restoreLastSaved()`
   - If returns `true`: done (saved session was restored)
   - If returns `false`: fall back to `useTerminalTabsStore.getState().restoreLastClosedTab()`

**Verification**:
- [ ] `Ctrl+Shift+T` restores saved session when available
- [ ] `Ctrl+Shift+T` falls back to in-memory restore when no saved sessions
- [ ] Unit tests pass

---

## Execution Order

1. **T1** — Data model (foundation)
2. **T2** — IPC handlers (depends on T1)
3. **T3** — Block tabset close (independent, can run in parallel with T2)
4. **T4** — Saved sessions store (depends on T2)
5. **T5** — Save dialog (depends on T4 for store reference)
6. **T6** — Close tab interception (depends on T4 + T5)
7. **T7** — Command palette (depends on T4)
8. **T8** — Keyboard shortcut (depends on T4)

T4-T8 all depend on T2 being complete but are mostly independent of each other. T6 depends on T5.

Recommended sequential order: **T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8**
