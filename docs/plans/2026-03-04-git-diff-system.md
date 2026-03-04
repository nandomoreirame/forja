# Git Diff System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a visual diff system for changed files (similar to VS Code/Cursor/Zed), integrated with the current Git flow in Forja, including full support for multi-project workspaces.

**Architecture:** Reuse the existing Git integration (`electron/git-info.ts` + `frontend/stores/git-status.ts`) and add a new diff layer with dedicated IPC, a zustand store for review state, and React components for a changes list + side-by-side hunk viewer. In multi-project workspaces, Git/diff state will be indexed by `projectPath`, with aggregated indicators on the project folder/name in the sidebar.

**Tech Stack:** Electron IPC, `git` CLI (`git diff`/`git show`), React 19, TypeScript, Zustand, Tailwind.

---

### Task 1: Define Diff Data Contract and File Status States

**Files:**
- Create: `frontend/lib/git-diff-types.ts`
- Modify: `frontend/lib/git-constants.ts`
- Test: `frontend/lib/__tests__/git-constants.test.ts`

**Step 1: Write failing tests for new diff types/statuses**

Run: `pnpm vitest run frontend/lib/__tests__/git-constants.test.ts`
Expected: FAIL for partial status scenarios (`M`, `MM`, `??`, `D`, `R`) and diff labels.

**Step 2: Create diff contracts**

Add types for:
- `GitChangedFile` (path, status, staged/unstaged flags)
- `GitDiffHunk` (header, oldStart, oldLines, newStart, newLines, lines[])
- `GitDiffResult` (file metadata + hunks + mode: unified/split)

**Step 3: Update status mapping**

Normalize statuses for the changes list and keep labels consistent between the file tree and diff panel.

**Step 4: Run test**

Run: `pnpm vitest run frontend/lib/__tests__/git-constants.test.ts`
Expected: PASS.

---

### Task 2: Backend - Changed Files API and Per-File Patch API

**Files:**
- Modify: `electron/git-info.ts`
- Modify: `electron/main.ts`
- Test: `electron/__tests__/git-info.test.ts`

**Step 1: Write failing tests for diff APIs**

Add tests for:
- listing changed files with correct status
- getting patch for a modified file
- getting diff for a new file (`??`)
- getting diff for a deleted file
- behavior in a non-git directory

Run: `pnpm vitest run electron/__tests__/git-info.test.ts`
Expected: FAIL (new functions missing).

**Step 2: Implement backend functions**

In `electron/git-info.ts`, create:
- `getGitChangedFiles(projectPath)`
- `getGitFileDiff(projectPath, relativePath, options)`

Rules:
- use `git status --porcelain -z` for robust parsing
- use `git diff --no-color --relative -- <file>` for unstaged
- use `git diff --no-color --cached --relative -- <file>` for staged
- for `??`, generate full-addition style diff (`/dev/null -> file`)
- enforce patch size limit (e.g. 300 KB) to protect UI

**Step 3: Expose IPC handlers**

In `electron/main.ts`, add:
- `get_git_changed_files`
- `get_git_file_diff`

**Step 4: Run tests**

Run: `pnpm vitest run electron/__tests__/git-info.test.ts`
Expected: PASS.

---

### Task 3: Fix Git Event Flow for Real-Time Updates

**Files:**
- Modify: `electron/watcher.ts`
- Modify: `frontend/App.tsx`
- Test: `frontend/stores/__tests__/git-status.test.ts`

**Step 1: Write a lightweight integration test (store/event)**

Validate that changes in `.git` trigger refresh for status and changed-files list.

**Step 2: Standardize event name**

There is currently a mismatch risk (`git-changed` vs `git:changed`). Standardize to a single event name and update emitter + listener.

**Step 3: Ensure refresh works in multi-repo workspaces**

Refresh must be keyed by `projectPath`, not only `currentPath`.

**Step 3.1: Show per-project changes in workspace mode**

Add per-repository aggregation:
- per-project counters (`modified`, `added`, `deleted`, `untracked`, total)
- badge/indicator on the project root node in the sidebar
- visual dirty/clean indicator per project

The `Changes` panel must support switching/searching changed files per project.

**Step 4: Run tests**

Run: `pnpm vitest run frontend/stores/__tests__/git-status.test.ts`
Expected: PASS.

---

### Task 4: Frontend Store for Change Review

**Files:**
- Create: `frontend/stores/git-diff.ts`
- Test: `frontend/stores/__tests__/git-diff.test.ts`

**Step 1: Write failing tests**

Cases:
- load changed files list
- select file and fetch patch
- toggle staged/unstaged
- loading/error states
- fallback for file without patch

Run: `pnpm vitest run frontend/stores/__tests__/git-diff.test.ts`
Expected: FAIL.

**Step 2: Implement store**

Minimum state:
- `changedFiles`
- `selectedPath`
- `selectedDiff`
- `diffMode` (`split`/`unified`)
- `isLoadingFiles`, `isLoadingDiff`, `error`

