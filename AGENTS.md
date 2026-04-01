# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Forja

Forja is a desktop GUI client for Vibe Coders and other AI coding CLIs, built as a pnpm monorepo with Electron + React + TypeScript. It features a hybrid rendering approach with xterm.js for terminal emulation and React for rich markdown/code output.

**Status:** Active development. v1.9.2. Cross-platform: macOS, Linux, Windows.

## Monorepo Structure

pnpm workspaces with `apps/*` and `packages/*`:

| Package | Path | Description |
|---------|------|-------------|
| `@forja/desktop` | `apps/desktop/` | Electron desktop app (main product) |
| `@forja/site` | `apps/site/` | Next.js 15 marketing site (port 3030) |
| `@forja/docs` | `apps/docs/` | Fumadocs documentation site (port 3031) |
| `@forja/mobile` | `apps/mobile/` | Expo remote control app (React Native) |
| `@forja/tsconfig` | `packages/tsconfig/` | Shared TypeScript configs (base, react, node, nextjs) |
| `@forja/shared` | `packages/shared/` | Shared types and constants (WebSocket bridge, IPC types) |

All packages reference each other via `workspace:*` protocol.

## Build Commands

```bash
# Development (all from monorepo root)
pnpm dev              # Desktop app (Vite + Electron concurrently)
pnpm dev:site         # Marketing site (Next.js, port 3030)
pnpm dev:docs         # Documentation site (Fumadocs, port 3031)
pnpm dev:mobile       # Mobile app (Expo)

# Build
pnpm build            # Desktop: TypeScript compile + Vite build
pnpm build:electron   # Desktop: full Electron build (dmg/AppImage/deb/nsis)
pnpm build:site       # Site: Next.js static export
pnpm build:docs       # Docs: Next.js build

# Testing
pnpm test             # All workspaces (pnpm -r run test)
pnpm test:desktop     # Desktop only (multi-project: frontend + electron + scripts)

# Cleanup
pnpm clean            # Clean all workspace build artifacts
```

### Running Desktop Tests

```bash
# From root (filters to @forja/desktop)
pnpm test:desktop -- path/to/file.test.ts    # Specific file
pnpm test:desktop -- --project frontend      # Frontend tests only (happy-dom)
pnpm test:desktop -- --project electron      # Electron tests only (node)
pnpm test:desktop -- --watch                 # Watch mode

# From apps/desktop/ directly
pnpm test path/to/file.test.ts
pnpm test --project frontend
pnpm test --reporter=verbose
pnpm test:coverage
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
    |   +-- Ring buffer for output buffering
    +-- File System (reader, writer, tree, LRU cache)
    +-- File Watchers (chokidar)
    |   +-- Project directory (depth: 3, 1s debounce)
    |   +-- Git directory (.git/ changes, 500ms debounce)
    |   +-- Settings (live reload)
    +-- Git Reader (git CLI, TTL-cached)
    +-- Context System (hub, sync, tool registry)
    +-- Plugin System (bridge, loader, registry, permissions)
    +-- WebSocket Bridge (@forja/shared types)
    +-- Config Manager (electron-store)
    +-- System Metrics (demand-driven sampling)
```

### Desktop App File Organization

All paths below are relative to `apps/desktop/`:

```
frontend/
  components/     # React components
  hooks/          # Custom hooks
  stores/         # Zustand stores (state management)
  lib/            # Utility modules (ipc.ts is the key IPC abstraction)
  themes/         # 14+ theme definitions (CSS variable-based)
  styles/         # Tailwind + globals

electron/
  main.ts         # Entry point, all ipcMain handlers
  preload.cts     # contextBridge for window.electronAPI
  pty.ts          # PTY management (node-pty, cross-platform)
  config.ts       # electron-store
  paths.ts        # Cross-platform path utilities
  context/        # Context synchronization system
  plugins/        # Plugin system (bridge, loader, registry, permissions)
  __tests__/      # Electron tests (node env)

scripts/          # Root monorepo scripts (CLI, Discord bot)
```

## Code Style

### TypeScript

- **Frontend** (`apps/desktop/tsconfig.json`): Strict mode, `moduleResolution: bundler`, `@/*` alias to `frontend/*`
- **Electron** (`apps/desktop/electron/tsconfig.json`): Strict mode, `moduleResolution: NodeNext`, `.js` extensions in imports
- **Shared configs**: All extend `@forja/tsconfig` presets (base, react, node, nextjs)

### Imports

Order: external libraries, `@/` paths, relative imports, `import type` last.

```typescript
// Frontend (apps/desktop/frontend/)
import { useState } from "react";
import { create } from "zustand";
import { getCurrentWindow } from "@/lib/ipc";
import type { SessionType } from "@/lib/cli-registry";

// Electron main process (requires .js extensions)
import { app, BrowserWindow, ipcMain } from "electron";
import type { UiPreferences } from "./config.js";
```

### Naming

- **Files**: kebab-case (`file-tree.ts`, `use-pty.ts`)
- **Components**: PascalCase (`TerminalPane.tsx`)
- **Stores**: kebab-case Zustand stores (`terminal-tabs.ts`)
- **Types**: PascalCase (`TerminalTab`, `TerminalTabsState`)

### React Patterns

- Function components only, Zustand for state (not Context)
- Defensive returns when data is missing
- `cn()` utility (clsx + tailwind-merge) for conditional classes

### Testing Patterns

- **Frontend tests**: happy-dom environment, always mock `@/lib/ipc`
- **Electron tests**: node environment, forks pool, mock fs/chokidar/node-pty
- Test files colocated in `__tests__/` directories
- Max 2 workers per project

```typescript
// Standard IPC mock for frontend tests
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));
```

### IPC

- `invoke()` for request/response, `listen()` for events (always return cleanup)
- All channels defined in `electron/preload.cts` via `contextBridge`
- `frontend/lib/dedup-invoke.ts` deduplicates concurrent identical calls
- `frontend/lib/ipc.ts` is the unified abstraction layer

### Security

- `assertPathWithinScope()` in all file-related IPC handlers
- No `nodeIntegration`, use `contextBridge` only
- DOMPurify for HTML sanitization
- URL scheme blocking (javascript, file, data, vbscript, blob)
- Sandbox enabled, filtered PTY environment variables

## Key Design Decisions

1. **pnpm monorepo** - Shared configs (`@forja/tsconfig`) and types (`@forja/shared`) across desktop, site, docs, mobile
2. **Config via electron-store** - `~/.config/forja/config.json` (Unix) or `%APPDATA%/forja/config.json` (Windows)
3. **Cross-platform paths** - `electron/paths.ts` with `getForjaConfigDir()` handles OS differences
4. **Git via CLI, not libgit2** - `git branch --show-current`, `git status --porcelain`
5. **No authentication** - AI CLIs manage their own auth
6. **Local-first** - No cloud, no accounts, no telemetry without opt-in
7. **Hybrid rendering** - xterm.js for raw PTY, React for rich markdown output
8. **Trunk-Based Development** - main is the trunk, `release/X.Y` branches for releases
9. **Native addons** - `node-pty` requires `electron-rebuild` (CI runs `npx electron-rebuild` in `apps/desktop/`)
