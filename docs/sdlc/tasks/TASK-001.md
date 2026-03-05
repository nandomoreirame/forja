# TASK-001: Implement New Session Type Selector Dialog

> **Status:** in-progress
> **Assignee:** Claude (Sonnet 4.5)
> **User Story:** [US-001](../stories/US-001.md)
> **Branch:** `develop` (no feature branch)
> **Created:** 2026-02-22

---

## Description

Implement a modal dialog that appears when users press Ctrl+T or click "New Session", allowing them to choose between creating a Claude Code session or a regular terminal session.

---

## Objective

Enable users to select session type before creating a new terminal tab, providing flexibility between AI-assisted and standard shell sessions.

---

## Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Modify | `frontend/stores/app-dialogs.ts` | Add `newSessionOpen` state |
| Modify | `frontend/stores/terminal-tabs.ts` | Add `sessionType` parameter to `addTab` |
| Create | `frontend/components/new-session-dialog.tsx` | New modal component |
| Modify | `frontend/components/command-palette.tsx` | Update "New Session" handler |
| Modify | `frontend/App.tsx` | Update Ctrl+T handler and import dialog |
| Create | `frontend/components/__tests__/new-session-dialog.test.tsx` | Unit tests for dialog |
| Modify | `frontend/stores/__tests__/app-dialogs.test.ts` | Add tests for new state |
| Modify | `frontend/stores/__tests__/terminal-tabs.test.ts` | Add tests for sessionType |

---

## Implementation Steps

### Step 1: Write Failing Tests for `useAppDialogsStore`

**Test:** Verify `newSessionOpen` state and `setNewSessionOpen` method

```typescript
// frontend/stores/__tests__/app-dialogs.test.ts
it('should manage newSessionOpen state', () => {
  const { result } = renderHook(() => useAppDialogsStore());

  expect(result.current.newSessionOpen).toBe(false);

  act(() => {
    result.current.setNewSessionOpen(true);
  });

  expect(result.current.newSessionOpen).toBe(true);
});
```

**Run:** `pnpm test app-dialogs.test.ts`
**Expected:** FAIL - property `newSessionOpen` does not exist

---

### Step 2: Implement `newSessionOpen` State

Update `frontend/stores/app-dialogs.ts`:

```typescript
interface AppDialogsState {
  shortcutsOpen: boolean;
  aboutOpen: boolean;
  newSessionOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setNewSessionOpen: (open: boolean) => void;
}

export const useAppDialogsStore = create<AppDialogsState>((set) => ({
  shortcutsOpen: false,
  aboutOpen: false,
  newSessionOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setAboutOpen: (open) => set({ aboutOpen: open }),
  setNewSessionOpen: (open) => set({ newSessionOpen: open }),
}));
```

**Run:** `pnpm test app-dialogs.test.ts`
**Expected:** PASS

---

### Step 3: Write Failing Tests for `addTab` with `sessionType`

**Test:** Verify `addTab` accepts and stores `sessionType`

```typescript
// frontend/stores/__tests__/terminal-tabs.test.ts
it('should add tab with sessionType parameter', () => {
  const { result } = renderHook(() => useTerminalTabsStore());

  act(() => {
    const tabId = result.current.nextTabId();
    result.current.addTab(tabId, '/test/path', 'terminal');
  });

  expect(result.current.tabs[0].sessionType).toBe('terminal');
});

it('should default to claude-code when sessionType is not provided', () => {
  const { result } = renderHook(() => useTerminalTabsStore());

  act(() => {
    const tabId = result.current.nextTabId();
    result.current.addTab(tabId, '/test/path');
  });

  expect(result.current.tabs[0].sessionType).toBe('claude-code');
});
```

**Run:** `pnpm test terminal-tabs.test.ts`
**Expected:** FAIL - `sessionType` property does not exist

---

### Step 4: Implement `sessionType` in `addTab`

Update `frontend/stores/terminal-tabs.ts`:

