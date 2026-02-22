# Forja - PRD (Product Requirements Document)

> Complete technical specification for implementation

**Author:** Fernando Moreira
**Date:** 02/22/2025
**Version:** 1.0
**Status:** 📝 Draft

---

## 🎯 Overview

### Vision

> Make Claude Code accessible and delightful for any developer or vibe-coder, transforming the raw terminal experience into a rich, contextual GUI focused on the development workflow.

### Problem Statement

**What's happening:**
Claude Code users interact with a powerful tool through a standard terminal that doesn't render markdown, doesn't preserve visual session context, and forces the user to constantly switch between windows.

**Who is affected:**
Experienced devs and vibe-coders who use Claude Code as a central part of their development workflow.

**Cost of not solving:**
Loss of productivity, cognitive fatigue when interpreting raw markdown, loss of context between sessions, and inferior experience compared to the tool's real potential.

**How they solve it today:**
Standard terminal (iTerm2, Warp, etc.) with Claude Code CLI. Some use tmux for splits, others manually switch between windows.

### Goals

- [ ] **Reduce Claude Code workflow friction**
  → Metric: Average window switching time | Target: close to zero

- [ ] **Deliver functional enhanced rendering**
  → Metric: 100% of markdown visually rendered | Target: MVP

- [ ] **Build active open source base**
  → Metric: GitHub Stars | Target: 500 in 3 months

### Non-Goals (Out of Scope)

- ❌ Support for other AI agents (Cursor, Copilot) — exclusive focus on Claude Code
- ❌ Shell Pane in MVP — scope simplification
- ❌ Mobile or web version — desktop only
- ❌ Cloud session synchronization — local first
- ❌ Monetization in MVP — pure open source

---

## 👤 User Personas

### Persona 1: Lucas — Full-Stack Dev

**Who they are:**

- **Name:** Lucas, 28 years old
- **Role:** Full-Stack Developer
- **Context:** Works at a startup, uses Claude Code daily for feature development and code review

**Background:**
Lucas adopted Claude Code 3 months ago and is addicted to the productivity it offers. The problem is that the standard terminal makes it difficult to follow long responses with markdown, code blocks, and diffs. He keeps VS Code open on the side to be able to read the output decently.

**Main Pain:**
Having to interpret raw markdown in the terminal and switch between 3 different windows (terminal, editor, browser) during a Claude Code session.

**Goals:**

- See Claude's output visually formatted
- Keep project context (branch, changed files) visible
- Not need to switch between windows

**Frustrations:**

- Raw markdown is hard to read in long responses
- Loses session history when closing the terminal
- Code blocks don't have syntax highlighting

**Tech Savviness:** High

**Quote:**
> "Claude Code is amazing, but reading raw markdown in the terminal is painful. I always keep VS Code open on the side just to be able to follow the responses."

---

### Persona 2: Mariana — Vibe-Coder

**Who they are:**

- **Name:** Mariana, 24 years old
- **Role:** Designer who learned to code with AI
- **Context:** Creates personal and freelance projects using Claude Code as main development tool

**Background:**
Mariana doesn't have a deep technical background, but uses Claude Code to build real projects. For her, the terminal is intimidating and the lack of visual feedback makes it even harder to follow what Claude is doing.

**Main Pain:**
Terminal interface is hostile for those who didn't grow up with it. Raw markdown, without visual context, makes the experience confusing.

**Goals:**

- Understand what Claude is doing visually
- Have clear feedback about project state
- Not need to deeply understand the terminal

**Frustrations:**

- Pure terminal is intimidating
- Doesn't know if Claude finished executing or is processing
- Can't easily see which files were changed

**Tech Savviness:** Low-Medium

**Quote:**
> "I use Claude Code, but honestly the terminal scares me. I wish for something more visual, that shows me what's happening."

---

## 📖 User Stories

### Persona 1: Lucas (Full-Stack Dev)

#### Core Stories (Must-Have)

- [x] As a dev, I want to open an existing project in Forja to start a Claude Code session without configuration
  - **Acceptance criteria:**
    - [x] I can select a folder from the filesystem
    - [x] Recent projects appear on the initial screen
    - [x] The session opens directly with Claude Code active in the correct directory

- [x] As a dev, I want to see Claude's output with rendered markdown so I don't need to interpret raw text
  - **Acceptance criteria:**
    - [x] Headers, bold, italic, lists rendered as HTML
    - [x] Code blocks with syntax highlighting by language
    - [x] Clickable links in output

