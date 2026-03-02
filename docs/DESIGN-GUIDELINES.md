# Forja - Design Guidelines

> Design system — native dark mode, developer aesthetic

**Date:** 02/03/2026
**Version:** 2.0
**UI Stack:** React + Tailwind CSS + shadcn/ui

---

## 🎨 Design Philosophy

### Principles

1. **Terminal-native aesthetic:** The app is a development environment — it should feel like tools developers love (VS Code, Warp, Linear)
2. **Dark mode first:** It's not an option, it's the default. Light mode may come later.
3. **Density without clutter:** Information-dense like VS Code, but without visual noise
4. **Visual performance:** No unnecessary animations. Fast transitions (150ms maximum)
5. **Total consistency:** Same colors, same spacing, same components

### Visual Style

- ✅ Dark & Technical (Warp, VS Code, Raycast)
- Mood: **Professional, powerful, focused**
- Ideal reference: *"VS Code meets Warp Terminal meets Linear"*

---

## 🎨 Color System

### Main Palette

```css
/* Base — True black, not gray */
--background: #0a0a0a        /* App background */
--background-deep: #000000   /* Titlebar, deep sidebar */
--surface: #111111           /* Panels, cards */
--surface-raised: #1a1a1a    /* Hover states, tooltips */
--surface-border: #222222    /* Default borders */

/* Text */
--text-primary: #f0f0f0      /* Main text */
--text-secondary: #888888    /* Labels, captions */
--text-muted: #555555        /* Placeholders, disabled */

/* Brand / Accent */
--accent: #e85d3f            /* Primary CTA, active selection */
--accent-hover: #d44d2f      /* Accent hover */
--accent-muted: #2a1510      /* Subtle accent background */
--accent-glow: rgba(232, 93, 63, 0.12)  /* Glow effects */

/* Semantic */
--success: #22c55e
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6

/* Git Diff Colors */
--diff-added: #166534         /* Added line background */
--diff-added-text: #22c55e    /* Added line text */
--diff-removed: #7f1d1d       /* Removed line background */
--diff-removed-text: #ef4444  /* Removed line text */
--diff-modified: #78350f      /* Modified line background */
```

### Tailwind Integration

Add to `tailwind.config.ts`:

```typescript
colors: {
  brand: {
    DEFAULT: '#e85d3f',
    hover: '#d44d2f',
    muted: '#2a1510',
  },
  surface: {
    DEFAULT: '#111111',
    raised: '#1a1a1a',
    border: '#222222',
  },
  app: {
    bg: '#0a0a0a',
    deep: '#000000',
  }
}
```

### Color Usage Guide

| Context | Class |
|---------|-------|
| App background | `bg-[#0a0a0a]` |
| Sidebar | `bg-black` |
| Panel/card | `bg-[#111111]` |
| Item hover | `bg-[#1a1a1a]` |
| Default border | `border-[#222222]` |
| Primary text | `text-[#f0f0f0]` |
| Secondary text | `text-[#888888]` |
| Active/selected item | `bg-brand-muted border-l-2 border-brand` |
| CTA button | `bg-brand text-white` |

---

## ✍️ Typography

### Font Families

```css
/* UI — headings and labels */
font-family: 'Geist', 'Inter', system-ui, sans-serif;

/* Body text */
font-family: 'Geist', 'Inter', system-ui, sans-serif;

/* Terminal and code */
font-family: 'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace;
```

**Google Fonts / CDN:**

- Geist (Vercel): https://vercel.com/font
- Alternative: Inter (more common, safe fallback)

### Font Sizes

```
text-xs   → 11px  (metadata, keyboard shortcuts)
text-sm   → 13px  (sidebar labels, captions)
text-base → 14px  (app default body — dense like VS Code)
text-lg   → 16px  (panel titles)
text-xl   → 18px  (section headings)
text-2xl  → 22px  (workspace titles)
```

**Note:** The app base size is 14px, not 16px — higher information density, IDE standard.

### Font Weights

```
font-normal   → Labels, body
font-medium   → File titles, active tabs
font-semibold → Workspace names, headings
font-mono     → Terminal, code, file paths
```

### xterm.js Font

```typescript
// Terminal configuration
const terminal = new Terminal({
  fontFamily: '"Geist Mono", "JetBrains Mono", "Fira Code", monospace',
  fontSize: 13,
  lineHeight: 1.4,
  letterSpacing: 0,
  cursorBlink: true,
  cursorStyle: 'block',
})
```

---

## 📐 Spacing Scale

Base: **4px** (Tailwind default)

```
1  → 4px   (micro — gap between icon and label)
2  → 8px   (badge padding, small gap)
3  → 12px  (list item padding)
4  → 16px  (panel inner padding)
5  → 20px  (gap between minor sections)
6  → 24px  (card padding)
8  → 32px  (section separation)
```

### Layout Sizes

```
Sidebar width:        240px (desktop), collapsible to 48px (icons)
Titlebar height:      40px
Tab bar height:       36px
Status bar height:    24px
Minimum panel:        200px
```

---

## 🔲 Border Radius

```
rounded-sm   → 4px   (badges, tags, inputs)
rounded      → 6px   (small buttons)
rounded-md   → 8px   (buttons, smaller cards)
rounded-lg   → 12px  (cards, floating panels)
rounded-xl   → 16px  (modals)
rounded-full → pill  (status badges, avatars)
```

---

## 🌑 Shadows

```css
/* App shadows — subtle in dark mode */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.6);

/* Accent glow (use sparingly) */
--shadow-brand: 0 0 20px rgba(232, 93, 63, 0.15);
```

---

## 🖼 Main App Layout

