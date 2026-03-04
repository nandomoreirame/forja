# Forja - MVP Scope

> Clear definition of what is IN and what is NOT IN the MVP

**Date:** 02/22/2025
**Version:** 1.0
**Status:** ✅ Approved

---

## 🎯 MVP Vision

### In one sentence, what does the MVP do?

> Open source desktop app (Electron + React) that opens Claude Code with rendered markdown, syntax-highlighted code blocks, and visible Git context — transforming the raw terminal into a dedicated GUI.

### What hypothesis are we testing?

> Devs and vibe-coders who use Claude Code will prefer a dedicated GUI with enhanced rendering over continuing to use the standard terminal, and the open source community will adopt and contribute to the project.

### How will we know it worked?

> 500 active sessions/week + 500 GitHub stars + at least 1 external contributor within 3 months.

---

## ✅ Scope: What's IN

### Must Have (P0) - Can't launch without it

| Feature | Description | Done Criteria |
|---|---|---|
| Project Selector | Initial screen with recent projects and native file picker | User selects folder and session starts in < 2s |
| Claude Code Pane | PTY connected to `claude` process with input/output | User can chat with Claude normally |
| Markdown Rendering | Claude output rendered (headers, lists, bold) | CommonMark markdown rendered without FOUC |
| Code Blocks | Syntax highlight by language in code blocks | > 90% of common languages identified correctly |
| Session State | Visual indicator of "thinking" vs "ready" | Visual feedback in < 300ms when sending message |
| Git Header | Current branch + modified files counter | Updates in < 1s after filesystem changes |
| Error Handling | Graceful fallback if `claude` is not installed | Modal with installation instructions, no crash |

**Total P0 features:** 7
**Time estimate:** 6-8 weeks

---

### Should Have (P1) - Important, but can wait for v1.1

| Feature | Description | Why it's not P0 |
|---|---|---|
| Modified files list | Sidebar with Git files (M, A, D) | Branch + counter already provide sufficient context |
| Copy button in code blocks | Copy code block with 1 click | Ctrl+C works as workaround |
| Clickable links | Open URLs from output in browser | Doesn't block main usage |
| Session history | Persist conversation history between sessions | PTY resets anyway; Claude Code doesn't preserve native context |
| Keyboard shortcuts | Cmd+K for new session, Cmd+, for settings | Nice to have for power users |
| Settings panel | Basic settings (theme, font, size) | Reasonable defaults are sufficient in MVP |

**When to add:** v1.1, after alpha community feedback.

---

### Could Have (P2) - Nice to have

| Feature | Description | When to consider |
|---|---|---|
| Shell Pane | Split screen with conventional terminal | If > 30% of users request it |
| Token usage | Display tokens used in session | When Claude Code exposes this info |
| Diff viewer | Visualize diffs of changed files | If git integration gains traction |
| Auto-updater | Automatic app updates | After stable v1.0 |
| Themes | Light mode, custom themes | Low priority (dark mode is default) |
| Multi-session | Open multiple projects in tabs | High complexity, uncertain need |

---

## ❌ Scope: What's NOT IN

### Explicitly Out of MVP

| Feature | Why it's not included | When to reconsider |
|---|---|---|
| Shell Pane | Adds layout and dual PTY complexity; not the core proposal | v1.2 if there's clear demand |
| Complete Session Manager | Claude Code's native PTY doesn't preserve context; implementing on top would be false value | When Claude Code has context API |
| Context Panel (token usage, history) | Data not easily available via PTY parsing | v1.1 if Claude Code exposes the info |
| Monaco Editor in code blocks | High complexity without proportional value; xterm.js + Shiki solve it | v2.0 if there are requests |
| Support for other AI agents | Exclusive Claude Code focus is Forja's differentiator | Never (out of scope by design) |
| Cloud synchronization | Local-first is the proposal; cloud adds complexity and cost | v2.0 enterprise (if it gets there) |
| Windows version in MVP | PTY on Windows has peculiarities; requires extra testing | v1.1 if there's demand |
| Authentication/accounts | Claude Code manages its own auth; Forja doesn't need this | Never in current model |

---

### Common Temptations to Avoid

**Feature Scope Creep:**

- [ ] ~~"I'll add an integrated terminal too"~~ → Increases scope by 3x
- [ ] ~~"It would be nice to have tabs for multiple projects"~~ → Unnecessary state complexity in MVP
- [ ] ~~"I can show visual diff of files"~~ → P2, not P0
- [ ] ~~"I'll implement history search"~~ → There's no persistent history in MVP

**Technical Scope Creep:**

- [ ] ~~GraphQL or custom API~~ → No external backend
- [ ] ~~Database~~ → TOML config is sufficient
- [ ] ~~Complex CI/CD at start~~ → Basic GitHub Actions works
- [ ] ~~Monaco Editor~~ → Shiki + xterm.js solves for MVP

