# Plan: Sistema de Notificação Rico (Visual Rings + Jump-to-Unread)

**Priority:** High
**Date:** 2026-03-19

---

## 1. Overview and Motivation

Currently, Forja shows a small green dot badge on the project sidebar icon when an AI session completes. This is subtle and easy to miss, especially when the user is focused on a different project. The goal is to implement a richer notification system with:

- **Visual rings** around pane tab headers when the AI agent in that pane needs attention (e.g., session finished, waiting for input)
- **Keyboard shortcut** (`Alt+N` or `Ctrl+Shift+N`) to jump to the next unread notification across all projects
- **Last notification text** shown in the sidebar tooltip, giving users context without switching projects

---

## 2. Current State Analysis

### What already exists

**`frontend/stores/projects.ts`:**
- `unreadProjects: Set<string>` — tracks projects with unread session activity
- `thinkingProjects: Set<string>` — tracks projects with active AI sessions
- `notifiedProjects: Set<string>` — tracks projects that triggered notifications (not cleared until project is focused)
- `markProjectNotified(projectPath)` — adds to `notifiedProjects` if not active project
- `clearProjectNotified(projectPath)` — cleared when switching to a project
- `setProjectSessionState(projectPath, state)` — adds to `unreadProjects` on "exited" if not active

**`frontend/components/project-sidebar.tsx`:**
- `ProjectIcon` component renders a green dot badge (`showBadge`) when `isNotified && !isActive`
- A spinner badge when `isThinking && !isActive`
- The tooltip shows project name and path — no notification text

**`frontend/stores/tiling-layout.ts`:**
- FlexLayout model manages tabsets and tabs
- No per-tabset notification state currently

**`electron/pty.ts`:**
- Emits `pty:session-state-changed` events with `{ sessionId, projectPath, state }`
- State is `"running"` | `"exited"`

### What is missing

1. Per-pane (tabset) notification state in the tiling layout store
2. Visual ring/border highlighting on active pane tabs when notification is pending
3. Notification text storage (last AI output line that triggered notification)
4. Global keyboard shortcut to jump to next unread project
5. Sidebar tooltip enrichment with last notification text

---

## 3. Step-by-Step Implementation Plan

### Step 1: Add notification text storage to projects store

Extend `ProjectsState` with:
```ts
notificationMessages: Record<string, string>; // projectPath -> last notification text
```

Add actions:
```ts
setProjectNotificationMessage: (projectPath: string, message: string) => void;
clearProjectNotificationMessage: (projectPath: string) => void;
```

Update `markProjectNotified` to accept an optional message parameter.

**File:** `frontend/stores/projects.ts`

### Step 2: Capture last notification text from PTY output

In `frontend/stores/terminal-tabs.ts` (or wherever PTY data is processed), when a session transitions to "exited", capture the last meaningful line of output and store it via `markProjectNotified(path, lastLine)`.

The last meaningful line should be the last non-empty, non-escape-sequence line from the PTY buffer.

**File:** `frontend/stores/terminal-tabs.ts` or wherever `pty:session-state-changed` is handled in the frontend

### Step 3: Enrich sidebar tooltip with notification message

In `ProjectIcon` component, update the `TooltipContent` to show the last notification message when `isNotified` is true:

```tsx
<TooltipContent side="right" className="max-w-xs">
  <p className="font-semibold">{project.name}</p>
  {isNotified && notificationMessage && (
    <p className="text-app-sm text-ctp-green mt-1 line-clamp-2">{notificationMessage}</p>
  )}
  <p className="text-app-sm text-ctp-overlay1">{project.path}</p>
</TooltipContent>
```

**File:** `frontend/components/project-sidebar.tsx`

### Step 4: Add pane-level notification state to tiling layout store

Add to `TilingLayoutState`:
```ts
notifiedTabsets: Set<string>; // tabset IDs with pending notifications
markTabsetNotified: (tabsetId: string) => void;
clearTabsetNotified: (tabsetId: string) => void;
```

When a terminal tab exits (via `pty:session-state-changed`), identify which tabset that terminal tab lives in (via FlexLayout model traversal) and call `markTabsetNotified`.

Clear tabset notification when:
- The user clicks/focuses that tabset
- The project is switched

**File:** `frontend/stores/tiling-layout.ts`

### Step 5: Render visual ring on notified tabsets

In the FlexLayout tab render, detect if the parent tabset is in `notifiedTabsets`. Apply a visual indicator:

