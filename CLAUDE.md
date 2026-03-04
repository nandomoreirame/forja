# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Forja

Forja is a dedicated desktop GUI client for Claude Code (and other AI coding CLIs), built with Electron (Node.js backend) + React (TypeScript frontend). It transforms the raw terminal experience into a rich visual interface with markdown rendering, syntax-highlighted code blocks, and Git context. It supports multiple AI CLIs (Claude Code, Gemini CLI, Codex CLI, Cursor Agent) and plain terminal sessions.

**Status:** Active development. Electron migration complete. 400+ tests passing.

## Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 19 + TypeScript** | UI framework |
| **Tailwind CSS 4 + shadcn/ui** | Styling and components |
| **xterm.js** | Terminal emulation (PTY rendering, VT sequences) |
| **react-markdown + remark-gfm** | Markdown output rendering |
| **Shiki** | Syntax highlighting (theme: Catppuccin Mocha) |
| **Zustand** | State management |
| **Lucide React** | Icon system |

### Backend (Node.js / Electron)

| Technology | Purpose |
|-----------|---------|
| **Electron** | Desktop framework (Node.js main process + Chromium renderer) |
| **node-pty** | PTY management, spawns AI CLI processes |
| **chokidar** | File watching (monitors `.git/` and settings changes) |
| **electron-store** | Config storage (`~/.config/forja/config.json`) |
| **systeminformation** | System metrics (CPU, memory, disk, network) |
| **git CLI via child_process** | Branch info + file status |

### IPC

Electron IPC via `contextBridge` + `ipcMain`/`ipcRenderer`. Frontend uses `frontend/lib/ipc.ts` as a unified abstraction layer.

### Testing

| Technology | Purpose |
|-----------|---------|
| **Vitest** | Test runner (multi-project: jsdom for frontend, node for electron) |
| **React Testing Library** | Component testing |

## Architecture

```
[React Frontend (Chromium)]
    |
    | Electron IPC (invoke + events)
    |
[Node.js Backend (Main Process)]
    +-- PTY Manager (node-pty)
    |   +-- Spawns claude / gemini / codex / terminal processes
    |   +-- Streams output -> Frontend via IPC events
    +-- File Watcher (chokidar)
    |   +-- Monitors .git/ for changes
    |   +-- Watches settings.json for live reload
    +-- Git Reader (git CLI)
    |   +-- Branch info (git branch --show-current)
    |   +-- File status (git status --porcelain)
    +-- Config Manager (electron-store)
    |   +-- Recent projects, UI preferences
    +-- User Settings (~/.config/forja/settings.json)
    +-- System Metrics (systeminformation)
```

### Key Files

| File | Purpose |
|------|---------|
| `electron/main.ts` | Entry point, all ipcMain handlers |
| `electron/preload.ts` | contextBridge for window.electronAPI |
| `electron/pty.ts` | PTY management with node-pty |
| `electron/config.ts` | electron-store at ~/.config/forja/config.json |
| `electron/watcher.ts` | chokidar file watcher (500ms debounce) |
| `electron/git-info.ts` | Git status/branch reader |
| `electron/metrics.ts` | systeminformation (2s interval) |
| `electron/user-settings.ts` | User settings manager |
| `frontend/lib/ipc.ts` | IPC abstraction layer |

### Rendering Strategy (Hybrid)

- **xterm.js** handles raw PTY input, VT sequences, and terminal interaction
- **React components** handle rich output rendering (markdown, code blocks, syntax highlight)
- **Electron IPC events** stream PTY output in real-time from main process to renderer

### App Layout

```
+---------------------------------------------------+
|  Titlebar (40px) - menu + title + window controls  |
+------+--------------------+------------------------+
|      |                    |                        |
| File |  Terminal Pane     |  File Preview /        |
| Tree |  (xterm.js)        |  Settings Editor       |
| 256px|  ~60% width        |  ~40% width            |
|      |                    |                        |
+------+--------------------+------------------------+
|  Status Bar (24px) - git info + system metrics      |
+---------------------------------------------------+
```

### Application Flow

```
Home Screen (Project Selector)
  -> User selects project directory
  -> Workspace opens
      +-- Tab Bar (multi-session management)
      +-- Terminal Pane (PTY + xterm.js)
      +-- File Tree Sidebar (directory structure + git status)
      +-- File Preview Pane (code + markdown rendering)
      +-- Status Bar (git branch + metrics)
```

## Current Features

