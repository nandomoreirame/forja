# Forja - Brief

> Executive Summary — Tauri → Electron Migration

**Date:** 02/03/2026
**Author:** Fernando Moreira
**Status:** 🚀 In Development

---

## 🎯 Problem (in one sentence)

> Developers using Claude Code and other agentic AIs lack a dedicated, fluid desktop environment organized by workspaces — they constantly switch between terminal, editor, browser, and documentation without any integration.

---

## ✨ Solution (in one sentence)

> A cross-platform desktop app (Linux/macOS) that unifies fluid PTY terminals, agentic AI sessions, file tree, git diff, and widgets in a single workspace organized by project.

---

## 👥 Target Audience

### Primary Persona

**Who they are:**
Solo developer or developer duo who uses Claude Code (and eventually other AI CLIs) as their primary development tool. Technical, comfortable with the terminal, demanding about performance and UX.

**Main pain:**
The workflow with agentic AIs is fragmented — terminal in one window, editor in another, browser in another, with no shared project context.

**Desired outcome:**
An environment where opening a workspace immediately brings up the terminal, the AI session, the file tree, and the git diff for the project — all together, with no configuration needed.

---

## 🚀 Value Proposition

### Competitive Differentiators

- ✅ **Real, fluid PTY terminal** — node-pty + xterm.js, just like VS Code, without Tauri/WebView bugs
- ✅ **Workspace-first** — each project has its own context (terminal, AI session, files, git)
- ✅ **Open source + extensible** — starts simple, evolves into a widget system with WebView, multi-AI, etc.
- ✅ **True cross-platform** — Linux and macOS from day 1 (Windows in the future)

### Vs. Current Alternatives

| Alternative | Problem | Forja |
|-------------|---------|-------|
| Native terminal + Claude Code | No workspace organization, no UI | Integrated workspace with context |
| Superset.sh | Mac-only, focused on git/PRs, no widgets | Cross-platform, focus on AI + productivity |
| Freeter | No real terminal, no AI | PTY terminal + AI sessions as core |
| VS Code + extensions | Heavy, generic, not optimized for agentic AI | Dedicated to the agentic AI workflow |

---

## 💰 Business Model

**Model:** Open Source (MIT)
**Monetization:** None in MVP — building community and personal use

---

## 📊 Success Metrics

### North Star Metric

**Metric:** GitHub stars + weekly active users
**Target (3 months):** 500 stars, 50 active users
**How to measure:** GitHub Insights + opt-in analytics in the app

### Secondary Metrics

| Metric | Target (3m) | How to Measure |
|--------|-------------|----------------|
| Reported issues resolved | >80% in 7 days | GitHub Issues |
| Workspace open time | <2s | Performance benchmark |
| TTY input latency | <16ms | xterm.js benchmark |

---

## 🎯 MVP Scope (summary)

### ✅ What's IN the MVP

- [x] Tauri → Electron migration (electron-vite)
- [x] Fluid PTY terminal (node-pty + xterm.js, multiple tabs)
- [x] Claude Code session in the terminal
- [x] Sidebar with workspace file tree
- [x] Git diff viewer
- [x] File viewer with syntax highlight
- [x] Workspace — open folder as project

### ❌ What's NOT in the MVP

- ❌ WebView widget (browser → localhost)
- ❌ Widget system / mini apps
- ❌ Multiple AIs (Gemini CLI, Codex)
- ❌ Multi-window / customizable layout

---

## ⏱️ Timeline (Sprints)

| Sprint | Delivery | Estimated Deadline |
|--------|----------|--------------------|
| Sprint 0 | Electron setup + migrated repo | 3 days |
| Sprint 1 | Fluid PTY terminal | 5 days |
| Sprint 2 | Workspace + File Tree | 4 days |
| Sprint 3 | Git Diff + File Viewer | 4 days |
| Sprint 4 | Polish + Release v1.0 | 3 days |

**Total estimated:** ~3 weeks

---

## 🚨 Main Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Partial reuse of React components | Low | Medium | IPC is different but isolated — only adapt API calls |
| node-pty on Linux/macOS with different behaviors | Medium | High | Test on both OSes from Sprint 1 |
| Scope creep (wanting to add widgets early) | High | High | Follow sprints strictly |

---

## 🔗 Links

- **Repo:** https://github.com/nandomoreirame/forja
- **Reference 1:** https://superset.sh
- **Reference 2:** https://freeter.io

---

**Last updated:** 02/03/2026
