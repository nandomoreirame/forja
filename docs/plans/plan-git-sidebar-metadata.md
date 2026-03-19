# Plan: Metadados de Git na Sidebar de Projetos

**Priority:** High
**Date:** 2026-03-19

---

## 1. Overview and Motivation

Currently, Forja shows the current git branch only in the global status bar at the bottom, and only for the active project. Users with multiple projects in the sidebar have no way to see the git state of their other projects without switching to each one.

The goal is to enrich the project sidebar with per-project git metadata:

1. **Current git branch** — shown as a small label below/beside the project icon in the tooltip and optionally inline
2. **Modified files count** — shown as a numeric badge (e.g., `+3`) on the sidebar icon
3. **Linked PRs** (stretch goal) — via `gh` CLI or GitHub API, show open PR count

---

## 2. Current State Analysis

### What already exists

**`electron/git-info.ts`:**
- `getGitInfo(projectPath)` — returns `{ branch: string, modified_count: number }` via `git status --porcelain --branch`
- TTL-cached per project in the watcher module
- Already called for the active project's status bar display

**`frontend/stores/projects.ts`:**
- `Project` interface: `{ path, name, lastOpened, iconPath? }`
- No git metadata fields currently
- `sessionStates`, `unreadProjects`, `thinkingProjects`, `notifiedProjects` — all per-project Sets

**`frontend/components/project-sidebar.tsx`:**
- `ProjectIcon` renders: project icon/initial, active ring, thinking spinner, notification badge
- Tooltip shows: project name + path
- No git info rendered anywhere in sidebar

**`electron/main.ts`:**
- `ipcMain.handle("get_git_info", ...)` — IPC handler wrapping `getGitInfo(projectPath)`
- This is the channel used by the active project's status bar

**`electron/watcher.ts`:**
- Git watcher monitors `.git/` for changes with 500ms debounce
- Sends `git:changed` IPC event to frontend when git state changes
- Only watches the active project

### What is missing

1. Per-project git state cache in the projects store
2. Background fetching of git info for all projects (not just active)
3. Sidebar UI to display branch name and modified count
4. Watcher coverage for non-active projects (or poll-based fallback)

---

## 3. Step-by-Step Implementation Plan

### Step 1: Add git metadata types and state to projects store

Extend the `Project` interface and store:

```ts
// In frontend/stores/projects.ts
export interface ProjectGitInfo {
  branch: string;
  modifiedCount: number;
  fetchedAt: number; // timestamp
}

interface ProjectsState {
  // ... existing fields ...
  gitInfoByProject: Record<string, ProjectGitInfo>;
  fetchGitInfo: (projectPath: string) => Promise<void>;
  refreshAllGitInfo: () => Promise<void>;
  setGitInfo: (projectPath: string, info: ProjectGitInfo) => void;
}
```

**File:** `frontend/stores/projects.ts`

### Step 2: Implement `fetchGitInfo` action

```ts
fetchGitInfo: async (projectPath) => {
  try {
    const info = await invoke<{ branch: string; modified_count: number }>("get_git_info", { path: projectPath });
    if (info) {
      set((s) => ({
        gitInfoByProject: {
          ...s.gitInfoByProject,
          [projectPath]: {
            branch: info.branch,
            modifiedCount: info.modified_count,
            fetchedAt: Date.now(),
          },
        },
      }));
    }
  } catch {
    // Non-fatal — project may not be a git repo
  }
},
```

Cache TTL: 30 seconds — `fetchGitInfo` skips the IPC call if data is fresh.

### Step 3: Fetch git info on project load and on project add

In `loadProjects()`, after loading the project list, fan-out `fetchGitInfo` for all projects:

```ts
// After loading projects
for (const p of projects) {
  get().fetchGitInfo(p.path).catch(() => {});
}
```

In `addProject()`, call `fetchGitInfo` for the new project.

**File:** `frontend/stores/projects.ts`

### Step 4: React to git change events for background projects

The frontend already listens for `git:changed` events (via `listen("git:changed", ...)`). Currently it only refreshes the active project's git state. Extend this listener to also update `gitInfoByProject` for the relevant project path.

However, the watcher only watches the active project's `.git/` directory. For non-active projects, we need a lightweight polling approach.

**Strategy: Stale-while-revalidate polling**

In `App.tsx` or a dedicated hook `useGitInfoPoller`, set up a 60-second interval that calls `refreshAllGitInfo()`:

```ts
useEffect(() => {
  const interval = setInterval(() => {
    useProjectsStore.getState().refreshAllGitInfo();
  }, 60_000);
  return () => clearInterval(interval);
}, []);
```

`refreshAllGitInfo` iterates all projects and calls `fetchGitInfo` (which internally skips if data is fresher than 30s).

Also listen for `git:changed` events to refresh only the affected project immediately:

