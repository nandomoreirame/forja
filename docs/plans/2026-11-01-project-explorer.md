# Plan: Project Explorer

> **Spec:** docs/specs/project-explorer/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Back the Explorer section with a real, safe project tree and enable its flag.
**Architecture:** A core folder lister behind validated IPC feeds the existing section lazily; the `explorer` flag flips on when delivered.
**Tech Stack:** Electron, React, TypeScript; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 16 of 17 (future, flagged)
**Total Tasks:** 2
**Estimated Complexity:** small
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- [ui-quick-adjustments](2026-11-01-ui-quick-adjustments.md) (flags)

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the complete spec and current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.


## Acceptance

- Explorer shows the real tree without reading file contents and appears in production only after delivery.

## Checks

**Run explorer**: `npx vitest run test/files/tree.test.ts test/renderer/explorer-live.test.tsx --reporter=verbose`

- C1 (REQ-111): the core lists folders first with ignored entries marked and Explorer loads folders on expand. Proof: run explorer | PASS lists one folder with folders first and ignored entries marked

## Tasks

### Task 1: List project folders lazily without reading contents

**Requirement:** REQ-111
**Files:**

- Create: `src/core/files/tree.ts`
- Test: `test/files/tree.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { listFolder } from '../../src/core/files/tree'
it('lists one folder with folders first and ignored entries marked', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forja-tree-'))
  await mkdir(join(root, 'src'))
  await writeFile(join(root, 'README.md'), '# x')
  await writeFile(join(root, '.env'), 'SECRET=1')
  const entries = await listFolder(root, '', { ignored: (path) => path === '.env', limit: 500 })
  expect(entries).toEqual([
    { name: 'src', kind: 'folder', ignored: false },
    { name: '.env', kind: 'file', ignored: true },
    { name: 'README.md', kind: 'file', ignored: false },
  ])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/files/tree.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Expose `listFolder(projectRoot, relativePath)` over validated IPC: canonical paths only inside the project, entries sorted folders first, git-ignored entries flagged (from `git check-ignore` batch), at most `limit` entries with a truncation flag, symlinks listed but not followed, and never reading file contents.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/files/tree.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A relative path with `..` is refused.
- A folder above the limit returns a truncated flag.
- No file content is opened (spy on read calls).

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Feed the Explorer section from the core tree

**Requirement:** REQ-111, REQ-106
**Depends on:** Task 1
**Files:**

- Modify: `src/renderer/src/features/source-control/explorer-section.tsx`
- Test: `test/renderer/explorer-live.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('loads a folder when it expands', async () => {
  const source = createMockSource({ locale: 'en' })
  const calls: string[] = []
  source.listFolder = async (path) => { calls.push(path); return [{ name: 'index.ts', kind: 'file', ignored: false }] }
  render(<WorkbenchPage source={source} initialProjectId="dev" />)
  const tree = await screen.findByRole('tree', { name: 'Explorer' })
  fireEvent.click(within(tree).getByRole('button', { name: /^src/ }))
  expect(await within(tree).findByRole('treeitem', { name: /^index\.ts/ })).toBeInTheDocument()
  expect(calls).toContain('src')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/explorer-live.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `listFolder` to `WorkbenchSource` (mock keeps the sample tree; desktop calls core). The section loads the root on mount and each folder on first expand, shows a loading row and an error row on failure, and keeps git decorations from source control when its flag is on. Turning the `explorer` flag on for production happens in this task's final commit once tests pass.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/explorer-live.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The flag stays off in production until this task is accepted.
- An IPC error shows an error row, not an empty tree.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
