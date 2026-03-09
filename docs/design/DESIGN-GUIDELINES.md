# Forja - Design Guidelines

> Base design system for consistent implementation

**Date:** 02/22/2025
**Version:** 1.0
**UI Stack:** shadcn/ui + Tailwind CSS + Electron

---

## 🎨 Design Philosophy

### Principles

1. **Terminal-native:** Looks like a dev app, not a generic SaaS
2. **Dark-first:** Dark mode is the default, light mode is optional (may not exist in MVP)
3. **Clarity over decoration:** Content > visual ornaments
4. **High contrast, low noise:** Readable text, recessed UI
5. **Density matters:** Devs want to see more information on screen, not less

### Visual Style

**Choice:**

- [X] Dark & Technical (Raycast, Warp, Zed)
- [ ] Clean & Minimal (Linear, Resend)
- [ ] Colorful & Playful (Notion, Canva)
- [ ] Gradient-heavy (Stripe, Modern SaaS)

**Mood:** *"High-quality terminal — not Electron, not Web"*

**Visual References:**

1. **Warp** — https://warp.dev (modern terminal, output blocks, dark-first)
2. **Raycast** — https://raycast.com (excellent dark mode, density, polish)
3. **Zed** — https://zed.dev (minimal, performance-focused, dev tool aesthetic)
4. **Linear** — https://linear.app (consistency, spacing, typography)
5. **Fig** (discontinued, but visual reference for terminal UX)

---

## 🎨 Color System

### Primary Palette (Catppuccin Mocha — dark default)

```css
/* Background Stack */
--bg-base: #1e1e2e;         /* Catppuccin Base — main background */
--bg-elevated: #181825;     /* Catppuccin Mantle — sidebars, panels */
--bg-card: #313244;         /* Catppuccin Surface 0 — cards, list items */
--bg-hover: #45475a;        /* Catppuccin Surface 1 — hover states */
--bg-active: #585b70;       /* Catppuccin Surface 2 — selected/active item */

/* Foreground */
--fg-primary: #cdd6f4;      /* Catppuccin Text — main text */
--fg-secondary: #a6adc8;    /* Catppuccin Subtext 0 — secondary text, labels */
--fg-muted: #6c7086;        /* Catppuccin Overlay 0 — disabled text, placeholders */
--fg-subtle: #bac2de;       /* Catppuccin Subtext 1 — subtle foreground variation */

/* Brand Color */
--brand: #cba6f7;           /* Catppuccin Mauve — accent */
--brand-hover: #b4befe;     /* Catppuccin Lavender — hover */
--brand-subtle: #251e3a;    /* dark mauve background for badges and highlights */
--brand-border: #585b70;    /* Catppuccin Surface 2 — border for brand elements */

/* Borders */
--border-default: #313244;  /* Catppuccin Surface 0 — default borders */
--border-subtle: #181825;   /* Catppuccin Mantle — subtle borders */
--border-strong: #45475a;   /* Catppuccin Surface 1 — borders on focus/hover */
```

### Semantic Colors

```css
/* Success */
--success: #a6e3a1;         /* Catppuccin Green */
--success-bg: #1a2a1e;      /* dark green background */
--success-border: #2d4a35;  /* green border */

/* Warning */
--warning: #f9e2af;         /* Catppuccin Yellow */
--warning-bg: #2a2520;      /* dark yellow background */
--warning-border: #4a3d25;  /* yellow border */

/* Error */
--error: #f38ba8;           /* Catppuccin Red */
--error-bg: #2a1520;        /* dark red background */
--error-border: #4a2535;    /* red border */

/* Info */
--info: #89b4fa;            /* Catppuccin Blue */
--info-bg: #1a2030;         /* dark blue background */
--info-border: #254065;     /* blue border */
```

### Terminal Colors (for Claude Code output)

