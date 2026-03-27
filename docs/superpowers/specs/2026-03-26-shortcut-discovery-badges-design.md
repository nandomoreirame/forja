# Shortcut Discovery Badges

**Date:** 2026-03-26
**Status:** Approved
**Branch:** feature/keyboard-shortcuts-usability

## Summary

A "shortcut discovery" system where holding a modifier key (⌘+Shift, Ctrl, Alt, ⌘+Alt) reveals contextual badges on UI elements, showing the user which keys complete the shortcut. Badges appear after a 200ms hold delay (to avoid flickering on fast shortcuts) and fade out over 150ms when the modifier is released.

## Motivation

Forja has 30+ keyboard shortcuts but no visual discoverability beyond the keyboard shortcuts dialog and command palette. Users can't learn shortcuts organically while using the app. This feature lets users hold a modifier and instantly see what's available, building muscle memory naturally.

## Architecture

### Zustand Store: `modifier-held.ts`

New store at `frontend/stores/modifier-held.ts`.

```typescript
type ModifierCombo = "cmd-shift" | "ctrl" | "alt" | "cmd-alt";

interface ModifierHeldState {
  activeModifier: ModifierCombo | null;
  visible: boolean; // true after 200ms delay
  cancelBadges: () => void; // clears activeModifier + cancels pending timer
}
```

**Internal logic:**
- `keydown` → sets `activeModifier`, starts 200ms timer
- After 200ms → sets `visible: true` (badges appear with fade-in)
- `keyup` → sets `visible: false` (triggers 150ms CSS fade-out), then clears `activeModifier`
- If a full shortcut completes (e.g., ⌘+Shift+1) in <200ms → timer is cancelled, badges never appear

**Detection rules:**

The codebase uses `mod` = `event.metaKey || event.ctrlKey` for cross-platform compatibility. Detection mirrors this:

