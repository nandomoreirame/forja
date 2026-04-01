# Session Save & Restore — Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Renderer)                                         │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │ save-session-     │  │ command-palette.tsx              │  │
│  │ dialog.tsx         │  │  + "Restore session" item       │  │
│  │ (confirmation UI)  │  │  + "saved-sessions" sub-mode    │  │
│  └────────┬─────────┘  └──────────┬──────────────────────┘  │
│           │                       │                         │
│  ┌────────▼───────────────────────▼──────────────────────┐  │
│  │ stores/saved-sessions.ts (Zustand)                    │  │
│  │  - savedSessions: SavedSession[]                      │  │
│  │  - saveSession(tab) → IPC → electron                  │  │
│  │  - loadSessions(projectPath) → IPC → electron         │  │
│  │  - restoreSession(id) → creates tab + removes entry   │  │
│  │  - restoreLastSaved() → restores most recent          │  │
│  │  - deleteSession(id) → IPC → electron                 │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │ IPC                             │
├───────────────────────────┼─────────────────────────────────┤
│ Electron (Main Process)   │                                 │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ main.ts — IPC handlers                                 │ │
│  │  saved_sessions:save     → project-config.ts           │ │
│  │  saved_sessions:load     → project-config.ts           │ │
│  │  saved_sessions:delete   → project-config.ts           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ project-config.ts                                      │ │
│  │  ForjaProjectConfig.savedSessions?: SavedSessionEntry[]│ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### SavedSessionEntry (persisted in `.forja/config.json`)

```typescript
interface SavedSessionEntry {
  id: string;              // crypto.randomUUID()
  sessionType: SessionType; // "claude" | "gemini" | "codex" | etc.
  customName?: string;     // user-defined tab name
  cliSessionId?: string;   // for --resume
  savedAt: string;         // ISO 8601 timestamp
}
```

### ForjaProjectConfig extension

```typescript
interface ForjaProjectConfig {
  // ... existing fields ...
  savedSessions?: SavedSessionEntry[];
}
```

## Component Design

### 1. SaveSessionDialog (`frontend/components/save-session-dialog.tsx`)

Lightweight modal triggered when closing an AI tab. Uses the same pattern as the unsaved-file confirmation in file-preview.

**State**: Managed via `useAppDialogsStore` extension:
- `saveSessionDialogOpen: boolean`
- `saveSessionDialogTabId: string | null`
- `saveSessionDialogCallback: ((action: "save" | "close" | "cancel") => void) | null`

### 2. SavedSessionsStore (`frontend/stores/saved-sessions.ts`)

Zustand store that:
- Loads saved sessions from disk via IPC on project switch
- Exposes `saveSession(tab: TerminalTab)` — persists to disk via IPC
- Exposes `restoreSession(id: string)` — creates tab with resume, removes entry
- Exposes `restoreLastSaved()` — restores most recent by `savedAt`
- Handles expiry pruning (7-day TTL) on load
- Enforces 20-entry FIFO limit on save

### 3. Command Palette Changes

**mode "commands"** — Sessions group:
- Add "Restore session" item (with `RotateCcw` icon) below Terminal
- Only visible when `savedSessions.length > 0`
- Opens `mode: "saved-sessions"` sub-view

**mode "saved-sessions"** (new):
- Lists saved sessions for current project
- Each item: CLI icon + type name + custom name + relative time
- Selecting restores the session

### 4. Keyboard Shortcut Change

`Ctrl+Shift+T` in `use-keyboard-shortcuts.ts`:
- First: check `savedSessionsStore.restoreLastSaved()` — returns `true` if restored
- Fallback: `terminalTabsStore.restoreLastClosedTab()` (existing in-memory behavior)

### 5. Tab Close Interception

In `App.tsx`, the `closeTab` callback:
- Check if tab is AI session (`sessionType !== "terminal"`)
- If AI: show SaveSessionDialog, await user choice
- If "Save & Close": call `savedSessionsStore.saveSession(tab)`, then close
- If "Close": close directly
- If "Cancel": abort

### 6. Block Tabset Close UI

In `tabset-context-menu.tsx`:
- Remove the "Close pane" button entirely

## IPC Channels

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `saved_sessions:save` | renderer → main | `{ projectPath, entry: SavedSessionEntry }` | `void` |
| `saved_sessions:load` | renderer → main | `{ projectPath }` | `SavedSessionEntry[]` |
| `saved_sessions:delete` | renderer → main | `{ projectPath, id: string }` | `void` |

## Expiry & Eviction Logic

On `saved_sessions:load`:
1. Read `savedSessions` from `.forja/config.json`
2. Filter out entries where `savedAt` is older than 7 days
3. If filtered count differs, write back pruned list
4. Return pruned list

On `saved_sessions:save`:
1. Read current list
2. Prune expired
3. If list.length >= 20, remove oldest entry (FIFO)
4. Append new entry
5. Write back

## Edge Cases

- **Tab has no cliSessionId**: Save anyway — restore will create a fresh session of that type
- **CLI no longer installed**: Restore item still shows, but session spawn will fail gracefully (existing error handling in PTY)
- **Project path no longer exists**: `saved_sessions:load` returns empty array (readProjectConfig returns null)
- **Concurrent saves**: Sequential IPC calls, no race condition (Electron main process is single-threaded for IPC handlers)