```ts
listen("git:changed", ({ projectPath }) => {
  useProjectsStore.getState().fetchGitInfo(projectPath);
});
```

**File:** `frontend/App.tsx` or `frontend/hooks/use-git-info-poller.ts`

### Step 5: Display branch name and modified count in sidebar tooltip

Update `ProjectIcon`'s `TooltipContent` to include git metadata:

```tsx
const gitInfo = useProjectsStore(s => s.gitInfoByProject[project.path]);

<TooltipContent side="right" className="max-w-xs">
  <p className="font-semibold">{project.name}</p>
  {gitInfo && gitInfo.branch !== "unknown" && (
    <div className="mt-1 flex items-center gap-1.5 text-app-sm text-ctp-blue">
      <GitBranch className="h-3 w-3" strokeWidth={2} />
      <span>{gitInfo.branch}</span>
      {gitInfo.modifiedCount > 0 && (
        <span className="text-ctp-yellow">·{gitInfo.modifiedCount} changed</span>
      )}
    </div>
  )}
  <p className="text-app-sm text-ctp-overlay1">{project.path}</p>
</TooltipContent>
```

**File:** `frontend/components/project-sidebar.tsx`

### Step 6: Display modified count badge on sidebar icon (optional inline indicator)

Add a subtle numeric badge to the project icon when `modifiedCount > 0` and the project is not active:

```tsx
{!isActive && gitInfo?.modifiedCount > 0 && (
  <span
    className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-ctp-yellow px-0.5 text-[9px] font-bold text-ctp-base ring-1 ring-ctp-mantle"
    aria-label={`${gitInfo.modifiedCount} modified files`}
  >
    {gitInfo.modifiedCount > 99 ? "99+" : gitInfo.modifiedCount}
  </span>
)}
```

Note: This badge should only show when `modifiedCount > 0` AND when it doesn't conflict with the notification/thinking badges. Badge priority: thinking spinner > notification badge > git badge.

**File:** `frontend/components/project-sidebar.tsx`

### Step 7: (Stretch) Show linked PRs via `gh` CLI

Add a new IPC handler `get_project_prs` that runs:
```sh
gh pr list --state=open --json=number,title,headRefName --limit=3
```
in the project directory. Parse and return the result.

Show PR count as a small purple icon in the sidebar tooltip.

**Condition:** Only implement if `gh` is detected as installed (use existing `cli-detector` module).

**Files:** `electron/main.ts`, `frontend/stores/projects.ts`, `frontend/components/project-sidebar.tsx`

---

## 4. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `frontend/stores/projects.ts` | Modify | Add `ProjectGitInfo`, `gitInfoByProject`, `fetchGitInfo`, `refreshAllGitInfo`, `setGitInfo` |
| `frontend/components/project-sidebar.tsx` | Modify | Show branch + modified count in tooltip; add modified count badge |
| `frontend/App.tsx` | Modify | Add `useGitInfoPoller` or inline polling logic, wire `git:changed` handler |
| `frontend/hooks/use-git-info-poller.ts` | Create | Custom hook encapsulating the 60s polling logic |
| `electron/main.ts` | No change | `get_git_info` IPC handler already exists |

---

## 5. Test Strategy

### Unit tests

**`frontend/stores/__tests__/projects.test.ts`:**
- `fetchGitInfo` calls `invoke("get_git_info", ...)` and stores result
- `fetchGitInfo` skips IPC call when data is fresh (< 30s old)
- `fetchGitInfo` is a no-op when IPC throws
- `refreshAllGitInfo` calls `fetchGitInfo` for each project

### Component tests

**`frontend/components/__tests__/project-sidebar.test.tsx`:**
- Renders branch name in tooltip when `gitInfo.branch !== "unknown"`
- Renders modified count badge when `modifiedCount > 0` and project is not active
- Does not render git badge when project is active
- Does not render git badge when `modifiedCount === 0`
- Badge shows "99+" when `modifiedCount > 99`
- Badge priority: thinking spinner takes precedence over git badge

### Hook tests

**`frontend/hooks/__tests__/use-git-info-poller.test.ts`:**
- Sets up 60s interval on mount
- Clears interval on unmount
- Calls `refreshAllGitInfo` on each tick

---

## 6. Acceptance Criteria

- [ ] The sidebar tooltip for any project shows the current git branch
- [ ] The branch name updates within 60 seconds of a git checkout (via polling)
- [ ] The branch name updates immediately for the active project (via `git:changed` event)
- [ ] When a project has modified files, a yellow count badge appears on its sidebar icon
- [ ] The badge disappears after all modifications are committed/reverted
- [ ] Projects that are not git repos show no git metadata (no "unknown" branch shown)
- [ ] All new tests pass
- [ ] Performance: no IPC calls more frequent than 30s per project