1. **Multi-CLI Support** - Claude Code, Gemini CLI, Codex CLI, Cursor Agent, plain terminal
2. **Multi-Session Tabs** - Concurrent sessions with tab management (Ctrl+T/W/Tab)
3. **Project Selector** - Recent projects + native file picker, persisted in JSON config
4. **File Tree Sidebar** - Directory structure, file type icons, git status indicators, Ctrl+B toggle
5. **File Preview Pane** - Syntax-highlighted code preview and markdown rendering
6. **Settings Editor** - In-app JSON editor with syntax highlighting (Ctrl+,)
7. **Font Settings** - Separate font configuration for app UI, editor/preview, and terminal
8. **Git Integration** - Branch info, modified files counter, per-file status badges, auto-updates
9. **Workspaces** - Group projects into named workspaces, open in dedicated windows
10. **Command Palette** - File navigation (Ctrl+P) and command access (Ctrl+Shift+P)
11. **Terminal Zoom** - Independent font size control (Ctrl+Alt++/-)
12. **System Metrics** - CPU, memory, swap, disk, network in status bar
13. **Session State** - Visual indicator for "thinking" vs "ready" states
14. **Error Handling** - Graceful fallback when AI CLI is not installed

## Key Design Decisions

1. **Config is JSON via electron-store** - `~/.config/forja/config.json` stores projects and preferences
2. **User settings is separate JSON** - `~/.config/forja/settings.json` for fonts, window, sessions
3. **Git via CLI, not libgit2** - Uses `git branch --show-current` and `git status --porcelain`
4. **No authentication** - AI CLIs manage their own auth; Forja doesn't store API keys
5. **Local-first** - No cloud, no accounts, no telemetry without opt-in
6. **macOS + Linux only for MVP** - Windows deferred
7. **Dark-only in MVP** - Catppuccin Mocha, no theme toggle
8. **Hybrid rendering** - xterm.js for raw PTY, React components for rich markdown output

## Design System

Full design guidelines in `docs/DESIGN-GUIDELINES.md`. Key points:

**Theme:** Catppuccin Mocha (dark mode). Catppuccin Latte (light mode, planned).

**Brand color:** `#cba6f7` (Catppuccin Mauve). Use sparingly for selected items, CTAs, highlights.

**Color palette:** Catppuccin Mocha with `ctp-*` Tailwind utility classes. `ctp-base` (#1e1e2e) for backgrounds, `ctp-text` (#cdd6f4) for text, `ctp-surface0` (#313244) for borders/cards, `ctp-overlay1` (#7f849c) for secondary text.

**Fonts (3 groups via user settings):**

- App UI: Geist Sans, Inter (fallback: system-ui) - default 14px
- Editor/Preview: JetBrains Mono, Fira Code (fallback: Menlo, monospace) - default 13px
- Terminal: JetBrains Mono, Fira Code (fallback: Menlo, monospace) - default 14px

**Component sizes:**

- Titlebar: 40px height
- Pane Header: 36px height
- Status Bar: 24px height
- Buttons (app): `size="sm"` (32-36px)
- Icons: `h-4 w-4` toolbar, `h-3 w-3` status, `strokeWidth={1.5}`

## Build Commands

```bash
pnpm dev              # concurrently (vite + electron)
pnpm build:electron   # electron-builder
pnpm test             # vitest multi-project (jsdom + node)
```

## Test Strategy

- Frontend tests: jsdom environment, mock `@/lib/ipc`
- Electron tests: node environment, pool: forks, mock fs/chokidar

## Platform Targets

- macOS: `.dmg` and `.app` (Apple Silicon + Intel)
- Linux: `.AppImage` and `.deb`
- CI/CD: GitHub Actions
- Releases: GitHub Releases

## Performance Targets

| Metric | Target |
|--------|--------|
| App startup | < 2s |
| Project Selector load | < 200ms |
| PTY response overhead | < 50ms vs raw terminal |
| Markdown render (long output) | < 100ms |
| File watcher update | < 1s |

## Documentation

- `docs/BRIEF.md` - Executive summary, personas, business model
- `docs/PRD.md` - Full product requirements, user stories, technical spec, user flows, edge cases
- `docs/MVP-SCOPE.md` - What's in/out of MVP, timeline, stack decisions, definition of done
- `docs/DESIGN-GUIDELINES.md` - Complete design system (colors, typography, spacing, components, accessibility)
- `docs/LANDING-PAGE-SPEC.md` - Landing page structure, design tokens, layout specs
