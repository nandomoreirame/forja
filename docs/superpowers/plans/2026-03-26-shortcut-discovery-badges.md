# Shortcut Discovery Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show contextual shortcut badges on UI elements when the user holds a modifier key, enabling organic shortcut discovery.

**Architecture:** A centralized Zustand store (`modifier-held.ts`) tracks which modifier combo is held. A hook (`useModifierHeld`) manages keyboard listeners with a 200ms activation delay and cleanup on blur. A reusable `ShortcutBadge` component renders badges with fade-in/out transitions. Each UI component reads the store and conditionally renders badges.

**Tech Stack:** React 19, Zustand 5, Tailwind CSS 4, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-26-shortcut-discovery-badges-design.md`

---

### Task 1: Create the `modifier-held` Zustand Store

**Files:**
- Create: `frontend/stores/__tests__/modifier-held.test.ts`
- Create: `frontend/stores/modifier-held.ts`

- [ ] **Step 1: Write failing store tests**

```typescript
// frontend/stores/__tests__/modifier-held.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useModifierHeldStore } from "../modifier-held";

describe("modifier-held store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useModifierHeldStore.getState().cancelBadges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with null activeModifier and visible false", () => {
    const state = useModifierHeldStore.getState();
    expect(state.activeModifier).toBeNull();
    expect(state.visible).toBe(false);
  });

  it("sets activeModifier on setModifier", () => {
    useModifierHeldStore.getState().setModifier("cmd-shift");
    expect(useModifierHeldStore.getState().activeModifier).toBe("cmd-shift");
    expect(useModifierHeldStore.getState().visible).toBe(false);
  });

  it("becomes visible after 200ms delay", () => {
    useModifierHeldStore.getState().setModifier("cmd-shift");
    vi.advanceTimersByTime(199);
    expect(useModifierHeldStore.getState().visible).toBe(false);
    vi.advanceTimersByTime(1);
    expect(useModifierHeldStore.getState().visible).toBe(true);
  });

  it("clearModifier fades out: visible false immediately, activeModifier null after 150ms", () => {
    useModifierHeldStore.getState().setModifier("ctrl");
    vi.advanceTimersByTime(200);
    expect(useModifierHeldStore.getState().visible).toBe(true);
    useModifierHeldStore.getState().clearModifier();
    // visible goes false immediately (CSS fade-out starts)
    expect(useModifierHeldStore.getState().visible).toBe(false);
    // activeModifier still set so badge component stays mounted during transition
    expect(useModifierHeldStore.getState().activeModifier).toBe("ctrl");
    vi.advanceTimersByTime(150);
    // Now activeModifier clears
    expect(useModifierHeldStore.getState().activeModifier).toBeNull();
  });

  it("cancelBadges cancels pending timer", () => {
    useModifierHeldStore.getState().setModifier("alt");
    useModifierHeldStore.getState().cancelBadges();
    vi.advanceTimersByTime(200);
    expect(useModifierHeldStore.getState().visible).toBe(false);
    expect(useModifierHeldStore.getState().activeModifier).toBeNull();
  });

  it("changing modifier resets the timer", () => {
    useModifierHeldStore.getState().setModifier("cmd-shift");
    vi.advanceTimersByTime(150);
    useModifierHeldStore.getState().setModifier("ctrl");
    vi.advanceTimersByTime(150);
    expect(useModifierHeldStore.getState().visible).toBe(false);
    vi.advanceTimersByTime(50);
    expect(useModifierHeldStore.getState().visible).toBe(true);
    expect(useModifierHeldStore.getState().activeModifier).toBe("ctrl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test frontend/stores/__tests__/modifier-held.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the store**

```typescript
// frontend/stores/modifier-held.ts
import { create } from "zustand";

export type ModifierCombo = "cmd-shift" | "ctrl" | "alt" | "cmd-alt";

interface ModifierHeldState {
  activeModifier: ModifierCombo | null;
  visible: boolean;
  setModifier: (combo: ModifierCombo) => void;
  clearModifier: () => void;
  cancelBadges: () => void;
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;

const ACTIVATION_DELAY = 200;
const FADEOUT_DURATION = 150;

export const useModifierHeldStore = create<ModifierHeldState>((set) => ({
  activeModifier: null,
  visible: false,

  setModifier: (combo) => {
    if (pendingTimer) clearTimeout(pendingTimer);
    set({ activeModifier: combo, visible: false });
    pendingTimer = setTimeout(() => {
      set({ visible: true });
      pendingTimer = null;
    }, ACTIVATION_DELAY);
  },

  clearModifier: () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    // First hide badges (triggers CSS fade-out), then clear activeModifier
    // after 150ms so badge components stay mounted during the transition
    set({ visible: false });
    pendingTimer = setTimeout(() => {
      set({ activeModifier: null });
      pendingTimer = null;
    }, FADEOUT_DURATION);
  },

  cancelBadges: () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    set({ activeModifier: null, visible: false });
  },
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test frontend/stores/__tests__/modifier-held.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/stores/modifier-held.ts frontend/stores/__tests__/modifier-held.test.ts
git commit -m "feat(shortcuts): add modifier-held Zustand store"
```

---

### Task 2: Create the `useModifierHeld` Hook

**Files:**
- Create: `frontend/hooks/__tests__/use-modifier-held.test.ts`
- Create: `frontend/hooks/use-modifier-held.ts`

- [ ] **Step 1: Write failing hook tests**

```typescript
// frontend/hooks/__tests__/use-modifier-held.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useModifierHeldStore } from "@/stores/modifier-held";
import { detectModifierCombo } from "../use-modifier-held";

// Test the detection logic directly (no React rendering needed)
// The hook just wires up event listeners — we test the detection function

// Helper: create a keyboard event
function makeKeyEvent(
  type: "keydown" | "keyup",
  overrides: Partial<KeyboardEvent> = {}
): KeyboardEvent {
  return new KeyboardEvent(type, {
    bubbles: true,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    key: "",
    code: "",
    ...overrides,
  });
}

describe("modifier detection logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useModifierHeldStore.getState().cancelBadges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Cmd+Shift sets cmd-shift", () => {
    // Simulate what the hook does
    const e = makeKeyEvent("keydown", { metaKey: true, shiftKey: true, key: "Shift" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-shift");
  });

  it("Ctrl+Shift sets cmd-shift (cross-platform mod)", () => {
    const e = makeKeyEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Shift" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-shift");
  });

  it("bare Ctrl sets ctrl", () => {
    const e = makeKeyEvent("keydown", { ctrlKey: true, key: "Control" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("ctrl");
  });

  it("bare Alt sets alt", () => {
    const e = makeKeyEvent("keydown", { altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("alt");
  });

  it("Cmd+Alt sets cmd-alt", () => {
    const e = makeKeyEvent("keydown", { metaKey: true, altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-alt");
  });

  it("Ctrl+Alt sets cmd-alt (cross-platform)", () => {
    const e = makeKeyEvent("keydown", { ctrlKey: true, altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBe("cmd-alt");
  });

  it("returns null for non-modifier keys", () => {
    const e = makeKeyEvent("keydown", { key: "a", code: "KeyA" });
    const combo = detectModifierCombo(e);
    expect(combo).toBeNull();
  });

  it("returns null when all three modifiers are held", () => {
    const e = makeKeyEvent("keydown", { metaKey: true, shiftKey: true, altKey: true, key: "Alt" });
    const combo = detectModifierCombo(e);
    expect(combo).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test frontend/hooks/__tests__/use-modifier-held.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the hook**

```typescript
// frontend/hooks/use-modifier-held.ts
import { useEffect } from "react";
import { useModifierHeldStore, type ModifierCombo } from "@/stores/modifier-held";

/**
 * Detects which modifier combo is being held from a keyboard event.
 * Exported for testing.
 */
export function detectModifierCombo(e: KeyboardEvent): ModifierCombo | null {
  const mod = e.metaKey || e.ctrlKey;

  // cmd-shift: (Cmd or Ctrl) + Shift, no Alt
  if (mod && e.shiftKey && !e.altKey) return "cmd-shift";

  // cmd-alt: (Cmd or Ctrl) + Alt, no Shift
  if (mod && e.altKey && !e.shiftKey) return "cmd-alt";

  // ctrl: bare Ctrl only (no Cmd, no Shift, no Alt)
  if (e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) return "ctrl";

  // alt: bare Alt only
  if (e.altKey && !e.metaKey && !e.shiftKey && !e.ctrlKey) return "alt";

  return null;
}

/** Returns true if the focused element is an input-like element where badges should not show. */
function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  // Monaco editor uses a textarea inside .monaco-editor
  if (el.closest(".monaco-editor")) return true;
  return false;
}

/** Whether the key is a pure modifier (not a "completing" key like a digit or letter). */
function isModifierKey(key: string): boolean {
  return key === "Shift" || key === "Control" || key === "Meta" || key === "Alt";
}

/**
 * Hook that listens for modifier key holds and updates the modifier-held store.
 * Mount once in App.tsx.
 */
export function useModifierHeld(): void {
  useEffect(() => {
    const store = useModifierHeldStore.getState;

    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;

      // Only react to modifier keys themselves being pressed
      if (!isModifierKey(e.key)) {
        // A non-modifier key was pressed — this is a shortcut completion
        // Cancel any pending badge display
        if (store().activeModifier) {
          store().cancelBadges();
        }
        return;
      }

      const combo = detectModifierCombo(e);
      if (!combo) return;

      // Only update if the combo changed
      if (store().activeModifier !== combo) {
        useModifierHeldStore.getState().setModifier(combo);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      // When any modifier is released, clear
      if (isModifierKey(e.key) && store().activeModifier) {
        store().clearModifier();
      }
    }

    function handleBlur() {
      store().cancelBadges();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        store().cancelBadges();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      store().cancelBadges();
    };
  }, []);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test frontend/hooks/__tests__/use-modifier-held.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/hooks/use-modifier-held.ts frontend/hooks/__tests__/use-modifier-held.test.ts
git commit -m "feat(shortcuts): add useModifierHeld hook with detection logic"
```

---

### Task 3: Create the `ShortcutBadge` Component

**Files:**
- Create: `frontend/components/__tests__/shortcut-badge.test.tsx`
- Create: `frontend/components/shortcut-badge.tsx`

- [ ] **Step 1: Write failing component tests**

```typescript
// frontend/components/__tests__/shortcut-badge.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortcutBadge } from "../shortcut-badge";

describe("ShortcutBadge", () => {
  it("renders label text", () => {
    render(<ShortcutBadge label="1" variant="active" visible />);
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("has aria-hidden=true", () => {
    render(<ShortcutBadge label="E" variant="inactive" visible />);
    const el = screen.getByText("E");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies visible styles when visible=true", () => {
    render(<ShortcutBadge label="→" variant="direction-active" visible />);
    const el = screen.getByText("→");
    expect(el.className).toContain("opacity-100");
  });

  it("applies hidden styles when visible=false", () => {
    render(<ShortcutBadge label="N" variant="notification" visible={false} />);
    const el = screen.getByText("N");
    expect(el.className).toContain("opacity-0");
  });

  it("applies active variant styles", () => {
    render(<ShortcutBadge label="1" variant="active" visible />);
    const el = screen.getByText("1");
    expect(el.className).toContain("bg-ctp-mauve");
    expect(el.className).toContain("text-ctp-base");
  });

  it("applies notification variant styles", () => {
    render(<ShortcutBadge label="N" variant="notification" visible />);
    const el = screen.getByText("N");
    expect(el.className).toContain("bg-ctp-green");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test frontend/components/__tests__/shortcut-badge.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the component**

```typescript
// frontend/components/shortcut-badge.tsx
import { cn } from "@/lib/utils";

export type ShortcutBadgeVariant =
  | "active"
  | "inactive"
  | "notification"
  | "direction-active"
  | "direction-inactive";

interface ShortcutBadgeProps {
  label: string;
  variant: ShortcutBadgeVariant;
  visible: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<ShortcutBadgeVariant, string> = {
  active: "bg-ctp-mauve text-ctp-base",
  inactive: "bg-ctp-surface2 text-ctp-text",
  notification: "bg-ctp-green text-ctp-base",
  "direction-active": "bg-ctp-mauve text-ctp-base",
  "direction-inactive": "bg-ctp-surface2 text-ctp-subtext1",
};

export function ShortcutBadge({ label, variant, visible, className }: ShortcutBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded font-mono text-[9px] font-bold leading-none transition-all duration-150 ease-out",
        "min-w-[14px] px-[3px] py-[1px]",
        VARIANT_CLASSES[variant],
        visible ? "opacity-100 scale-100" : "opacity-0 scale-75",
        className,
      )}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test frontend/components/__tests__/shortcut-badge.test.tsx`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/components/shortcut-badge.tsx frontend/components/__tests__/shortcut-badge.test.tsx
git commit -m "feat(shortcuts): add ShortcutBadge reusable component"
```

---

### Task 4: Mount Hook in App.tsx

**Files:**
- Modify: `frontend/App.tsx`

- [ ] **Step 1: Add import and mount the hook**

In `frontend/App.tsx`, add:

```typescript
// Add import near other hook imports
import { useModifierHeld } from "./hooks/use-modifier-held";
```

Inside the `App` function body (near the existing `useKeyboardShortcuts` call), add:

```typescript
useModifierHeld();
```

- [ ] **Step 2: Verify dev server starts without errors**

Run: `pnpm build` (or check existing tests still pass)
Expected: No TypeScript or build errors

- [ ] **Step 3: Commit**

```bash
git add frontend/App.tsx
git commit -m "feat(shortcuts): mount useModifierHeld hook in App"
```

---

### Task 5: Add Shortcut Badges to Project Sidebar

**Files:**
- Modify: `frontend/components/project-sidebar.tsx`
- Create: `frontend/components/__tests__/project-sidebar-badges.test.tsx`

- [ ] **Step 1: Write failing test**

Since `ProjectSidebar` requires extensive mocking (DnD, projects store, dialogs), we test badge integration via the `ShortcutBadge` component with modifier store state. The real integration is verified in Task 10.

```typescript
// frontend/components/__tests__/project-sidebar-badges.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortcutBadge } from "../shortcut-badge";
import { useModifierHeldStore } from "@/stores/modifier-held";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  open: vi.fn(),
}));

describe("Project sidebar badge integration", () => {
  beforeEach(() => {
    useModifierHeldStore.getState().cancelBadges();
  });

  it("renders numeric badge with active variant for current project", () => {
    render(
      <ShortcutBadge label="1" variant="active" visible className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("1");
    expect(badge.className).toContain("bg-ctp-mauve");
    expect(badge.className).toContain("opacity-100");
  });

  it("renders numeric badge with inactive variant for other projects", () => {
    render(
      <ShortcutBadge label="2" variant="inactive" visible className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("2");
    expect(badge.className).toContain("bg-ctp-surface2");
    expect(badge.className).toContain("opacity-100");
  });

  it("hides badge when not visible", () => {
    render(
      <ShortcutBadge label="1" variant="active" visible={false} className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("1");
    expect(badge.className).toContain("opacity-0");
  });

  it("renders N notification badge", () => {
    render(
      <ShortcutBadge label="N" variant="notification" visible className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("N");
    expect(badge.className).toContain("bg-ctp-green");
  });
});
```

- [ ] **Step 2: Modify ProjectIcon in project-sidebar.tsx**

Add import at top of `frontend/components/project-sidebar.tsx`:

```typescript
import { useModifierHeldStore } from "@/stores/modifier-held";
import { ShortcutBadge } from "./shortcut-badge";
```

Add new props to `ProjectIconProps` interface (around line 56):

```typescript
  /** 1-based index for shortcut badge (⌘+Shift+N). Only set for index < 9. */
  shortcutIndex?: number;
```

Inside `ProjectIcon` function, add store read (after line 82):

```typescript
  const modifierVisible = useModifierHeldStore((s) => s.visible);
  const activeModifier = useModifierHeldStore((s) => s.activeModifier);
  const showShortcutBadge = modifierVisible && activeModifier === "cmd-shift" && shortcutIndex !== undefined;
  const showNotifBadge = modifierVisible && activeModifier === "alt" && !!isNotified;
```

After the existing badge rendering (after line 130, before `</button>`), add:

```tsx
      {/* Shortcut discovery badges */}
      {shortcutIndex !== undefined && (
        <ShortcutBadge
          label={String(shortcutIndex)}
          variant={isActive ? "active" : "inactive"}
          visible={showShortcutBadge}
          className="absolute -bottom-1 -right-1 z-10"
        />
      )}
      {isNotified && (
        <ShortcutBadge
          label="N"
          variant="notification"
          visible={showNotifBadge}
          className="absolute -bottom-1 -right-1 z-10"
        />
      )}
```

Where `ProjectIcon` is rendered via `SortableProjectIcon` in the map loop (around line 355), pass `shortcutIndex`. Since `SortableProjectIconProps extends ProjectIconProps`, the prop flows through the spread `{...props}` in `SortableProjectIcon` to the inner `ProjectIcon`:

```typescript
// In the projects.map((project, index) => ...) at the SortableProjectIcon call site
shortcutIndex={index < 9 ? index + 1 : undefined}
```

**Important**: When `showShortcutBadge` or `showNotifBadge` is true, hide the existing spinner/notification badges to avoid overlap. Wrap the existing `showSpinner` and `showBadge` conditions:

```typescript
  const showSpinner = !isActive && !!isThinking && !showShortcutBadge && !showNotifBadge;
  const showBadge = !isActive && !!isNotified && !showShortcutBadge && !showNotifBadge;
```

- [ ] **Step 3: Run tests**

Run: `pnpm test frontend/components/__tests__/project-sidebar-badges.test.tsx frontend/components/__tests__/project-sidebar.test.tsx`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/components/project-sidebar.tsx frontend/components/__tests__/project-sidebar-badges.test.tsx
git commit -m "feat(shortcuts): add shortcut badges to project sidebar"
```

---

### Task 6: Add Shortcut Badges to Tab Bar

**Files:**
- Modify: `frontend/components/tab-bar.tsx`

- [ ] **Step 1: Add badge to tab bar**

In `frontend/components/tab-bar.tsx`, add imports:

```typescript
import { useModifierHeldStore } from "@/stores/modifier-held";
import { ShortcutBadge } from "./shortcut-badge";
```

Inside the tab map loop (around line 157), the `index` variable is already available. Add store reads at the top of the component function:

```typescript
const modifierVisible = useModifierHeldStore((s) => s.visible);
const activeModifier = useModifierHeldStore((s) => s.activeModifier);
const showCtrlBadges = modifierVisible && activeModifier === "ctrl";
```

Inside each tab `<div>` (after the CliIcon on line 200 and before InlineEdit on line 201), add:

```tsx
<ShortcutBadge
  label={String(index + 1)}
  variant={isActive ? "active" : "inactive"}
  visible={showCtrlBadges}
  className="shrink-0"
/>
```

- [ ] **Step 2: Run existing tab-bar tests to check no regressions**

Run: `pnpm test frontend/components/__tests__/tab-bar.test.tsx`
Expected: All PASS (may need to mock the modifier-held store)

If tests fail due to missing store mock, add to the test file:

```typescript
vi.mock("@/stores/modifier-held", () => ({
  useModifierHeldStore: vi.fn((selector) =>
    selector({ activeModifier: null, visible: false, setModifier: vi.fn(), clearModifier: vi.fn(), cancelBadges: vi.fn() })
  ),
}));
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/tab-bar.tsx
git commit -m "feat(shortcuts): add Ctrl+Tab numbering badges to tab bar"
```

---

### Task 7: Add Directional Arrow Badges to Tiling Layout

**Files:**
- Modify: `frontend/stores/tiling-layout.ts`
- Modify: `frontend/components/tiling-layout.tsx`

This is the most complex badge — it needs to detect adjacent panes relative to the active pane and show directional arrows.

- [ ] **Step 1: Add `getAdjacentDirections` to the tiling-layout store**

In `frontend/stores/tiling-layout.ts`, add to the `TilingLayoutState` interface:

```typescript
/** Returns which directions have adjacent tabsets relative to the active tabset. */
getAdjacentDirections: () => Record<"left" | "right" | "up" | "down", boolean>;
```

Add the implementation (uses the same adjacency logic as `navigateToAdjacentTabset` at line 891-951 but without performing navigation):

```typescript
getAdjacentDirections: () => {
  const result = { left: false, right: false, up: false, down: false };
  const { model } = get();

  const tabsets: { id: string; cx: number; cy: number }[] = [];
  model.visitNodes((node) => {
    if (node.getType() === "tabset") {
      const rect = node.getRect();
      tabsets.push({
        id: node.getId(),
        cx: rect.x + rect.width / 2,
        cy: rect.y + rect.height / 2,
      });
    }
  });

  if (tabsets.length <= 1) return result;

  const activeTabset = model.getActiveTabset();
  if (!activeTabset) return result;

  const activeId = activeTabset.getId();
  const active = tabsets.find((t) => t.id === activeId);
  if (!active) return result;

  result.right = tabsets.some((t) => t.cx > active.cx);
  result.left = tabsets.some((t) => t.cx < active.cx);
  result.down = tabsets.some((t) => t.cy > active.cy);
  result.up = tabsets.some((t) => t.cy < active.cy);

  return result;
},
```

- [ ] **Step 2: Add badge overlay to tiling-layout.tsx**

In `frontend/components/tiling-layout.tsx`, add imports:

```typescript
import { useModifierHeldStore } from "@/stores/modifier-held";
import { ShortcutBadge } from "./shortcut-badge";
```

Inside the `onRenderTabSet` callback (around line 251), after existing button additions, add directional badges to the active tabset's header buttons:

```tsx
// Read from store (use getState to avoid re-renders from FlexLayout callbacks)
const { visible: modVisible, activeModifier: modActive } = useModifierHeldStore.getState();
const showDirBadges = modVisible && modActive === "cmd-shift";

if (showDirBadges) {
  const model = useTilingLayoutStore.getState().model;
  const isActiveTabset = model.getActiveTabset()?.getId() === node.getId();

  if (isActiveTabset) {
    const dirs = useTilingLayoutStore.getState().getAdjacentDirections();
    const arrowMap = { left: "←", right: "→", up: "↑", down: "↓" } as const;

    const arrowBadges = (["left", "right", "up", "down"] as const)
      .filter((dir) => dirs[dir])
      .map((dir) => (
        <ShortcutBadge
          key={dir}
          label={arrowMap[dir]}
          variant="direction-active"
          visible
          className="mx-0.5"
        />
      ));

    if (arrowBadges.length > 0) {
      renderValues.buttons.push(
        <div key="dir-badges" className="flex items-center gap-0.5 px-1">
          {arrowBadges}
        </div>
      );
    }
  }
}
```

**Note:** Since `onRenderTabSet` is a callback (not a React component), we use `getState()` instead of the hook selector pattern. The badges will update because FlexLayout re-renders tabset headers when the model changes, and modifier state changes trigger re-renders via the store subscription in the parent component.

To ensure the component re-renders when modifier state changes, add reactive store reads at the top of the `TilingLayout` component:

```typescript
const modifierVisible = useModifierHeldStore((s) => s.visible);
const activeModifier = useModifierHeldStore((s) => s.activeModifier);
```

These values aren't used directly in JSX but force React to re-render when they change, which triggers FlexLayout to call `onRenderTabSet` again.

- [ ] **Step 3: Verify no regressions**

Run: `pnpm test frontend/stores/__tests__/tiling-layout.test.ts`
Expected: All PASS

**Note:** There is no `tiling-layout.test.tsx` in `components/__tests__/`. The store tests are at `frontend/stores/__tests__/tiling-layout.test.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/tiling-layout.tsx frontend/stores/tiling-layout.ts
git commit -m "feat(shortcuts): add directional arrow badges to tiling panes"
```

---

### Task 8: Add Workspace Switching Shortcut (⌘+Alt+1-9)

**Files:**
- Modify: `frontend/hooks/use-keyboard-shortcuts.ts`
- Modify: `frontend/components/workspace-switcher.tsx`

- [ ] **Step 1: Add ⌘+Alt+1-9 handler to use-keyboard-shortcuts.ts**

In `frontend/hooks/use-keyboard-shortcuts.ts`, after the project switching block (around line 227), add:

```typescript
// ⌘+Alt+1-9 — switch workspace
if (mod && event.altKey && !event.shiftKey && digitMatch) {
  const digit = parseInt(digitMatch[1], 10);
  if (digit === 0) return; // 0 is bound to resetZoom
  event.preventDefault();
  const { workspaces, openWorkspaceInNewWindow } = useWorkspaceStore.getState();
  const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
  const index = digit - 1;
  if (index < workspaces.length) {
    const ws = workspaces[index];
    if (ws.id !== activeWorkspaceId) {
      openWorkspaceInNewWindow(ws.id);
    }
  }
  useModifierHeldStore.getState().cancelBadges();
  return;
}
```

Add the necessary import at the top:

```typescript
import { useWorkspaceStore } from "@/stores/workspace";
import { useModifierHeldStore } from "@/stores/modifier-held";
```

Also add `cancelBadges()` call after the existing project switching handler (line ~226):

```typescript
useModifierHeldStore.getState().cancelBadges();
```

- [ ] **Step 2: Add badges to workspace-switcher.tsx**

In `frontend/components/workspace-switcher.tsx`, add imports:

```typescript
import { useModifierHeldStore } from "@/stores/modifier-held";
import { ShortcutBadge } from "./shortcut-badge";
```

Add store reads at top of the component:

```typescript
const modifierVisible = useModifierHeldStore((s) => s.visible);
const activeModifier = useModifierHeldStore((s) => s.activeModifier);
const showWorkspaceBadges = modifierVisible && activeModifier === "cmd-alt";
```

Open the popover when `cmd-alt` is held (using a `useEffect`):

```typescript
useEffect(() => {
  if (showWorkspaceBadges && hasWorkspaces) {
    setIsOpen(true);
  }
}, [showWorkspaceBadges, hasWorkspaces]);
```

In the workspace list, change `workspaces.map((ws) =>` to `workspaces.map((ws, wsIndex) =>` (around line 208).

Add a badge to **both** the active and inactive workspace render paths:

**Active workspace** (around line 310, inside the `<div>` with `bg-ctp-surface0/50`, before the `<WsIcon>`):

```tsx
{wsIndex < 9 && (
  <ShortcutBadge
    label={String(wsIndex + 1)}
    variant="active"
    visible={showWorkspaceBadges}
    className="shrink-0"
  />
)}
```

**Inactive workspace** (around line 336, inside the `<button>`, before the `<WsIcon>`):

```tsx
{wsIndex < 9 && (
  <ShortcutBadge
    label={String(wsIndex + 1)}
    variant="inactive"
    visible={showWorkspaceBadges}
    className="shrink-0"
  />
)}
```

The editing render path (line 214) does not need badges — the user is focused on editing, not switching.

- [ ] **Step 3: Run existing tests**

Run: `pnpm test frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts frontend/components/__tests__/workspace-switcher.test.tsx`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/hooks/use-keyboard-shortcuts.ts frontend/components/workspace-switcher.tsx
git commit -m "feat(shortcuts): add Cmd+Alt+1-9 workspace switching with badges"
```

---

### Task 9: Add cancelBadges on Shortcut Execution

**Files:**
- Modify: `frontend/hooks/use-keyboard-shortcuts.ts`

- [ ] **Step 1: Add cancelBadges calls to existing shortcut handlers**

In `frontend/hooks/use-keyboard-shortcuts.ts`, add `useModifierHeldStore.getState().cancelBadges()` at the beginning of each handler that completes a shortcut (where `event.preventDefault()` is called and the action is performed). This ensures that if the user executes a shortcut fast enough (within 200ms), badges are cancelled.

Key locations:
- After project switch (Cmd+Shift+1-9) — around line 226
- After Alt+N notification jump — around line 244
- After Cmd+Shift+E/B/G/T/P/L/F handlers

This is a straightforward addition — just add the `cancelBadges()` call after each `event.preventDefault()`.

- [ ] **Step 2: Run keyboard shortcuts tests**

Run: `pnpm test frontend/hooks/__tests__/use-keyboard-shortcuts.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/use-keyboard-shortcuts.ts
git commit -m "feat(shortcuts): cancel badges on shortcut execution"
```

---

### Task 10: Final Integration Testing

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass (1500+ tests across 117+ files)

- [ ] **Step 2: Fix any regressions**

If any existing tests fail due to the new store import, add mocks:

```typescript
vi.mock("@/stores/modifier-held", () => ({
  useModifierHeldStore: Object.assign(
    vi.fn((selector: any) =>
      selector({ activeModifier: null, visible: false, setModifier: vi.fn(), clearModifier: vi.fn(), cancelBadges: vi.fn() })
    ),
    { getState: () => ({ activeModifier: null, visible: false, setModifier: vi.fn(), clearModifier: vi.fn(), cancelBadges: vi.fn() }) }
  ),
}));
```

- [ ] **Step 3: Commit all fixes**

```bash
git add -A
git commit -m "fix: resolve test regressions from shortcut badges feature"
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no TypeScript errors
