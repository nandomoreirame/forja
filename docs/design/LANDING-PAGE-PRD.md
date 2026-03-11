# Forja — Landing Page PRD

> Product Requirements Document for the Forja open source landing page

**Version:** 1.0
**Date:** 2026-03-11
**Author:** Fernando Moreira
**Status:** Ready for Implementation
**Target:** AI agent specialized in building single-file HTML landing pages

---

## Executive Summary

Forja is an open source desktop GUI client for AI coding CLIs (Claude Code, Gemini CLI, OpenAI Codex, Cursor Agent), built with Electron + React + TypeScript. It replaces the raw terminal experience with a rich, visual environment that renders markdown beautifully, tracks Git context, manages multi-session tabs, and provides a full file tree sidebar — all in one dedicated window.

This document is the complete specification for building the Forja landing page. The page is a **single self-contained HTML file** — no build tool, no framework, no CDN dependencies that could break. Every asset is inlined or loaded from stable, reliable sources. The goal of the page is to convert developer visitors into users who download Forja or star the GitHub repository.

**Current project state (as of March 2026):**

- Version 1.5.0 released with theme system support
- 400+ tests passing (Vitest, multi-project)
- Production-grade feature set far beyond the original MVP spec
- MIT license, built in public on GitHub
- Supports macOS (Apple Silicon + Intel) and Linux (AppImage + deb)

---

## Target Audience & Personas

### Primary Audience

Developers who already use or are curious about AI coding CLIs — especially Claude Code, Gemini CLI, and OpenAI Codex. They are technical, skeptical of marketing, and respond to genuine demos and specific claims.

### Persona 1: Lucas — Full-Stack Developer

- **Age:** 25–35
- **Role:** Full-stack or backend developer at a startup or freelancing
- **Tool stack:** VS Code / Neovim, terminal-heavy workflow, uses Claude Code daily
- **Pain:** Claude Code outputs raw markdown in the terminal — hard to read long responses. Always has VS Code open on the side just to read the formatted output. Loses context between sessions.
- **Goal:** A dedicated window for Claude Code with readable output and Git context visible
- **Quote:** "Claude Code is insane for productivity, but reading walls of raw markdown in iTerm2 is painful."
- **What convinces him:** Real screenshots, multi-CLI support, the fact it's open source (not another SaaS)

### Persona 2: Mariana — Vibe Coder / AI-native Developer

- **Age:** 20–30
- **Role:** Designer who codes, indie hacker, or AI-first developer who builds real products with Claude Code
- **Tool stack:** Uses Claude Code as primary development tool, may not use a traditional IDE
- **Pain:** Terminal is intimidating. Raw text makes it hard to know what Claude is doing. No visual context.
- **Goal:** Visual, organized environment that shows what's happening — like an IDE but for AI CLIs
- **Quote:** "I wish Claude Code had a real UI. The terminal works but it doesn't feel like a product."
- **What convinces her:** Clean design, visual screenshots, the "open source" badge (free, no subscription)

### Secondary Audience

- Open source contributors who want to improve the project
- Developers curious about the Electron + React + xterm.js architecture
- People who saw Forja mentioned on Reddit, X/Twitter, Hacker News, or Product Hunt

---

## Project Context — Current Features (v1.5.0)

This section is critical. The original specs (Feb 2025) described an MVP. The actual product shipped in March 2026 is significantly more capable. The landing page must reflect the current state.

### Core Features to Highlight

**1. Multi-CLI Support**
Forja is not Claude Code-only. It supports Claude Code, Gemini CLI, OpenAI Codex CLI, Cursor Agent, and plain terminal sessions — all from a unified interface with session tabs.

**2. Terminal Emulation (xterm.js)**
Full PTY management via node-pty. VT sequence support. Real terminal, not a textarea. Ctrl+C/V, mouse support, scrollback buffer.

**3. Rich Markdown Rendering**
AI CLI output is intercepted and rendered as HTML — headers, lists, tables, code blocks, inline code, blockquotes — all formatted beautifully in the preview pane. No more staring at `**bold**` or `` `code` `` in raw form.

**4. Syntax Highlighting via Shiki**
Code blocks in AI output get full syntax highlighting using Shiki with Catppuccin Mocha as the default theme. Language detection covers 100+ languages.

**5. File Tree Sidebar**
Collapsible sidebar with full project directory tree, file type icons, git status indicators (M/A/D), lazy-loading subdirectories. Toggle with Ctrl+B.

**6. File Preview Pane**
Click any file in the tree to preview it with syntax highlighting. Supports code files, markdown, images. Monaco editor integration for file editing.

**7. Git Integration (Real-time)**
Current branch in the status bar, modified file counter, per-file git status badges in the file tree. Auto-updates every 500ms via chokidar file watcher. No need to open a separate terminal for `git status`.

**8. Multi-Session Tabs**
Multiple concurrent AI CLI sessions per project. Tab management: Ctrl+T (new), Ctrl+W (close), Ctrl+Tab (switch), Ctrl+1-9 (jump to tab). Context menu with rename and close.

**9. Command Palette**
Ctrl+P for quick file navigation. Ctrl+Shift+P for commands. Session picker, theme switcher, all accessible from keyboard.

**10. Theme System (v1.5.0)**
10 popular editor themes + 4 core themes. Catppuccin Mocha is default. Theme switcher in command palette and settings. CSS variable-based architecture for real-time switching without reload.

**11. Embedded Browser Pane**
Webview pane with navigation toolbar (back/forward/reload/address bar). Globe icon in titlebar to toggle. Auto-opens when localhost URLs appear in terminal output. Ctrl+Shift+B shortcut. Security: blocks dangerous URL schemes.

**12. System Metrics**
Real-time CPU, memory, swap, disk, and network metrics in the status bar via `systeminformation`. Demand-driven polling (only active when visible).

**13. Workspaces**
Group multiple projects into named workspaces. Each workspace opens in a dedicated window.

**14. Settings**
In-app JSON settings editor (Ctrl+,). Font configuration for 3 separate areas: app UI (Geist/Inter), editor/preview (JetBrains Mono), terminal. Line height, theme, window opacity, zoom level.

**15. Keyboard Shortcuts**
Comprehensive keyboard shortcut system. Ctrl+T/W/Tab for sessions. Ctrl+B for file tree. Ctrl+P/Ctrl+Shift+P for command palette. Ctrl+Alt+/- for terminal zoom. F11 for fullscreen.

**16. Security**
Sandbox enabled. CSP configured (no eval, no inline scripts). DOMPurify for HTML rendering. Path traversal prevention. No API key storage. PTY environment filtering.

**17. 400+ Tests**
Vitest multi-project setup (jsdom for frontend, node for Electron). React Testing Library for component tests. Coverage across all critical paths.

---

