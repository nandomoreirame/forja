# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Forja

Forja is a desktop GUI client for Vibe Coders and other AI coding CLIs, built with Electron + React + TypeScript. It features a hybrid rendering approach with xterm.js for terminal emulation and React for rich markdown/code output.

**Status:** Active development. v1.5.0. 1498+ tests passing across 117 test files.

## Build Commands

```bash
# Development
pnpm dev              # Run Vite + Electron concurrently
pnpm dev:vite         # Run Vite dev server only (port 1420)
pnpm dev:electron     # Run Electron main process (waits for Vite)

# Build
pnpm build            # TypeScript compile + Vite build
pnpm build:electron   # Full Electron build with electron-builder
pnpm preview          # Preview production build

# Testing
pnpm test             # Run all tests (multi-project: jsdom + node)
pnpm test:ui          # Run tests with Vitest UI
pnpm test:coverage    # Run tests with coverage report

# Landing page
pnpm site:dev         # Serve site/public on localhost:3030
pnpm site:deploy      # Deploy to Firebase Hosting
```

### Running Single Tests

```bash
pnpm test path/to/file.test.ts          # Specific test file
pnpm test --grep "pattern"              # Tests matching a pattern
pnpm test --project frontend            # Frontend tests only (jsdom)
pnpm test --project electron            # Electron tests only (node)
pnpm test --watch                       # Watch mode
pnpm test --reporter=verbose            # Verbose output
```

## Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 19 + TypeScript** | UI framework |
| **Tailwind CSS 4 + shadcn/ui** | Styling and components |
| **xterm.js 6** | Terminal emulation (PTY rendering, VT sequences) |
| **Monaco Editor** | Code editing (settings, file editing) |
| **react-markdown + remark-gfm** | Markdown output rendering |
| **Shiki** | Syntax highlighting (Catppuccin Mocha default theme) |
| **Zustand 5** | State management (18 stores) |
| **Lucide React** | Icon system |
| **@dnd-kit** | Drag-and-drop (project sidebar reorder) |
| **@tanstack/react-virtual** | Virtualized lists (file tree) |

### Backend (Electron Main Process)

| Technology | Purpose |
|-----------|---------|
| **Electron 32** | Desktop framework (Node.js main + Chromium renderer) |
| **node-pty** | PTY management, spawns AI CLI processes |
| **chokidar 4** | File watching (`.git/`, settings, project files) |
| **electron-store 10** | Config storage (`~/.config/forja/config.json`) |
| **systeminformation** | System metrics (CPU, memory, disk, network) |
| **git CLI** | Branch info + file status via child_process |

### IPC

Electron IPC via `contextBridge` + `ipcMain`/`ipcRenderer`. Frontend uses `frontend/lib/ipc.ts` as a unified abstraction layer.

### Testing

| Technology | Purpose |
|-----------|---------|
| **Vitest 4** | Multi-project test runner (jsdom for frontend, node for electron) |
| **React Testing Library** | Component testing |
| **happy-dom** | Frontend test environment |

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
    |   +-- Ring buffer for output buffering
    +-- File System
    |   +-- File Reader/Writer/Operations (CRUD)
    |   +-- File Tree (shallow loading, on-demand subdirectories)
    |   +-- LRU File Cache
    |   +-- Path Validation (assertPathWithinScope)
    +-- File Watchers (chokidar)
    |   +-- Project directory watcher (depth: 3, 1s debounce)
    |   +-- Git directory watcher (.git/ changes, 500ms debounce)
    |   +-- Settings watcher (live reload)
    +-- Git Reader (git CLI)
    |   +-- Branch info, file status, diff content
    |   +-- TTL-cached git refresh per project
    +-- Context System
    |   +-- Context Hub (coordination)
    |   +-- Context Sync (in/out/watch)
    |   +-- Tool Registry
    +-- Agent Chat (IPC-based chat with AI CLIs)
    +-- Config Manager (electron-store)
    +-- User Settings (~/.config/forja/settings.json)
    +-- System Metrics (demand-driven sampling)
```

### File Organization

```
frontend/
├── components/     # 43 React components
├── hooks/          # 7 custom hooks
├── stores/         # 18 Zustand stores
├── lib/            # 21 utility modules
├── themes/         # 14+ theme definitions (apply.ts, schema.ts, index.ts)
├── styles/         # CSS (Tailwind + globals)
└── types/          # Shared type definitions

electron/
├── main.ts         # Entry point, all ipcMain handlers
├── preload.ts      # contextBridge for window.electronAPI
├── pty.ts          # PTY management
├── config.ts       # electron-store
├── context/        # Context synchronization system (6 modules)
├── agent-chat*.ts  # Agent chat backend
├── __tests__/      # 26 electron test files

site/
├── public/         # Landing page (static HTML + Tailwind CDN)
└── firebase.json   # Firebase Hosting config

