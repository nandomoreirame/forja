# Forja - PRD (Product Requirements Document)

> Complete technical specification — Tauri → Electron Migration

**Author:** Fernando Moreira
**Date:** 02/03/2026
**Version:** 2.0
**Status:** ✅ Approved

---

## 🎯 Overview

### Vision

> To be the definitive desktop environment for developers who use agentic AIs — unifying fluid terminals, AI sessions, file tree, and git diff in per-project workspaces.

### Problem Statement

**What is happening:**
The current version of Forja (Tauri 2 + Rust) has critical fluidity issues in the integrated terminal (PTY via Rust with latency in Rust↔WebView serialization), plus WebView inconsistencies between operating systems, making the experience inferior to what a simple native terminal offers.

**Who is affected:**
Developers (Fernando + partner) who use Claude Code daily and need a workspace-organized environment.

**Cost of not solving:**
Continuing to use the app with visible bugs → loss of credibility as an open source project → no community adoption.

**How they solve it today:**
Native terminal (fish/zsh) + Claude Code CLI + VS Code side-by-side — no integration, no workspace context.

### Goals

- [x] **Fluid PTY terminal** — latency <16ms, same as VS Code
  → Metric: input lag benchmark | Target: <16ms

- [x] **Functional workspace** — open project with full context in <2s
  → Metric: open time | Target: <2s

- [x] **Complete migration without visual loss** — React UI preserved
  → Metric: reused components | Target: >80%

### Non-Goals

- ❌ Widget system — v1.2
- ❌ WebView embed — v1.1
- ❌ Multi-AI (Gemini, Codex) — v1.1
- ❌ Windows support — future
- ❌ Cloud workspace sync — future

---

## 👤 User Personas

### Persona 1: Fernando — The Creator

**Who they are:** Full-stack developer, 30s, Linux (primary), uses Claude Code as their primary daily development tool.

**Background:**
Builds tools for the Claude Code community. Uses the terminal extensively. Wants an environment that "disappears" and lets the work flow — no visible bugs, no latency, no constant window switching.

**Main Pain:**
The current Forja has slow and buggy TTY — he uses the native terminal more than the very app he created.

**Goals:**

- Terminal that works perfectly
- See file tree and git diff without leaving the app
- Have a per-project workspace that remembers state

**Tech Savviness:** High

**Quote:**
> "I created the app but use the native terminal because my own terminal inside the app is bad."

---

### Persona 2: Partner — The macOS User

**Who they are:** Developer, macOS, Forja collaborator.

**Main Pain:**
macOS WebView (WebKit) renders differently from Linux — visual bugs and different behaviors in the Tauri version.

**Goals:**

- App that works the same on macOS
- Contribute without needing to debug platform differences

**Tech Savviness:** High

---

## 📖 User Stories

### Core Stories (Must-Have)

- [x] As a developer, I want to open a workspace (folder) to have all the project context in one place
  - **Criteria:**
    - [ ] I select a folder via the file system
    - [ ] File tree loads automatically
    - [ ] Terminal opens at the project root
    - [ ] Workspace is saved in history

- [x] As a developer, I want a fluid terminal to use Claude Code without latency
  - **Criteria:**
    - [ ] Input lag <16ms
    - [ ] Full ANSI color support
    - [ ] Responsive resize (terminal resizes with the window)
    - [ ] Multiple terminal tabs
    - [ ] Smooth scroll in history

- [x] As a developer, I want to see the project's git diff to review changes without leaving the app
  - **Criteria:**
    - [ ] List of modified files
    - [ ] Side-by-side or inline diff
    - [ ] Status indicator (added/modified/deleted)

- [x] As a developer, I want to view files with syntax highlight to review code quickly
  - **Criteria:**
    - [ ] Opens file from file tree with click
    - [ ] Syntax highlight for the most common languages (JS/TS/Rust/Python/Go)
    - [ ] Read-only is acceptable in MVP

---

## ⚙️ Features & Requirements

### Feature 1: Tauri → Electron Migration

**Description:** Rewrite the app's main process from Rust/Tauri to Node.js/Electron, preserving the existing React renderer with minimal IPC adaptations.