## Competitive Analysis

### What We Learned from Studying Competitor Landing Pages

Based on research of 100+ developer tool landing pages (Evil Martians study) and direct analysis of Warp, Zed, Cursor, Linear, and Raycast:

**What works for developer tools:**
1. No salesy marketing language. Devs see through it immediately.
2. Show the product visually in the first 3 seconds.
3. Specific claims beat vague ones ("400+ tests" beats "battle-tested").
4. Two CTAs in the hero: primary (download) + secondary (GitHub).
5. GitHub stars and open source badges build instant credibility with developers.
6. Social proof comes from GitHub metrics, not testimonials (for early-stage).
7. Dark, terminal-native aesthetics signal "built for devs, by devs".
8. Problem-first framing creates emotional resonance before showing solution.

**Warp (warp.dev):**
- Hero: Big headline + animated app demo below the fold
- "The terminal for the 21st century" — bold positioning
- Heavy emphasis on speed, AI integration, collaboration
- Dark background with gradient accents
- What to borrow: Product demo animation, speed emphasis, developer credibility

**Zed (zed.dev):**
- "Code at the speed of thought" — performance-first positioning
- Minimal design, lots of whitespace, clean typography
- Performance benchmarks prominently featured
- Open source badge is central (not hidden)
- What to borrow: Performance messaging, minimal aesthetic, OSS pride

**Cursor (cursor.sh):**
- "The AI Code Editor" — category definition
- Video demo autoplay in hero
- Feature grid with large icons
- "Built on VS Code" trust signal for adoption
- What to borrow: Clear category definition, autoplay demo

**Linear (linear.app):**
- Premium dark design, excellent typography
- "Built for speed" as persistent theme
- Consistent spacing, subtle animations
- No clutter, every element earns its place
- What to borrow: Typography quality, restraint, premium feel

**Raycast (raycast.com):**
- Product demo at the top is interactive
- Extension ecosystem prominently featured
- Dark-first with purple/blue accents
- Strong community messaging
- What to borrow: Product-first hero, community angle

### Forja's Positioning

**Category:** Open source desktop client for AI coding CLIs
**Primary differentiator:** Multi-CLI GUI (not locked to one AI), built in public, MIT license
**Tagline options (ranked):**
1. "The GUI your AI CLI deserves." — direct, clear, confident
2. "Where vibe coders forge code." — brand-aligned, but "forge" pun may be too subtle
3. "One window. Every AI CLI." — feature-led, emphasizes multi-CLI
4. "Open source GUI for Claude Code and friends." — explicit, but less punchy

**Recommended headline:** "The GUI your AI CLI deserves."
**Recommended subheadline:** "Forja is an open source desktop client for Claude Code, Gemini CLI, Codex, and more — with rich markdown rendering, multi-session tabs, and Git context built in."

---

## Page Architecture

### Overall Structure

```
1. Sticky Navigation Bar
2. Hero Section
3. Social Proof Bar (GitHub stats)
4. Problem Section
5. Feature Showcase (5-6 features)
6. CLI Compatibility Section
7. Theme Showcase
8. Open Source CTA Section
9. Footer
```

**Estimated scroll depth:** 5–7 screenfuls on desktop, 8–10 on mobile.
**Conversion goals:** GitHub star click > 15%, Download click > 10%, Bounce rate < 60%.

---

## Section-by-Section Specification

### Section 1: Navigation Bar

**Purpose:** Minimal wayfinding without competing with the hero CTA.

**Height:** 64px desktop / 56px mobile
**Position:** Sticky, z-index: 100
**Background:** Transparent initially, transitions to `rgba(30, 30, 46, 0.9)` with `backdrop-filter: blur(12px)` when scrolled past 60px

**Left side:**
- Forja logo — a small forge/anvil icon (Unicode: ⚒ or custom SVG) + wordmark "Forja" in Geist font, bold, `#cdd6f4`
- Logo links to `#top` (scroll to top)

**Center (desktop only):**
- Link: "Features" → scrolls to `#features`
- Link: "Themes" → scrolls to `#themes`
- Link: "GitHub" → `https://github.com/nandomoreirame/forja` (external, new tab)
- Link: "Releases" → `https://github.com/nandomoreirame/forja/releases` (external, new tab)
- Font: 14px, `#a6adc8`, hover: `#cdd6f4`, transition 150ms

**Right side:**
- CTA Button: "Download" — background `#cba6f7`, text `#1e1e2e`, font-weight 600, border-radius 8px, padding 8px 20px
- On click: smooth scroll to download section or direct link to releases

**Mobile (<768px):**
- Logo left
- "Download" button right
- No center links (no hamburger menu — too few links to need it)

**CSS implementation note:**
```css
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background 200ms ease, backdrop-filter 200ms ease;
}
.nav.scrolled {
  background: rgba(30, 30, 46, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #313244;
}
```

---

### Section 2: Hero

**Purpose:** Communicate what Forja is, for whom, and get the visitor to act — all in under 10 seconds.

**Min-height:** 90vh desktop, 80vh mobile
**Layout:** Centered, single column
**Background:** `#1e1e2e` (Catppuccin Base) with a subtle radial gradient at top center: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(203, 166, 247, 0.12) 0%, transparent 70%)`

**Element order (top to bottom):**

1. **Eyebrow badge**
   - Text: "Open Source · MIT License"
   - Style: Small pill/badge, border `1px solid #cba6f7`, background `rgba(203, 166, 247, 0.08)`, text `#cba6f7`, font-size 13px, border-radius 999px, padding 4px 14px
   - Positioned above the H1

2. **H1 Headline**
   - Copy: "The GUI your AI CLI deserves."
   - Font: Geist or Inter, 56px desktop / 36px mobile, font-weight 700, line-height 1.1
   - Color: `#cdd6f4`
   - Max-width: 720px, centered
   - Note: Period is intentional — confident, final statement

3. **Subheadline**
   - Copy: "Forja is an open source desktop client for Claude Code, Gemini CLI, Codex, and more. Rich markdown rendering, multi-session tabs, file tree, and real-time Git context — all in one window."
   - Font: Inter, 18px desktop / 16px mobile, line-height 1.6
   - Color: `#a6adc8`
   - Max-width: 600px, centered

4. **CTA Buttons**
   - **Primary:** "Download for macOS" (with Apple  icon) — large button, background `#cba6f7`, text `#1e1e2e`, font-weight 600, padding 14px 28px, border-radius 8px, font-size 16px
     - Dropdown arrow or note: "Also available for Linux (AppImage · deb)"
   - **Secondary:** "⭐ Star on GitHub" — outline button, border `#45475a`, text `#a6adc8`, hover border `#cba6f7`, hover text `#cdd6f4`, same size, padding 14px 28px, border-radius 8px
   - Arrangement: Side by side desktop, stacked mobile
   - Gap: 12px