- [x] As a dev, I want to see the current branch and modified files to keep project context
  - **Acceptance criteria:**
    - [x] Git branch displayed in session header
    - [x] List of modified files (unstaged + staged) visible
    - [x] Updates automatically when files change

#### Secondary Stories (Should-Have)

- [ ] As a dev, I want conversation history to persist to resume a previous session
- [ ] As a dev, I want to see session token usage to control costs

#### Future Stories (Could-Have)

- [ ] As a dev, I want an integrated shell pane to run commands without leaving Forja
- [ ] As a dev, I want to see visual diffs of files changed by Claude

---

### Persona 2: Mariana (Vibe-Coder)

#### Core Stories (Must-Have)

- [x] As a vibe-coder, I want a clear initial screen to open my project without intimidation
  - **Acceptance criteria:**
    - [x] Clean interface with few elements
    - [x] Recent projects with directory name
    - [x] Clear button to open new folder

- [x] As a vibe-coder, I want to clearly see when Claude is processing or finished so I know when I can interact
  - **Acceptance criteria:**
    - [x] Visual loading/processing indicator
    - [x] Clear state: "Claude is thinking...", "Ready"
    - [x] Input disabled while Claude processes

---

## ⚙️ Features & Requirements

### Feature 1: Project Selector

**Description:**
Forja's initial screen that allows the user to select, open, and manage projects. It's the application's entry point.

**Priority:** 🔴 P0 (Must)

**User Story:**
As a user, I want to select my project easily to start a Claude Code session without friction.

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| F1.1 | Display list of recent projects (last 10) | P0 | Persist in local config |
| F1.2 | "Open Folder" button with native file picker | P0 | Use OS native dialog via Tauri |
| F1.3 | Display directory name and full path | P0 | Truncate long path |
| F1.4 | Favorite projects (pin to top) | P1 | Drag to reorder |
| F1.5 | Auto-discovery of Git repos in filesystem | P2 | Optional scan |

**Acceptance Criteria:**

- [ ] Recent projects load in < 200ms
- [ ] File picker opens in < 500ms
- [ ] Project selection starts session in < 2s
- [ ] Persists between app restarts

**UI/UX Requirements:**

- Layout: Grid of cards with project name + icon + path
- Empty state: "No recent projects. Open a folder to get started."
- Responsive to window resize

---

### Feature 2: Claude Code Pane

**Description:**
Main workspace area. A PTY running `claude` with enhanced rendering — transforms raw output into rendered markdown, code blocks with syntax highlighting, and interactive interface.

**Priority:** 🔴 P0 (Must)

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| F2.1 | PTY connected to `claude` process | P0 | Via Rust `portable-pty` |
| F2.2 | Input field to send messages to Claude | P0 | Enter to send, Shift+Enter for new line |
| F2.3 | Markdown rendering in output (headers, bold, lists) | P0 | Detect and render in real-time |
| F2.4 | Code blocks with syntax highlighting | P0 | Use Shiki or Prism |
| F2.5 | State indicator (thinking / ready) | P0 | PTY output parsing |
| F2.6 | Conversation history scroll | P0 | Unlimited scrollback in memory |
| F2.7 | "Copy" button on each code block | P1 | Clipboard API |
| F2.8 | Clickable links in output | P1 | Open in default browser |

**Acceptance Criteria:**

- [ ] Claude responds within normal latency (no Forja overhead)
- [ ] Markdown renders in real-time as output arrives
- [ ] Code blocks identify language correctly in > 90% of cases
- [ ] "thinking" state appears in < 300ms after sending message

**UI/UX Requirements:**

- Output: Scroll area with alternating messages (user / claude)
- Input: Sticky at bottom, expandable multiline
- Loading: Animated dots or subtle spinner while Claude processes
- Error state: Clear message if `claude` is not installed

---

### Feature 3: Markdown Preview

**Description:**
Visual rendering of Claude's output — visually differentiates user messages and Claude responses, with full support for markdown elements.

**Priority:** 🔴 P0 (Must)

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| F3.1 | Render headers (H1-H6) | P0 | |
| F3.2 | Render bold, italic, strikethrough | P0 | |
| F3.3 | Render ordered and unordered lists | P0 | |
| F3.4 | Render code blocks with detected language | P0 | |
| F3.5 | Render inline code | P0 | |
| F3.6 | Render tables | P1 | |
| F3.7 | Render blockquotes | P1 | |
| F3.8 | Render links | P1 | Open in browser |

