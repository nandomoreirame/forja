# Forja - Brief

> Executive product summary

**Date:** 02/22/2025
**Author:** Fernando Moreira
**Status:** 🔍 Discovery

---

## 🎯 Problem (in one sentence)

> Devs and vibe-coders who use Claude Code in the terminal suffer from illegible markdown, loss of context between sessions, and the constant need to switch between terminal and editor.

---

## ✨ Solution (in one sentence)

> Forja is an open source desktop client for Claude Code that delivers enhanced rendering (markdown, diffs, code blocks), project-based sessions, and git integration — all in a dedicated GUI built with Tauri 2 + React.

---

## 👥 Target Audience

### Primary Persona

**Who they are:**
Developers and vibe-coders who already use Claude Code via terminal, whether in professional or personal projects, and feel friction in the current workflow.

**Main pain:**
Claude Code output is illegible in the standard terminal (raw markdown), session context is lost between uses, and it's necessary to switch between multiple windows to edit, review diffs, and chat with Claude.

**Desired outcome:**
Have a single, visual, and organized environment to interact with Claude Code — without giving up the power of the terminal.

---

## 🚀 Value Proposition

### Competitive Differentiator

- ✅ **Claude Code-first** — not a generic terminal with AI, it's a GUI 100% dedicated to Claude Code workflow
- ✅ **Real enhanced rendering** — markdown rendered as HTML, code blocks with syntax highlight, visual diffs
- ✅ **Project-based sessions** — isolated context per project, without losing history
- ✅ **Open source from day 1** — community as competitive advantage

### Vs Current Alternatives

| Alternative | Problem | Forja solves |
|---|---|---|
| Standard terminal (`claude` CLI) | Raw markdown, no visual context | Rich rendering + session memory |
| Claude Desktop (official) | Generic, not focused on dev workflow | Code-focused experience |
| opcode (ex-Claudia) | Pivoted to other models | Exclusive focus on Claude Code |
| Warp | Generic terminal, Claude is just an agent | Claude Code as first-class citizen |

---

## 💰 Business Model

**Model:** Open Source (MIT) — no monetization in MVP

**Strategy:**

- Launch open source, build community
- Sponsorships (GitHub Sponsors, Open Collective)
- Pro features for teams in the future (v2+)

**Why it makes sense:**
Open source developer tooling builds reputation and fast organic adoption. The differentiator of being "the community's official Claude Code GUI" is worth more than premature monetization.

---

## 📊 Success Metrics

### North Star Metric

**Metric:** Weekly active sessions (projects opened in Forja)
**Target (3 months):** 500 sessions/week
**How to measure:** Opt-in telemetry (Plausible or similar)

### Secondary Metrics

| Metric | Baseline | Target (3m) | How to Measure |
|---|---|---|---|
| GitHub stars | 0 | 500 | GitHub |
| Total downloads | 0 | 1,000 | GitHub Releases |
| Contributors | 0 | 5 | GitHub |
| Community-opened issues | 0 | 50+ | GitHub Issues |

---

## 🎯 MVP Scope (summary)

### ✅ What's IN the MVP

- [x] Project Selector (recent projects + browse filesystem)
- [x] Claude Code Pane (PTY with rendered markdown and code blocks)
- [x] Markdown Preview of Claude's output
- [x] Basic Git Integration (current branch + modified files in header)

### ❌ What's NOT IN the MVP

- ❌ Separate Shell Pane — unnecessary layout complexity now
- ❌ Complete Session Manager — v1.1
- ❌ Context Panel (token usage, history) — v1.1
- ❌ Monaco Editor in code blocks — xterm.js solves for MVP

---

## ⏱️ Timeline

| Milestone | Deadline | Status |
|---|---|---|
| Setup (Tauri 2 + React + PTY) | Week 1-2 | ⏳ Pending |
| Functional Project Selector | Week 2-3 | ⏳ Pending |
| Claude Code Pane + Rendering | Week 3-5 | ⏳ Pending |
| Git Integration | Week 5-6 | ⏳ Pending |
| Polish + Alpha release | Week 7-8 | ⏳ Pending |

**Total estimated time:** 6-8 weeks

---

## 🚨 Main Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Learning curve in Rust/Tauri | High | High | Start with simpler backend (file system), evolve to PTY |
| Complex PTY management | Medium | High | Use `portable-pty` crate, study Warp examples |
| Dependency on Claude Code CLI (Anthropic changes API) | Low | High | Maintain abstraction layer, follow changelog |
| Slow community adoption | Medium | Medium | Launch on Product Hunt + Reddit r/ClaudeAI + X on day 1 |

---

## ❓ Hypotheses to Validate

1. **Problem Hypothesis:**
   Claude Code users feel real friction with the standard terminal and would seek a GUI alternative
   ➜ Validate: Post question on r/ClaudeAI and X before launch

2. **Solution Hypothesis:**
   Enhanced rendering + project-based sessions significantly reduces friction
   ➜ Validate: Alpha with 5-10 devs from network, collect qualitative feedback

3. **Adoption Hypothesis:**
   The community will contribute and help evolve the project
   ➜ Validate: First 5 external contributors in 3 months

---

## 🔗 Useful Links

- **Repo:** https://github.com/nandomoreirame/forja (to be created)
- **Origin issue:** https://github.com/nandomoreirame/ideias/issues/41
- **References:** Warp, Hyper, GNOME Terminal

---

**Last updated:** 02/22/2025
**Next review:** Post-alpha release