5. **Trust line**
   - Copy: "Free & open source · macOS · Linux · v1.5.0"
   - Font: 13px, color `#6c7086`, centered
   - Positioned below CTA buttons, margin-top 16px

6. **App screenshot / demo**
   - A high-quality screenshot of Forja with the terminal pane + file tree + preview pane all visible
   - Framing: Rounded corners 12px, border `1px solid #313244`, box-shadow `0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(203, 166, 247, 0.05)`
   - Max-width: 1100px, 100% on mobile
   - Margin-top: 56px
   - If no real screenshot available: Use a realistic code mock using HTML/CSS styled as the app

**Important:** If using a static image, use `<img>` with lazy=false (above the fold). Format: WebP preferred, PNG fallback. Provide at 2x resolution for retina screens.

**Optional enhancement:** If a video/GIF demo is available, use `<video autoplay muted loop playsinline>` instead of a static image. This increases engagement significantly.

---

### Section 3: Social Proof Bar

**Purpose:** Build immediate credibility with developers after the hero — especially for those who scroll quickly.

**Background:** `#181825` (Catppuccin Mantle) — slightly darker than base, creates visual separation
**Border:** `border-top: 1px solid #313244; border-bottom: 1px solid #313244;`
**Padding:** 24px 0
**Layout:** Centered flex row, gap 48px, wraps on mobile to 2x2 grid

**Stats to show (4 items):**

1. **GitHub Stars**
   - Icon: ⭐ (star emoji or SVG)
   - Value: Load dynamically from GitHub API: `https://api.github.com/repos/nandomoreirame/forja`
   - Format: Display as "1.2k" for 1200+, exact number below 1000
   - Label: "GitHub Stars"
   - Fallback if API fails: Show "⭐ Stars" with a link to the repo

2. **Tests Passing**
   - Icon: ✓ (checkmark, color `#a6e3a1` Catppuccin Green)
   - Value: "400+"
   - Label: "Tests Passing"

3. **License**
   - Icon: ⚖ or shield icon
   - Value: "MIT"
   - Label: "Open Source License"

4. **Platform Support**
   - Icon: Apple + Linux (Tux or penguin)
   - Value: "macOS + Linux"
   - Label: "Platform Support"

**Per-stat styling:**
- Value: 24px, font-weight 700, `#cdd6f4`
- Label: 12px, `#6c7086`, text-transform uppercase, letter-spacing 0.08em

**GitHub API call (JavaScript):**
```javascript
async function loadGitHubStats() {
  try {
    const res = await fetch('https://api.github.com/repos/nandomoreirame/forja');
    const data = await res.json();
    const stars = data.stargazers_count;
    const display = stars >= 1000 ? (stars / 1000).toFixed(1) + 'k' : stars.toString();
    document.getElementById('gh-stars').textContent = display;
  } catch (e) {
    // Silently fail — fallback text is already in the DOM
  }
}
```

---

### Section 4: Problem Section

**Purpose:** Create emotional resonance — "this is exactly my pain" — before presenting the solution.

**ID:** `problem`
**Background:** `#1e1e2e`
**Padding:** 96px 0 80px
**Layout:** Centered, max-width 1100px

**Section label:**
- Text: "THE PROBLEM"
- Style: 11px, font-weight 600, letter-spacing 0.12em, color `#cba6f7`, text-transform uppercase

**H2 Headline:**
- Copy: "Claude Code is powerful. The terminal is not."
- Font: 40px desktop / 28px mobile, font-weight 700, `#cdd6f4`
- Max-width: 640px, can be centered or left-aligned

**Lead paragraph:**
- Copy: "You're already using Claude Code, Gemini CLI, or Codex to build faster. But the raw terminal experience hasn't kept up. You're wrestling with the interface instead of focusing on the code."
- Font: 18px, `#a6adc8`, line-height 1.7, max-width 620px

**Pain points grid:**
- Layout: 3 columns desktop, 1 column mobile
- Gap: 24px
- Card background: `rgba(49, 50, 68, 0.4)` (subtle, not heavy)
- Border: `1px solid rgba(49, 50, 68, 0.8)`
- Border-radius: 12px
- Padding: 28px

**Pain point 1 — Raw Markdown**
- Icon: A terminal/text icon (Lucide-style, 32px, stroke `#f38ba8` Catppuccin Red)
- Title: "Raw markdown everywhere"
- Description: "Claude's responses are filled with headers, code blocks, and lists — all rendered as ugly `**asterisks**` and backtick syntax in the terminal. Reading long responses is exhausting."

**Pain point 2 — Lost Context**
- Icon: A history/clock icon (32px, stroke `#f9e2af` Catppuccin Yellow)
- Title: "Context disappears"
- Description: "Close the terminal and your session is gone. Switch projects and you lose your place. There's no organized way to manage multiple AI sessions across different codebases."

**Pain point 3 — Window juggling**
- Icon: A layout/windows icon (32px, stroke `#89b4fa` Catppuccin Blue)
- Title: "Too many windows"
- Description: "Terminal for Claude, VS Code to read the output, browser to check docs — constantly alt-tabbing instead of building. Your workflow is scattered across 4 different applications."

---

### Section 5: Feature Showcase

**ID:** `features`
**Background:** `#1e1e2e` for odd features, `#181825` for even (alternating creates rhythm)
**Padding per feature:** 96px 0
**Layout:** 2-column grid (text + screenshot), alternating sides. Mobile: single column (screenshot first, then text)

**Section intro:**
- Label: "FEATURES"
- H2: "Everything you need. Nothing you don't."

**Feature 1 — Multi-CLI Support**

- Side: Screenshot left, text right
- Background: `#1e1e2e`
- Label chip: "Multi-CLI"
- Title: "One home for every AI CLI"
- Description: "Switch between Claude Code, Gemini CLI, OpenAI Codex, Cursor Agent, or a plain terminal session — all from the same interface. Each session gets its own tab. No more scattered terminal windows."
- Secondary detail: "Multi-session tabs with keyboard shortcuts. Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+1-9."
- Screenshot description: Show the CLI selection dialog or tab bar with multiple sessions visible
- Accent color for this feature: `#cba6f7` (Mauve — brand)

**Feature 2 — Rich Rendering**

- Side: Text left, screenshot right
- Background: `#181825`
- Label chip: "Rendering"
- Title: "Markdown the way it was meant to be read"
- Description: "AI output is intercepted and rendered as proper HTML — not raw text. Headers snap into hierarchy, code blocks light up with Shiki syntax highlighting across 100+ languages, tables align correctly, lists breathe."
- Secondary detail: "Powered by react-markdown + remark-gfm + Shiki (Catppuccin Mocha theme by default)."
- Screenshot description: Before/after showing raw terminal text vs. Forja's rendered preview pane
- Accent color: `#a6e3a1` (Green)