**Option A** — CSS ring on the tabset container via FlexLayout `classNameCustomizer` or `onRenderTabSet` callback:
```tsx
// In the FlexLayout component render
onRenderTabSet={(tabsetNode, renderValues) => {
  const tabsetId = tabsetNode.getId();
  if (notifiedTabsets.has(tabsetId)) {
    renderValues.headerContent = (
      <span className="absolute inset-0 rounded ring-1 ring-ctp-green ring-offset-1 ring-offset-ctp-base pointer-events-none" />
    );
  }
}}
```

**Option B** — Add a pulsing border class to the tabset DOM element via `classList` mutation. Less ideal since it fights with FlexLayout's rendering.

Prefer **Option A** using FlexLayout's `onRenderTabSet` callback. The active tabset already uses `onRenderTabSet` for the mauve border highlight (from recent commit 75fd8b2). Extend this.

**File:** `frontend/App.tsx` or wherever the FlexLayout component is rendered

### Step 6: Implement "Jump to next unread" keyboard shortcut

Add global keyboard shortcut handler in `App.tsx` or the global keybindings hook:

```ts
// Alt+N or Ctrl+Shift+N — jump to next unread project
if (e.altKey && e.key === "n") {
  const { projects, activeProjectPath, notifiedProjects, switchToProject } = useProjectsStore.getState();
  const unread = projects.filter(p => notifiedProjects.has(p.path));
  if (unread.length === 0) return;

  // Find the next unread after the current active project
  const activeIdx = projects.findIndex(p => p.path === activeProjectPath);
  const nextUnread = unread.find(p => {
    const idx = projects.findIndex(pp => pp.path === p.path);
    return idx > activeIdx;
  }) ?? unread[0];

  if (nextUnread) switchToProject(nextUnread.path);
}
```

Register in the existing global keyboard handler.

**File:** `frontend/hooks/use-global-keyboard.ts` (or equivalent)

### Step 7: Update project sidebar badge to be more prominent

Enhance the existing green dot badge to use a pulsing animation for unread state, improving discoverability:

```tsx
{showBadge && (
  <span
    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-ctp-green ring-1 ring-ctp-mantle animate-pulse"
    aria-label={`${project.name} session finished`}
  />
)}
```

**File:** `frontend/components/project-sidebar.tsx`

---

## 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `frontend/stores/projects.ts` | Modify | Add `notificationMessages`, `setProjectNotificationMessage`, update `markProjectNotified` signature |
| `frontend/stores/tiling-layout.ts` | Modify | Add `notifiedTabsets`, `markTabsetNotified`, `clearTabsetNotified` |
| `frontend/components/project-sidebar.tsx` | Modify | Enrich tooltip with notification text, animate badge |
| `frontend/App.tsx` | Modify | Wire `onRenderTabSet` for ring indicator, add Alt+N shortcut |
| `frontend/hooks/use-global-keyboard.ts` | Modify | Add jump-to-unread shortcut handler |
| `frontend/stores/terminal-tabs.ts` | Modify | Capture last PTY line on exit, call `setProjectNotificationMessage` |

---

## 5. Test Strategy

### Unit tests

**`frontend/stores/__tests__/projects.test.ts`:**
- `markProjectNotified` with message stores message in `notificationMessages`
- `clearProjectNotified` removes message from `notificationMessages`
- `setProjectNotificationMessage` stores/updates message
- Message is not stored when project is active

**`frontend/stores/__tests__/tiling-layout.test.ts`:**
- `markTabsetNotified` adds tabset ID to `notifiedTabsets`
- `clearTabsetNotified` removes it
- Switching project clears all tabset notifications

### Component tests

**`frontend/components/__tests__/project-sidebar.test.tsx`:**
- Renders pulse animation on badge when `isNotified`
- Shows notification message in tooltip when `isNotified` and message exists
- Does not show message when `isNotified` is false

### Integration tests

- `Alt+N` with one unread project switches to it
- `Alt+N` with multiple unread projects cycles through in sidebar order
- `Alt+N` with no unread is a no-op

---

## 6. Acceptance Criteria

- [ ] When an AI session exits in a background project, the sidebar badge pulses
- [ ] The sidebar tooltip for a notified project shows the last line of output (or a generic "Session finished" message)
- [ ] When an AI session exits, the containing tabset shows a visual ring indicator (green border)
- [ ] The ring disappears when the user focuses that tabset
- [ ] `Alt+N` jumps to the next project with a pending notification
- [ ] `Alt+N` is a no-op when no projects have notifications
- [ ] All new state is properly cleared when switching to a project
- [ ] Existing tests continue to pass
- [ ] New tests cover all new store actions and the keyboard shortcut