```typescript
export interface TerminalTab {
  id: string;
  name: string;
  path: string;
  isRunning: boolean;
  sessionType: 'claude-code' | 'terminal';
}

interface TerminalTabsState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  counter: number;

  nextTabId: () => string;
  addTab: (id: string, path: string, sessionType?: 'claude-code' | 'terminal') => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  markTabExited: (id: string) => void;
}

export const useTerminalTabsStore = create<TerminalTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  counter: 0,

  nextTabId: () => {
    const newCounter = get().counter + 1;
    set({ counter: newCounter });
    return `tab-${newCounter}`;
  },

  addTab: (id: string, path: string, sessionType: 'claude-code' | 'terminal' = 'claude-code') => {
    const currentCounter = get().counter;
    const tab: TerminalTab = {
      id,
      name: `Session #${currentCounter}`,
      path,
      isRunning: true,
      sessionType,
    };
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: id,
    }));
  },

  // ... rest unchanged
}));
```

**Run:** `pnpm test terminal-tabs.test.ts`
**Expected:** PASS

---

### Step 5: Write Failing Tests for `NewSessionDialog` Component

**Test:** Verify component renders and handles user interactions

```typescript
// frontend/components/__tests__/new-session-dialog.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewSessionDialog } from '../new-session-dialog';

describe('NewSessionDialog', () => {
  it('should render when open is true', () => {
    render(<NewSessionDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/New Session/i)).toBeInTheDocument();
  });

  it('should call onSessionTypeSelect with "claude-code" when Claude Code is clicked', async () => {
    const user = userEvent.setup();
    const onSessionTypeSelect = vi.fn();

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const claudeCodeButton = screen.getByText(/Claude Code/i);
    await user.click(claudeCodeButton);

    expect(onSessionTypeSelect).toHaveBeenCalledWith('claude-code');
  });

  it('should call onSessionTypeSelect with "terminal" when Terminal is clicked', async () => {
    const user = userEvent.setup();
    const onSessionTypeSelect = vi.fn();

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const terminalButton = screen.getByText(/Terminal/i);
    await user.click(terminalButton);

    expect(onSessionTypeSelect).toHaveBeenCalledWith('terminal');
  });
});
```

**Run:** `pnpm test new-session-dialog.test.tsx`
**Expected:** FAIL - component does not exist

---

### Step 6: Implement `NewSessionDialog` Component

Create `frontend/components/new-session-dialog.tsx`:

```typescript
import { Sparkles, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionTypeSelect: (sessionType: 'claude-code' | 'terminal') => void;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  onSessionTypeSelect,
}: NewSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-120 gap-0 border-ctp-surface0 bg-ctp-base p-0"
      >
        <DialogHeader className="gap-0 border-b border-ctp-surface0 px-5 py-4">
          <DialogTitle className="text-ctp-text">New Session</DialogTitle>
          <DialogDescription className="text-ctp-overlay1">
            Choose session type
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 p-5">
          <button
            onClick={() => onSessionTypeSelect('claude-code')}
            className="group flex flex-col items-center gap-3 rounded-lg border border-ctp-surface0 bg-ctp-mantle p-6 transition-all hover:border-brand hover:bg-ctp-surface0"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ctp-surface0 transition-colors group-hover:bg-brand/20">
              <Sparkles className="h-6 w-6 text-brand" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-ctp-text">
                Claude Code
              </span>
              <span className="text-center text-xs text-ctp-overlay1">
                AI-assisted terminal with Claude Code
              </span>
            </div>
          </button>

          <button
            onClick={() => onSessionTypeSelect('terminal')}
            className="group flex flex-col items-center gap-3 rounded-lg border border-ctp-surface0 bg-ctp-mantle p-6 transition-all hover:border-brand hover:bg-ctp-surface0"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ctp-surface0 transition-colors group-hover:bg-brand/20">
              <Terminal className="h-6 w-6 text-ctp-subtext0" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-ctp-text">
                Terminal
              </span>
              <span className="text-center text-xs text-ctp-overlay1">
                Standard shell session
              </span>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Run:** `pnpm test new-session-dialog.test.tsx`