**Feature 3 — File Tree + Preview**

- Side: Screenshot left, text right
- Background: `#1e1e2e`
- Label chip: "File System"
- Title: "Your project, always in view"
- Description: "Collapsible file tree sidebar with git status indicators on every file. Click any file to preview it with full syntax highlighting. Edit files inline with Monaco editor integration."
- Secondary detail: "Lazy-loading directory tree. Ctrl+B to toggle. File type icons for 50+ file types."
- Screenshot description: File tree sidebar expanded with several files visible, one file open in preview pane
- Accent color: `#89b4fa` (Blue)

**Feature 4 — Git Integration**

- Side: Text left, screenshot right
- Background: `#181825`
- Label chip: "Git"
- Title: "Real-time Git context, always visible"
- Description: "Current branch in the status bar. Modified file count. Per-file git status badges (M/A/D) in the tree. All updated automatically every 500ms via file watcher — no manual refresh, no extra terminal."
- Secondary detail: "Powered by chokidar file watcher. Works with any local Git repository."
- Screenshot description: Status bar with branch name visible, file tree showing M/A badges on files
- Accent color: `#f9e2af` (Yellow)

**Feature 5 — Embedded Browser**

- Side: Screenshot left, text right
- Background: `#1e1e2e`
- Label chip: "Browser"
- Title: "localhost is part of the workflow"
- Description: "An embedded browser pane opens automatically when your AI CLI runs a dev server. Navigate your running app without switching windows. Back/forward/reload, custom address bar — full browser in your dev environment."
- Secondary detail: "Auto-detects localhost URLs in terminal output. Ctrl+Shift+B to toggle."
- Screenshot description: Browser pane visible showing a running web app, alongside the terminal
- Accent color: `#94e2d5` (Teal)

**Feature 6 — Theme System**

- ID: `themes`
- Side: Centered, full-width grid layout (not 2-column)
- Background: `#181825`
- Label chip: "Themes"
- Title: "14 themes. Your editor, your rules."
- Description: "10 popular editor themes plus 4 core Catppuccin variants. Switch instantly from the command palette (Ctrl+Shift+P). CSS variable architecture — no reload required."
- Theme grid: Show small color swatches or mini UI previews for each theme:
  - Catppuccin Mocha (default — dark purple)
  - Catppuccin Latte (light)
  - Tokyo Night
  - One Dark
  - Dracula
  - Nord
  - Gruvbox Dark
  - Solarized Dark
  - Material Dark
  - GitHub Dark
  - (and more)
- Note: Use colored circles or gradient swatches styled to match each theme's palette

**CSS for feature alternating layout:**
```css
.feature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  max-width: 1100px;
  margin: 0 auto;
  padding: 96px 24px;
}
.feature-row:nth-child(even) .feature-text {
  order: -1;
}
@media (max-width: 768px) {
  .feature-row {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .feature-row:nth-child(even) .feature-text {
    order: 0;
  }
}
```

---

### Section 6: CLI Compatibility

**Purpose:** Explicitly show which AI tools Forja supports — this is a key differentiator.

**Background:** `#1e1e2e`
**Padding:** 80px 0
**Layout:** Centered

**Headline:** "Works with the tools you already use"

**CLI cards grid:**
- Layout: 5 columns desktop, 2-3 columns tablet, 1-2 mobile
- Each card: border `1px solid #313244`, background `rgba(49, 50, 68, 0.3)`, border-radius 12px, padding 20px, centered

**CLI 1 — Claude Code (featured)**
- Logo: Anthropic's Claude icon (orange/amber) — if not available, use text "Cl" with orange background
- Name: "Claude Code"
- Badge: "Recommended" in brand purple
- Note: `npm install -g @anthropic-ai/claude-code`

**CLI 2 — Gemini CLI**
- Logo: Google's Gemini icon (blue gradient)
- Name: "Gemini CLI"
- Note: `npm install -g @google/gemini-cli`

**CLI 3 — OpenAI Codex**
- Logo: OpenAI icon (monochrome)
- Name: "Codex CLI"
- Note: `npm install -g @openai/codex`

**CLI 4 — Cursor Agent**
- Logo: Cursor icon (if available)
- Name: "Cursor Agent"
- Note: Cursor integration

**CLI 5 — Terminal**
- Logo: Terminal icon (monochrome)
- Name: "Plain Terminal"
- Note: Just a terminal session — no AI required

**Below grid:**
- Text: "More CLIs coming soon. Open source means you can add your own."
- Style: 14px, `#6c7086`, italic

---

### Section 7: Open Source CTA

**Purpose:** Convert developers into GitHub stargazers and community members.

**Background:** Differentiated — use a subtle gradient: `linear-gradient(135deg, #181825 0%, #1e1e2e 50%, #251e3a 100%)`
**Padding:** 120px 0
**Layout:** Centered, max-width 720px
**Border-top:** `1px solid rgba(203, 166, 247, 0.15)`

**Label:** "OPEN SOURCE"

**H2:** "Built in public. Free forever."

**Body copy:**
"Forja is MIT licensed and developed in public on GitHub. The source is yours to read, fork, modify, and improve. No paywalls, no subscriptions, no hidden features. Just a good tool for developers, made by a developer."

**GitHub stats row (live data):**
- ⭐ `<id="gh-stars">...</id>` Stars
- 🍴 `<id="gh-forks">...</id>` Forks
- 📦 `<id="gh-releases">...</id>` Releases

**CTA Buttons:**
- Primary: "⭐ Star on GitHub" — large, brand color background `#cba6f7`, text `#1e1e2e`, padding 16px 32px, font-size 17px, border-radius 8px, href to GitHub repo
- Secondary: "↓ Download Latest" — outline, border `#45475a`, text `#a6adc8`, same size, href to releases page

**Below buttons:**
- "PRs welcome · Issues welcome · MIT License"
- Font: 13px, `#6c7086`

**GitHub API for forks and releases:**
```javascript
const res = await fetch('https://api.github.com/repos/nandomoreirame/forja');
const data = await res.json();
// data.stargazers_count → stars
// data.forks_count → forks

const relRes = await fetch('https://api.github.com/repos/nandomoreirame/forja/releases');
const releases = await relRes.json();
// releases.length → number of releases
```

---

### Section 8: Footer

**Purpose:** Useful links and attribution.

**Background:** `#11111b` (Catppuccin Crust — darkest tone)
**Border-top:** `1px solid #1e1e2e`
**Padding:** 40px 0

**Layout:** 3-column grid desktop, stacked mobile

**Column 1 — Brand:**
- Forja logo (small)
- One-line description: "Open source GUI for AI coding CLIs."
- `© 2026 Fernando Moreira`

