```
███████╗ ██████╗ ██████╗      ██╗ █████╗
██╔════╝██╔═══██╗██╔══██╗     ██║██╔══██╗
█████╗  ██║   ██║██████╔╝     ██║███████║
██╔══╝  ██║   ██║██╔══██╗██   ██║██╔══██║
██║     ╚██████╔╝██║  ██║╚█████╔╝██║  ██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝
```

A desktop app for people who run AI coding agents (Claude Code, Codex, Gemini CLI, Cursor Agent) all day, across several projects at once.

## Why Forja exists

If you run AI coding CLIs in a plain terminal, you know the routine: five tabs or tmux panes with no way to tell which agent finished and which is waiting for your answer, markdown answers printed as raw text, a second window open just to read the files and diffs the agent touched, and no idea what the session is costing until the bill arrives.

A terminal is the right place to *run* the agent, so Forja keeps a real PTY. What it adds is the layer around it that a terminal does not have:

- **Sessions grouped by project and workspace**, with a visible state per tab (thinking or ready for you) and a notification when an agent stops.
- **The files, diffs and git status of the project next to the session**, so reviewing what the agent changed does not mean switching windows.
- **Token usage and cost per session**, live in the status bar.
- **One interface for every CLI**, instead of learning a different TUI per vendor.

If you run one agent in one project at a time, your terminal is probably enough. Forja is for the moment you have several running.