---

## 🎨 Simplification Decisions

### UI Framework

**Choice:** Electron + React + TypeScript

**Justification:** Fernando is proficient in React/TypeScript. Electron provides full Node.js backend with node-pty for PTY management, electron-store for config, and chokidar for file watching.

**Don't do:**

- ❌ Pure native UI (no HTML/CSS) — curve too steep and limits rich rendering
- ❌ Tauri — migrated to Electron for simpler PTY management and Node.js ecosystem

---

### Terminal Rendering

**Choice:** Hybrid architecture

- `xterm.js` for raw PTY (input handling, VT sequences)
- React components for rendered output (markdown, code blocks)

**Justification:** xterm.js is mature and solves PTY complexity; React solves rich rendering.

**Don't do:**

- ❌ Implement custom VT parser in frontend — unnecessary complexity
- ❌ Try to do everything in xterm.js — limitations for rich rendering

---

### Data Persistence

**Choice:** Local JSON config (`~/.config/forja/config.json`) via electron-store

**Persisted data:**

- Recent projects (path + last opened)
- Favorites
- Basic preferences (window size, etc.)

**Don't do:**

- ❌ SQLite — overkill for this data
- ❌ Firebase/Supabase — product is local-first
- ❌ Manual file I/O — electron-store handles JSON persistence

---

### Configuration and Build

**Choice:** Electron with electron-builder + GitHub Actions for CI/CD

**Releases:** GitHub Releases with binaries for macOS (arm64 + x64) and Linux

- macOS: `.dmg` and `.app`
- Linux: `.AppImage` and `.deb`

**Don't do:**

- ❌ App Store in MVP — long process
- ❌ Homebrew tap in MVP — set up after v1.0

---

## 👥 Personas in MVP

### Primary Persona (total focus)

**Name:** Dev / Vibe-Coder with Claude Code
**Who they are:** Anyone already using Claude Code via terminal and wants a better experience
**Job to be Done:** Interact with Claude Code in a visual GUI without losing the power of current workflow

**Why focus on them:**

- Fernando is the user himself (guaranteed dogfooding)
- Accessible audience via Claude Code communities (Reddit, X, Discord)
- Clear and articulated pain point

---

### Personas OUT of MVP

| Persona | Why not now | When to consider |
|---|---|---|
| Teams / Companies | Requires multi-user, session sharing, billing | v2.0 enterprise |
| Windows users | PTY complexity on Windows; macOS/Linux first | v1.1 |
| Users without Claude Code | Would need to integrate other agents | Never (out of scope by design) |

---

## 🔄 Critical Flows

### Flow 1: First Use (First-Time User)

```
1. User downloads and opens Forja
2. Project Selector appears (empty — no recent projects)
3. Clicks "Open Folder"
4. OS native file picker opens
5. Selects project directory
6. Workspace opens with active Claude Code Pane
7. PTY spawns `claude` in directory
8. Git header displays branch + status
9. User types first message
10. Claude responds with rendered markdown
11. 🎉 Success
```

**Success criteria:** 70% of new users complete this flow.

---

### Flow 2: Returning User

```
1. User opens Forja
2. Recent project appears in Project Selector
3. Clicks on project
4. Workspace opens immediately
5. New Claude Code session started
6. User is working in < 5 seconds
```

**Success criteria:** Time from click to Claude ready < 5s.

---

### Flow 3: Claude not installed

```
1. User opens workspace
2. Forja detects that `claude` is not in PATH
3. Modal: "Claude Code CLI not found"
4. Installation instructions + link to docs
5. "Try Again" button after installing
6. Session starts normally
```

**Success criteria:** Zero crashes; user can install and continue.

---

## 🛠 MVP Stack

### Definitive Choices

| Layer | Technology | Justification |
|---|---|---|
| Desktop Framework | Electron | Node.js backend, mature ecosystem |
| Frontend Language | TypeScript + React 19 | Familiarity, rich ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Speed, consistency |
| Terminal | xterm.js | Mature, PTY rendering |
| Markdown | react-markdown + remark-gfm | Extensible, lightweight |
| Syntax Highlight | Shiki | Best quality |
| State Management | Zustand | Simple, no boilerplate |
| Backend PTY | node-pty | Cross-platform PTY via Node.js |
| File Watcher | chokidar | Cross-platform, 500ms debounce |
| Git | git CLI via child_process | Simple for MVP |
| Config | electron-store (JSON) | Readable, mature |

### What NOT to use

- ❌ ~~Redux~~ → Zustand is sufficient
- ❌ ~~Tauri~~ → Migrated to Electron for simpler PTY and Node.js ecosystem
- ❌ ~~SQLite~~ → JSON config solves it
- ❌ ~~Monaco Editor~~ → Shiki + xterm.js
- ❌ ~~Styled Components~~ → Tailwind
- ❌ ~~GraphQL~~ → No external API