**Priority:** 🔴 P0

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| F1.1 | Setup electron-vite as bundler | P0 | Replaces Tauri CLI |
| F1.2 | Main process in TypeScript | P0 | electron/main.ts |
| F1.3 | Preload script with contextBridge | P0 | Security — no direct nodeIntegration |
| F1.4 | IPC channels replacing Tauri invoke | P0 | Map all existing invokes |
| F1.5 | Linux + macOS build pipeline | P0 | electron-builder with targets |
| F1.6 | React components reuse | P0 | Only adapt IPC calls |

**Acceptance Criteria:**

- [ ] App opens without errors on Linux and macOS
- [ ] React components render the same as Tauri
- [ ] IPC working (main ↔ renderer)
- [ ] Build generates binaries for both platforms

---

### Feature 2: PTY Terminal (node-pty + xterm.js)

**Description:** Real integrated terminal using node-pty in the main process and xterm.js in the renderer, communicating via IPC.

**Priority:** 🔴 P0

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| F2.1 | Spawn PTY via node-pty in main process | P0 | OS default shell (fish/bash/zsh) |
| F2.2 | Output streaming via IPC to xterm.js | P0 | ipcMain → ipcRenderer |
| F2.3 | xterm.js input sent to PTY | P0 | ipcRenderer → ipcMain → pty.write() |
| F2.4 | Synchronized terminal resize | P0 | pty.resize() on ResizeObserver |
| F2.5 | Multiple terminal tabs | P0 | Map of PTY instances per tabId |
| F2.6 | addons: fit, web-links, search | P1 | Improved UX |
| F2.7 | Visual theme consistent with app | P1 | CSS variables → xterm theme object |

**Acceptance Criteria:**

- [ ] Input lag <16ms measured
- [ ] Claude Code runs without issues
- [ ] Full ANSI colors (256 colors + truecolor)
- [ ] Terminal resizes without breaking layout
- [ ] Ctrl+C, Ctrl+D, Ctrl+L work correctly

**Terminal IPC Architecture:**

```
[xterm.js - Renderer]
  → ipcRenderer.send('pty:input', {tabId, data})
  ← ipcRenderer.on('pty:output', {tabId, data})
  → ipcRenderer.send('pty:resize', {tabId, cols, rows})

[main.ts - Main Process]
  ipcMain.on('pty:input') → pty.write(data)
  ipcMain.on('pty:resize') → pty.resize(cols, rows)
  pty.onData → mainWindow.webContents.send('pty:output')
```

---

### Feature 3: Workspace Manager

**Description:** System for opening, saving, and switching between projects (folders), each with its own state (terminal tabs, open file, etc).

**Priority:** 🔴 P0

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| F3.1 | Open folder via native dialog | P0 | dialog.showOpenDialog |
| F3.2 | Workspace persists in electron-store | P0 | List of recent workspaces |
| F3.3 | Workspace saves basic state | P1 | Open terminal tabs, active file |
| F3.4 | Switcher between open workspaces | P1 | Sidebar or header dropdown |

---

### Feature 4: File Tree

**Description:** Sidebar with the active workspace's file tree, with support for real-time change watcher.

**Priority:** 🔴 P0

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| F4.1 | List files/folders recursively | P0 | Ignore node_modules, .git by default |
| F4.2 | Expand/collapse folders | P0 | State persisted per workspace |
| F4.3 | File watcher (chokidar) | P0 | Updates tree in real time |
| F4.4 | Open file in viewer on click | P0 | IPC → main reads file → renderer displays |
| F4.5 | Icons by file type | P1 | vscode-icons or similar |
| F4.6 | Git status on files (M/A/D) | P1 | Integrate with simple-git |

---

### Feature 5: Git Diff Viewer

**Description:** Panel to view git changes in the active workspace, with list of modified files and inline diff.

**Priority:** 🔴 P0

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| F5.1 | List of files with git status | P0 | simple-git status |
| F5.2 | Inline diff of selected file | P0 | simple-git diff + diff renderer |
| F5.3 | Visual indicators (added/modified/deleted) | P0 | Semantic colors |
| F5.4 | Automatic update on change detection | P1 | chokidar watch .git/index |

---

### Feature 6: File Viewer

**Description:** File visualization panel with syntax highlight, read-only in MVP.

