# Forja - Landing Page Spec

> Structural specification — no copy/text

**Date:** 02/03/2026
**Type:** Open Source Product Launch
**Objective:** GitHub stars, downloads, contributors — Claude Code community

---

## 🎯 Landing Page Objectives

**Main Objective:** Convert visitors (devs who use Claude Code) into users who download Forja and star it on GitHub.

**Audience:** Developers arriving via Product Hunt, Twitter/X, Reddit (r/ClaudeAI, r/LocalLLaMA), Anthropic community.

| Metric | Target |
|--------|--------|
| GitHub stars (30 days post-launch) | 500+ |
| Downloads (binaries) | 200+ |
| Bounce rate | <60% |
| Time on page | >90s |

---

## 📐 Design Principles

- **Developer-first:** The landing talks to devs — real technical demo, no empty marketing
- **Show don't tell:** Animated screenshot/GIF of the terminal working is worth more than any headline
- **Native dark mode:** Target audience uses dark mode — light mode is opt-in
- **Speed above all:** Lightweight page, no heavy animations

**Visual references:**

- https://warp.dev (hero with animated terminal)
- https://github.com/features/copilot (clean, technical)
- https://linear.app (minimalism, dark)

---

## 📄 Page Structure

### MVP Version (launch)

```
1. Header/Nav
2. Hero
3. Demo Visual (Terminal in action)
4. Problem
5. Features (4 main)
6. Open Source CTA
7. Footer
```

---

## 🧱 Detailed Sections

### 1. HEADER/NAV

**Elements:**

- Forja Logo (left) — forge/anvil icon + name
- Links (right): `GitHub` (with star count) | `Docs` | `Download`
- Primary CTA: `⬇ Download` (badge with current version)

**Layout:**

```
[🔨 Forja]                         [GitHub ★ 500]  [Docs]  [⬇ Download v1.0]
```

**Behavior:**

- Sticky, always visible
- GitHub star count via API (shields.io or GitHub API)
- Height: 60px
- Background: `bg-black/90 backdrop-blur`

---

### 2. HERO

**Objective:** Communicate in 5 seconds — "dedicated terminal for Claude Code, finally fluid"

**Layout — Centered:**

```
┌─────────────────────────────────────────┐
│                                         │
│         Badge: "Open Source"            │
│                                         │
│         Headline (H1)                   │
│         Subheadline                     │
│                                         │
│    [⬇ Download]    [GitHub →]           │
│                                         │
│    Badge: Linux + macOS                 │
│                                         │
└─────────────────────────────────────────┘
```

**Elements:**

- Pill badge: "Open Source · MIT License"
- H1: Benefit-focused, developer language
- Subheadline: 1-2 sentences explaining what it is
- Primary CTA: "⬇ Download for Linux" / "⬇ Download for macOS" (detect OS)
- Secondary CTA: "View on GitHub →"
- Trust badges: `🐧 Linux` | `🍎 macOS` | `⚡ Electron`

**Specs:**

- Min-height: 80vh
- Padding-top: 120px (after nav)
- Background: black with subtle grain texture or dark radial gradient

---

### 3. DEMO VISUAL

**Objective:** Show the product working — the fluid terminal, Claude Code running inside Forja.

**Central element:**

- Animated GIF or autoplay/muted/loop video showing:
  1. Opening a workspace
  2. Claude Code running in the integrated terminal
  3. File tree updating in real time
  4. Git diff showing changes

**Layout:**

```
┌────────────────────────────────────────────────────┐
│                                                    │
│   [App Screenshot/GIF — fullwidth with shadow]    │
│                                                    │
│   Border: 1px border-gray-800, border-radius 12px │
│   Shadow: subtle glow with the app's primary color │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Specs:**

- Max-width: 1100px, centered
- Aspect ratio: 16:9
- Border: `border border-gray-800 rounded-xl`
- Shadow: `shadow-2xl` with subtle app color glow
- Caption below: short descriptive text

---

### 4. PROBLEM

**Objective:** Generate identification — "this happens to me every day"

**Layout — 3 horizontal cards:**

```
         Do you recognize this?