---

## ⏱️ Estimated Timeline

### Breakdown by Phase

| Phase | Duration | Deliverables |
|---|---|---|
| **Setup** | 1 week | Electron + React + xterm.js working, basic PTY |
| **Project Selector** | 1 week | Complete UI, file picker, recent projects |
| **Claude Code Pane** | 2 weeks | PTY connected, functional input/output |
| **Markdown + Code Rendering** | 1 week | Complete enhanced rendering |
| **Git Integration** | 1 week | Branch + status in header |
| **Polish + Alpha** | 1 week | Bug fixes, UX, first release |
| **Feedback + Adjustments** | 1 week | Post-alpha fixes |

**Total:** ~8 weeks

### Milestones

```
Week 1: Setup (Electron + React + PTY hello world)
Week 2: Functional Project Selector
Week 3-4: Claude Code Pane chatting with Claude
Week 5: Markdown + Syntax Highlight
Week 6: Git Integration
Week 7: Polish + Alpha on GitHub
Week 8: Feedback + fixes → v0.1.0
```

---

## ✅ Definition of Done (MVP)

The MVP is ready when **ALL** conditions are true:

### Functionality

- [ ] Project Selector works (recents + file picker)
- [ ] PTY connects to `claude` and session works end-to-end
- [ ] Markdown renders correctly in output
- [ ] Code blocks have syntax highlight
- [ ] Git header shows branch + file counter
- [ ] Error handling for `claude` not installed

### Quality

- [ ] No known crashes in critical flows
- [ ] OK performance (no lag in long output rendering)
- [ ] macOS arm64 and x64 tested
- [ ] Linux (AppImage) tested

### Deploy

- [ ] Binaries available on GitHub Releases
- [ ] README with installation instructions
- [ ] Basic CONTRIBUTING.md

### Community

- [ ] Public repository on GitHub
- [ ] LICENSE (MIT)
- [ ] At least **1 external user** tested and gave feedback
- [ ] Issue tracker open for community

---

## 🚨 Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Complex PTY management | 🟡 Medium | 🔴 High | `node-pty` is mature, used by VS Code and Hyper |
| Hybrid rendering (xterm + React) | 🟡 Medium | 🟡 Medium | Prototype early in week 1; fallback to pure xterm if necessary |
| Claude Code CLI changes interface | 🟢 Low | 🔴 High | Monitor changelog, maintain abstraction layer |
| Slow community adoption | 🟡 Medium | 🟡 Medium | Launch on Product Hunt, r/ClaudeAI, X/Twitter on release day |
| Scope creep during development | 🔴 High | 🟡 Medium | Review this document weekly, say NO |

---

## 🧪 Hypotheses to Validate

| # | Hypothesis | How to Validate | Success = |
|---|---|---|---|
| 1 | Claude Code users want a dedicated GUI | Post question on Reddit/X before launch | 50+ upvotes / positive responses |
| 2 | Enhanced rendering significantly improves experience | Alpha with 5-10 devs, interview after | Unanimous preference vs pure terminal |
| 3 | Open source community will contribute | First 30 days after launch | 1+ external PR merged |

---

## 📜 Next Steps Post-MVP

### v0.2 (Quick Wins)

1. [ ] Detailed list of modified Git files
2. [ ] Copy button in code blocks
3. [ ] Clickable links in output
4. [ ] Basic keyboard shortcuts
5. [ ] Windows support

### v0.3 (Retention)

1. [ ] Persisted session history
2. [ ] Settings panel (theme, font)
3. [ ] Auto-updater

### v1.0 (Stable)

1. [ ] Shell Pane (if demand confirmed)
2. [ ] Multi-session / tabs
3. [ ] Homebrew tap / Linux package managers

---

## 📏 Golden Rule

When in doubt if something goes in the MVP, ask:

> **"Can I launch and have real users using it without this feature?"**

- ✅ If YES → **NOT in MVP**
- ❌ If NO → **Can go in** (but confirm if it's really a blocker)

| Feature | Necessary to launch? | Decision |
|---|---|---|
| PTY connected to `claude` | YES | ✅ P0 |
| Markdown rendering | YES (it's the core proposal) | ✅ P0 |
| Git branch in header | NO (but it's part of core value) | ✅ P0 |
| Shell Pane | NO | ❌ P2 |
| Session history | NO | ❌ P1 |
| Copy button | NO | ❌ P1 |
| Windows support | NO | ❌ P1 |

---

**Last Updated:** 02/22/2025
**Next Review:** Weekly until v0.1.0

**Mantra:** "Launch fast, learn quickly, iterate better." 🚀