**Column 2 — Links:**
- GitHub → `https://github.com/nandomoreirame/forja`
- Releases → `https://github.com/nandomoreirame/forja/releases`
- Issues → `https://github.com/nandomoreirame/forja/issues`
- MIT License → `https://github.com/nandomoreirame/forja/blob/main/LICENSE`

**Column 3 — Built with:**
- "Built with Electron · React · TypeScript"
- "xterm.js · Shiki · Zustand"
- Font: 13px, `#6c7086`

**Bottom strip (optional):**
- "Made with care by Fernando Moreira · v1.5.0"
- `text-align: center; font-size: 12px; color: #45475a; padding-top: 24px; border-top: 1px solid #1e1e2e;`

---

## Copy Guidelines

### Voice & Tone

- **Direct:** Say exactly what it does. "Multi-session tabs" not "enhanced session management."
- **Developer-native:** Use technical terms without over-explaining. "PTY," "xterm.js," "Shiki" are fine.
- **Confident, not arrogant:** "The GUI your AI CLI deserves" not "The BEST GUI in the world."
- **No salesy language:** Never say "revolutionary," "game-changing," "powerful," "seamless," "robust," "cutting-edge."
- **Specific over vague:** "400+ tests" over "well-tested." "500ms debounce" over "fast updates."
- **Open source pride:** Celebrate the MIT license and built-in-public nature. Don't hide it.

### Headlines (Complete List)

| Section | Headline | Subheadline |
|---------|----------|-------------|
| Hero | "The GUI your AI CLI deserves." | "Open source desktop client for Claude Code, Gemini CLI, Codex, and more — with rich rendering, tabs, and Git context." |
| Problem | "Claude Code is powerful. The terminal is not." | "You're wrestling with the interface instead of focusing on the code." |
| Features | "Everything you need. Nothing you don't." | null |
| Feature 1 | "One home for every AI CLI" | "Switch between Claude Code, Gemini CLI, Codex, and more." |
| Feature 2 | "Markdown the way it was meant to be read" | "Proper HTML rendering with Shiki syntax highlighting." |
| Feature 3 | "Your project, always in view" | "File tree, git status, and file preview — all in one sidebar." |
| Feature 4 | "Real-time Git context, always visible" | "Branch, modified files, and git status — updated every 500ms." |
| Feature 5 | "localhost is part of the workflow" | "Embedded browser pane with auto-detect for dev servers." |
| Feature 6 | "14 themes. Your editor, your rules." | "Switch instantly from the command palette." |
| CLI section | "Works with the tools you already use" | null |
| Open Source CTA | "Built in public. Free forever." | "MIT licensed. PRs welcome. No paywalls, no subscriptions." |

### CTA Copy

| CTA | Context | Copy |
|-----|---------|------|
| Primary download | Hero, nav | "Download for macOS" |
| Secondary | Hero | "⭐ Star on GitHub" |
| Linux note | Below download | "Also available for Linux (AppImage · deb)" |
| GitHub CTA | OSS section | "⭐ Star on GitHub" |
| Download | OSS section | "↓ Download Latest" |

---

## Design Tokens (Complete Reference)

All colors, typography, spacing, and component values the AI agent needs to implement the landing page.

### Color Palette (Catppuccin Mocha)

```css
/* === BACKGROUNDS === */
--bg-crust:    #11111b;   /* Darkest — footer */
--bg-mantle:   #181825;   /* Darker — alternate sections, nav */
--bg-base:     #1e1e2e;   /* Main background */
--bg-surface0: #313244;   /* Cards, borders */
--bg-surface1: #45475a;   /* Hover states */
--bg-surface2: #585b70;   /* Active states, button borders */

/* === TEXT === */
--text-primary:   #cdd6f4;   /* Main text */
--text-secondary: #bac2de;   /* Subtext 1 */
--text-muted:     #a6adc8;   /* Subtext 0 / labels */
--text-subtle:    #7f849c;   /* Overlay 1 — placeholder */
--text-disabled:  #6c7086;   /* Overlay 0 — disabled / footer */
--text-faint:     #585b70;   /* Surface 2 — very faint */

/* === BRAND === */
--brand:           #cba6f7;   /* Catppuccin Mauve — primary accent */
--brand-hover:     #b4befe;   /* Catppuccin Lavender */
--brand-subtle-bg: #251e3a;   /* Dark mauve — badge backgrounds */
--brand-border:    rgba(203, 166, 247, 0.2);  /* Subtle brand border */

/* === SEMANTIC === */
--green:   #a6e3a1;   /* Success, positive */
--yellow:  #f9e2af;   /* Warning, git modified */
--red:     #f38ba8;   /* Error, danger */
--blue:    #89b4fa;   /* Info, links */
--teal:    #94e2d5;   /* Teal accent */
--peach:   #fab387;   /* Peach — warm accent */

/* === BORDERS === */
--border:        #313244;   /* Default border */
--border-subtle: #1e1e2e;   /* Very subtle separator */
--border-strong: #45475a;   /* Hover/focus border */
```

### Typography

```css
/* === FONT STACKS === */
--font-display: 'Geist', 'Inter', system-ui, -apple-system, sans-serif;
--font-body:    'Inter', system-ui, -apple-system, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* === HEADING SCALE === */
--text-hero:    clamp(32px, 5vw, 56px);   /* H1 hero */
--text-h2:      clamp(24px, 4vw, 42px);   /* Section headings */
--text-h3:      clamp(18px, 2.5vw, 24px); /* Feature titles */
--text-label:   11px;                      /* Section labels */

/* === BODY SCALE === */
--text-lg:   18px;   /* Lead paragraphs */
--text-base: 16px;   /* Default body */
--text-sm:   14px;   /* Secondary content, nav links */
--text-xs:   12px;   /* Footer, metadata */
--text-2xs:  11px;   /* Labels (UPPERCASE) */

/* === LINE HEIGHTS === */
--leading-tight:  1.1;   /* Hero headline */
--leading-snug:   1.3;   /* Section headings */
--leading-normal: 1.6;   /* Body text */
--leading-relaxed: 1.7;  /* Long paragraphs */

/* === FONT WEIGHTS === */
--weight-normal:   400;
--weight-medium:   500;
--weight-semibold: 600;
--weight-bold:     700;
--weight-black:    800;

/* === LETTER SPACING === */
--tracking-tight:   -0.02em;  /* Hero headline */
--tracking-normal:  0;
--tracking-wide:    0.05em;   /* Subheadline labels */
--tracking-wider:   0.08em;   /* Uppercase section labels */
--tracking-widest:  0.12em;   /* All-caps labels */
```

### Spacing Scale

```css
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
--space-16:  64px;
--space-20:  80px;
--space-24:  96px;
--space-30:  120px;
```

