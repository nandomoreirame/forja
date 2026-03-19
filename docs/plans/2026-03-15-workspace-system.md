# Implementation Plan: Workspace System (PRD-004 / TASK-005)

**Date:** 2026-03-15
**Branch:** `feature/tiling-layout` (current branch)
**Status:** Planning

---

## Summary

This plan implements the rich Workspace System for Forja. The feature extends the
existing minimal workspace data model with visual identity (color + icon), adds a
topbar dropdown switcher (`WorkspaceSwitcher`), and provides a "+  Create new workspace"
flow that opens a new Electron window while keeping all other sessions alive.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Titlebar (frontend/components/titlebar.tsx)            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  [Menu]  [WorkspaceSwitcher]  ... title ...       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  WorkspaceSwitcher (frontend/components/workspace-switcher)  │
│  State: isOpen, editingId, editName, editColor, editIcon     │
│  ─────────────────────────────────────────────────────────── │
│  WorkspaceButton trigger                                     │
│    → colored icon (WorkspaceIcon), tooltip (name)            │
│  PopoverContent                                              │
│    → "Switch workspace" title                                │
│    → WorkspaceRow (for each workspace)                       │
│      inactive: [icon] [name]  ← click to switch             │
│      active:   [icon] [name] [pencil] → expand edit mode    │
│        edit mode: name input                                 │
│                   ColorPicker (7 circles)                    │
│                   IconPicker (14 icons, 7×2 grid)            │
│                   [Delete workspace] red link                │
│    → [+ Create new workspace] footer button                  │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  useWorkspaceStore (frontend/stores/workspace.ts)            │
│  New action: updateWorkspaceDetails(id, {name,color,icon})   │
│  Calls: invoke("update_workspace", {id, name, color, icon})  │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  electron/main.ts IPC handlers                               │
│  update_workspace: now accepts color + icon                  │
│  create_and_open_workspace: creates workspace, new window    │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  electron/config.ts                                          │
│  Workspace interface: +color?: WorkspaceColor                │
│                       +icon?: WorkspaceIcon                  │
│  updateWorkspace(): extended to accept color, icon           │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Data Model & Backend (Start Here)

### Step 1.1 — Extend `Workspace` in `electron/config.ts`

**File:** `/home/nandomoreira/dev/projects/forja/electron/config.ts`

Add type definitions and extend the interface:

```typescript
// Add BEFORE the Workspace interface
export type WorkspaceColor =
  | "green"   // #a6e3a1
  | "teal"    // #94e2d5
  | "blue"    // #89b4fa
  | "mauve"   // #cba6f7 (default)
  | "red"     // #f38ba8
  | "peach"   // #fab387
  | "yellow"; // #f9e2af

export type WorkspaceIcon =
  | "waves" | "mountain" | "star" | "heart" | "bolt" | "cloud"
  | "moon"  | "layers"   | "rocket" | "beaker" | "link" | "trending"
  | "graduation" | "coffee";

// Modify Workspace interface to:
export interface Workspace {
  id: string;
  name: string;
  color?: WorkspaceColor;  // defaults to "mauve" at read-time
  icon?: WorkspaceIcon;    // defaults to "layers" at read-time
  projects: string[];
  createdAt: string;
  lastUsedAt: string;
}
```

Also extend `updateWorkspace` function signature:

```typescript
export function updateWorkspace(
  id: string,
  updates: Partial<Pick<Workspace, "name" | "color" | "icon">>
): Workspace | null {
  // same implementation, but now applies color and icon too
}
```

### Step 1.2 — Extend IPC handler in `electron/main.ts`

**File:** `/home/nandomoreira/dev/projects/forja/electron/main.ts`

```typescript
// Find existing update_workspace handler and replace with:
ipcMain.handle("update_workspace", async (_event, args: {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
}) => {
  const config = await getConfig();
  const updates: Parameters<typeof config.updateWorkspace>[1] = {};
  if (args.name !== undefined) updates.name = args.name;
  if (args.color !== undefined) updates.color = args.color as import("./config.js").WorkspaceColor;
  if (args.icon !== undefined) updates.icon = args.icon as import("./config.js").WorkspaceIcon;
  return config.updateWorkspace(args.id, updates);
});

// Add new IPC handler for create-and-open:
ipcMain.handle("create_and_open_workspace", async () => {
  const config = await getConfig();
  const ws = config.createWorkspace("New Workspace");
  await createWindow(undefined, ws.id);
  return ws;
});
```