┌──────────┐  ┌──────────┐  ┌──────────┐
│  Icon    │  │  Icon    │  │  Icon    │
│  Pain 1  │  │  Pain 2  │  │  Pain 3  │
│  Detail  │  │  Detail  │  │  Detail  │
└──────────┘  └──────────┘  └──────────┘
```

**3 Pain Points:**

1. **Fragmentation** — Terminal in one window, editor in another, browser in another, with no project context
2. **Slow TTY** — Integrated terminals in desktop apps always have visible input lag
3. **No workspace** — Every time you open a project you have to reconfigure everything from scratch

**Specs:**

- 3-column grid on desktop, stack on mobile
- Cards: `bg-gray-950 border border-gray-800 rounded-lg p-6`
- Icons: 48px, Lucide or Phosphor

---

### 5. FEATURES

**Objective:** Show the 4 core features with real visuals (inline screenshots)

**Layout — Alternating (feature + screenshot):**

```
Feature 1 text  │  Screenshot 1
                │
Screenshot 2    │  Feature 2 text
                │
Feature 3 text  │  Screenshot 3
                │
Screenshot 4    │  Feature 4 text
```

**4 Features:**

**Feature 1: Real PTY Terminal**

- Icon: terminal/command
- Screenshot: terminal with Claude Code running
- Highlights: node-pty, xterm.js, <16ms latency

**Feature 2: Per-Project Workspaces**

- Icon: folder/workspace
- Screenshot: sidebar with workspace switcher
- Highlights: persisted context, automatic file tree

**Feature 3: Real-Time Git Diff**

- Icon: git-branch/diff
- Screenshot: git diff panel showing Claude's changes
- Highlights: updates automatically, clear visualization

**Feature 4: Smart File Tree**

- Icon: files
- Screenshot: sidebar with file tree
- Highlights: real-time watcher, ignores node_modules

**Specs:**

- 2-column grid (50/50) on desktop, stack on mobile
- Screenshots: border-radius 12px, shadow-lg
- Padding between features: 80px

---

### 6. OPEN SOURCE CTA

**Objective:** Convert into star, download, and contribution

**Layout — Centered, differentiated background:**

```
┌─────────────────────────────────────────────┐
│                                             │
│         Closing headline                    │
│         Subheadline (open source angle)     │
│                                             │
│    [⬇ Download]    [★ Star on GitHub]       │
│                                             │
│    "MIT License · Free forever"             │
│                                             │
└─────────────────────────────────────────────┘
```

**Elements:**

- Headline: final value proposition
- GitHub star button (real, with count)
- Download CTA (detects OS)
- Badge: "MIT License · Free forever · No telemetry"
- Background: `bg-gray-950` or subtle gradient differentiating from the rest

---

### 7. FOOTER

**Elements:**

- Logo + short tagline
- Links: GitHub | Docs | Releases | Issues
- "Built with Electron + React"
- MIT Copyright

**Layout:**

```
[🔨 Forja]  tagline

GitHub  Docs  Releases  Issues

Built with ❤️ using Electron + React · MIT License
```

---

## 📱 Mobile Behavior

- Hero: Vertical stack, full-width CTA
- Demo: Full-width GIF/video, horizontal scroll allowed
- Features: Stack (1 column) — screenshot above, text below
- Nav: Logo + Download button only (no extra links)
- Main breakpoint: 768px

---

## 🎨 Design Tokens

```css
/* Background */
--bg-primary: #000000
--bg-card: #0a0a0a
--bg-subtle: #111111

/* Borders */
--border: #1f1f1f
--border-subtle: #161616

/* Text */
--text-primary: #fafafa
--text-secondary: #a1a1aa

/* Brand (adjust to match current Forja color) */
--accent: #e85d3f  /* or the app's primary color */
--accent-glow: rgba(232, 93, 63, 0.15)
```

**Typography:**

- Heading: Geist or Inter — weights 600/700
- Body: Inter — weight 400/500
- Code/Terminal: JetBrains Mono or Geist Mono

---

## ✅ Pre-Launch Checklist

- [ ] Demo GIF/video recorded (terminal + Claude Code in action)
- [ ] Screenshots of all features
- [ ] OG image 1200x630 for Twitter/LinkedIn
- [ ] GitHub star count working (shields.io)
- [ ] Download detects OS (Linux vs macOS)
- [ ] Link to GitHub Release page with binaries
- [ ] Lighthouse score >90
- [ ] Tested on mobile

---

**Last Updated:** 02/03/2026
