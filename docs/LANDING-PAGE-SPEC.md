# Forja - Landing Page Spec

> Structural specification for landing page (WITHOUT copy/text)

**Date:** 02/22/2025
**Type:** Open Source Tool Launch / Product Hunt
**Goal:** Downloads, GitHub stars, community

---

## 🎯 Landing Page Objectives

### Main Objective

Convert visitors into users who download Forja and/or star the repository on GitHub.

### Success Metrics

| Metric | Target | How to Measure |
|---|---|---|
| GitHub star click-through | > 15% | Plausible events |
| Download click-through | > 10% | Plausible events |
| Bounce rate | < 60% | Plausible |
| Scroll depth (50%) | > 70% | Plausible scroll tracking |

---

## 🎨 Design Principles

**Visual Style:** Dark, terminal aesthetics — Product Hunt meets developer tool

**Priorities:**

1. **Visual demo first** — show the product before explaining
2. **Developer-credible** — looks like it's made by devs, for devs
3. **Open source pride** — GitHub is the main CTA, not a form

**Visual References:**

- https://warp.dev (terminal product landing)
- https://zed.dev (developer tool, clean dark)
- https://linear.app (minimal, high-quality)
- https://raycast.com (dark, polished, demo-first)

---

## 📄 Page Structure

### MVP Version (minimal but effective)

```
1. Header/Nav
2. Hero (with visual demo)
3. Problem / Pain Points
4. Features (3-4 main ones)
5. Open Source CTA
6. Footer
```

**Estimated scroll:** 3-4 screenfuls (desktop), 5-6 (mobile)

---

## 🧱 Detailed Sections

### 1. HEADER/NAV

**Objective:** Minimal navigation without distracting from the main CTA.

**Elements:**

- Forja Logo (left) — icon + wordmark
- Links: [GitHub ↗] [Docs] [Releases]
- Primary CTA (right): "Download" or "Get Started"

**Layout:**

```
[Logo Forja]          [GitHub ↗] [Docs] [Releases]    [↓ Download]
```

**Behavior:**

- Sticky on scroll: Yes
- Background: Transparent → solid with backdrop blur on scroll
- Mobile: Logo + Download button only (no nav links)

**Specs:**

- Height: 64px desktop, 56px mobile
- Z-index: 100
- Blur: `backdrop-blur-md` on scroll

---

### 2. HERO

**Objective:** Show the product in action in 3 seconds. Sell the visual experience before any text.

**Mandatory elements:**

1. **Badge / Label:** Identifier like "Open Source" or "Built with Electron + React"
2. **Headline (H1):** Benefit-focused, short (max 8 words)
3. **Subheadline:** 1-2 sentences explaining what it is and who it's for
4. **CTAs:**
   - Primary: Download (with detected operating system icon)
   - Secondary: "View on GitHub →"
5. **Visual Demo:** Screenshot or animated GIF of the app in use

**Optional elements:**

- Trust line: "Free & Open Source · MIT License"
- Platform badges: macOS / Linux (with icons)

**Layout (Centered):**

```
┌─────────────────────────────────────────────┐
│                                             │
│  [Badge: Open Source]                       │
│                                             │
│         Headline in focus                   │
│       Explanatory subheadline               │
│                                             │
│    [↓ Download for macOS]  [GitHub →]       │
│                                             │
│    [Free & Open Source · MIT License]       │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │   [App Screenshot / GIF Demo]       │   │
│   │                                     │   │
│   └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Guidelines:**

- Screenshot: Real app with visible rendered markdown (not mockup)
- GIF: If possible, 3-5 seconds showing the transition from raw terminal → Forja
- Badge: Small, above the H1 (Raycast, Linear style)
- Download CTA: Detect visitor's OS (macOS arm64 vs Intel vs Linux)

**Specs:**

- Min-height: 85vh desktop, 75vh mobile
- Screenshot: Pronounced shadow, border-radius 12px, subtle border
- GIF/Video: Autoplay, muted, loop

---

### 3. PROBLEM / PAIN POINTS

**Objective:** Generate identification — "this is me using Claude Code in the terminal."

**Elements:**

- Headline: Phrased as a question or statement of pain
- 3 pain points with icon + title + short description
- Optional visual: Screenshot of the problem (illegible raw terminal)

**Layout:**

```
         [Headline: Describes the frustration]