### Border Radius

```css
--radius-sm:   4px;    /* badges, tags, small pills */
--radius-md:   8px;    /* buttons, inputs */
--radius-lg:   12px;   /* cards, feature sections */
--radius-xl:   16px;   /* dialogs, screenshots */
--radius-2xl:  24px;   /* hero container */
--radius-full: 9999px; /* pills, avatars, tags */
```

### Shadows

```css
--shadow-sm:         0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md:         0 4px 6px rgba(0, 0, 0, 0.4);
--shadow-lg:         0 10px 15px rgba(0, 0, 0, 0.5);
--shadow-xl:         0 20px 40px rgba(0, 0, 0, 0.6);
--shadow-screenshot: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(203, 166, 247, 0.05);
--shadow-card:       0 4px 20px rgba(0, 0, 0, 0.4);
--shadow-glow-brand: 0 0 30px rgba(203, 166, 247, 0.15);
```

### Transitions

```css
--transition-fast:    100ms ease;   /* Hover micro-interactions */
--transition-default: 150ms ease;   /* Default UI */
--transition-slow:    250ms ease;   /* Modals, larger elements */
--transition-enter:   350ms ease;   /* Entry animations */
```

### Breakpoints

```css
--bp-sm:  480px;
--bp-md:  768px;   /* Mobile → Desktop breakpoint */
--bp-lg:  1024px;
--bp-xl:  1280px;
--bp-2xl: 1536px;

/* Max content width */
--max-content: 1100px;
--max-text:    720px;
--max-prose:   620px;
```

---

## Component Specifications

### Button — Primary (Download)

```css
.btn-primary {
  background: #cba6f7;
  color: #1e1e2e;
  font-weight: 600;
  font-size: 16px;
  padding: 14px 28px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 150ms ease, transform 100ms ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn-primary:hover {
  background: #b4befe;
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
}
```

### Button — Secondary (GitHub)

```css
.btn-secondary {
  background: transparent;
  color: #a6adc8;
  font-weight: 500;
  font-size: 16px;
  padding: 14px 28px;
  border-radius: 8px;
  border: 1px solid #45475a;
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn-secondary:hover {
  border-color: #cba6f7;
  color: #cdd6f4;
}
```

### Badge / Label chip

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(203, 166, 247, 0.3);
  background: rgba(203, 166, 247, 0.08);
  color: #cba6f7;
}
```

### Feature label chip (smaller, accent-colored)

```css
.feature-label {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(203, 166, 247, 0.1);
  color: #cba6f7;
  margin-bottom: 12px;
}
```

### Section label (ALL CAPS, above H2)

```css
.section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #cba6f7;
  margin-bottom: 16px;
  display: block;
}
```

### Screenshot / App mockup container

```css
.screenshot-container {
  border-radius: 12px;
  border: 1px solid #313244;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(203, 166, 247, 0.05);
  overflow: hidden;
  background: #1e1e2e;
}
.screenshot-container img {
  width: 100%;
  display: block;
}
```

### Pain card

```css
.pain-card {
  background: rgba(49, 50, 68, 0.4);
  border: 1px solid rgba(49, 50, 68, 0.8);
  border-radius: 12px;
  padding: 28px;
}
.pain-card:hover {
  border-color: #45475a;
  transition: border-color 200ms ease;
}
```

### Stat item

```css
.stat-item {
  text-align: center;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #cdd6f4;
  display: block;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6c7086;
}
```

---

## Mobile Responsiveness

### Breakpoint: 768px

**Navigation:**
- Hide center links
- Keep logo + download button
- Increase touch targets to min 44px

**Hero:**
- H1: 32–36px (from 56px)
- Subheadline: 16px (from 18px)
- Buttons: Full width, stacked vertically
- Screenshot: 100% width, remove horizontal padding

**Social Proof Bar:**
- 2x2 grid (from 4 columns)

**Problem Section:**
- Pain cards: Single column stack
- H2: 28px

**Feature rows:**
- Always: screenshot above, text below (ignore alternating layout)
- Screenshots: 100% width

**CLI grid:**
- 2 columns (from 5)

**Open Source CTA:**
- Buttons: Stacked, full width

**Footer:**
- Single column stack
- Increased padding

### Touch Targets

All interactive elements must have minimum 44x44px touch target on mobile.

### Font size minimum

No text smaller than 14px on mobile (16px preferred for body).

---

## SEO & Meta Tags

### HTML Head (Complete)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary Meta -->
  <title>Forja — Open Source GUI for Claude Code, Gemini CLI & AI Coding CLIs</title>
  <meta name="description" content="Forja is an open source desktop client for Claude Code, Gemini CLI, OpenAI Codex, and more. Rich markdown rendering, multi-session tabs, file tree, Git integration, and 14 themes. Free. MIT license." />
  <meta name="keywords" content="Claude Code GUI, Gemini CLI, AI coding, terminal emulator, Electron app, open source, developer tools, xterm.js, Catppuccin" />
  <meta name="author" content="Fernando Moreira" />
  <link rel="canonical" href="https://forja.dev/" />

  <!-- Open Graph (for Twitter/X, LinkedIn, Slack, etc.) -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://forja.dev/" />
  <meta property="og:title" content="Forja — The GUI your AI CLI deserves" />
  <meta property="og:description" content="Open source desktop client for Claude Code, Gemini CLI, and Codex. Rich rendering, tabs, Git context, and 14 themes. Free & MIT licensed." />
  <meta property="og:image" content="https://forja.dev/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Forja" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@nandomoreirame" />
  <meta name="twitter:creator" content="@nandomoreirame" />
  <meta name="twitter:title" content="Forja — The GUI your AI CLI deserves" />
  <meta name="twitter:description" content="Open source desktop client for Claude Code, Gemini CLI, and Codex. Rich rendering, tabs, Git context. Free & MIT." />
  <meta name="twitter:image" content="https://forja.dev/og-image.png" />

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

  <!-- Theme color for browser chrome -->
  <meta name="theme-color" content="#1e1e2e" />

  <!-- Fonts — preload for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />

  <!-- Geist font (Vercel) — load separately or use Inter as fallback -->
  <!--
    Option A: Use Geist from npm (requires build step, not suitable for single HTML)
    Option B: Use Inter as display font (nearly identical, widely available)
    Option C: Self-host Geist woff2 files (inline as base64 or separate files)
    Recommendation for single HTML: Use Inter for display, JetBrains Mono for code
  -->

  <!-- Analytics — Plausible (no cookies, GDPR compliant, < 1KB) -->
  <!-- Replace YOUR_DOMAIN with actual domain -->
  <script defer data-domain="YOUR_DOMAIN" src="https://plausible.io/js/script.js"></script>

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Forja",
    "description": "Open source desktop GUI client for AI coding CLIs — Claude Code, Gemini CLI, OpenAI Codex, and more.",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "macOS, Linux",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Person",
      "name": "Fernando Moreira"
    },
    "url": "https://forja.dev",
    "sameAs": "https://github.com/nandomoreirame/forja",
    "license": "https://opensource.org/licenses/MIT"
  }
  </script>
</head>
```