```css
/* ANSI colors inside xterm.js terminal */
--term-background: #1e1e2e;  /* Catppuccin Base */
--term-foreground: #cdd6f4;  /* Catppuccin Text */
--term-cursor: #f5e0dc;      /* Catppuccin Rosewater */
--term-selection-bg: #313244; /* Catppuccin Surface 0 */

/* ANSI Standard */
--term-black: #45475a;       /* Catppuccin Surface 1 */
--term-red: #f38ba8;         /* Catppuccin Red */
--term-green: #a6e3a1;       /* Catppuccin Green */
--term-yellow: #f9e2af;      /* Catppuccin Yellow */
--term-blue: #89b4fa;        /* Catppuccin Blue */
--term-magenta: #f5c2e7;     /* Catppuccin Pink */
--term-cyan: #94e2d5;        /* Catppuccin Teal */
--term-white: #a6adc8;       /* Catppuccin Subtext 0 */

/* ANSI Bright */
--term-bright-black: #585b70;  /* Catppuccin Surface 2 */
--term-bright-white: #bac2de;  /* Catppuccin Subtext 1 */
```

### Syntax Highlighting (Shiki — base theme)

Use **"catppuccin-mocha"** theme as base for code blocks rendered in React panel.

```css
/* Main tokens (Catppuccin Mocha palette) */
--syntax-keyword: #cba6f7;   /* Catppuccin Mauve — keywords */
--syntax-string: #a6e3a1;    /* Catppuccin Green — strings */
--syntax-number: #fab387;    /* Catppuccin Peach — numbers */
--syntax-function: #89b4fa;  /* Catppuccin Blue — functions */
--syntax-comment: #6c7086;   /* Catppuccin Overlay 0 — comments */
--syntax-variable: #cdd6f4;  /* Catppuccin Text — variables */
--syntax-type: #f9e2af;      /* Catppuccin Yellow — types */
```

### Tailwind Config

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      brand: {
        DEFAULT: '#cba6f7',
        hover: '#b4befe',
        subtle: '#251e3a',
        border: '#585b70',
      },
      ctp: {
        crust: '#11111b',
        mantle: '#181825',
        base: '#1e1e2e',
        surface0: '#313244',
        surface1: '#45475a',
        surface2: '#585b70',
        overlay0: '#6c7086',
        overlay1: '#7f849c',
        overlay2: '#9399b2',
        subtext0: '#a6adc8',
        subtext1: '#bac2de',
        text: '#cdd6f4',
        rosewater: '#f5e0dc',
        flamingo: '#f2cdcd',
        pink: '#f5c2e7',
        mauve: '#cba6f7',
        red: '#f38ba8',
        maroon: '#eba0ac',
        peach: '#fab387',
        yellow: '#f9e2af',
        green: '#a6e3a1',
        teal: '#94e2d5',
        sky: '#89dceb',
        sapphire: '#74c7ec',
        blue: '#89b4fa',
        lavender: '#b4befe',
      },
    }
  }
}
```

### Color Usage Guide

| Use Case | Tailwind Class |
|---|---|
| Main background | `bg-ctp-base` |
| Sidebar / panels | `bg-ctp-mantle` |
| Cards / list items | `bg-ctp-surface0` |
| Hover state | `bg-ctp-surface1` |
| Selected item | `bg-ctp-surface0` + `border-l-2 border-brand` |
| Main text | `text-ctp-text` |
| Secondary text | `text-ctp-overlay1` |
| Disabled text | `text-ctp-overlay1` (with opacity) |
| Default border | `border-ctp-surface0` |
| Hover border | `border-ctp-surface1` |
| Brand/accent | `text-brand` / `bg-brand` |

---

## ✏️ Typography

### Font Families

**Main UI (headings and labels):**

```css
font-family: 'Geist', 'Inter', system-ui, -apple-system, sans-serif;
```

**Body / General text:**

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

**Terminal / Code (xterm.js and code blocks):**

```css
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace;
```

**Recommended Google Fonts:**

- Geist (Vercel) — modern, readable, perfect for developer tools
- Inter — classic fallback
- JetBrains Mono — best-in-class monospace for code

### Font Sizes & Weights

**App UI:**

```css
/* Section title / pane header */
font-size: 0.75rem;    /* 12px */
font-weight: 600;      /* Semibold */
letter-spacing: 0.08em;
text-transform: uppercase;  /* "PROJECTS" label style */
color: #a6adc8;        /* Catppuccin Subtext 0 */