**Expected:** PASS

---

### Step 7: Update `command-palette.tsx`

Change "new-session" command handler to open dialog instead of creating tab directly:

```typescript
case "new-session": {
  useAppDialogsStore.getState().setNewSessionOpen(true);
  break;
}
```

---

### Step 8: Update `App.tsx`

1. Import `NewSessionDialog`
2. Update Ctrl+T handler to open dialog
3. Add dialog to JSX with handler

```typescript
// Import at top
import { NewSessionDialog } from "./components/new-session-dialog";

// In keyboard shortcuts handler, replace:
if (mod && event.key === "t") {
  event.preventDefault();
  createNewTab();
}

// With:
if (mod && event.key === "t") {
  event.preventDefault();
  useAppDialogsStore.getState().setNewSessionOpen(true);
}

// Add handler for dialog selection
const handleNewSessionType = useCallback(
  (sessionType: 'claude-code' | 'terminal') => {
    if (!currentPath) return;
    const tabId = nextTabId();
    addTab(tabId, currentPath, sessionType);
    useAppDialogsStore.getState().setNewSessionOpen(false);
  },
  [currentPath, nextTabId, addTab]
);

// Add dialog to JSX (after <CommandPalette />)
<NewSessionDialog
  open={useAppDialogsStore((s) => s.newSessionOpen)}
  onOpenChange={useAppDialogsStore.getState().setNewSessionOpen}
  onSessionTypeSelect={handleNewSessionType}
/>
```

---

### Step 9: Run All Tests

**Run:** `pnpm test`
**Expected:** All tests PASS

---

### Step 10: Manual Testing

1. Press Ctrl+T → modal should appear
2. Click "Claude Code" → Claude Code tab should be created
3. Press Ctrl+T → modal should appear
4. Click "Terminal" → Terminal tab should be created
5. Press Ctrl+T → modal should appear
6. Press Escape → modal should close
7. Open command palette (Ctrl+Shift+P) → Select "New Session" → modal should appear

---

## Technical Constraints

- Must use shadcn/ui Dialog component
- Must follow Catppuccin Mocha design system
- Must not break existing keyboard shortcuts
- Must maintain backward compatibility with existing tabs

---

## Edge Cases to Handle

- [ ] No project open → disable Ctrl+T (already handled by existing check)
- [ ] Modal already open → pressing Ctrl+T again should do nothing
- [ ] Rapid tab creation → ensure counter increments correctly
- [ ] Escape key press → close modal without creating tab

---

## Acceptance Criteria

- [ ] Modal opens on Ctrl+T
- [ ] Modal opens from "New Session" command
- [ ] Clicking "Claude Code" creates Claude Code tab
- [ ] Clicking "Terminal" creates terminal tab
- [ ] Escape closes modal
- [ ] Clicking outside closes modal
- [ ] All tests pass
- [ ] No lint errors
- [ ] No TypeScript errors

---

## Testing Checklist

- [ ] Unit tests for `useAppDialogsStore`
- [ ] Unit tests for `useTerminalTabsStore`
- [ ] Unit tests for `NewSessionDialog`
- [ ] Integration test: Ctrl+T opens modal
- [ ] Integration test: Command palette opens modal
- [ ] Manual testing completed

---

## Notes

- Electron backend support for `sessionType` parameter should be verified
- Tab name could potentially include session type (e.g., "Claude Code #1" vs "Terminal #1") in a future enhancement

---

## Related Documents

- **User Story:** [US-001](../stories/US-001.md)
- **ADR:** [ADR-001](../adrs/ADR-001.md)
- **PRD:** [PRD-001](../prds/PRD-001.md)

---

## Changelog

| Date | Status | Author | Notes |
|------|--------|--------|-------|
| 2026-02-22 | in-progress | Claude (Sonnet 4.5) | Created |