### Step 1.3 — Tests for backend changes

**File:** `/home/nandomoreira/dev/projects/forja/electron/__tests__/config.test.ts`

Add tests:

- `updateWorkspace` with `color` and `icon` persists correctly
- Existing workspace without color/icon reads back as-is (backward compat)

---

## Phase 2: Frontend Utilities

### Step 2.1 — `frontend/lib/workspace-icons.ts`

```typescript
import type { LucideIcon } from "lucide-react";
import {
  Waves, Mountain, Star, Heart, Zap, Cloud, Moon, Layers,
  Rocket, FlaskConical, Paperclip, TrendingUp, GraduationCap, Coffee,
} from "lucide-react";
import type { WorkspaceIcon } from "@/stores/workspace";

export const WORKSPACE_ICON_MAP: Record<WorkspaceIcon, LucideIcon> = {
  waves:      Waves,
  mountain:   Mountain,
  star:       Star,
  heart:      Heart,
  bolt:       Zap,
  cloud:      Cloud,
  moon:       Moon,
  layers:     Layers,
  rocket:     Rocket,
  beaker:     FlaskConical,
  link:       Paperclip,
  trending:   TrendingUp,
  graduation: GraduationCap,
  coffee:     Coffee,
};

export function getWorkspaceIcon(icon: WorkspaceIcon): LucideIcon {
  return WORKSPACE_ICON_MAP[icon] ?? Layers;
}

export const WORKSPACE_ICON_LIST: WorkspaceIcon[] = Object.keys(
  WORKSPACE_ICON_MAP
) as WorkspaceIcon[];
```

### Step 2.2 — `frontend/lib/workspace-colors.ts`

```typescript
import type { WorkspaceColor } from "@/stores/workspace";

export const WORKSPACE_COLOR_MAP: Record<WorkspaceColor, string> = {
  green:  "#a6e3a1",
  teal:   "#94e2d5",
  blue:   "#89b4fa",
  mauve:  "#cba6f7",
  red:    "#f38ba8",
  peach:  "#fab387",
  yellow: "#f9e2af",
};

export function getWorkspaceColor(color: WorkspaceColor): string {
  return WORKSPACE_COLOR_MAP[color] ?? WORKSPACE_COLOR_MAP.mauve;
}

export const WORKSPACE_COLOR_LIST: WorkspaceColor[] =
  Object.keys(WORKSPACE_COLOR_MAP) as WorkspaceColor[];
```

---

## Phase 3: Frontend Store Update

### Step 3.1 — Update `frontend/stores/workspace.ts`

Import types from config (re-export via store file):

```typescript
export type WorkspaceColor = "green" | "teal" | "blue" | "mauve" | "red" | "peach" | "yellow";
export type WorkspaceIcon = "waves" | "mountain" | "star" | "heart" | "bolt" | "cloud" | "moon" | "layers" | "rocket" | "beaker" | "link" | "trending" | "graduation" | "coffee";

export interface Workspace {
  id: string;
  name: string;
  color?: WorkspaceColor;
  icon?: WorkspaceIcon;
  projects: string[];
  createdAt: string;
  lastUsedAt: string;
}

// New action in WorkspaceState:
updateWorkspaceDetails: (id: string, updates: {
  name?: string;
  color?: WorkspaceColor;
  icon?: WorkspaceIcon;
}) => Promise<void>;
```

Implementation:

```typescript
updateWorkspaceDetails: async (id, updates) => {
  await invoke("update_workspace", { id, ...updates });
  await get().loadWorkspaces();
},
```

---

## Phase 4: `WorkspaceSwitcher` Component

### Step 4.1 — Create `frontend/components/workspace-switcher.tsx`

Key design decisions:

1. **Popover** (not DropdownMenu) to allow inline editing without auto-close
2. **Local edit state** per workspace row (editingId tracks which row is being edited)
3. **Immediate visual feedback** on color/icon change (optimistic UI — update locally,
   then persist)

Component structure:

