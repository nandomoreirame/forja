# Screenshot Reproduction Guide

Step-by-step instructions for reproducing each Forja screenshot using the `mcp-desktop-automation` MCP server or manual capture. Each section describes the exact state the application must be in before capturing.

## Prerequisites

- Forja built and running (`pnpm dev` or production build)
- A test project directory with source files, `CLAUDE.md`, and git history (e.g., the Forja repo itself)
- Claude Code, Codex CLI, Gemini CLI installed (for session type screenshots)
- Screen resolution: 1920x1080 recommended (screenshots were captured at this resolution)
- Window maximized or near-fullscreen

## MCP Desktop Automation Setup

The `desktop-automation` MCP server is configured in `.claude/settings.json`. It provides:

| Tool | Purpose |
|------|---------|
| `screen_capture` | Capture current desktop screenshot |
| `mouse_click` | Click at X/Y coordinates |
| `mouse_move` | Move cursor to X/Y position |
| `keyboard_press` | Press key combos (Ctrl+Shift+P, etc.) |
| `keyboard_type` | Type text at cursor position |
| `get_screen_size` | Get screen dimensions |

> **Note:** `screen_capture` has a 1MB response limit. For high-res displays, capture at 800x600 or use manual screenshot tools as fallback.

---

## 0. Workspaces with Projects

**File:** `0.workspaces-with-projects.png`

### State to reproduce

1. Launch Forja with a workspace named "Meu Workspace (Forja)"
2. Add the Forja project directory to the workspace
3. Open the **file tree** sidebar (click the files icon or `Ctrl+Shift+E`)
4. Open `CLAUDE.md` in a **file preview** pane (double-click the file in the tree)
5. Open a **terminal session** in the top-right pane:
   - Run `pnpm test` to show test results
   - Run `tree -L 1` to show repository structure
6. Open the **Pomodoro timer** widget (Command Palette > Toggle Pomodoro Timer)
   - Set timer to 25:00
7. Open the **Markdown Tasks** panel (visible in the right sidebar)
8. Open an **embedded browser** pane (`Ctrl+Shift+B`):
   - Navigate to the Forja GitHub repository page
9. Ensure the **status bar** at the bottom shows git branch info and system metrics

### Pane layout

```
+------------------+-------------------+------------------+
|                  |                   |   Terminal        |
|   File Tree      |   File Preview    |   (test output)   |
|   (sidebar)      |   (CLAUDE.md)     +------------------+
|                  |                   |   Pomodoro 25:00  |
|                  |                   |   Markdown Tasks  |
+------------------+-------------------+------------------+
|              Embedded Browser (GitHub page)              |
+---------------------------------------------------------+
```

### Capture

```
screen_capture → save as 0.workspaces-with-projects.png
```

---

## 1. First Screen (Add Project)

**File:** `1.first-screen-add-project.png`

### State to reproduce

1. Launch Forja with a **fresh workspace** (no projects added) or remove all projects
2. The workspace name should appear in the titlebar: "New Workspace (Forja)"
3. The center area shows:
   - Forja logo (anvil icon, blue glow)
   - Title: "Forja"
   - Tagline: "A dedicated desktop client for vibe coders"
   - "Click + in the sidebar to add a project" hint
   - "+ Add Project" button
4. The titlebar right side shows system metrics (CPU %, memory)
5. Sidebar is collapsed (only icons visible)

### Capture

```
screen_capture → save as 1.first-screen-add-project.png
```

---

## 2. Project Home Screen

**File:** `2.project-home-screen.png`

### State to reproduce

1. Start from screenshot 1 state
2. Add a project via "+ Add Project" (select the Forja directory)
3. The home screen now shows:
   - Forja logo and tagline
   - Keyboard shortcut hints:
     - `Ctrl + P` - Quick Open
     - `Shift + Ctrl + P` - Command Palette
   - Three quick action buttons: **New Session**, **Open Files**, **Browser**
4. Sidebar shows the project icon (collapsed view)
5. Titlebar shows: "forja - Forja"

### Capture

```
screen_capture → save as 2.project-home-screen.png
```