/* Item label */
font-size: 0.875rem;   /* 14px */
font-weight: 400;

/* Main content */
font-size: 0.875rem;   /* 14px */
font-weight: 400;

/* Metadata / timestamps */
font-size: 0.75rem;    /* 12px */
font-weight: 400;
color: #6c7086;        /* Catppuccin Overlay 0 - muted */
```

**Rendered Markdown (React panel):**

```css
/* H1 in markdown */
font-size: 1.5rem;     /* 24px */
font-weight: 700;

/* H2 in markdown */
font-size: 1.25rem;    /* 20px */
font-weight: 600;

/* H3 in markdown */
font-size: 1.125rem;   /* 18px */
font-weight: 600;

/* Paragraph */
font-size: 0.9375rem;  /* 15px */
line-height: 1.7;
```

**Terminal (xterm.js):**

```css
font-size: 13px;       /* terminal default */
font-family: JetBrains Mono;
line-height: 1.4;
```

**Tailwind Classes for UI:**

```
text-xs      → 12px (labels, metadata)
text-sm      → 14px (default UI, list items)
text-base    → 16px (content, descriptions)
font-normal  → 400
font-medium  → 500
font-semibold → 600
font-bold    → 700
```

---

## 📐 Spacing Scale

Base: **4px** (Tailwind default)

```
1  → 4px    (0.25rem)  — micro gaps
2  → 8px    (0.5rem)   — intra-component
3  → 12px   (0.75rem)  — compact item padding
4  → 16px   (1rem)     — default padding
5  → 20px   (1.25rem)
6  → 24px   (1.5rem)   — card padding
8  → 32px   (2rem)     — gaps between sections
10 → 40px   (2.5rem)
12 → 48px   (3rem)
16 → 64px   (4rem)
```

### Component Padding Guidelines

**Sidebar / side panel:**

```css
padding: 0.75rem 1rem;   /* py-3 px-4 */
```

**List items (Project Selector):**

```css
padding: 0.5rem 0.75rem;  /* py-2 px-3 */
```

**Pane header:**

```css
padding: 0.5rem 1rem;    /* py-2 px-4 */
height: 40px;
```

**Buttons (app UI):**

```css
/* Small */
padding: 0.375rem 0.75rem; /* py-1.5 px-3 */
height: 32px;

/* Default */
padding: 0.5rem 1rem;    /* py-2 px-4 */
height: 36px;
```

**Git header bar:**

```css
padding: 0.25rem 0.75rem; /* py-1 px-3 */
height: 32px;
```

---

## 🔲 Border Radius

```css
/* None (terminal areas) */
border-radius: 0;

/* Minimal (badges, tags, status pills) */
border-radius: 0.25rem;   /* 4px — rounded-sm */

/* Default (buttons, inputs, menu items) */
border-radius: 0.5rem;    /* 8px — rounded-md */

/* Cards, floating panels */
border-radius: 0.75rem;   /* 12px — rounded-lg */

/* Modals, dialogs */
border-radius: 1rem;      /* 16px — rounded-xl */

/* Pills, avatars */
border-radius: 9999px;    /* rounded-full */
```

**Usage in app:**

- Terminal area (xterm.js): `rounded-none` (terminal has no radius)
- Project Selector dialog: `rounded-xl`
- Buttons: `rounded-md`
- Status badges: `rounded-full`
- Code blocks in markdown: `rounded-lg`
- Screenshot items in list: `rounded-md`

---

## 🌑 Shadows

```css
/* None (flat elements like list items) */
box-shadow: none;