**Priority:** 🔴 P0

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| F6.1 | Display selected file content | P0 | Via IPC — main reads, renderer displays |
| F6.2 | Syntax highlight | P0 | Shiki (lighter than CodeMirror for read-only) |
| F6.3 | Line numbers | P0 | |
| F6.4 | Tabs for open files | P1 | Multiple files simultaneously |

---

## 🛠 Technical Stack

### Definitive Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Desktop framework | Electron 33+ | Mature PTY, native WebView, Node.js APIs |
| Bundler/Dev | electron-vite | HMR, TypeScript, modern structure |
| Language | TypeScript (strict) | Main + Renderer + Preload |
| Renderer | React 19 + Vite | Reuse Tauri components |
| Styling | Tailwind CSS + shadcn/ui | Preserve existing visual |
| Terminal renderer | xterm.js + addons | Battle-tested, used by VS Code |
| PTY | node-pty | The only mature one for Electron |
| File system | Node.js fs + chokidar | Real-time watcher |
| Git | simple-git | Node.js wrapper for git CLI |
| Syntax highlight | Shiki | Lightweight, server-side, no overhead |
| Persistence | electron-store | Config and recent workspaces |
| Build/Release | electron-builder | Targets Linux (.AppImage, .deb) + macOS (.dmg) |

### Folder Structure (electron-vite)

```
forja/
├── electron/
│   ├── main.ts          # Main process
│   ├── preload.ts       # Secure bridge (contextBridge)
│   └── services/
│       ├── pty.ts       # PTY instances management
│       ├── workspace.ts # fs reading, file tree
│       └── git.ts       # simple-git wrapper
├── src/
│   ├── components/      # React components (reused from Tauri)
│   ├── features/
│   │   ├── terminal/
│   │   ├── filetree/
│   │   ├── gitdiff/
│   │   └── fileviewer/
│   └── App.tsx
├── electron-builder.config.ts
└── electron.vite.config.ts
```

### IPC Channels Map

```typescript
// pty
'pty:spawn'    // main: creates new PTY instance
'pty:input'    // renderer → main: sends input
'pty:output'   // main → renderer: output stream
'pty:resize'   // renderer → main: resizes
'pty:kill'     // renderer → main: kills process

// workspace
'workspace:open'     // opens folder selection dialog
'workspace:list'     // lists recent workspaces
'workspace:filetree' // returns file tree

// file
'file:read'          // reads file content
'file:watch'         // starts watcher on workspace

// git
'git:status'         // lists modified files
'git:diff'           // diff of specific file
```

---

## 🔄 User Flows

### Main Flow: Open Workspace and Start Claude Code

```
1. App opens → Welcome screen / last workspace
2. User clicks "Open Workspace" → native dialog
3. Selects folder → workspace loads
4. File tree populates automatically (chokidar start)
5. Terminal tab opens at project root
6. User types `claude` → Claude Code session starts
7. Claude Code runs fluidly on PTY
8. User clicks on file in file tree → opens in viewer
9. User opens Git Diff tab → sees Claude's changes
```

---

## 🏗 Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| TTY input latency | <16ms |
| Workspace load time | <2s |
| File tree (1000 files) | <500ms |
| App startup (cold) | <3s |

### Security

- [ ] `nodeIntegration: false` in renderer
- [ ] `contextIsolation: true`
- [ ] All communication via contextBridge (preload)
- [ ] No arbitrary code execution via IPC

### Platform Support

- [ ] Linux: Ubuntu 22.04+, Arch, Fedora (.AppImage + .deb)
- [ ] macOS: 13+ Ventura (.dmg, Apple Silicon + Intel)

---

## ⚠️ Edge Cases

### PTY crashes (child process dies)

- Detect via `pty.onExit`
- Show indicator "Process exited (code X)" in the terminal
- Offer "Restart Shell" button

### Workspace with giant node_modules

- File tree ignores `node_modules`, `.git`, `dist`, `.next` by default
- Watcher excludes the same paths

### macOS vs Linux default shell

- Detect shell via `process.env.SHELL` → fallback `/bin/bash`

---

## 📊 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| TTY input latency | <16ms | xterm.js performance test |
| GitHub stars | 500 in 3m | GitHub Insights |
| Open critical issues | 0 P0 bugs | GitHub Issues |
| Contributors | 3+ in 3m | GitHub Contributors |

---

**Last Updated:** 02/03/2026
**Next Review:** After Sprint 2