```
┌────────────────────────────────────────────────────┐
│  Titlebar (40px) — Logo + Workspace switcher + Controls │
├──────────┬─────────────────────────────────────────┤
│          │  Tab Bar (36px) — Terminal tabs          │
│ Sidebar  ├─────────────────────────────────────────┤
│ (240px)  │                                         │
│          │           Main Panel                    │
│ FileTree │        (Terminal / FileViewer           │
│          │          / GitDiff)                     │
│          │                                         │
├──────────┴─────────────────────────────────────────┤
│  Status Bar (24px) — Branch, status, info          │
└────────────────────────────────────────────────────┘
```

### CSS Base

```css
.app-layout {
  display: grid;
  grid-template-rows: 40px 1fr 24px;
  grid-template-columns: 240px 1fr;
  height: 100vh;
  background: #0a0a0a;
  color: #f0f0f0;
}
```

---

## 📦 Component Guidelines (shadcn/ui)

### Dark Theme Adaptations

Configure shadcn's `components.json` with dark theme:

```json
{
  "style": "default",
  "rsc": false,
  "tailwind": { "baseColor": "neutral" },
  "aliases": { "components": "@/components" }
}
```

### Forja Core Components

**Tab Bar (Terminal Tabs):**

```jsx
// Custom — do not use shadcn Tabs for terminal tabs
// Reason: we need specific behavior (close, reorder)
<div className="flex h-9 items-center bg-black border-b border-[#222] gap-1 px-2">
  <button className="flex items-center gap-1.5 px-3 h-7 rounded text-sm
    bg-[#1a1a1a] text-[#f0f0f0] border border-[#333]">
    <span>bash</span>
    <X className="h-3 w-3 text-[#888]" />
  </button>
</div>
```

**File Tree Item:**

```jsx
<div className="flex items-center gap-1.5 px-3 py-1 text-sm cursor-pointer
  text-[#ccc] hover:bg-[#1a1a1a] rounded-sm
  data-[active=true]:bg-brand-muted data-[active=true]:text-[#f0f0f0]">
  <FileIcon className="h-3.5 w-3.5 text-[#888] shrink-0" />
  <span className="truncate font-mono">filename.ts</span>
</div>
```

**Git Status Badge:**

```jsx
// M = modified, A = added, D = deleted
const statusColors = {
  M: 'text-yellow-400',
  A: 'text-green-400',
  D: 'text-red-400',
  '?': 'text-gray-500',
}
<span className={cn('text-xs font-mono', statusColors[status])}>{status}</span>
```

**Button (primary):**

```jsx
<Button className="bg-brand hover:bg-brand-hover text-white">
  Open Workspace
</Button>
```

**Panel Header:**

```jsx
<div className="flex items-center justify-between px-4 py-2
  border-b border-[#222] bg-[#0f0f0f]">
  <span className="text-xs font-medium text-[#888] uppercase tracking-wide">
    Explorer
  </span>
  <button className="text-[#555] hover:text-[#f0f0f0] transition-colors">
    <Plus className="h-3.5 w-3.5" />
  </button>
</div>
```

---

## 🎭 Animations & Transitions

```css
/* Micro-interactions */
transition: all 100ms ease;   /* hover states */

/* Normal */
transition: all 150ms ease;   /* sidebar expansion, tabs */

/* Avoid: */
/* ❌ Animations >200ms in app UI (feels slow) */
/* ❌ Spring physics in layout (this is not a consumer app) */
/* ❌ Skeleton loaders for operations <100ms */
```

**Tailwind classes:**

```
transition-colors duration-100   → item hover
transition-all duration-150      → open/close panels
```

---

## 🖥 Electron-specific

### Custom Titlebar (frameless window)

```typescript
// main.ts
new BrowserWindow({
  frame: false,          // Remove native titlebar
  titleBarStyle: 'hidden', // macOS: native control buttons
  trafficLightPosition: { x: 12, y: 12 }, // macOS
})
```

```jsx
// Titlebar Component
<div className="h-10 bg-black flex items-center
  [-webkit-app-region:drag]   /* Window drag area */
  select-none">
  {/* macOS: space for control buttons */}
  <div className="w-16 [-webkit-app-region:no-drag]" />
  <span className="text-sm font-medium text-[#888]">Forja</span>
</div>
```

### Custom Scrollbar

```css
/* Thin scrollbars VS Code style */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: #444; }
```

---

## 🔗 Design References

1. **Warp** — https://warp.dev
   - Terminal aesthetic, dark mode
   - Command palette style

2. **VS Code** — https://code.visualstudio.com
   - Sidebar + panel layout
   - Information density, typography

3. **Linear** — https://linear.app
   - Dark mode excellence
   - Subtle micro-interactions

4. **Superset.sh** — https://superset.sh
   - Direct reference for similar product
   - Workspace with multiple branches

5. **Raycast** — https://raycast.com
   - Polished interactions, dark mode

---

## ✅ Checklist

### Setup

- [ ] Geist font installed (or Inter as fallback)
- [ ] Tailwind configured with custom colors
- [ ] shadcn/ui initialized with dark theme
- [ ] Scrollbar CSS applied globally
- [ ] Frameless titlebar configured

### Development

- [ ] All text follows the typography scale
- [ ] Borders using `--surface-border` (#222)
- [ ] Hover states on all interactive elements
- [ ] Selected/active item visually distinct
- [ ] Terminal using correct mono font

### Before Release

- [ ] Consistent visual on Linux (GTK) and macOS
- [ ] No elements with accidental white background
- [ ] Styled scrollbars visible
- [ ] Titlebar drag working on both OSes

---

**Last Updated:** 02/03/2026