┌────────────┐  ┌────────────┐  ┌────────────┐
│   Icon     │  │   Icon     │  │   Icon     │
│  Pain 1    │  │  Pain 2    │  │  Pain 3    │
│  Description│ │  Description│ │  Description│
└────────────┘  └────────────┘  └────────────┘
```

**Pain Points to communicate:**

1. **Illegible markdown** — Claude's output is raw in the terminal
2. **Loss of context** — Session disappears when closing the terminal
3. **Too many windows** — Terminal + editor + browser simultaneously

**Guidelines:**

- Casual language, not technical
- Specific, not generic ("raw markdown" > "bad interface")
- Simple icons (Lucide or similar)

**Specs:**

- Grid: 3 columns desktop, 1 column mobile
- Cards: no heavy border, subtle background (`bg-[#313244]/30`)
- Icons: 40x40px, stroke-based

---

### 4. FEATURES

**Objective:** Detail what Forja delivers differently — benefits, not technical specs.

**Elements:**

- 3-4 features with visual + title + description
- Inline app screenshots for each feature

**Features to show:**

**Feature 1: Enhanced Rendering**

- Visual: Screenshot showing rendered markdown vs raw terminal (before/after)
- Focus: Headers, lists, code blocks with syntax highlight

**Feature 2: Project-Based Sessions**

- Visual: Project Selector with recent projects
- Focus: Context organized by project, instant opening

**Feature 3: Git Context**

- Visual: Header with branch + modified files
- Focus: No need to open another terminal to check status

**(Optional) Feature 4: Built with Electron + React**

- Visual: Binary size vs Electron (comparative badge)
- Focus: Native performance, no packaged Chromium

**Layout (Alternating):**

```
[Screenshot Feature 1]     Feature 1 Text
                           Title
                           Description

Feature 2 Text             [Screenshot Feature 2]
Title
Description

[Screenshot Feature 3]     Feature 3 Text
```

**Guidelines:**

- Real app screenshots (not mockups)
- Before/after in Feature 1 (maximum visual impact)
- Short descriptions (2-3 sentences)

**Specs:**

- Screenshots: max-width 600px, shadow-lg, rounded-xl
- Alternating layout: 2 column grid desktop, stack mobile
- Padding between features: 80-100px

---

### 5. OPEN SOURCE CTA

**Objective:** Convert visitors into contributors and stargazers.

**Elements:**

- Closing headline
- GitHub stats (stars, forks, contributors) — via GitHub API or badge
- Buttons:
  - Primary: "⭐ Star on GitHub"
  - Secondary: "↓ Download"
- Message about contribution (invite to collaborate)

**Layout:**

```
┌────────────────────────────────────────────┐
│                                            │
│         [Closing headline]                 │
│       [Subheadline about open source]      │
│                                            │
│    [⭐ Stars: 0]  [🔀 Forks: 0]           │
│                                            │
│    [⭐ Star on GitHub]  [↓ Download]       │
│                                            │
│   "Built in public. PRs welcome."          │
│                                            │
└────────────────────────────────────────────┘
```

**Guidelines:**

- Background: Differentiated (subtle gradient or `bg-[#313244]/30`)
- Stars/Forks: Load dynamically via GitHub API (with fallback)
- Tone: Inviting, not corporate — "built in public", "hack it"

**Specs:**

- Full-width section
- Padding: 100px top/bottom
- CTA button: 56px height, large

---

### 6. FOOTER

**Objective:** Useful links and credits.

**Elements:**

- Forja Logo (left)
- Links: [GitHub] [Releases] [Docs] [License]
- Credit: "Made with ♥ by Fernando Moreira"
- Stack disclosure: "Built with Electron + React + TypeScript"

**Layout:**

```
[Logo Forja]   GitHub  Releases  Docs  License    Twitter/X

Made by Fernando Moreira · Built with Electron + React + TypeScript
```

**Specs:**

- Padding: 40px top/bottom
- Font-size: 14px, opacity 0.6
- Background: Subtle (#11111b — Catppuccin Mocha Crust, one tone darker than main)

---

## 📱 Mobile Behavior

### Main Adaptations

**Hero:**

- Vertical stack (text → screenshot)
- Full-width buttons
- Screenshot with 100% width (without excessive lateral padding)
- Reduced H1 font-size (32-36px vs 48-56px desktop)

**Problem:**

- 3 column grid → vertical stack (1 column)
- Pain points in accordion (optional to save scroll)

**Features:**

- Alternating layout → always stack (screenshot above, text below)
- Screenshots with 100% width

**Nav:**

- Logo + Download button only
- No nav links (hamburger unnecessary for 3 links)

**Specs:**

- Breakpoint: 768px
- Touch targets: min 44x44px
- Minimum font-size: 16px

---

## 🎨 Design Tokens

### Base Colors

```css
/* Background stack (Catppuccin Mocha) */
--bg-primary: #1e1e2e      /* Base */
--bg-secondary: #181825    /* Mantle */
--bg-subtle: #313244       /* Surface 0 */

/* Foreground (Catppuccin Mocha) */
--fg-primary: #cdd6f4      /* Text */
--fg-secondary: #a6adc8    /* Subtext 0 */
--fg-muted: #6c7086        /* Overlay 0 */

/* Brand (Catppuccin Mauve) */
--brand: #cba6f7           /* Mauve */
--brand-hover: #b4befe     /* Lavender */
--brand-muted: #585b70     /* Surface 2 */

/* Borders (Catppuccin Mocha) */
--border: #313244          /* Surface 0 */
--border-subtle: #181825   /* Mantle */

/* Semantic (Catppuccin Mocha) */
--success: #a6e3a1         /* Green */
--error: #f38ba8           /* Red */
```

### Typography

**Headings:**

- H1: 48-56px desktop / 32-40px mobile
- H2: 36-42px desktop / 28-32px mobile
- H3: 24px

**Body:**

- Base: 16-18px, line-height 1.6
- Small: 14px

**Font Stack:**

- Display: Geist or Inter (headings)
- Body: Inter or system-ui
- Code: JetBrains Mono or Geist Mono

**Tailwind:**

```
font-geist or font-inter for headings
font-mono for inline code snippets
```

### Spacing Scale

```
4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128px
```

### Border Radius

```
sm: 4px   → badges, tags
md: 8px   → buttons, inputs
lg: 12px  → cards
xl: 16px  → screenshots
2xl: 24px → hero container
```

### Shadows

```
sm: 0 1px 2px rgba(0,0,0,0.5)
md: 0 4px 6px rgba(0,0,0,0.4)
lg: 0 10px 15px rgba(0,0,0,0.5)
screenshot: 0 25px 50px rgba(0,0,0,0.6)  /* dramatic shadow for screenshots */
```

---

## 🎯 CTA Hierarchy

### Primary CTA (Main Goal)

**Text:** "↓ Download for macOS" (or Linux)
**Placement:** Hero + Open Source CTA section
**Style:** Background brand color (Catppuccin Mauve #cba6f7), large (48-56px height)

### Secondary CTA (Alternative)

**Text:** "⭐ Star on GitHub" or "View on GitHub →"
**Placement:** Hero (next to primary) + Open Source section
**Style:** Outline button, border `#45475a` (Catppuccin Mocha Surface 1)

### Tertiary CTA (Low Priority)

**Text:** Navigation links (Docs, Releases)
**Placement:** Header + Footer
**Style:** Text link, opacity 0.7

---

## 🚀 Performance Targets

| Metric | Target | Tool |
|---|---|---|
| First Contentful Paint | < 1.2s | Lighthouse |
| Largest Contentful Paint | < 2s | Lighthouse |
| Cumulative Layout Shift | < 0.05 | Lighthouse |
| Total page size | < 800KB | DevTools |

**Optimization:**

- Screenshots: WebP, lazy load below the fold
- GIF/Video: Use `<video>` with autoplay/muted/loop (lighter than GIF)
- Fonts: Preload Inter/Geist, subset with only used characters
- Analytics: Plausible (< 1KB, no cookies)

---

## ✅ Pre-Launch Checklist

### Content

- [ ] Real screenshot of the app with rendered markdown
- [ ] GIF or demo video (optional but recommended)
- [ ] Clear and benefit-focused headlines
- [ ] Working GitHub link
- [ ] Download link pointing to GitHub Releases

### Design

- [ ] Consistent dark mode
- [ ] Responsive mobile (tested on 3 devices)
- [ ] Retina quality screenshots (2x)
- [ ] WCAG AA contrast

### Technical

- [ ] Lighthouse score > 90
- [ ] Meta tags (title, description, OG image 1200x630)
- [ ] Favicon (SVG + PNG fallback)
- [ ] Plausible or GA4 configured
- [ ] GitHub stars badge loading

### Required Assets

- [ ] Logo SVG (light/dark)
- [ ] App screenshots (PNG 2x, at least 3)
- [ ] Demo GIF or MP4 (optional)
- [ ] OG image 1200x630px
- [ ] Multi-size favicon

---

**Last Updated:** 02/22/2025
**Next Review:** Pre-launch

## 📝 Final Notes

This spec is structural. Copy and headlines come from a separate session.

**Next steps:**

1. Approve structure
2. Create real app screenshots
3. Write copy (headlines, descriptions)
4. Implement (Next.js or static HTML)
5. Launch together with v0.1.0 on GitHub