/* Subtle (hover on list items) */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
/* shadow-sm */

/* Cards */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
/* shadow-md */

/* Dialogs, modals */
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
/* shadow-xl */

/* Popover, dropdown */
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
/* shadow-2xl */
```

**Dark mode — shadows are more pronounced (dark background hides less).**

---

## 📦 App Layout

### Main Structure

```
┌─────────────────────────────────────────────────┐
│  Git Header (32px) — branch + modified files    │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│  Claude Code Pane    │  Markdown Preview        │
│  (xterm.js)          │  (React renderer)        │
│  ~60% of width       │  ~40% of width           │
│                      │                          │
│                      │                          │
└──────────────────────┴──────────────────────────┘
│  Status Bar (24px) — state, last activity       │
└─────────────────────────────────────────────────┘
```

**Variants:**

- Expanded Claude Pane (no preview): fullwidth
- Expanded Preview: toggle/keyboard shortcut
- With project sidebar (modal/overlay): not fixed

### Component Dimensions

```
Git Header: height 32px, bg-ctp-mantle, border-b border-ctp-surface0
Pane Header: height 40px, bg-ctp-mantle, border-b border-ctp-surface0
Status Bar: height 24px, bg-ctp-base, border-t border-ctp-surface0
Split resizer: width 4px, bg-ctp-surface0, hover: bg-brand
```

### Window Chrome (Electron)

- Native decorations: **macOS** — use default decorations (traffic lights)
- Titlebar background: `bg-ctp-base` (match app)
- Linux: simple or custom decorations depending on WM

---

## 📦 Component Guidelines (shadcn/ui)

### Buttons

**In desktop app context (compact):**

```jsx
/* Primary action (e.g.: new project) */
<Button size="sm" className="bg-brand hover:bg-brand-hover text-white">
  New Project
</Button>

/* Secondary action */
<Button size="sm" variant="outline" className="border-ctp-surface1 text-ctp-subtext1">
  Cancel
</Button>

/* Icon action (toolbar) */
<Button size="icon" variant="ghost" className="h-8 w-8 text-ctp-overlay1 hover:text-ctp-text">
  <Settings className="h-4 w-4" />
</Button>
```

**Sizes in app:**

- `size="sm"` → default for app UI (32-36px height)
- `size="icon"` → toolbar and inline action buttons
- `size="default"` → modals and dialogs

---

### Project Selector (Custom Component)

```jsx
/* Project item in list */
<div className="
  flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer
  hover:bg-ctp-surface0 transition-colors
  border-l-2 border-transparent
  data-[selected]:border-brand data-[selected]:bg-ctp-surface0
">
  <FolderIcon className="h-4 w-4 text-ctp-overlay1 flex-shrink-0" />
  <div className="flex-1 min-w-0">
    <p className="text-sm text-ctp-text truncate">project-name</p>
    <p className="text-xs text-ctp-overlay1 truncate">/absolute/path</p>
  </div>
  <span className="text-xs text-ctp-overlay1">2h ago</span>
</div>
```

---

### Git Header Bar

```jsx
<div className="
  h-8 flex items-center gap-4 px-4
  bg-ctp-mantle border-b border-ctp-surface0
  text-xs text-ctp-overlay1
">
  {/* Branch */}
  <div className="flex items-center gap-1.5">
    <GitBranchIcon className="h-3.5 w-3.5" />
    <span className="text-ctp-subtext1">main</span>
  </div>

  {/* Separator */}
  <div className="h-4 w-px bg-ctp-surface0" />

  {/* Modified files */}
  <div className="flex items-center gap-1.5 text-warning">
    <span>M</span>
    <span>3 files</span>
  </div>
</div>
```

---

### Markdown Renderer

**Styles for rendered elements:**

```css
/* Headings */
.markdown h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #cdd6f4;
  border-bottom: 1px solid #313244;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.markdown h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #cdd6f4;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