**Acceptance Criteria:**

- [ ] All standard markdown (CommonMark) rendered correctly
- [ ] No flash of unrendered content (FOUC)
- [ ] Performance: no lag when receiving long output (> 5000 words)

---

### Feature 4: Git Integration

**Description:**
Displays Git context of the current project in header or sidebar: active branch and list of modified files. Automatic update via file watcher.

**Priority:** 🔴 P0 (Must)

**Functional Requirements:**

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| F4.1 | Display current Git branch in header | P0 | Via `git branch --show-current` |
| F4.2 | Display counter of modified files | P0 | Unstaged + staged |
| F4.3 | List modified files (name + status) | P0 | M, A, D, R status |
| F4.4 | Automatic update when detecting changes | P0 | File watcher on `.git` |
| F4.5 | Visual indicator when not a Git repo | P1 | "Not a git repo" |

**Acceptance Criteria:**

- [ ] Branch updates in < 500ms after change
- [ ] File list updates in < 1s after Claude modifies files
- [ ] Works with local Git repos (no remote authentication)
- [ ] Graceful fallback when not a Git repo

---

## 🛠 Technical Stack

### Frontend

| Layer | Technology | Why |
|---|---|---|
| Framework | React 19 + TypeScript | Rich ecosystem, familiarity |
| Styling | Tailwind CSS | Utility-first, speed |
| Components | shadcn/ui | High-quality, accessible |
| Terminal | xterm.js | Mature, VT support, scrollback |
| Markdown | react-markdown + remark | Extensible, performant |
| Syntax Highlight | Shiki | Best highlight quality |
| State | Zustand | Simple, no boilerplate |

### Backend (Rust / Tauri)

| Layer | Technology | Why |
|---|---|---|
| Desktop Framework | Tauri 2 | Rust backend + WebView, small binaries |
| PTY Management | portable-pty (crate) | Cross-platform PTY |
| VT Parser | vte (crate) | VT100/ANSI sequence parser |
| File Watcher | notify (crate) | Cross-platform file watching |
| Git Info | git2 (crate) or CLI | Bindings for libgit2 |
| Config Storage | serde + toml | Simple, readable |
| IPC | Tauri Commands + Events | Frontend ↔ Backend communication |

### Architecture

```
[React Frontend]
    |
    | Tauri IPC (Commands + Events)
    |
[Rust Backend]
    ├── PTY Manager (portable-pty)
    │   └── Spawns `claude` process
    │   └── Stream output → Frontend via Events
    ├── File Watcher (notify)
    │   └── Monitors .git/ for changes
    │   └── Emits Git events → Frontend
    ├── Git Reader (git2)
    │   └── Current branch
    │   └── File status
    └── Config Manager (serde/toml)
        └── Recent projects
        └── User preferences
```

**Key Decisions:**

1. **xterm.js for raw terminal** — handle VT sequences in frontend, Rust does PTY
2. **Hybrid rendering** — xterm.js for input/raw mode, React components for rendered output
3. **Events for streaming** — Tauri Events to stream PTY output in real-time
4. **Local config** — `~/.config/forja/config.toml` for recent projects and preferences
5. **Git via CLI** — Use `git` via Command for MVP, migrate to `git2` if needed

---

## 🔄 User Flows

### Flow 1: Open Project and Start Session

**Happy Path:**

```
App opens → Project Selector
  → User clicks recent project (or "Open Folder")
  → File picker (if new project)
  → Workspace opens with Claude Code Pane active
  → PTY spawns `claude` in selected directory
  → Git header shows branch + modified files
  → Input enabled, Claude ready
```

**Error Paths:**

- `claude` not installed → Modal: "Claude Code CLI not found. Install with `npm i -g @anthropic-ai/claude-code`" + link
- Directory no longer exists → Toast: "Folder not found. Please select another."
- No read permission → Toast: "Permission denied for this folder."

---

### Flow 2: Interaction with Claude

**Happy Path:**

```
User types message → Presses Enter
  → Input disabled
  → "Claude is thinking..." indicator appears
  → Output starts arriving (streaming)
  → Markdown rendered in real-time
  → Code blocks with syntax highlighting
  → Indicator disappears, input re-enabled
```

**Error Paths:**

- PTY process died → Banner: "Session ended. Start a new session?" + button
- Timeout without response (> 60s) → Toast: "Claude is taking longer than expected..."

---

## 🗄 Non-Functional Requirements

