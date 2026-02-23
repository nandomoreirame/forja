# Forja

A dedicated GUI client for Claude Code, built with Rust (Tauri 2) + React. Not just another terminal: it's the forge where code is shaped with artificial intelligence.

## Screenshot

![Forja - Home Screen](screenshot.png)

## Concept

Forja opens directly into Claude Code. The user picks a project directory and the session starts. The main experience is Claude Code with enhanced visual rendering (rich markdown, syntax-highlighted code blocks, visual diffs). Git context is always visible in the header.

## Features (MVP)

- **Project Selector** - Home screen with recent projects, favorites, and filesystem browser
- **Claude Code Pane** - PTY running `claude` with enhanced rendering (markdown, visual diffs, code blocks)
- **Markdown Preview** - Claude's output rendered as rich HTML with syntax highlighting
- **Git Integration** - Current branch in the header, modified files counter, auto-updates via file watcher
- **Session State** - Clear visual indicator for "thinking" vs "ready" states
- **Error Handling** - Graceful fallback if `claude` CLI is not installed

## Stack

- **Tauri 2** - Desktop framework (Rust backend + WebView frontend)
- **Rust** - Core (PTY management via `portable-pty`, file watching via `notify`)
- **React 19 + TypeScript** - Frontend (enhanced rendering, project selector)
- **xterm.js** - Terminal emulation in frontend (VT parsing + scrollback)
- **Tailwind CSS + shadcn/ui** - Styling and UI components
- **Shiki** - Syntax highlighting in code blocks
- **Zustand** - State management

## Architecture

```
Home Screen (Project Selector)
  |
  v
Main Workspace
  +-- Git Header (branch + modified files)
  +-- Claude Code Pane (PTY + xterm.js, ~60% width)
  +-- Markdown Preview (React renderer, ~40% width)
  +-- Status Bar (state, last activity)
```

## Inspirations

- **Warp** - Modern terminal UX, integrated AI
- **Raycast** - Excellent dark mode, density, polish
- **Zed** - Minimal, performance-focused, dev tool aesthetic
- **Linear** - Consistency, spacing, typography

## What Makes Forja Different

- **Claude Code-first** - Not a generic terminal with AI; it's a dedicated GUI for Claude Code
- **Enhanced Rendering** - Markdown rendered as HTML, code blocks with syntax highlight via Shiki
- **Project-based** - Each session is isolated per project with automatic context
- **Open Source** - Open source from day 1

## Competitors

| Tool | Gap Forja Fills |
|------|----------------|
| Claude Desktop (official) | Generic, not focused on dev workflow |
| opcode (ex-Claudia) | Pivoted to open-source models |
| CodePilot | Simple wrapper, no enhanced rendering |
| Warp | Generic terminal, Claude Code is just one agent among many |

## Strategy

Open source from day 1. Community first, monetization later (sponsorships, pro features for teams).

## Installation

Download the latest release from [GitHub Releases](https://github.com/nandomoreirame/forja/releases):

- **macOS**: `.dmg` (Apple Silicon + Intel)
- **Linux**: `.AppImage` or `.deb`

### Prerequisites

Forja requires [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/overview) installed:

```bash
npm install -g @anthropic-ai/claude-code
```

## Build from Source

```bash
# Clone
git clone https://github.com/nandomoreirame/forja.git
cd forja

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup.

## Documentation

| Document | Description |
|----------|-------------|
| [Brief](docs/BRIEF.md) | Executive summary, personas, business model |
| [PRD](docs/PRD.md) | Full product requirements, user stories, technical spec |
| [MVP Scope](docs/MVP-SCOPE.md) | What's in/out of MVP, timeline, stack decisions |
| [Design Guidelines](docs/DESIGN-GUIDELINES.md) | Complete design system (colors, typography, components) |
| [Landing Page Spec](docs/LANDING-PAGE-SPEC.md) | Landing page structure and design tokens |

## License

[MIT](LICENSE)
