# Forja - MVP Scope & Sprint Plan

> Tauri → Electron migration with value deliveries per sprint

**Date:** 02/03/2026
**Version:** 2.0
**Status:** ✅ Approved

---

## 🎯 MVP Vision

> Electron desktop app (Linux + macOS) with fluid PTY terminal, Claude Code session, file tree, git diff, and file viewer — organized in per-project workspaces.

**Main hypothesis:**
> "By migrating to Electron and solving the PTY, Forja becomes an app the creator himself uses daily — which generates real credibility for the open source community."

**Success =** Fernando and his partner using Forja as the primary environment for Claude Code, without resorting to the native terminal.

---

## 🗺 Sprints Overview

```
Sprint 0 (3 days) → Electron Foundation
Sprint 1 (5 days) → Fluid PTY Terminal ← CORE VALUE
Sprint 2 (4 days) → Workspace + File Tree
Sprint 3 (4 days) → Git Diff + File Viewer
Sprint 4 (3 days) → Polish + v1.0 Release
─────────────────────────────────────────
Total: ~19 business days (~4 weeks)
```

---

## 🏃 Sprint 0 — Electron Foundation

**Duration:** 3 days
**Value delivery:** Migrated repo, app opens in Electron with preserved visual

### Tasks

| # | Task | Effort |
|---|------|--------|
| 0.1 | Install electron-vite, configure `electron/` + `src/` structure | 4h |
| 0.2 | Create `electron/main.ts` with basic BrowserWindow | 2h |
| 0.3 | Create `electron/preload.ts` with contextBridge skeleton | 2h |
| 0.4 | Remove Tauri dependencies (cargo, tauri.conf.json) | 1h |
| 0.5 | Migrate React components — replace `@tauri-apps/api` with `window.electron` (IPC) | 4h |
| 0.6 | Configure electron-builder (Linux .AppImage + macOS .dmg) | 2h |
| 0.7 | Basic CI: build on both OSes via GitHub Actions | 3h |

### Definition of Done

- [ ] `pnpm dev` opens the app in Electron with the React UI intact
- [ ] No console errors related to Tauri
- [ ] Build works on Linux and macOS

### What NOT to do in this sprint

- ❌ Do not implement PTY yet
- ❌ Do not refactor components — only adapt IPC

---

## 🏃 Sprint 1 — Fluid PTY Terminal

**Duration:** 5 days
**Value delivery:** Terminal that works better than Forja's old native terminal

### This is the most important sprint. The terminal is the heart of Forja

### Tasks

| # | Task | Effort |
|---|------|--------|
| 1.1 | Install `node-pty` + `xterm.js` + addons (fit, web-links) | 1h |
| 1.2 | Create `electron/services/pty.ts` — PTY manager with Map of instances per tabId | 4h |
| 1.3 | Register IPC channels: `pty:spawn`, `pty:input`, `pty:output`, `pty:resize`, `pty:kill` | 3h |
| 1.4 | Create `<Terminal />` component with xterm.js in renderer | 4h |
| 1.5 | Connect xterm.js ↔ IPC ↔ node-pty (input/output/resize) | 4h |
| 1.6 | Implement multiple terminal tabs | 4h |
| 1.7 | Apply Forja's visual theme in xterm (colors, font) | 2h |
| 1.8 | Test Claude Code in the terminal (Linux + macOS) | 2h |
| 1.9 | Measure and validate input latency <16ms | 1h |

### Definition of Done

- [ ] Terminal opens with the OS default shell
- [ ] Claude Code (`claude`) runs without issues
- [ ] Input lag measured <16ms
- [ ] ANSI colors and truecolor working
- [ ] Terminal resize follows the layout
- [ ] Multiple tabs working

### Implementation reference

```typescript
// electron/services/pty.ts
import * as pty from 'node-pty'

const instances = new Map<string, pty.IPty>()

export function spawnPty(tabId: string, cwd: string) {
  const shell = process.env.SHELL || '/bin/bash'
  const instance = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env: process.env as Record<string, string>,
  })
  instances.set(tabId, instance)
  return instance
}
```

---

## 🏃 Sprint 2 — Workspace + File Tree

**Duration:** 4 days
**Value delivery:** Open a project and have the full context (terminal at root, files visible)

### Tasks

| # | Task | Effort |
|---|------|--------|
| 2.1 | Install `electron-store` + `chokidar` | 30min |
| 2.2 | Create `electron/services/workspace.ts` — open dialog, save history | 3h |
| 2.3 | IPC: `workspace:open`, `workspace:list`, `workspace:filetree` | 2h |
| 2.4 | Recursive file tree algorithm (with ignore: node_modules, .git, dist) | 3h |
| 2.5 | Create/adapt `<FileTree />` component in renderer | 4h |
| 2.6 | Chokidar watcher → updates file tree in real time via IPC | 3h |
| 2.7 | Terminal automatically opens at workspace root | 1h |
| 2.8 | Workspace switcher (dropdown or sidebar) | 2h |

### Definition of Done

- [ ] "Open Workspace" opens native dialog and loads the project
- [ ] File tree displays files correctly (without node_modules)
- [ ] Adding/removing files updates the tree in real time
- [ ] Terminal opens at the root of the selected workspace
- [ ] Recent workspaces appear in history