### OG Image Specification

**Size:** 1200x630px
**Background:** `#1e1e2e`
**Content:** Forja logo (large) + tagline "The GUI your AI CLI deserves." + small screenshot thumbnail + MIT/Open Source badges
**Format:** PNG
**Path:** `/og-image.png` (same directory as index.html)

---

## Performance Requirements

### Core Web Vitals Targets

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint (FCP) | < 1.0s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.0s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.05 | Lighthouse |
| Total Blocking Time (TBT) | < 200ms | Lighthouse |
| Time to Interactive (TTI) | < 3.0s | Lighthouse |
| Lighthouse Performance Score | > 90 | Lighthouse |

### Asset Optimization

**Images:**
- Format: WebP for screenshots, PNG fallback for browsers that don't support WebP
- Serve 2x resolution for retina (1x for mobile, 2x for desktop via srcset)
- Lazy-load images below the fold: `loading="lazy"`
- Hero screenshot: `loading="eager"` (above the fold, critical)
- Compress: Target < 200KB per screenshot after WebP compression

**Fonts:**
- Preconnect to fonts.googleapis.com and fonts.gstatic.com
- Use `display=swap` to prevent invisible text during load
- Load only needed weights: 400, 500, 600, 700 for Inter; 400, 500 for JetBrains Mono
- Subset if possible (latin only for English content)

**Scripts:**
- No framework (vanilla JS only)
- Inline critical JavaScript (< 3KB total)
- Defer non-critical scripts with `defer` attribute
- GitHub API calls: Non-blocking, enhance after load, graceful fallback

**CSS:**
- No external CSS libraries (no Bootstrap, no Tailwind CDN)
- All styles inline in `<style>` tag in `<head>`
- Critical above-the-fold CSS loaded synchronously

**Total page weight target:** < 1MB (excluding large screenshots)

### Single-File Constraints

The page is implemented as a **single HTML file** (`index.html`). This means:

- All CSS is inside `<style>` tags in `<head>`
- All JavaScript is inside `<script>` tags (preferably at end of `<body>`)
- No external CSS files (except Google Fonts CDN)
- No JavaScript framework imports
- Screenshots and images are referenced as external files (not base64-encoded — too heavy)
- Analytics loaded via simple `<script>` tag with `defer`

**File structure:**
```
/
├── index.html          (the entire page — HTML + CSS + JS)
├── screenshot.png      (hero screenshot — referenced in HTML)
├── og-image.png        (Open Graph image)
├── favicon.svg
├── favicon-32x32.png
├── favicon-16x16.png
└── apple-touch-icon.png
```

---

## Animations & Interactions

### Scroll-triggered entrance animations

Use `IntersectionObserver` to trigger CSS animations as sections scroll into view. No JavaScript animation library.

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 400ms ease, transform 400ms ease;
}
.animate-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Nav background on scroll

```javascript
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });
```

### Smooth scroll for anchor links

```css
html {
  scroll-behavior: smooth;
}
```

### Hover effects

All hover states use CSS transitions (no JavaScript). Keep transitions at 150ms for snap feel. No complex JavaScript-driven animations on this page — keep it fast.

### Theme color swatches (Section 6)

Interactive theme preview: on hover over a theme swatch, change a CSS variable on a mock UI element to preview the theme color. Pure CSS with `:hover` sibling selectors where possible.

---

## Accessibility

### Requirements

- **WCAG 2.1 AA** compliance minimum
- All interactive elements have visible focus states
- Focus ring: `outline: 2px solid #cba6f7; outline-offset: 3px;`
- Color contrast ratio: minimum 4.5:1 for text (7:1 preferred)
- All images have `alt` text
- Decorative images: `alt=""`
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<footer>`, `<h1>–<h6>` used correctly
- Only one `<h1>` per page (the hero headline)
- Keyboard navigable: Tab through all interactive elements in logical order
- Skip link: `<a href="#main" class="sr-only focus:not-sr-only">Skip to main content</a>`

### Color Contrast Audit

| Element | Text color | Background | Ratio | Pass |
|---------|-----------|-----------|-------|------|
| Body text | `#cdd6f4` | `#1e1e2e` | 12.5:1 | ✅ AAA |
| Secondary text | `#a6adc8` | `#1e1e2e` | 7.0:1 | ✅ AAA |
| Muted text | `#6c7086` | `#1e1e2e` | 3.8:1 | ⚠ AA large only |
| Brand on dark | `#cba6f7` | `#1e1e2e` | 8.4:1 | ✅ AAA |
| Button text | `#1e1e2e` | `#cba6f7` | 8.4:1 | ✅ AAA |
| Nav links | `#a6adc8` | `transparent/#1e1e2e` | 7.0:1 | ✅ AAA |

**Note:** Muted text (`#6c7086`) at 3.8:1 only passes WCAG AA for large text (18px+ normal or 14px+ bold). Use it only for decorative/secondary labels, not for critical content.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .animate-on-scroll {
    opacity: 1;
    transform: none;
    transition: none;
  }
  html {
    scroll-behavior: auto;
  }
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## Analytics Events

Track these events with Plausible (or any analytics tool):

```javascript
// GitHub star click
document.querySelectorAll('a[data-event="github-star"]').forEach(el => {
  el.addEventListener('click', () => {
    plausible('GitHub Star Click', { props: { location: el.dataset.location } });
  });
});

// Download click
document.querySelectorAll('a[data-event="download"]').forEach(el => {
  el.addEventListener('click', () => {
    plausible('Download Click', { props: { os: el.dataset.os, location: el.dataset.location } });
  });
});
```

**Events to track:**
- `GitHub Star Click` — prop: location (hero, oss-cta)
- `Download Click` — prop: os (macos, linux), location (hero, nav, oss-cta)
- `GitHub Repo Click` — general repo link clicks
- `Scroll Depth` — 25%, 50%, 75%, 100% (via IntersectionObserver on section markers)

---

## Implementation Notes for AI Agent

### Required Reading Before Building

Before writing a single line of HTML, the agent building this page must internalize:

1. **Single HTML file** — No build step, no framework. Everything lives in one file.
2. **No jQuery, no React, no Vue** — Vanilla JS only.
3. **No Bootstrap, no Tailwind CDN** — All CSS written manually in `<style>` tags.
4. **Google Fonts via CDN** — Inter and JetBrains Mono only.
5. **GitHub API** — Called asynchronously with graceful fallback if it fails.
6. **All colors from this document** — Do not invent colors. Use only the Catppuccin Mocha palette defined here.
7. **Semantic HTML** — Use `<section>`, `<nav>`, `<footer>`, `<main>`, `<h1>–<h3>`.
8. **Mobile first** — Write mobile CSS, then desktop overrides in `@media (min-width: 768px)`.

