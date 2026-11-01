# Plan: Source Control Changes

> **Spec:** docs/specs/source-control-changes/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Back the Changes section and the statusbar sync counts with real Git data and enable their flag.
**Architecture:** Core parsers over the owned Git executor feed new `WorkbenchSource` calls; the `source-control` flag flips on when delivered.
**Tech Stack:** Electron, React, TypeScript; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 17 of 17 (future, flagged)
**Total Tasks:** 3
**Estimated Complexity:** small
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- [feature-git-worktrees](2026-10-30-feature-git-worktrees.md)
- [ui-quick-adjustments](2026-11-01-ui-quick-adjustments.md) (flags)

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the complete spec and current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.


## Acceptance

- Changes and sync counts reflect the real repository and appear in production only after delivery.

## Checks

**Run scm**: `npx vitest run test/git/status.test.ts test/git/sync.test.ts test/renderer/source-control-live.test.tsx --reporter=verbose`

- C1 (REQ-112): working tree changes map to short statuses. Proof: run scm | PASS maps porcelain v2 entries to short statuses
- C2 (REQ-113): behind and ahead counts come from the upstream. Proof: run scm | PASS reads behind and ahead counts

## Tasks

### Task 1: Parse working tree changes from git status

**Requirement:** REQ-112
**Files:**

- Create: `src/core/git/status.ts`
- Test: `test/git/status.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { parsePorcelainV2 } from '../../src/core/git/status'
it('maps porcelain v2 entries to short statuses', () => {
  const raw = ['1 .M N... 100644 100644 100644 a b CLAUDE.md', '? test/new.test.ts', '1 A. N... 000000 100644 100644 0 b docs/SPEC.md', '1 D. N... 100644 000000 000000 a 0 old.sh'].join('\0')
  expect(parsePorcelainV2(raw)).toEqual([
    { path: 'CLAUDE.md', status: 'M' },
    { path: 'test/new.test.ts', status: 'U' },
    { path: 'docs/SPEC.md', status: 'A' },
    { path: 'old.sh', status: 'D' },
  ])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/status.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Run `git status --porcelain=v2 -z --untracked-files=all` through the owned Git executor in the feature worktree (or the opened repository) and parse it into `{ path, status }`; renames become a deletion plus an addition. Refresh after turns, Git operations and on a 10 s timer while the window is focused.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/status.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Paths with spaces and unicode parse correctly from `-z` output.
- A non-repository folder reports no changes without an error dialog.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Count commits behind and ahead of the upstream

**Requirement:** REQ-113
**Depends on:** Task 1
**Files:**

- Create: `src/core/git/sync.ts`
- Test: `test/git/sync.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { parseLeftRight } from '../../src/core/git/sync'
it('reads behind and ahead counts', () => {
  expect(parseLeftRight('2\t5\n')).toEqual({ behind: 2, ahead: 5 })
  expect(parseLeftRight('')).toBeUndefined()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/sync.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Use `git rev-list --left-right --count @{upstream}...HEAD` (or the feature base when no upstream) through the Git executor; no upstream returns undefined so the statusbar shows only the branch. The tooltip names the base it compared against.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/sync.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Detached HEAD shows the short commit and no counts.
- A missing upstream never throws to the renderer.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Feed Changes and the statusbar from core and enable the flag

**Requirement:** REQ-112, REQ-113, REQ-106
**Depends on:** Task 2
**Files:**

- Modify: `src/renderer/src/features/source-control/changes-section.tsx`
- Modify: `src/renderer/src/widgets/git-status.tsx`
- Test: `test/renderer/source-control-live.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('shows live changes and sync counts from the source', async () => {
  const source = createMockSource({ locale: 'en' })
  source.loadChanges = async () => [{ path: 'src/app.ts', status: 'M' }]
  source.loadSync = async () => ({ behind: 1, ahead: 4, base: 'origin/main' })
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const changes = await screen.findByRole('list', { name: 'Changes' })
  expect(within(changes).getByRole('listitem', { name: /^app\.ts/ })).toHaveTextContent('M')
  expect(screen.getByRole('contentinfo')).toHaveTextContent('1↓ 4↑')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/source-control-live.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `loadChanges` and `loadSync` to `WorkbenchSource` (mock returns the sample data; desktop calls core) and replace the snapshot-held mock values. Flip the `source-control` flag on for production in this task's final commit once tests pass.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/source-control-live.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The flag stays off in production until this task is accepted.
- Loading errors keep the last values marked unavailable.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
