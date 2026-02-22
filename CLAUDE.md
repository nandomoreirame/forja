# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Forja

Forja is a dedicated desktop GUI client for Claude Code, built with Tauri 2 (Rust backend) + React (TypeScript frontend). It transforms the raw terminal experience into a rich visual interface with markdown rendering, syntax-highlighted code blocks, and Git context. It is NOT a generic terminal; it is purpose-built for Claude Code workflows.

**Status:** Pre-development (documentation phase). No code has been written yet.

## Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 19 + TypeScript** | UI framework |
| **Tailwind CSS + shadcn/ui** | Styling and components |
| **xterm.js** | Terminal emulation (PTY rendering, VT sequences) |
| **react-markdown + remark-gfm** | Markdown output rendering |
| **Shiki** | Syntax highlighting (theme: tokyo-night or one-dark-pro) |
| **Zustand** | State management |
| **Lucide React** | Icon system |

### Backend (Rust)

| Technology | Purpose |
|-----------|---------|
| **Tauri 2** | Desktop framework (Rust backend + WebView) |
| **portable-pty** (crate) | PTY management, spawns `claude` process |
| **notify** (crate) | File watching (monitors `.git/` for changes) |
| **serde + toml** (crate) | Config storage (`~/.config/forja/config.toml`) |
| **git CLI via Command** | Branch info + file status |

### IPC

Tauri Commands (request/response) + Tauri Events (streaming PTY output in real-time).

### Explicitly NOT used

Redux, Electron, SQLite, Monaco Editor, Styled Components, GraphQL, Material UI, Chakra UI, Ant Design. See `docs/MVP-SCOPE.md` for rationale.

## Architecture

```
[React Frontend]
    |
    | Tauri IPC (Commands + Events)
    |
[Rust Backend]
    ├── PTY Manager (portable-pty)
    │   └── Spawns `claude` process
    │   └── Streams output → Frontend via Tauri Events
    ├── File Watcher (notify)
    │   └── Monitors .git/ for changes
    │   └── Emits Git events → Frontend
    ├── Git Reader (git CLI)
    │   └── Current branch (`git branch --show-current`)
    │   └── File status (`git status --porcelain`)
    └── Config Manager (serde/toml)
        └── Recent projects
        └── User preferences
```

### Rendering Strategy (Hybrid)

- **xterm.js** handles raw PTY input, VT sequences, and terminal interaction
- **React components** handle rich output rendering (markdown, code blocks, syntax highlight)
- **Tauri Events** stream PTY output in real-time from Rust to React

### App Layout

```
┌─────────────────────────────────────────────────┐
│  Titlebar (40px) — menu + title + window btns   │
├──────┬──────────────────┬───────────────────────┤
│      │                  │                       │
│ File │  Claude Code     │  Markdown Preview     │
│ Tree │  Pane (xterm.js) │  (React renderer)     │
│ 256px│  ~60% width      │  ~40% width           │
│      │                  │                       │
├──────┴──────────────────┴───────────────────────┤
│  Status Bar (28px) — system metrics             │
└─────────────────────────────────────────────────┘
```

### Application Flow

```
Home Screen (Project Selector)
  → User selects project directory
  → Workspace opens
      ├── Claude Code Pane (PTY + Enhanced Rendering)
      ├── Markdown Preview (React renderer)
      ├── Git Header (branch + modified file count)
      └── Status Bar
```

## MVP Features (P0)

1. **Project Selector** - Recent projects list + native file picker, persisted in TOML config
2. **Claude Code Pane** - PTY connected to `claude` process with input/output
3. **Markdown Rendering** - CommonMark output rendered in real-time (headers, lists, bold, inline code)
4. **Code Blocks** - Syntax highlight via Shiki, language auto-detection
5. **Session State** - Visual indicator for "thinking" vs "ready" states
6. **Git Header** - Current branch + modified file count, auto-updates via file watcher
7. **Error Handling** - Graceful fallback when `claude` CLI is not installed
8. **File Tree Sidebar** - Collapsible sidebar with project directory structure, file type icons, toolbar actions, and Ctrl+B toggle
9. **System Metrics Status Bar** - Real-time CPU, memory, swap, disk, and network metrics with sparklines

### Explicitly Out of MVP Scope

Shell Pane, Session Manager, Context Panel (token usage), Monaco Editor, Windows support, multi-session/tabs, cloud sync, support for other AI agents, light mode. See `docs/MVP-SCOPE.md` for full list and rationale.

## Key Design Decisions

1. **Config is TOML, not SQLite** - `~/.config/forja/config.toml` stores recent projects and preferences
2. **Git via CLI, not libgit2** - Uses `git branch --show-current` and `git status --porcelain` for simplicity
3. **No authentication** - Claude Code manages its own auth; Forja doesn't store API keys
4. **Local-first** - No cloud, no accounts, no telemetry without opt-in
5. **macOS + Linux only for MVP** - Windows PTY has quirks, deferred to v1.1
6. **Dark-only in MVP** - No theme toggle; dark mode is the default and only option
7. **Hybrid rendering** - xterm.js for raw PTY, React components for rich markdown output

## Design System

Full design guidelines in `docs/DESIGN-GUIDELINES.md`. Key points:

**Theme:** Catppuccin Mocha (dark mode). Catppuccin Latte (light mode, planned).

**Brand color:** `#cba6f7` (Catppuccin Mauve). Use sparingly for selected items, CTAs, highlights.

**Color palette:** Catppuccin Mocha with `ctp-*` Tailwind utility classes. `ctp-base` (#1e1e2e) for backgrounds, `ctp-text` (#cdd6f4) for text, `ctp-surface0` (#313244) for borders/cards, `ctp-overlay1` (#7f849c) for secondary text.

**Fonts:**

- UI: Geist, Inter (fallback: system-ui)
- Code/Terminal: JetBrains Mono, Fira Code (fallback: Menlo, monospace)
- Terminal font-size: 13px

**Component sizes:**

- Git Header: 32px height
- Pane Header: 40px height
- Status Bar: 24px height
- Buttons (app): `size="sm"` (32-36px)
- Icons: `h-4 w-4` toolbar, `h-3 w-3` status, `strokeWidth={1.5}`

**Tailwind config:** Extend colors with `brand` (mauve) and `ctp` (full Catppuccin Mocha palette) objects.

**Terminal theme:** Custom `ITheme` matching Catppuccin Mocha palette (see `docs/DESIGN-GUIDELINES.md`).

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