docs/
├── specs/          # BRIEF, PRD, MVP-SCOPE
├── design/         # Design guidelines, landing page specs
├── sdlc/           # ADRs, PRDs, user stories, tasks
├── plans/          # 22 implementation plan docs
├── guides/         # Performance optimization guides
└── performance/    # Benchmarks
```

### Key Files

| File | Purpose |
|------|---------|
| `electron/main.ts` | Entry point, all ipcMain handlers |
| `electron/preload.ts` | contextBridge for window.electronAPI |
| `electron/pty.ts` | PTY management with node-pty |
| `electron/config.ts` | electron-store at `~/.config/forja/config.json` |
| `electron/user-settings.ts` | User settings at `~/.config/forja/settings.json` |
| `electron/watcher.ts` | Git directory watcher (500ms debounce) |
| `electron/file-watcher.ts` | Project file watcher (1s debounce) |
| `electron/git-info.ts` | Git status/branch/diff reader |
| `electron/context/context-hub.ts` | Context synchronization coordinator |
| `electron/agent-chat.ts` | Agent chat backend logic |
| `electron/path-validation.ts` | `assertPathWithinScope()` security |
| `frontend/lib/ipc.ts` | IPC abstraction layer (invoke + listen) |
| `frontend/stores/*.ts` | 18 Zustand state stores |
| `frontend/themes/index.ts` | Theme registry (14+ themes) |

## Code Style Guidelines

### TypeScript Configuration

- **Frontend**: Strict mode, `moduleResolution: bundler`, paths alias `@/*` to `frontend/*`
- **Electron**: Strict mode, `moduleResolution: NodeNext`, `.js` extensions in imports
- **No unused locals/parameters** enforced by compiler

### Imports

**Order** (by convention):

1. External libraries (React, Zustand, etc.)
2. Internal imports (`@/` paths)
3. Relative imports (`./`, `../`)
4. Type-only imports (use `import type`)

```typescript
// Frontend
import { useState, useEffect } from "react";
import { create } from "zustand";
import { getCurrentWindow } from "@/lib/ipc";
import type { SessionType } from "@/lib/cli-registry";

// Electron main process (requires .js extensions)
import { app, BrowserWindow, ipcMain } from "electron";
import type { UiPreferences } from "./config.js";
```

### Naming Conventions

- **Files**: kebab-case (`file-tree.ts`, `use-pty.ts`)
- **Components**: PascalCase (`TerminalPane.tsx`, `FileTree.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePty.ts`, `useInstalledClis.ts`)
- **Stores**: kebab-case (`terminal-tabs.ts`, `user-settings.ts`)
- **Types/Interfaces**: PascalCase (`TerminalTab`, `TerminalTabsState`)
- **Constants**: SCREAMING_SNAKE_CASE for magic values

### React Patterns

- **Function components** only (no classes)
- **Zustand** for state management (not Context)
- **Defensive returns** when data is missing
- **Colocate** types with their usage

```typescript
// Defensive return
function FileTree({ rootPath }: { rootPath: string | null }) {
  if (!rootPath) return null;
  // ...
}

// Zustand store
export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  // ...
}));
```

### CSS / Tailwind

- **Tailwind CSS 4** with theme system (14+ themes, default Catppuccin Mocha)
- Theme colors applied via CSS variables (see `frontend/themes/apply.ts`)
- Use **cn()** utility (`clsx` + `tailwind-merge`) for conditional classes

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "flex items-center gap-2",
  isActive && "bg-ctp-surface0"
)} />
```

### Testing Patterns

- **Frontend tests**: happy-dom environment, mock `@/lib/ipc`
- **Electron tests**: node environment, pool: forks, mock fs/chokidar/node-pty
- Test files colocated in `__tests__/` directories
- Max 2 workers per project (configured in vitest.config.ts)

```typescript
// Standard IPC mock for frontend tests
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));
```

### Electron IPC

- `invoke()` for request/response (returns Promise)
- `listen()` for events (always return cleanup function)
- All IPC channels defined in `electron/preload.ts` via `contextBridge`
- `frontend/lib/dedup-invoke.ts` deduplicates concurrent identical IPC calls

### Security

- Validate file paths with `assertPathWithinScope()` in all IPC handlers
- No `nodeIntegration` in renderer (use `contextBridge`)
- DOMPurify for HTML sanitization
- URL scheme blocking in browser pane (javascript, file, data, vbscript, blob)
- Sandbox enabled, filtered PTY environment variables

## Theme System

14+ built-in themes with CSS variable-based application. Themes defined in `frontend/themes/`:

- **Core**: Catppuccin Mocha (default dark), Catppuccin Latte (light)
- **Popular**: Dracula, Nord, One Dark Pro, Tokyo Night, Solarized Dark, Monokai Pro, Gruvbox Dark, GitHub Dark, Darcula, Alucard, Night Owl, Synthwave 84

Theme switching via settings dialog or command palette. Schema validated in `frontend/themes/schema.ts`.

## Design System

Full guidelines in `docs/design/DESIGN-GUIDELINES.md`.

**Brand color:** `#cba6f7` (Catppuccin Mauve). Use sparingly for selected items, CTAs, highlights.

**Fonts (3 groups via user settings):**

- App UI: Geist Sans, Inter (fallback: system-ui) - default 14px
- Editor/Preview: JetBrains Mono, Fira Code (fallback: Menlo, monospace) - default 13px
- Terminal: JetBrains Mono, Fira Code (fallback: Menlo, monospace) - default 14px

**Component sizes:** Titlebar 40px, Pane Header 36px, Status Bar 24px, Buttons `size="sm"`, Icons `h-4 w-4` toolbar / `h-3 w-3` status / `strokeWidth={1.5}`.

## Key Design Decisions

1. **Config is JSON via electron-store** - `~/.config/forja/config.json` stores projects and preferences
2. **User settings is separate JSON** - `~/.config/forja/settings.json` for fonts, window, sessions, theme
3. **Git via CLI, not libgit2** - Uses `git branch --show-current` and `git status --porcelain`
4. **No authentication** - AI CLIs manage their own auth; Forja doesn't store API keys
5. **Local-first** - No cloud, no accounts, no telemetry without opt-in
6. **macOS + Linux only for MVP** - Windows deferred
7. **Hybrid rendering** - xterm.js for raw PTY, React components for rich markdown output
8. **Shallow file tree** - On-demand subdirectory loading for performance
9. **Demand-driven metrics** - System metrics sampled only when visible
10. **TTL-cached git** - Git refresh coalesced per project with cache