```tsx
export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<WorkspaceColor>("mauve");
  const [editIcon, setEditIcon] = useState<WorkspaceIcon>("layers");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { workspaces, activeWorkspaceId, loadWorkspaces,
          updateWorkspaceDetails, deleteWorkspace, activateWorkspace } = useWorkspaceStore();

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId);
  const activeColor = activeWorkspace?.color ?? "mauve";
  const activeIcon = activeWorkspace?.icon ?? "layers";
  const ActiveIcon = getWorkspaceIcon(activeIcon);
  const activeHex = getWorkspaceColor(activeColor);

  // ... render WorkspaceButton trigger + PopoverContent
}
```

The **WorkspaceButton** (trigger):

```tsx
<button
  className="inline-flex h-8 w-8 items-center justify-center rounded-md
             transition-colors hover:bg-ctp-surface0"
  aria-label={`Workspace: ${activeWorkspace?.name ?? "None"}`}
>
  <ActiveIcon className="h-4 w-4" style={{ color: activeHex }} strokeWidth={1.5} />
</button>
```

The **PopoverContent** — workspace list:

```tsx
<div className="w-64 rounded-lg border border-ctp-surface0 bg-overlay-base p-1 shadow-lg">
  <p className="px-2 py-1.5 text-xs font-medium text-ctp-overlay1">Switch workspace</p>
  <div className="space-y-0.5">
    {workspaces.map(ws => (
      <WorkspaceRow
        key={ws.id}
        workspace={ws}
        isActive={ws.id === activeWorkspaceId}
        isEditing={editingId === ws.id}
        editName={editName}
        editColor={editColor}
        editIcon={editIcon}
        deleteConfirmId={deleteConfirmId}
        onSelect={() => { activateWorkspace(ws.id); setIsOpen(false); }}
        onEditStart={() => {
          setEditingId(ws.id);
          setEditName(ws.name);
          setEditColor(ws.color ?? "mauve");
          setEditIcon(ws.icon ?? "layers");
        }}
        onEditConfirm={async () => {
          await updateWorkspaceDetails(ws.id, {
            name: editName,
            color: editColor,
            icon: editIcon,
          });
          setEditingId(null);
        }}
        onEditCancel={() => setEditingId(null)}
        onNameChange={setEditName}
        onColorChange={setEditColor}
        onIconChange={setEditIcon}
        onDeleteRequest={() => setDeleteConfirmId(ws.id)}
        onDeleteConfirm={async () => {
          await deleteWorkspace(ws.id);
          setDeleteConfirmId(null);
        }}
        onDeleteCancel={() => setDeleteConfirmId(null)}
      />
    ))}
  </div>
  <div className="mt-1 border-t border-ctp-surface0 pt-1">
    <button
      onClick={() => invoke("create_and_open_workspace", {})}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5
                 text-sm text-ctp-overlay1 transition-colors hover:bg-ctp-surface0
                 hover:text-ctp-text"
    >
      <Plus className="h-3.5 w-3.5" />
      Create new workspace
    </button>
  </div>
</div>
```

The **WorkspaceRow** (inactive mode):

```tsx
<button
  onClick={onSelect}
  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5
             text-sm text-ctp-text transition-colors hover:bg-ctp-surface0"
>
  <WorkspaceIconEl className="h-3.5 w-3.5" style={{ color: hex }} strokeWidth={1.5} />
  <span className="flex-1 text-left">{workspace.name}</span>
</button>
```

The **WorkspaceRow** (active + edit mode):

