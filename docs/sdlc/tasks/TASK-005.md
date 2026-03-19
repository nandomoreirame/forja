# TASK-005: Workspace System Implementation

**Status:** Ready
**PRD:** PRD-004
**User Story:** US-004
**ADR:** ADR-004
**Date:** 2026-03-15
**Estimated effort:** L (Large — multi-file, ~400–600 lines net new code + tests)

---

## Overview

Implement the rich Workspace System as specified in PRD-004. The feature touches
the Electron backend (data model, IPC handlers), the frontend store, and adds
two new UI components.

---

## Sub-tasks

### Phase 1 — Data Model & Backend

#### ST-1.1: Extend `Workspace` interface in `electron/config.ts`

- Add `color?: WorkspaceColor` and `icon?: WorkspaceIcon` optional fields
- Define `WorkspaceColor` and `WorkspaceIcon` union types
- Update `updateWorkspace()` to accept `color` and `icon` in the Partial update
- Default fallback: `color ?? "mauve"`, `icon ?? "layers"`

#### ST-1.2: Extend IPC handler `update_workspace` in `electron/main.ts`

- Extend arg type to include `color?: string` and `icon?: string`
- Pass new fields to `config.updateWorkspace()`

#### ST-1.3: Update `Workspace` interface in `frontend/stores/workspace.ts`

- Mirror the extended interface (same `color`, `icon` fields)
- Update `updateWorkspace` store action to include `color` and `icon` params

#### ST-1.4: Write tests for backend workspace updates

- `electron/__tests__/config.test.ts` — test `updateWorkspace` with color/icon
- Verify backward compat: workspace without color/icon reads back as-is

---

### Phase 2 — Frontend Utilities

#### ST-2.1: Create `frontend/lib/workspace-icons.ts`

- Map `WorkspaceIcon` string → Lucide React component
- Export `getWorkspaceIcon(icon: WorkspaceIcon): LucideIcon`
- 14 icons: Waves, Mountain, Star, Heart, Zap, Cloud, Moon, Layers, Rocket,
  FlaskConical, Paperclip, TrendingUp, GraduationCap, Coffee

#### ST-2.2: Create `frontend/lib/workspace-colors.ts`

- Map `WorkspaceColor` string → hex value
- Export `WORKSPACE_COLORS` record and `getWorkspaceColor(color: WorkspaceColor): string`
- Colors: green=#a6e3a1, teal=#94e2d5, blue=#89b4fa, mauve=#cba6f7,
  red=#f38ba8, peach=#fab387, yellow=#f9e2af

#### ST-2.3: Write tests for utility modules

- `frontend/components/__tests__/workspace-icons.test.ts`
- Test all 14 icons resolve to non-null LucideIcon
- Test all 7 colors resolve to correct hex

---

### Phase 3 — `WorkspaceSwitcher` Component

#### ST-3.1: Create `frontend/components/workspace-switcher.tsx`

Build the dropdown component:

```
<WorkspaceSwitcher>
  [WorkspaceButton trigger]
    → colored icon
    → tooltip with workspace name
  [Popover content]
    → title "Switch workspace"
    → list of workspaces
      → inactive: icon + name (click to switch)
      → active: expanded inline editor
        → name input
        → color picker (7 circles)
        → icon picker (14 icons)
        → pencil / checkmark toggle
        → "Delete workspace" red link
    → footer: "+ Create new workspace"
```

Implementation details:

- Use `@radix-ui/react-popover` (Popover, PopoverTrigger, PopoverContent)
- Local state: `isOpen`, `editingId`, `editName`, `editColor`, `editIcon`
- On confirm: call `workspaceStore.updateWorkspaceDetails(id, { name, color, icon })`
- On delete: show inline confirm prompt, then `workspaceStore.deleteWorkspace(id)`
- On create: call `invoke("open_workspace_in_new_window", { workspaceId: undefined })`
  → Actually: call `invoke("create_and_open_workspace", {})` — new IPC that creates
    a blank workspace and opens a new window
- On switch: call `workspaceStore.activateWorkspace(id)`

#### ST-3.2: Add `updateWorkspaceDetails` action to `frontend/stores/workspace.ts`

```typescript
updateWorkspaceDetails: async (id: string, updates: {
  name?: string;
  color?: WorkspaceColor;
  icon?: WorkspaceIcon;
}) => Promise<void>
```

Calls `invoke("update_workspace", { id, ...updates })` then reloads.

#### ST-3.3: Write component tests

- `frontend/components/__tests__/workspace-switcher.test.tsx`
- Renders workspace button with correct color
- Opens dropdown on click
- Shows all workspaces in list
- Active workspace shows edit controls
- Color picker updates selection
- Icon picker updates selection
- Delete triggers confirmation
- "+ Create new workspace" calls IPC

---

### Phase 4 — Titlebar Integration

#### ST-4.1: Add `WorkspaceSwitcher` to `frontend/components/titlebar.tsx`

- Import and render `<WorkspaceSwitcher />` inside the left cluster `div`
- Position: after the Menu dropdown, before the separator (if any)
- Load workspaces on mount: call `workspaceStore.loadWorkspaces()` in `useEffect`

#### ST-4.2: Write titlebar integration test

- Verify `WorkspaceSwitcher` appears in the rendered Titlebar

---

### Phase 5 — New IPC: `create_and_open_workspace`

#### ST-5.1: Add IPC handler in `electron/main.ts`

```typescript
ipcMain.handle("create_and_open_workspace", async () => {
  const config = await getConfig();
  const ws = config.createWorkspace("New Workspace");
  config.setActiveWorkspace(ws.id);
  await createWindow(undefined, ws.id);
});
```

This creates a default workspace with name "New Workspace" and opens a new window.
The user renames it inline in the new window's workspace switcher.

#### ST-5.2: Write IPC test

- Mock `getConfig`, verify `createWorkspace` is called
- Verify `createWindow` is called with the new workspace's id

---

## File Checklist

### New files

- [ ] `frontend/lib/workspace-icons.ts`
- [ ] `frontend/lib/workspace-colors.ts`
- [ ] `frontend/components/workspace-switcher.tsx`

### Modified files

- [ ] `electron/config.ts` — extend `Workspace`, `updateWorkspace`
- [ ] `electron/main.ts` — extend `update_workspace` handler, add `create_and_open_workspace`
- [ ] `frontend/stores/workspace.ts` — extend interface, add `updateWorkspaceDetails`
- [ ] `frontend/components/titlebar.tsx` — add `<WorkspaceSwitcher />`

### Test files

- [ ] `electron/__tests__/config.test.ts` — workspace color/icon
- [ ] `frontend/components/__tests__/workspace-switcher.test.tsx`

---

## Definition of Done

- [ ] All sub-tasks completed
- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles without errors (`pnpm build`)
- [ ] No `any` types introduced
- [ ] Backward-compatible: existing workspaces without color/icon work correctly
- [ ] Workspace color and icon persist after restart
- [ ] New window opens without affecting current window's PTY sessions
- [ ] Code reviewed against ADR-004

---

## Dependencies

- `@radix-ui/react-popover` (check if already available via shadcn/ui)
- `lucide-react` (already a dependency)
- Existing IPC channels: `get_workspaces`, `update_workspace`, `delete_workspace`,
  `set_active_workspace`, `open_workspace_in_new_window`