Actions:
- `fetchChangedFiles(projectPath)`
- `selectChangedFile(projectPath, relativePath)`
- `setDiffMode(mode)`
- `refresh(projectPath)`

Multi-project extension:
- `changedFilesByProject: Record<string, GitChangedFile[]>`
- `projectCountersByPath: Record<string, { modified: number; added: number; deleted: number; untracked: number; total: number }>`
- explicit `selectedProjectPath` for navigating between projects in the changes panel.

**Step 3: Run tests**

Run: `pnpm vitest run frontend/stores/__tests__/git-diff.test.ts`
Expected: PASS.

---

### Task 5: UI - Changes Panel (List) + Diff Viewer

**Files:**
- Create: `frontend/components/git-changes-pane.tsx`
- Create: `frontend/components/git-diff-viewer.tsx`
- Create: `frontend/components/__tests__/git-changes-pane.test.tsx`
- Create: `frontend/components/__tests__/git-diff-viewer.test.tsx`
- Modify: `frontend/components/file-tree-sidebar.tsx`
- Modify: `frontend/components/file-preview-pane.tsx`

**Step 1: Write rendering/interaction tests**

Cover:
- list ordering by status/path
- file selection
- hunk rendering with added/removed/context lines
- keyboard navigation across changed files

Run: `pnpm vitest run frontend/components/__tests__/git-changes-pane.test.tsx frontend/components/__tests__/git-diff-viewer.test.tsx`
Expected: FAIL.

**Step 2: Implement baseline UX**

Target behavior:
- `Changes` section in sidebar (Source Control-like)
- in multi-project workspaces, grouped by project (each group with folder/project name + A/M/D/U counters)
- click opens diff in preview area
- side-by-side mode by default + toggle to unified
- header with status, path, and future actions (stage/discard disabled for now)

In `FileTreeSidebar`:
- show aggregated status on project folder/name (e.g. `my-api  M:2 A:1 D:1`)
- keep compatibility with existing per-file/per-folder change indicators.

**Step 3: Run tests**

Run: `pnpm vitest run frontend/components/__tests__/git-changes-pane.test.tsx frontend/components/__tests__/git-diff-viewer.test.tsx`
Expected: PASS.

---

### Task 6: App Integration and Shortcuts

**Files:**
- Modify: `frontend/App.tsx`
- Modify: `frontend/stores/file-preview.ts`
- Modify: `frontend/stores/file-tree.ts`
- Test: `frontend/components/__tests__/file-preview-pane.test.tsx`

**Step 1: Integrate lifecycle**

When project opens/changes:
- load `git-status`
- load `git-diff changed files`
- listen to Git event and refresh both

When multiple projects are open in workspace:
- update only the project affected by the event
- preserve current user selection in changes panel
- avoid reloading diffs for all projects unnecessarily.

**Step 2: Add review shortcuts**

Add shortcuts for:
- open Changes view
- next/previous changed file

**Step 3: Run tests**

Run: `pnpm vitest run frontend/components/__tests__/file-preview-pane.test.tsx`
Expected: PASS with no regressions in current preview behavior.

---

### Task 7: Performance, Limits, and Edge Cases

**Files:**
- Modify: `electron/git-info.ts`
- Modify: `frontend/components/git-diff-viewer.tsx`
- Test: `electron/__tests__/git-info.test.ts`

**Step 1: Handle critical scenarios**

- binary file (`Binary files differ`)
- very large patch (show warning + "open file preview" action)
- rename with edits (`R100`, `R085`, etc.)
- paths with spaces/unicode

**Step 2: Virtualize hunks/lines**

Prevent UI freezes with incremental/virtualized rendering for large diffs.

**Step 3: Run tests**

Run: `pnpm vitest run electron/__tests__/git-info.test.ts`
Expected: PASS.

---

### Task 8: QA, Documentation, and Rollout

**Files:**
- Modify: `README.md`
- Modify: `docs/PRD.md`
- Modify: `docs/MVP-SCOPE.md`

**Step 1: Full verification**

Run:
- `pnpm test`
- `pnpm build`

Expected: green test suite and successful build.

**Step 2: Update documentation**

- move “Diff viewer” from P2 to implemented status (or v1.1, depending on release decision)
- document initial limitations (view-only; no stage/discard in this cycle)

**Step 3: Incremental rollout**

1. Local feature flag (`settings.json`) for internal UX validation.
2. Enable by default after stability.

---

## First Release Scope (Recommended)

For fast, high-quality delivery:
1. Include diff visualization only (no apply patch/stage/discard).
2. Support one file diff open at a time.
3. Ensure automatic updates and strong performance for common cases.
4. In multi-workspace mode, show per-project changes with aggregated status on the project folder/name in the sidebar.

---

## Risks and Mitigations

1. **Inconsistent `git status` parsing:** use `--porcelain -z` and tests with rename/complex paths.
2. **Slow UI on large patches:** enforce size limit + virtualization.
3. **Confusing multi-workspace behavior:** always load diffs by `projectPath` and reset state appropriately when switching projects.
4. **Missed refresh events:** standardize event channel and cover with tests.