### Performance

| Requirement | Target | How to Measure |
|---|---|---|
| App startup time | < 2s | Tauri built-in metrics |
| Project Selector load | < 200ms | Custom timer |
| PTY response latency | < 50ms overhead | Benchmark vs direct terminal |
| Markdown render (long output) | < 100ms | React Profiler |
| File watcher update | < 1s | Manual test |

### Security

- [ ] PTY runs with current user permissions (no escalation)
- [ ] Tauri CSP configured (no eval, inline scripts)
- [ ] Local config doesn't store API keys (Claude Code manages this)
- [ ] No telemetry without explicit opt-in

### Accessibility

- [ ] Keyboard navigation in Project Selector
- [ ] ARIA labels on interactive elements
- [ ] WCAG AA minimum contrast
- [ ] Screen reader support in rendered output

### Platform Support

- [ ] macOS (primary target, Apple Silicon + Intel)
- [ ] Linux (secondary target)
- [ ] Windows (future — Tauri supports, but PTY has peculiarities)

---

## 📌 Integrations

### Claude Code CLI

**Purpose:** Main process running inside PTY

**Requirement:** `claude` installed globally on user's system

**Detection:**

```rust
// Check if claude is available
Command::new("which").arg("claude").output()
// or on Windows: where claude
```

**Error Handling:**

- Not found → Onboarding with installation instructions
- Incompatible version → Warning (without blocking)

---

### Git CLI / libgit2

**Purpose:** Branch information and file status

**Endpoints Used:**

- `git branch --show-current` → branch name
- `git status --porcelain` → modified files

**Update Strategy:**

- File watcher on `.git/` directory
- Re-execute Git queries when detecting changes

---

## ⚠️ Edge Cases & Error Handling

### Edge Case 1: `claude` CLI not installed

**Problem:** User opens Forja without having Claude Code installed

**Solution:** Detect when opening workspace, before spawning PTY

**UI Behavior:**

- Blocking modal with clear instructions
- Direct link to Claude Code documentation
- "Try Again" button after installation

---

### Edge Case 2: Project is not a Git repository

**Problem:** User opens folder without `.git/`

**Solution:** Git header shows "Not a Git repo" state without crashing

**UI Behavior:**

- Header displays Git icon with tooltip "Not a git repository"
- Modified files list doesn't appear
- Session works normally (Git is not mandatory)

---

### Edge Case 3: PTY process ends unexpectedly

**Problem:** `claude` process dies during session

**Solution:** Monitor process exit code via Tauri

**UI Behavior:**

- Banner at top of pane: "Session ended unexpectedly"
- "Restart Session" button (restarts PTY in same directory)
- Previous output kept for reference

---

### Edge Case 4: Very long output (> 10,000 tokens)

**Problem:** Rendering performance degrades with very long outputs

**Solution:** History virtualization (render only visible items)

**UI Behavior:**

- Smooth scroll without lag
- "Scroll to bottom" button when scrolling up

---

## 📊 Success Metrics

### North Star Metric

**Metric:** Weekly active sessions
**Definition:** Number of Claude Code sessions started via Forja
**Target (3m):** 500/week
**How to measure:** Opt-in telemetry (`session_started` event)

### Feature-Specific Metrics

| Feature | Metric | Target (3m) | Tool |
|---|---|---|---|
| Project Selector | Projects opened per user/week | > 5 | Telemetry |
| Claude Code Pane | Completed sessions (no crash) | > 95% | Error tracking |
| Markdown Preview | N/A (qualitative) | Positive feedback | GitHub Issues |
| Git Integration | Users with Git repo | > 80% | Telemetry |

### Community Metrics

| Metric | Baseline | Target (3m) | How to Measure |
|---|---|---|---|
| GitHub Stars | 0 | 500 | GitHub |
| Downloads | 0 | 1,000 | GitHub Releases |
| Contributors | 0 | 5 | GitHub |
| Opened Issues/PRs | 0 | 50 | GitHub |

---

## 📝 Open Questions

- [ ] Hybrid rendering (xterm.js + React components): how to detect where output is pure markdown vs raw terminal?
- [ ] Opt-in telemetry: which tool to use that respects privacy? (Plausible, self-hosted PostHog?)
- [ ] Automatic app updates: use Tauri updater or leave it to the user?
- [ ] Icon and final name: is "Forja" definitive? (check trademark conflicts)

---

**Last Updated:** 02/22/2025
**Next Review:** Post-initial setup