---

## 🏃 Sprint 3 — Git Diff + File Viewer

**Duration:** 4 days
**Value delivery:** See what Claude Code changed without leaving the app

### Tasks

| # | Task | Effort |
|---|------|--------|
| 3.1 | Install `simple-git` + `shiki` | 30min |
| 3.2 | Create `electron/services/git.ts` — status + diff | 3h |
| 3.3 | IPC: `git:status`, `git:diff` | 1h |
| 3.4 | Create/adapt `<GitDiff />` component — file list + inline diff | 5h |
| 3.5 | Automatic git diff update (chokidar watch .git/index) | 2h |
| 3.6 | IPC: `file:read` — main reads file, sends to renderer | 1h |
| 3.7 | Create/adapt `<FileViewer />` component with Shiki for syntax highlight | 4h |
| 3.8 | Clicking on file tree opens file in viewer | 1h |

### Definition of Done

- [ ] Git diff lists modified files with status (M/A/D)
- [ ] Clicking on file shows inline diff
- [ ] Diff updates when Claude Code makes changes
- [ ] File viewer opens any file from the file tree
- [ ] Syntax highlight works for JS/TS/Rust/Python/Go

---

## 🏃 Sprint 4 — Polish + Release v1.0

**Duration:** 3 days
**Value delivery:** Public release on GitHub with binaries for Linux and macOS

### Tasks

| # | Task | Effort |
|---|------|--------|
| 4.1 | Fix bugs found in previous sprints | 4h |
| 4.2 | Test complete flow on Linux (Fernando) | 2h |
| 4.3 | Test complete flow on macOS (partner) | 2h |
| 4.4 | Optimize startup performance (<3s cold start) | 2h |
| 4.5 | Updated README.md with installation and screenshots | 2h |
| 4.6 | GitHub Release with .AppImage + .deb + .dmg | 2h |
| 4.7 | GitHub Actions: automatic build on tag | 2h |

### Definition of Done

- [ ] Zero known P0 bugs
- [ ] App works on Linux and macOS without issues
- [ ] Release v1.0 published on GitHub
- [ ] README with screenshots and installation instructions

---

## ✅ What's IN the MVP (P0)

| Feature | Sprint |
|---------|--------|
| Electron + electron-vite setup | Sprint 0 |
| IPC migration (Tauri → Electron) | Sprint 0 |
| Fluid PTY terminal (node-pty + xterm.js) | Sprint 1 |
| Multiple terminal tabs | Sprint 1 |
| Workspace manager (open folder, history) | Sprint 2 |
| File tree with real-time watcher | Sprint 2 |
| Git diff viewer | Sprint 3 |
| File viewer with syntax highlight | Sprint 3 |
| Linux + macOS build | Sprint 0 + 4 |

---

## 🔜 SHOULD HAVE (P1) — v1.1

| Feature | Why not now |
|---------|-------------|
| WebView widget (browser → localhost) | Electron sandboxing requires attention — separate feature |
| Multiple AIs in the terminal (Gemini CLI, Codex) | Just PTY sessions — trivial after terminal is solid |
| Basic widget system | Requires layout/architecture decision |
| Multi-window / customizable layout | After the core is stable |
| Git status on file tree icons | Nice to have, doesn't block usage |

---

## 🔮 COULD HAVE (P2) — v1.2

| Feature | Why not now |
|---------|-------------|
| Mini apps / widget marketplace | High architecture complexity |
| Deep integration with Cursor agent | Waiting for stable public API |
| Workspace sync/cloud | No monetization, low priority |
| Customizable themes | Dark mode already sufficient |
| Windows support | Focus on Linux + macOS first |

---

## ❌ Won't Have (never or very distant future)

| Feature | Reason |
|---------|--------|
| Full code editor | VS Code exists — don't compete |
| Embedded AI chat (non-terminal) | Outside the concept |
| Mobile app | Doesn't make sense for the product |

---

## 🚨 Risks and Mitigations

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| node-pty with different behavior on Linux vs macOS | Medium | Test on both OSes from Sprint 1 |
| Scope creep (wanting widgets early) | High | Closed sprints — issues for v1.1 |
| node-pty breaking in build (native module) | Medium | electron-rebuild in postinstall |
| React components coupled to Tauri | Low | Already mapped — only IPC calls to adapt |

---

## 📐 Golden Rule

> **"Can I validate that Forja is better than the native terminal WITHOUT this feature?"**

- ✅ If YES → not in the MVP
- ❌ If NO → may enter (but confirm)

---

## 🏁 Definition of Done — MVP

The MVP is ready when:

- [ ] Fluid terminal (input lag <16ms, tested on both OSes)
- [ ] Claude Code runs without issues inside the app
- [ ] Workspace opens project with file tree in <2s
- [ ] Git diff shows Claude's changes in real time
- [ ] File viewer opens any file with syntax highlight
- [ ] Build generates working binaries for Linux and macOS
- [ ] GitHub Release v1.0 published
- [ ] Fernando uses Forja as primary environment (not native terminal)

**Last Updated:** 02/03/2026