/* Paragraphs */
.markdown p {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: #bac2de;
  margin-bottom: 0.75rem;
}

/* Inline code */
.markdown code:not(pre code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  background: #313244;
  color: #cba6f7;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

/* Code blocks */
.markdown pre {
  background: #11111b;
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}

/* Lists */
.markdown ul { list-style: disc; padding-left: 1.5rem; }
.markdown ol { list-style: decimal; padding-left: 1.5rem; }
.markdown li { color: #bac2de; margin-bottom: 0.25rem; }

/* Blockquote */
.markdown blockquote {
  border-left: 3px solid #cba6f7;
  padding-left: 1rem;
  color: #6c7086;
  font-style: italic;
}

/* Table */
.markdown table { width: 100%; border-collapse: collapse; }
.markdown th { background: #313244; color: #cdd6f4; }
.markdown td, .markdown th { border: 1px solid #313244; padding: 0.5rem 0.75rem; }
.markdown tr:nth-child(even) td { background: #181825; }

/* Horizontal rule */
.markdown hr { border: none; border-top: 1px solid #313244; margin: 1.5rem 0; }
```

---

### Toasts / Notifications

```jsx
/* Success */
toast({
  title: "Session started",
  description: "Claude Code is running in project-x",
  className: "bg-ctp-mantle border-ctp-surface0 text-ctp-text"
})

/* Error */
toast({
  variant: "destructive",
  title: "Claude CLI not found",
  description: "Install with: npm install -g @anthropic-ai/claude-code",
})
```

**Position:** Bottom-right
**Duration:** 4 seconds for info, permanent for critical errors

---

### Badges / Status Indicators

```jsx
/* Branch badge */
<Badge className="bg-ctp-surface0 text-ctp-subtext1 border border-ctp-surface1">
  main
</Badge>

/* Modified files */
<Badge className="bg-warning/10 text-warning border border-warning/20">
  3M
</Badge>

/* Status — running */
<Badge className="bg-success/10 text-success border border-success/20">
  ● Active
</Badge>

/* Status — error */
<Badge className="bg-error/10 text-error border border-error/20">
  ● Error
</Badge>
```

---

## 🎭 Animations & Transitions

### Transition Durations

```css
/* Micro-interactions (hover, focus) */
transition: all 100ms ease;

/* Default UI (sidebar, accordion) */
transition: all 150ms ease;

/* Modals, dialogs */
transition: all 200ms ease;

/* Entry animations */
transition: all 300ms ease;
```

**Tailwind:**

```
duration-100  → hover states
duration-150  → app default
duration-200  → modals
duration-300  → entry animations
ease-in-out   → default
```

### Common Animations

**Hover on list items:**

```jsx
<div className="hover:bg-ctp-surface0 transition-colors duration-100" />
```

**Dialog/Modal (shadcn/ui default):**

- Fade in + scale up (already included in shadcn)

**Split pane resize:**

- `transition: none` during resize (performance)

**Skeleton loading:**

```jsx
<div className="animate-pulse bg-ctp-surface0 rounded h-4 w-3/4" />
```

---

## ♿ Accessibility

### Focus States

```jsx
/* All interactive elements need visible focus */
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-ctp-base">
  Action
</button>
```

### Keyboard Navigation

- Project Selector: Arrow keys to navigate, Enter to select, Esc to close
- Split pane: Keyboard shortcut to resize (Cmd+\)
- All critical actions: documented keyboard shortcut

### ARIA

```jsx
/* Terminal pane */
<div role="region" aria-label="Claude Code Terminal" />

/* Markdown pane */
<div role="region" aria-label="Markdown Preview" />

/* Git header */
<div role="status" aria-live="polite" aria-label="Git status" />
```

---

## 🎯 Icon System

### Lucide React (Recommended)

```bash
npm install lucide-react
```

**Main app icons:**

```jsx
import {
  FolderOpen,    // Open project
  GitBranch,     // Current branch
  FileCode,      // Modified files
  Terminal,      // Terminal pane
  FileText,      // Preview pane
  Settings,      // Settings
  ChevronRight,  // Navigation
  Plus,          // New project
  RefreshCw,     // Restart session
  Copy,          // Copy code
  Check,         // Success on copy
  AlertCircle,   // Error
  Circle,        // Status indicator
} from "lucide-react"
```

**Sizes:**

- Toolbar icons: `h-4 w-4` (16px)
- Status indicators: `h-3 w-3` (12px)
- Modal/dialog icons: `h-5 w-5` (20px)

**Stroke Width:**

- Default: `strokeWidth={1.5}` (lighter for dark mode)
- Emphasis: `strokeWidth={2}`

---

## 🌑 Dark Mode

The app is **dark-only** in MVP. There is no theme toggle.

**Implementation (Electron + React):**

```jsx
// app/layout.tsx or main.tsx
// Apply 'dark' class permanently to HTML

document.documentElement.classList.add('dark')

// Or via Tailwind config:
// darkMode: 'class'
// And apply className="dark" to <html>
```

**CSS Variables (globals.css):**

```css
:root {
  --background: 30 30 46;    /* #1e1e2e Catppuccin Base */
  --foreground: 205 214 244; /* #cdd6f4 Catppuccin Text */
  --border: 49 50 68;        /* #313244 Catppuccin Surface 0 */
  /* etc */
}
```

---

## 📐 Design Checklist

### Before Implementation

- [ ] Palette defined (Catppuccin Mocha + brand mauve)
- [ ] Typography scale defined (Geist/Inter + JetBrains Mono)
- [ ] shadcn/ui components installed
- [ ] Shiki configured for syntax highlighting (catppuccin-mocha theme)
- [ ] xterm.js with custom Catppuccin Mocha theme

### During Development

- [ ] Using design tokens (CSS variables)
- [ ] Consistent Catppuccin Mocha palette (use ctp-* classes)
- [ ] Visible focus states on all interactive elements
- [ ] Text with adequate contrast (WCAG AA)
- [ ] Icons with stroke-width=1.5 (lighter in dark)

### Before Launch

- [ ] App tested on macOS (Sequoia + Ventura)
- [ ] App tested on Linux (Ubuntu/Fedora)
- [ ] Readable font sizes (min. 12px in UI)
- [ ] Terminal with configured mono font
- [ ] Smooth transitions (no visual jank)
- [ ] Loading states implemented (skeleton or spinner)
- [ ] Error states with clear message

---

## 📝 Final Notes

### About the Brand Color (Mauve)

Mauve (#cba6f7) as accent color (from Catppuccin Mocha) represents:

- Forja's identity within the Catppuccin aesthetic
- Creative focus and premium quality
- Differentiates from blue (VSCode) and green (typical terminal)

Use sparingly: selected items, CTAs, important highlights. The Catppuccin Mocha theme provides a cohesive dark palette that works well for developer tools.

### About the Visual Stack

shadcn/ui as base ensures:

- Accessible components by default
- Easy customization via Tailwind
- Consistency between elements

Don't use Material UI, Chakra UI or Ant Design — they're too heavy and opinionated for this visual profile.

### About the Terminal

xterm.js needs custom theme to match the Catppuccin Mocha palette. Configure via `ITheme` from xterm:

```ts
const termTheme: ITheme = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  cursorAccent: '#11111b',
  selectionBackground: '#313244',
  black: '#45475a',
  red: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  blue: '#89b4fa',
  magenta: '#f5c2e7',
  cyan: '#94e2d5',
  white: '#a6adc8',
  brightBlack: '#585b70',
  brightWhite: '#bac2de',
}
```

---

**Last Updated:** 02/22/2025
**Maintainer:** Fernando Moreira
**References:** Warp, Raycast, Zed, Linear, Catppuccin (catppuccin.com)
