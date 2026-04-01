# Session Save & Restore

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
- **REQ-2.6**: `projectPath` — the project path the tab belonged to

### REQ-3: Persistence & lifecycle

- **REQ-3.1**: Saved sessions are stored per-project in the local project config (`.forja/config.json`)
- **REQ-3.2**: Maximum 20 saved sessions per project (FIFO eviction)
- **REQ-3.3**: Sessions expire after 7 days (checked on load, expired entries pruned)
- **REQ-3.4**: When a project is removed from workspace, saved sessions remain in `.forja/config.json` (restored if project is re-added)

### REQ-4: Restore via command palette

- **REQ-4.1**: Add "Restore session" item in the **Sessions** group of command palette (`mode === "commands"`)
- **REQ-4.2**: Clicking "Restore session" opens a sub-view listing saved sessions for the current project
- **REQ-4.3**: Each entry shows: CLI icon + session type name + custom name (if set) + relative time ("2h ago", "3 days ago")
- **REQ-4.4**: Selecting an entry creates a new tab with the saved `sessionType`, `customName`, and spawns the CLI with `--resume <cliSessionId>`
- **REQ-4.5**: After restoring, the saved entry is removed from the saved sessions list
- **REQ-4.6**: If no saved sessions exist for the current project, the "Restore session" item is hidden

### REQ-5: Restore via keyboard shortcut

- **REQ-5.1**: `Ctrl+Shift+T` restores the most recently saved session (last `savedAt`)
- **REQ-5.2**: This replaces the current `restoreLastClosedTab()` behavior with saved session restore
- **REQ-5.3**: If no saved sessions exist, fall back to the current `restoreLastClosedTab()` in-memory behavior

### REQ-6: Block tabset/pane close

- **REQ-6.1**: Remove the "Close pane" option from the tabset context menu
- **REQ-6.2**: The `closeTabset` method in tiling-layout remains available internally but is not exposed via UI

## Out of Scope

- Saving terminal buffer/output content
- Global (cross-project) saved sessions
- Saving/restoring the tiling layout position of the tab
- Auto-save on app quit (only manual save via dialog)

## UI Mockup (text)

### Save dialog (on tab close)

```
┌─────────────────────────────────────────┐
│  Save session before closing?           │
│                                         │
│  Claude Code - "my-feature-work"        │
│                                         │
│  [Cancel]  [Close]  [Save & Close]      │
└─────────────────────────────────────────┘
```

### Command palette — Sessions group

```
Sessions
  ✦ Claude Code
  ◆ Codex CLI
  ✦ Gemini CLI
  ▶ Cursor Agent
  ✡ GitHub Copilot
  ☐ Terminal
  ─────────────────
  ↩ Restore session          Ctrl+Shift+T
```

### Restore session sub-view

```
Saved Sessions
  ✦ Claude Code — "my-feature-work"         2h ago
  ◆ Codex CLI                                1 day ago
  ✦ Claude Code — "refactor-auth"            3 days ago
```

## Technical Notes

- The save dialog should be a lightweight modal component (similar to the unsaved-file dialog pattern in `file-preview`)
- Saved sessions stored under `savedSessions` key in `.forja/config.json` (via `project-config.ts`)
- The `restoreLastClosedTab` in `terminal-tabs.ts` keeps working for in-session undo (non-AI tabs, or when user chose "Close without saving")
- `Ctrl+Shift+T` first checks saved sessions, then falls back to `recentlyClosed`
