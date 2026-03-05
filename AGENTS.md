# AGENTS.md

This file provides guidance for AI coding agents operating in this repository.

## What is Forja

Forja is a desktop GUI client for Vibe Coders and other AI coding CLIs, built with Electron + React + TypeScript. It features a hybrid rendering approach with xterm.js for terminal emulation and React for rich markdown/code output.

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

## Build Commands

```bash
# Development
pnpm dev              # Run Vite + Electron concurrently
pnpm dev:vite         # Run Vite dev server only (port 1420)
pnpm dev:electron     # Run Electron main process

# Build
pnpm build            # TypeScript compile + Vite build
pnpm build:electron   # Full Electron build with electron-builder
pnpm preview          # Preview production build

# Testing
pnpm test             # Run all tests (multi-project: jsdom + node)
pnpm test:ui          # Run tests with Vitest UI
pnpm test:coverage    # Run tests with coverage report
```

### Running Single Tests

```bash
# Run a specific test file
pnpm test path/to/file.test.ts

# Run tests matching a pattern
pnpm test --grep "pattern"

# Run frontend tests only
pnpm test --project frontend

# Run electron tests only
pnpm test --project electron

# Watch mode
pnpm test --watch

# Run with verbose output
pnpm test --reporter=verbose
```

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

### File Organization

```
frontend/
├── components/     # React components
├── hooks/          # Custom React hooks
├── stores/         # Zustand stores
├── lib/            # Utilities, IPC, helpers
└── types/          # Shared type definitions

electron/
├── *.ts            # Main process modules
└── __tests__/      # Electron tests

tests/
└── setup.ts        # Test setup and polyfills
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
| `electron/user-settings.ts` | User settings manager |
| `frontend/lib/ipc.ts` | IPC abstraction layer |
| `frontend/stores/*.ts` | Zustand state stores |

## Code Style Guidelines

### TypeScript Configuration

- **Frontend**: Strict mode enabled, `moduleResolution: bundler`, paths alias `@/*` to `frontend/*`
- **Electron**: Strict mode enabled, `moduleResolution: NodeNext`
- **No unused locals/parameters** - TypeScript compiler enforces this

### Imports

**Order** (enforced by convention, not linter):

1. External libraries (React, Zustand, etc.)
2. Internal imports (`@/` paths)
3. Relative imports (`./`, `../`)
4. Type-only imports (use `import type`)

```typescript
// Good
import { useState, useEffect } from "react";
import { create } from "zustand";
import { getCurrentWindow } from "@/lib/ipc";
import { type SessionType } from "@/lib/cli-registry";
import { SomeComponent } from "./components";

// Electron main process
import { app, BrowserWindow, ipcMain } from "electron";
import type { UiPreferences } from "./config.js";
```

### Naming Conventions

- **Files**: kebab-case (`file-tree.ts`, `use-pty.ts`)
- **Components**: PascalCase (`TerminalPane.tsx`, `FileTree.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePty.ts`, `useInstalledClis.ts`)
- **Stores**: camelCase (`terminal-tabs.ts`, `user-settings.ts`)
- **Types/Interfaces**: PascalCase (`TerminalTab`, `TerminalTabsState`)
- **Constants**: SCREAMING_SNAKE_CASE for magic values

### React Patterns

- Use **function components** only (no classes)
- Use **Zustand** for state management (not Context)
- Use **defensive returns** when data is missing
- **Colocate** types with their usage when possible

```typescript
// Good - defensive return
function FileTree({ rootPath }: { rootPath: string | null }) {
  if (!rootPath) return null;
  // ... implementation
}

// Good - Zustand store
export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  // ...
}));
```

### Error Handling

- Use **try/catch** for async operations with meaningful error messages
- **Console.warn** for non-fatal issues (e.g., missing optional deps)
- Let errors propagate for truly exceptional cases
- Return `undefined` or fallback values when appropriate

```typescript
// Good - graceful fallback
const api = getAPI();
if (!api) {
  console.warn(`[ipc] electronAPI not available`);
  return Promise.resolve(undefined as T);
}
```

### CSS / Tailwind

- Use **Tailwind CSS 4** with Catppuccin Mocha theme
- Use `ctp-*` utility classes for colors
- Use **cn()** utility (`clsx` + `tailwind-merge`) for conditional classes

```typescript
// Good
import { cn } from "@/lib/utils";

<div className={cn(
  "flex items-center gap-2",
  isActive && "bg-ctp-surface0"
)} />
```

### Testing Patterns

- **Frontend tests**: jsdom environment, mock `@/lib/ipc`
- **Electron tests**: node environment, pool: forks, mock fs/chokidar
- Test files colocated: `__tests__/` in same directory or `tests/` root
- Use `@testing-library/react` for component tests

```typescript
// Mock IPC in tests
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));
```

### Electron IPC

- Use `invoke()` for request/response
- Use `listen()` for events (always return cleanup function)
- All IPC channels defined in `electron/preload.ts` and exposed via `contextBridge`

### Security

- Validate all IPC inputs with `assertPathWithinScope()` for file paths
- No `nodeIntegration` in renderer
- Use `contextBridge` for safe API exposure
- Sanitize user input before shell execution

## Design System

Full design guidelines in `docs/design/DESIGN-GUIDELINES.md`. Key points:

**Theme:** Catppuccin Mocha (dark mode). Catppuccin Latte (light mode, planned).

**Brand color:** `#cba6f7` (Catppuccin Mauve). Use sparingly for selected items, CTAs, highlights.

**Color palette:** Use `ctp-*` Tailwind utility classes. `ctp-base` (#1e1e2e) for backgrounds, `ctp-text` (#cdd6f4) for text, `ctp-surface0` (#313244) for borders/cards, `ctp-overlay1` (#7f849c) for secondary text.

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

## Key Design Decisions

1. **Config is JSON via electron-store** - `~/.config/forja/config.json` stores projects and preferences
2. **User settings is separate JSON** - `~/.config/forja/settings.json` for fonts, window, sessions
3. **Git via CLI, not libgit2** - Uses `git branch --show-current` and `git status --porcelain`
4. **No authentication** - AI CLIs manage their own auth; Forja doesn't store API keys
5. **Local-first** - No cloud, no accounts, no telemetry without opt-in
6. **macOS + Linux only for MVP** - Windows deferred
7. **Dark-only in MVP** - Catppuccin Mocha, no theme toggle
8. **Hybrid rendering** - xterm.js for raw PTY, React components for rich markdown output

## Related Documentation

- `docs/specs/BRIEF.md` - Executive summary, personas, business model
- `docs/specs/PRD.md` - Full product requirements, user stories, technical spec
- `docs/specs/MVP-SCOPE.md` - What's in/out of MVP, timeline, stack decisions
- `docs/design/DESIGN-GUIDELINES.md` - Complete design system (colors, typography, spacing, components)