> **Warning**
> Forja is under active development (beta stage). Expect incomplete features and tools, potential instability, crashes, or unexpected behavior, and breaking changes between updates without prior notice. Your settings and session data are stored locally and may need to be reset after major updates. We recommend keeping backups of important project configurations. Please [report issues](https://github.com/nandomoreirame/forja/issues) to help us improve.

## Screenshot

![Forja - Workspaces with Projects](screenshots/0.workspaces-with-projects.png)

## Features

- **Multi-CLI Support** - Claude Code, Gemini CLI, Codex CLI, Cursor Agent, and plain terminal sessions
- **Multi-Session Tabs** - Multiple concurrent sessions with tab management, context menus, inline rename
- **Project Selector** - Home screen with recent projects, filesystem browser, and drag-and-drop reorder
- **Terminal Emulation** - Full PTY via xterm.js with split panes (horizontal/vertical), independent zoom, and copy/paste
- **File Tree Sidebar** - Collapsible sidebar with lazy-loaded directory tree, file type icons, git status badges, and Ctrl+Shift+B toggle
- **File Preview Pane** - Syntax-highlighted code preview (Shiki), markdown rendering, image viewer, and Monaco editor integration
- **Git Integration** - Current branch, modified files counter, per-file git status badges, git diff viewer, auto-refresh via file watcher
- **Embedded Browser** - In-app browser pane with navigation toolbar, auto-opens on localhost URL detection in terminal output
- **Theme System** - 14+ built-in themes (Catppuccin, Dracula, Nord, Tokyo Night, Monokai Pro, and more) with live switching
- **Settings Editor** - In-app settings with syntax highlighting, live validation, font/theme/window configuration (Ctrl+,)
- **Workspaces** - Group multiple projects into named workspaces that open in dedicated windows
- **Command Palette** - Quick file navigation (Ctrl+P), command access (Ctrl+Shift+P), theme/session switching
- **Context System** - Context synchronization with import, sync status, and tool registry
- **Agent Chat** - Chat panel with slash command menu for AI CLI interaction
- **Keyboard Shortcuts** - Comprehensive shortcuts with customizable bindings, fullscreen toggle (F11)
- **Font Settings** - Separate font configuration for 3 areas: app UI, editor/preview, and terminal
- **Window Controls** - Custom titlebar with opacity and zoom level settings, configurable section visibility
- **System Metrics** - Demand-driven CPU, memory, swap, disk, and network metrics in status bar
- **Session Telemetry** - Real-time token usage, cost tracking, context bar with semantic colors
- **Discord Notifications** - Webhook notifications with PTY output summarization
- **Plugin System** - Plugin bridge, loader, registry, and permissions management
- **Session State** - Visual indicators for "thinking" vs "ready" states with notification support
- **Error Handling** - Graceful fallback when AI CLI is not installed

## Monorepo

The desktop app is the product. The other apps live in this repo for a concrete reason, and their maturity is not the same:

| Package | Path | Status | Why it lives here |
|---------|------|--------|-------------------|
| **@forja/desktop** | `apps/desktop/` | Beta (the product) | |
| **@forja/mobile** | `apps/mobile/` | Experimental | Speaks the WebSocket bridge protocol, whose types come from `packages/shared`; a protocol change and its client ship in the same commit |
| **@forja/docs** | `apps/docs/` | Maintained | Documents the desktop release it sits next to; docs change in the same PR as the feature |
| **@forja/site** | `apps/site/` | Maintained | Marketing page; versioned with the release it announces |
| **@forja/shared** | `packages/shared/` | Internal | Types and constants shared by desktop and mobile |
| **@forja/tsconfig** | `packages/tsconfig/` | Internal | Shared TypeScript configurations |

`AGENTS.md` holds the instructions for AI coding agents working on this repo; `CLAUDE.md` and `CODEX.md` are symlinks to it, so there is one source. Humans start at [CONTRIBUTING.md](CONTRIBUTING.md).

<details>
<summary>Package summary</summary>


| Package | Path | Description |
|---------|------|-------------|
| **@forja/desktop** | `apps/desktop/` | Electron desktop app (main product) |
| **@forja/site** | `apps/site/` | Next.js 15 marketing site |
| **@forja/docs** | `apps/docs/` | Fumadocs documentation site |
| **@forja/mobile** | `apps/mobile/` | Expo remote control app (React Native) |
| **@forja/tsconfig** | `packages/tsconfig/` | Shared TypeScript configurations |
| **@forja/shared** | `packages/shared/` | Shared types and constants |

</details>

## Stack

| Technology | Purpose |
|-----------|---------|
| **Electron 32** | Desktop framework (Node.js backend + Chromium frontend) |
| **React 19 + TypeScript** | UI framework |
| **Tailwind CSS 4 + shadcn/ui** | Styling and components |
| **xterm.js 6 + node-pty** | Terminal emulation and PTY management |
| **Monaco Editor** | Code editing and diff viewing |
| **Shiki** | Syntax highlighting (14+ themes) |
| **react-markdown + remark-gfm** | Markdown output rendering |
| **Zustand 5** | State management |
| **FlexLayout** | Tiling window layout system |
| **chokidar 4** | File watching (.git/ changes, project files, settings) |
| **electron-store 10** | Config storage |
| **systeminformation** | System metrics (CPU, memory, disk, network) |
| **Discord.js 14** | Webhook notifications |
| **Lucide React** | Icon system |
| **@dnd-kit** | Drag-and-drop (project sidebar) |
| **Next.js 15** | Marketing site and documentation |
| **Fumadocs** | MDX documentation framework |
| **Expo 52 + React Native** | Mobile remote control app |
| **Vitest + React Testing Library** | Testing framework |

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
    +-- File System (reader, writer, tree, cache, watcher)
    +-- File Watcher (chokidar)
    |   +-- Monitors .git/ for changes
    |   +-- Watches project files and settings for live reload
    +-- Git Reader (git CLI)
    |   +-- Branch info, file status, diff content
    +-- Context System (hub, sync, tool registry)
    +-- Plugin System (bridge, loader, registry, permissions)
    +-- WebSocket Bridge (mobile remote control)
    +-- Agent Chat (IPC-based AI CLI interaction)
    +-- Config Manager (electron-store)
    +-- User Settings (~/.config/forja/settings.json)
    +-- System Metrics (systeminformation, demand-driven)
```

### App Layout

```
+---------------------------------------------------+
|  Titlebar (40px) - menu + title + window controls  |
+------+--------------------+------------------------+
|      |                    |                        |
| File |  Terminal Pane     |  File Preview /        |
| Tree |  (xterm.js)        |  Browser / Settings    |
| 256px|  ~60% width        |  ~40% width            |
|      |                    |                        |
+------+--------------------+------------------------+
|  Status Bar (24px) - git info + system metrics      |
+---------------------------------------------------+
```

### Application Flow

```
Home Screen (Project Selector)
  -> User selects project directory
  -> Workspace opens
      +-- Tab Bar (multi-session management)
      +-- Terminal Pane (PTY + xterm.js + split panes)
      +-- File Tree Sidebar (directory structure + git status)
      +-- File Preview Pane (code + markdown + images + diffs)
      +-- Browser Pane (embedded webview, auto-opens on localhost)
      +-- Chat Panel (agent chat with slash commands)
      +-- Status Bar (git branch + system metrics + telemetry)
```

## Inspirations

- **Warp** - Modern terminal UX, integrated AI
- **Raycast** - Excellent dark mode, density, polish
- **Zed** - Minimal, performance-focused, dev tool aesthetic
- **Linear** - Consistency, spacing, typography

## Security

Forja runs AI agents that can read and write your files and execute commands. Two features send data off the desktop process; both are **off by default**.

### Mobile remote control (WebSocket bridge)

Turning on the bridge lets a phone read and type into your terminal sessions. Treat it as remote shell access.

| | Current behavior |
|---|---|
| Enabled | Only when you toggle it on; it stops when you toggle it off or quit Forja |
| Listens on | `ws://0.0.0.0:9400`, reachable from any device on the same network |
| Authentication | A 4-digit PIN generated each time the bridge starts, sent by the client in its first message; a wrong PIN closes the connection |
| Encryption | None (plain `ws://`, no TLS) |
| An authenticated client can | List sessions, read their output, type into them, and open or close sessions, including a plain shell |
| Limits | 5 concurrent clients, 10 messages per second per connection |

Known limitations, to be fixed before the bridge leaves beta:

- A 4-digit PIN has 10,000 values and there is no lockout across reconnects, so anyone on the same network can guess it in minutes.
- Without TLS, the PIN and all terminal output travel in clear text on the network.

Until then, enable the bridge only on a network you trust (not café or office Wi-Fi), and turn it off when you are done.

### Discord notifications

When you configure a webhook, Forja posts a summary of the session output to that Discord channel. Agent output may contain code, file paths or secrets printed in the terminal; point the webhook at a private channel.

### Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting: **Security** tab > **Report a vulnerability**.

## Design

**Theme:** Catppuccin Mocha (default dark), with 14+ built-in themes

**Brand color:** `#cba6f7` (Catppuccin Mauve)

**Fonts:** Geist Sans (UI), JetBrains Mono (code/terminal)

Full design guidelines in `docs/design/DESIGN-GUIDELINES.md`.

## Installation

Download the latest release from [GitHub Releases](https://github.com/nandomoreirame/forja/releases):

- **macOS**: `.dmg` (Apple Silicon + Intel)
- **Linux**: `.AppImage` or `.deb`
- **Windows**: `.exe` (NSIS installer)

### Prerequisites

Forja requires at least one AI coding CLI installed:

```bash
# Claude Code (recommended)
npm install -g @anthropic-ai/claude-code

# Or Gemini CLI, Codex CLI, etc.
```

## Build from Source

```bash
# Clone
git clone https://github.com/nandomoreirame/forja.git
cd forja

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build:electron
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup.

## Documentation

| Document | Description |
|----------|-------------|
| [Brief](docs/specs/BRIEF.md) | Executive summary, personas, business model |
| [PRD](docs/specs/PRD.md) | Full product requirements, user stories, technical spec |
| [MVP Scope](docs/specs/MVP-SCOPE.md) | What's in/out of MVP, timeline, stack decisions |
| [Design Guidelines](docs/design/DESIGN-GUIDELINES.md) | Complete design system (colors, typography, components) |
| [CONTRIBUTING](CONTRIBUTING.md) | Development setup, testing, and contribution guide |
| [CHANGELOG](CHANGELOG.md) | Version history and release notes |

## License

[MIT](LICENSE)