```tsx
// Active row (not editing):
<div className="flex items-center gap-2 rounded-md bg-ctp-surface0/50 px-2 py-1.5">
  <WorkspaceIconEl className="h-3.5 w-3.5" style={{ color: hex }} strokeWidth={1.5} />
  <span className="flex-1 text-sm font-medium text-ctp-text">{workspace.name}</span>
  <button onClick={onEditStart} aria-label="Edit workspace">
    <Pencil className="h-3 w-3" />
  </button>
</div>

// Editing row:
<div className="rounded-md bg-ctp-surface0/50 px-2 py-2 space-y-2">
  {/* Name input */}
  <input value={editName} onChange={e => onNameChange(e.target.value)} ... />

  {/* Color picker */}
  <div className="flex gap-1.5">
    {WORKSPACE_COLOR_LIST.map(color => (
      <button
        key={color}
        onClick={() => onColorChange(color)}
        style={{ backgroundColor: WORKSPACE_COLOR_MAP[color] }}
        className={cn("h-5 w-5 rounded-full transition-transform",
          editColor === color && "ring-2 ring-white ring-offset-1 scale-110")}
        aria-label={color}
      />
    ))}
  </div>

  {/* Icon picker — 7 columns × 2 rows */}
  <div className="grid grid-cols-7 gap-1">
    {WORKSPACE_ICON_LIST.map(icon => {
      const Icon = getWorkspaceIcon(icon);
      return (
        <button
          key={icon}
          onClick={() => onIconChange(icon)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            editIcon === icon
              ? "bg-ctp-surface1 text-ctp-text"
              : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
          )}
          aria-label={icon}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      );
    })}
  </div>

  {/* Footer: confirm + delete */}
  <div className="flex items-center justify-between">
    <button onClick={...} className="text-xs text-ctp-red hover:underline">
      Delete workspace
    </button>
    <button onClick={onEditConfirm} aria-label="Confirm">
      <Check className="h-3.5 w-3.5" />
    </button>
  </div>
</div>
```

---

## Phase 5: Titlebar Integration

### Step 5.1 — Add `WorkspaceSwitcher` to `frontend/components/titlebar.tsx`

In the left cluster `div` (the `no-drag` zone on the left), after the Menu dropdown:

```tsx
import { WorkspaceSwitcher } from "./workspace-switcher";

// Inside the left cluster div:
<div className="flex w-12 ...">
  {/* existing Menu dropdown */}
</div>
<WorkspaceSwitcher />
```

---

## Phase 6: Tests (TDD)

### Test files to create/update

1. **`electron/__tests__/config.test.ts`** (update existing)
   - `updateWorkspace` with color persists
   - `updateWorkspace` with icon persists
   - existing workspace without color/icon reads back unchanged

2. **`frontend/components/__tests__/workspace-switcher.test.tsx`** (new)
   - renders trigger button with active workspace's icon
   - opens popover on click
   - renders workspace list
   - active workspace shows edit button
   - clicking edit enters edit mode
   - color picker renders 7 circles
   - icon picker renders 14 icons
   - clicking "+ Create new workspace" calls `invoke("create_and_open_workspace")`
   - clicking inactive workspace calls `activateWorkspace`

---

## Implementation Order

```
1. [ ] Write failing tests first (TDD)
2. [ ] Phase 1: electron/config.ts — types + updateWorkspace
3. [ ] Phase 1: electron/main.ts — IPC handlers
4. [ ] Phase 2: workspace-icons.ts + workspace-colors.ts
5. [ ] Phase 3: stores/workspace.ts — interface + updateWorkspaceDetails
6. [ ] Phase 4: workspace-switcher.tsx — full component
7. [ ] Phase 5: titlebar.tsx — integration
8. [ ] Run all tests: pnpm test
9. [ ] TypeScript compile check: pnpm build
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Popover stays open when clicking inside | Use `onOpenChange` carefully; only close on trigger click or Escape |
| Edit mode lost on workspace list reload | Keep `editingId` in local state, not store |
| `FlaskConical` not available in older lucide-react | Check lucide-react version; fallback to `Beaker` |
| Multiple windows with same workspace | Current design: one window per workspace; `activeWorkspaceId` is per-store |

---

## Files Summary

### New Files

| File | LOC est. |
|------|----------|
| `frontend/lib/workspace-icons.ts` | ~30 |
| `frontend/lib/workspace-colors.ts` | ~25 |
| `frontend/components/workspace-switcher.tsx` | ~280 |
| `frontend/components/__tests__/workspace-switcher.test.tsx` | ~120 |

### Modified Files

| File | Change |
|------|--------|
| `electron/config.ts` | +WorkspaceColor, +WorkspaceIcon types; extend `Workspace`, `updateWorkspace` |
| `electron/main.ts` | extend `update_workspace` handler; add `create_and_open_workspace` |
| `frontend/stores/workspace.ts` | +WorkspaceColor, +WorkspaceIcon exports; extend `Workspace`; add `updateWorkspaceDetails` |
| `frontend/components/titlebar.tsx` | add `<WorkspaceSwitcher />` import + render |
| `electron/__tests__/config.test.ts` | add workspace color/icon tests |
| `docs/.counters.json` | update counters |