---

## 3. Focus Workspace

**File:** `3.focus-workspace.png`

### State to reproduce

1. Start from a workspace with a project added
2. Create a 3-column pane layout:
   - **Left pane:** Embedded browser (`Ctrl+Shift+B`)
     - Navigate to the Forja landing page (https://forja.dev or local `pnpm site:dev` on localhost:3030)
   - **Center pane (split vertical):**
     - Top: Claude Code session generating ASCII art (run `claude` and ask for ASCII art)
     - Bottom: Terminal session running a background task
   - **Right pane (split vertical):**
     - Top: Terminal session with test output running
     - Bottom: Pomodoro timer (set to ~19:54) + Markdown Tasks panel
3. Ensure tab bars are visible on each pane group
4. Workspace name: "Meu Workspace (Forja)"

### Pane layout

```
+------------------+-------------------+------------------+
|                  |   Claude Code     |   Terminal        |
|   Embedded       |   (ASCII art)     |   (test output)   |
|   Browser        +-------------------+------------------+
|   (landing page) |   Terminal        |   Pomodoro 19:54  |
|                  |   (background)    |   Markdown Tasks  |
+------------------+-------------------+------------------+
```

### Capture

```
screen_capture → save as 3.focus-workspace.png
```

---

## 4. Fullscreen Focus Mode

**File:** `4.fullscreen-focus-mode.png`

### State to reproduce

1. Create a 2-column layout (no sidebar visible, collapse it with the sidebar toggle)
2. **Left pane:** Claude Code session
   - Have Claude read and display the `CLAUDE.md` file content
   - The rich text rendering should show formatted markdown with headers, code blocks, bullet points
   - Tab label: "Claude 4"
3. **Right pane:** Claude Code session in conversation mode
   - Tab label: "Cline 2"
   - Have an active conversation where Claude is responding to a question about the project
   - The response should show architecture documentation, bullet points, code references
4. File tree sidebar must be **collapsed/hidden** to maximize terminal area
5. Titlebar shows session names

### Pane layout

```
+------------------------------+------------------------------+
|                              |                              |
|   Claude Code                |   Claude Code                |
|   (CLAUDE.md rendered)       |   (conversation mode)        |
|                              |                              |
|   Rich markdown display:     |   AI response with:          |
|   - Headers                  |   - Architecture details     |
|   - Code blocks              |   - Bullet points            |
|   - Bullet lists             |   - Code references          |
|                              |                              |
+------------------------------+------------------------------+
```

### Capture

```
screen_capture → save as 4.fullscreen-focus-mode.png
```

---

## 5. Open Browser (Dev Mode)

**File:** `5.open-browser-dev-mode.png`

### State to reproduce

1. Start the Forja landing page dev server: `pnpm site:dev` (localhost:3030)
2. Create a 3-column layout:
   - **Left pane:** File tree sidebar open (`Ctrl+Shift+E`), showing project source files
   - **Center pane:** Embedded browser (`Ctrl+Shift+B`)
     - Navigate to `http://localhost:3030` (Forja landing page)
     - The browser toolbar should be visible: back, forward, reload, URL bar
   - **Right pane:** Claude Code session with real-time development output
3. The browser should display the landing page with:
   - "The GUI your AI CLI deserves." headline
   - "Download for Linux" and "Star on GitHub" buttons
   - Feature sections visible

### Pane layout

```
+------------+-------------------------+------------------+
|            |                         |                  |
|  File Tree |   Embedded Browser      |   Claude Code    |
|  (sidebar) |   (localhost:3030)      |   (dev session)  |
|            |                         |                  |
|  Source     |   Forja Landing Page   |   Development    |
|  files     |   with nav toolbar     |   output         |
|            |                         |                  |
+------------+-------------------------+------------------+
```

### Capture

```
screen_capture → save as 5.open-browser-dev-mode.png
```

---

## 6. Panes and Multi-Sessions

**File:** `6.panes-multi-sessions.png`

### State to reproduce

1. Open the file tree sidebar with multiple projects listed
2. Create a complex **3x3 grid** of 9 panes:
   - Split horizontally into 3 columns, then split each column into 3 rows
3. In each pane, start different sessions:
   - Several **Claude Code** sessions: have them generate ASCII art (the "FORJA" ASCII banner)
   - One **plain terminal** running shell commands
   - One session showing **error output** with colored diagnostics
   - One session demonstrating **CLI auto-detection**
4. Each pane should have its own **tab bar** with session tabs
5. Ensure variety: different session types, different outputs, different tab counts

### Pane layout (approximate)

```
+------------------+-------------------+------------------+
|  Claude Code     |  Claude Code      |  Claude Code     |
|  (ASCII: FORJA)  |  (ASCII: FORJA)   |  (CLI detect)    |
+------------------+-------------------+------------------+
|  Claude Code     |  Terminal          |  Claude Code     |
|  (ASCII: FORJA)  |  (shell cmds)     |  (error output)  |
+------------------+-------------------+------------------+
|  Claude Code     |  Claude Code      |  Claude Code     |
|  (ASCII: FORJA)  |  (ASCII: FORJA)   |  (ASCII: FORJA)  |
+------------------+-------------------+------------------+
```

### Capture

```
screen_capture → save as 6.panes-multi-sessions.png
```

---

## 7. Command Bar

**File:** `7.command-bar.png`

### State to reproduce

1. Start from the **Project Home Screen** (screenshot 2 state)
2. Open the **Command Palette**: press `Ctrl+Shift+P`
3. The modal should display the command list:
   - New Session (`Ctrl+Shift+T`)
   - New Browser (`Ctrl+Shift+B`)
   - Add Project (`Ctrl+Shift+A`)
   - Open Files (`Ctrl+Shift+E`)
   - Open Browser (`Ctrl+Shift+O`)
   - Toggle Pomodoro Timer
4. The search input at the top should be empty (showing all commands)
5. The home screen should be visible behind the semi-transparent overlay

### Automation steps

```
keyboard_press: key="p", modifiers=["control", "shift"]
# Wait 500ms for the palette to animate in
screen_capture → save as 7.command-bar.png
```

---

## 8. Command for AI Sessions

**File:** `8.command-for-ai-sessions.png`

### State to reproduce

1. Start from the **Project Home Screen** (screenshot 2 state)
2. Trigger the **New Session** selector:
   - Either via Command Palette > New Session
   - Or click the "+ New Session" button on the home screen
3. The modal should display detected AI CLI session types:
   - **Claude Code** (with icon)
   - **Codex CLI** (with icon)
   - **Gemini CLI** (with icon)
   - **Cursor Agent** (with icon)
   - **GitHub Copilot** (with icon)
   - **Terminal** (plain terminal option)
4. The search input at the top should read: "Select session type..."
5. The home screen should be visible behind the overlay

### Automation steps

```
keyboard_press: key="t", modifiers=["control", "shift"]
# Wait 500ms for the session selector to appear
screen_capture → save as 8.command-for-ai-sessions.png
```

---

## Automation Script (Full Sequence)

To reproduce all screenshots in sequence using `mcp-desktop-automation`:

```
1. Launch Forja with empty workspace
2. screen_capture → 1.first-screen-add-project.png

3. mouse_click on "+ Add Project" → select project directory
4. Wait for project to load
5. screen_capture → 2.project-home-screen.png

6. keyboard_press: Ctrl+Shift+P
7. Wait 500ms
8. screen_capture → 7.command-bar.png

9. keyboard_press: Escape (close palette)
10. keyboard_press: Ctrl+Shift+T (or click New Session)
11. Wait 500ms
12. screen_capture → 8.command-for-ai-sessions.png

13. Select "Claude Code" session, set up panes for remaining screenshots
14. Build complex layouts for screenshots 0, 3, 4, 5, 6
15. Capture each after layout is complete
```

> **Important:** Screenshots 0, 3, 4, 5, and 6 require active sessions with specific content (ASCII art, test output, conversations). These need real AI CLI sessions running and producing output before capture. The automation can set up the pane layout, but the session content requires actual CLI interaction.