- `(metaKey || ctrlKey) && shiftKey && !altKey` → `"cmd-shift"`
- `ctrlKey && !metaKey && !shiftKey && !altKey` → `"ctrl"` (on macOS, bare Ctrl without Cmd; on Linux/Windows, Ctrl is the primary mod key so this combo doesn't apply — Ctrl+Tab uses different detection)
- `altKey && !metaKey && !shiftKey && !ctrlKey` → `"alt"`
- `(metaKey || ctrlKey) && altKey && !shiftKey` → `"cmd-alt"`

Priority: if multiple combos match, the most specific wins (e.g., `cmd-shift` over bare `ctrl`).

### Hook: `useModifierHeld`

A hook at `frontend/hooks/use-modifier-held.ts` that:
1. Registers `keydown`/`keyup` listeners on `window`
2. Handles `blur` event (clears state when window loses focus)
3. Ignores events when focus is on `input`, `textarea`, `select`, `contentEditable` elements, or Monaco editor
4. Manages the 200ms activation timer
5. Updates the Zustand store

This hook is mounted once in `App.tsx`.

### Badge Component: `ShortcutBadge`

A reusable component at `frontend/components/shortcut-badge.tsx`.

```typescript
interface ShortcutBadgeProps {
  label: string;          // "1", "E", "→", "N"
  variant: "active" | "inactive" | "notification" | "direction-active" | "direction-inactive";
  visible: boolean;
}
// Renders with aria-hidden="true" — badges are decorative/transient
```

**Variants and colors:**
| Variant | Background | Text | Use case |
|---------|-----------|------|----------|
| `active` | `bg-ctp-mauve` | `text-ctp-base` | Current/active project, active pane arrows |
| `inactive` | `bg-ctp-surface2` | `text-ctp-text` | Other projects, sidebar icons, tabs |
| `notification` | `bg-ctp-green` | `text-ctp-base` | Alt+N notification badge |
| `direction-active` | `bg-ctp-mauve` | `text-ctp-base` | Arrows from the active pane |
| `direction-inactive` | `bg-ctp-surface2` | `text-ctp-subtext1` | Arrows on adjacent panes |

**CSS transitions:**
```css
.shortcut-badge {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.shortcut-badge-hidden {
  opacity: 0;
  transform: scale(0.8);
}
.shortcut-badge-visible {
  opacity: 1;
  transform: scale(1);
}
```

## Modifier → Badge Mapping

### ⌘+Shift (Cmd+Shift)

| Component | Badge | Position | Variant |
|-----------|-------|----------|---------|
| Project sidebar icons | `1`-`9` | bottom-right of icon | `active` for current, `inactive` for others |
| Active pane | `→` `←` `↑` `↓` | tabset header buttons | `direction-active` |

**Note:** The File Explorer (E), Browser (B), Git Changes (G), Fullscreen (F), and New Tab (T) shortcuts are discoverable through the command palette and keyboard shortcuts dialog. They don't map to persistent UI elements that could display badges — they toggle blocks in the tiling layout. Adding badges for these would require a floating HUD overlay, which is out of scope for v1. The directional arrows on panes already provide the key "spatial navigation" discovery.

### Ctrl

| Component | Badge | Position | Variant |
|-----------|-------|----------|---------|
| Terminal tabs (all panes) | `1`-`N` | left of tab label | `active` for current tab, `inactive` for others |

Tab numbers follow the global cycling order (depth-first across panes), matching the order used by `Ctrl+Tab` / `Ctrl+Shift+Tab`.

### Alt

| Component | Badge | Position | Variant |
|-----------|-------|----------|---------|
| Notified project icons | `N` | bottom-right of icon | `notification` |

Only projects with active notifications show the badge. Projects without notifications show nothing.

### ⌘+Alt (Cmd+Alt) — New shortcut

| Component | Badge | Position | Variant |
|-----------|-------|----------|---------|
| Workspace switcher items | `1`-`9` | inline left of workspace name | `active` for current, `inactive` for others |

**New keyboard shortcut to implement:** `⌘+Alt+1-9` switches to workspace by position (excluding `⌘+Alt+0` which is already bound to `resetZoom()`). The workspace switcher popover briefly opens to show badges when this modifier is held.

**Note:** Holding `⌘+Alt` for 200ms will show workspace badges even if the user intends to press V (split vertical), H (split horizontal), or F (focus mode). This is acceptable — the badges are non-intrusive and disappear on the next keypress. The 200ms delay already prevents flickering for fast combos.

## Timing Specification

```
keydown (modifier)
  ├─ activeModifier = detected combo
  ├─ start 200ms timer
  │
  ├─ [if keyup before 200ms] → cancel timer, clear state (fast shortcut path)
  │
  └─ [after 200ms] → visible = true
       │
       ├─ Badges fade-in (150ms CSS transition)
       │
       └─ keyup (modifier released)
            ├─ visible = false → badges fade-out (150ms CSS transition)
            └─ after transition → activeModifier = null
```

## Components Modified

### `frontend/components/project-sidebar.tsx`
- Read `useModifierHeldStore` for `cmd-shift` and `alt` modifiers
- Render `ShortcutBadge` with project index (1-9) on `cmd-shift`
- Render `ShortcutBadge` with "N" on `alt` for notified projects
- Badge replaces existing notification badge position when visible

### `frontend/components/right-sidebar.tsx`
- Read `useModifierHeldStore` for `cmd-shift`
- Render `ShortcutBadge` with "E", "B", "G" on respective icons

### `frontend/components/tiling-layout.tsx`
- Read `useModifierHeldStore` for `cmd-shift`
- For each visible tabset, calculate which adjacent panes exist
- Render directional arrow badges on appropriate edges
- Active pane gets `direction-active` variant, neighbors get `direction-inactive`

### `frontend/components/tab-bar.tsx`
- Read `useModifierHeldStore` for `ctrl`
- Render numbered badges following global tab cycling order

### `frontend/components/workspace-switcher.tsx`
- Read `useModifierHeldStore` for `cmd-alt`
- Show numbered badges on workspace list items
- Implement new `⌘+Alt+1-9` shortcut in `use-keyboard-shortcuts.ts`

### `frontend/hooks/use-keyboard-shortcuts.ts`
- Add `⌘+Alt+1-9` handler for workspace switching (use `event.code` / `Digit1-Digit9` for reliable detection, same pattern as project switching)
- When a shortcut completes, call `useModifierHeldStore.getState().cancelBadges()` to immediately clear `activeModifier` and cancel the 200ms timer if pending

### `frontend/App.tsx`
- Mount `useModifierHeld` hook

## Edge Cases

- **Window blur / visibilitychange**: Clear all state immediately when window loses focus or becomes hidden (modifier may still be physically held but app can't detect keyup). On `focus` return, do not auto-resume — user must release and re-press the modifier.
- **Input focus**: Do not show badges when focus is on `input`, `textarea`, `select`, `contentEditable` elements, or Monaco editor
- **Projects > 9**: Projects at position 10+ do not receive badges (shortcut supports 1-9 only)
- **No adjacent pane**: Arrow badges only appear on edges where an adjacent pane exists
- **Single pane**: No directional badges shown when only one pane exists
- **Workspace in new window**: `⌘+Alt+N` for a non-active workspace opens/focuses that window
- **Notification badge conflict**: When `cmd-shift` is held, the numeric badge takes priority over the existing notification pulse badge. When `alt` is held, the "N" badge replaces it. When no modifier is held, original notification badges show normally.

## Testing Strategy

- **Store tests**: `modifier-held.test.ts` — verify state transitions, 200ms delay, cleanup on blur
- **Hook tests**: `use-modifier-held.test.ts` — verify keydown/keyup handling, input focus guard, timer cancellation
- **Component tests**: Each modified component verifies badge rendering when store state changes
- **Integration**: Verify badges don't appear during fast shortcut execution (<200ms)