### Placeholders and Assets

The agent should handle missing assets gracefully:

- **Screenshots:** If no real screenshot is provided, create a realistic app mockup using pure HTML/CSS styled to look like the Forja app (dark background, file tree on left, terminal in center, preview on right — all using Catppuccin Mocha colors).
- **Logos (CLI logos):** Use text abbreviations styled as colored icons (e.g., "Cl" in orange for Claude, "Gm" in blue for Gemini).
- **Forja logo:** Use a forge/anvil emoji (⚒) or Unicode character styled with the brand color, plus the wordmark "Forja" in bold.

### App Mockup (if no screenshot)

If no screenshot.png is available, build an HTML/CSS app mockup:

```html
<div class="app-mockup">
  <!-- Window chrome -->
  <div class="titlebar">
    <div class="traffic-lights">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
    </div>
    <span class="title">Forja — my-project</span>
  </div>
  <!-- App body -->
  <div class="app-body">
    <div class="sidebar"><!-- file tree --></div>
    <div class="terminal"><!-- xterm.js mock --></div>
    <div class="preview"><!-- markdown preview --></div>
  </div>
</div>
```

Style everything with Catppuccin Mocha colors from the design tokens above.

### GitHub Links (use exact URLs)

- Repo: `https://github.com/nandomoreirame/forja`
- Releases: `https://github.com/nandomoreirame/forja/releases`
- Issues: `https://github.com/nandomoreirame/forja/issues`
- License: `https://github.com/nandomoreirame/forja/blob/main/LICENSE`
- macOS download: `https://github.com/nandomoreirame/forja/releases/latest`
- Linux download: `https://github.com/nandomoreirame/forja/releases/latest`

### JavaScript — Complete functional requirements

1. **Nav scroll effect:** Add `.scrolled` class to `<nav>` when `scrollY > 60`
2. **Smooth scroll:** Intercept anchor click events, use `scrollIntoView({ behavior: 'smooth' })`
3. **GitHub stats:** Fetch from GitHub API asynchronously, update DOM
4. **IntersectionObserver:** Animate sections on scroll (add `.visible` class)
5. **OS detection (optional):** Detect navigator.platform to customize download button text
6. **Analytics:** Plausible event tracking on CTA clicks

---

## Pre-Launch Checklist

### Content Completeness

- [ ] Hero headline and subheadline written per this PRD
- [ ] All 6 feature sections have title, description, and visual
- [ ] Problem section has 3 pain point cards with icons and copy
- [ ] CLI compatibility section shows all 5 supported CLIs
- [ ] GitHub links point to correct repository
- [ ] Download links point to latest release
- [ ] Open source CTA section has correct copy and buttons

### Design Fidelity

- [ ] All colors match Catppuccin Mocha palette exactly (use hex values from this PRD)
- [ ] Typography: Inter/Geist for UI, JetBrains Mono for code blocks
- [ ] Mobile layout tested at 375px, 430px (iPhone), 768px (tablet)
- [ ] Desktop layout tested at 1280px, 1440px, 1920px
- [ ] Screenshot has 12px border-radius, subtle border, dramatic shadow
- [ ] Navigation bar backdrop blur works on scroll
- [ ] All interactive elements have hover states

### Accessibility

- [ ] Lighthouse accessibility score > 90
- [ ] All images have alt text
- [ ] Focus rings visible on all interactive elements
- [ ] Color contrast meets WCAG AA minimum
- [ ] `<h1>` only appears once (hero headline)
- [ ] Semantic HTML structure correct
- [ ] Reduced motion media query implemented

### Performance

- [ ] Lighthouse performance score > 90
- [ ] No render-blocking resources except Google Fonts
- [ ] Hero screenshot has `loading="eager"` (not lazy)
- [ ] Below-fold images have `loading="lazy"`
- [ ] JavaScript is < 5KB total (not counting analytics)
- [ ] Total page weight < 1MB (screenshots optional, should compress to < 200KB each)
- [ ] GitHub API call has try/catch and fallback values

### Technical

- [ ] Single HTML file (all CSS in `<style>`, all JS in `<script>`)
- [ ] Meta tags complete (title, description, OG, Twitter Card)
- [ ] Canonical URL set
- [ ] JSON-LD structured data present
- [ ] Favicon linked (or using emoji favicon as fallback)
- [ ] Plausible analytics configured (or remove the script tag if not using analytics)
- [ ] No console errors in browser DevTools
- [ ] Page works without JavaScript (graceful degradation)

---

## Asset Requirements

The following assets should be created before or alongside the landing page:

| Asset | Dimensions | Format | Purpose |
|-------|-----------|--------|---------|
| Hero screenshot | 2200x1400px (2x) | PNG/WebP | Main hero visual |
| Feature screenshot 1 (CLI selector) | 1200x800px (2x) | PNG/WebP | Multi-CLI section |
| Feature screenshot 2 (markdown preview) | 1200x800px (2x) | PNG/WebP | Rendering section |
| Feature screenshot 3 (file tree) | 1200x800px (2x) | PNG/WebP | File system section |
| Feature screenshot 4 (git header) | 1200x800px (2x) | PNG/WebP | Git section |
| Feature screenshot 5 (browser pane) | 1200x800px (2x) | PNG/WebP | Browser section |
| OG image | 1200x630px | PNG | Social sharing |
| Favicon | 32x32, 16x16 | PNG | Browser tab |
| Favicon SVG | vector | SVG | Modern browsers |
| Apple touch icon | 180x180px | PNG | iOS bookmark |

**If screenshots are not yet available:** The AI agent should build HTML/CSS app mockups styled with Catppuccin Mocha colors. These will be replaced by real screenshots later.

---

## Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Design Guidelines | `docs/design/DESIGN-GUIDELINES.md` | Full design system reference |
| Landing Page Spec (old) | `docs/design/LANDING-PAGE-SPEC.md` | Original Feb 2025 spec (superseded by this PRD) |
| Product Brief | `docs/specs/BRIEF.md` | Executive summary and personas |
| Product PRD | `docs/specs/PRD.md` | Full product requirements (original) |
| MVP Scope | `docs/specs/MVP-SCOPE.md` | What was in/out of MVP |
| README | `README.md` | Current project state and features |
| Changelog | `CHANGELOG.md` | Complete version history |

---

**Last Updated:** 2026-03-11
**Next Review:** Pre-launch
**Author:** Fernando Moreira
**Status:** Ready for implementation by AI landing page agent
