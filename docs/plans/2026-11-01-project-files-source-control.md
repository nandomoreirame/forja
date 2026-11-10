# Plan: Project Files and Source Control

> **Spec:** docs/specs/project-files-source-control/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Serve the real file tree, safe previews and diffs, and working tree status to the flagged panels.
**Architecture:** Core file services with canonical path checks and size bounds; Git status through porcelain output; IPC wiring into the existing panels.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 14
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 02 `chat-core-store` and 09 `chat-worktrees`; slice 03 IPC source.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Explorer and Changes show real data and open real previews and diffs.
- Their flags are released when checks pass.

## Checks

**Run slice**: `npx vitest run test/core/file-read.test.ts test/core/file-tree.test.ts test/core/git-status.test.ts test/renderer/ipc-files.test.ts --reporter=verbose`

- C1 (REQ-053): file tree holds as specified. Proof: run slice | ✓ lists folders first, marks ignored entries and never reads contents
- C2 (REQ-054): file preview and diff reads holds as specified. Proof: run slice | ✓ reads text inside the project and refuses secrets, escapes, binary and oversized files
- C3 (REQ-055): working tree status holds as specified. Proof: run slice | ✓ maps short status and counts commits behind and ahead of the base

## Tasks

### Task 1: List the project tree with bounds

**Requirement:** REQ-053
**Files:**

- Create: `src/core/files/tree.ts`
- Test: `test/core/file-tree.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { listTree } from '../../src/core/files/tree'
it('lists folders first, marks ignored entries and never reads contents', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-tree-'))
  mkdirSync(join(root, 'src')); writeFileSync(join(root, 'src/a.ts'), 'x'); writeFileSync(join(root, 'README.md'), 'x'); writeFileSync(join(root, '.gitignore'), 'dist\n'); mkdirSync(join(root, 'dist'))
  const tree = listTree(root, { maxDepth: 3, maxEntries: 100 })
  expect(tree.map((n) => n.name)).toEqual(['dist', 'src', '.gitignore', 'README.md'])
  expect(tree.find((n) => n.name === 'dist')).toMatchObject({ ignored: true })
  expect(JSON.stringify(tree)).not.toContain('"content"')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/file-tree.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Lazy listing per folder with depth and entry bounds and a truncation marker; symlinks outside the project are listed but not followed; unreadable folders yield an error node.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/file-tree.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Large folders show a truncation marker.
- Symlink loops do not recurse.
- Unreadable folders do not fail the tree.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Read previews and diffs safely

**Requirement:** REQ-054
**Files:**

- Create: `src/core/files/read.ts`
- Test: `test/core/file-read.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { readProjectFile } from '../../src/core/files/read'
it('reads text inside the project and refuses secrets, escapes, binary and oversized files', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-read-'))
  writeFileSync(join(root, 'a.ts'), 'export {}\n'); writeFileSync(join(root, '.env'), 'KEY=1'); writeFileSync(join(root, 'b.png'), Buffer.from([0, 1, 2]))
  expect(readProjectFile(root, 'a.ts')).toEqual({ kind: 'text', text: 'export {}\n' })
  expect(readProjectFile(root, '.env')).toEqual({ kind: 'binary' })
  expect(readProjectFile(root, 'b.png')).toEqual({ kind: 'binary' })
  expect(() => readProjectFile(root, '../etc/passwd')).toThrow(/path/)
  writeFileSync(join(root, 'big.txt'), 'x'.repeat(2_000_000))
  expect(readProjectFile(root, 'big.txt')).toEqual({ kind: 'too-large' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/file-read.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Canonical path checks against the project or chat worktree; `.env*` and other secret patterns report `binary` (protected) without reading; binary detection by NUL bytes; a size bound; diffs read the base from `git show <base>:<path>` and the working file the same way.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/file-read.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Symlinks escaping the root are refused.
- Secret files are never read, not even partially.
- Diff of an untracked file has an empty base.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Report working tree status and sync counts

**Requirement:** REQ-055
**Files:**

- Create: `src/core/files/git-status.ts`
- Test: `test/core/git-status.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { gitStatus } from '../../src/core/files/git-status'
it('maps short status and counts commits behind and ahead of the base', () => {
  const repo = mkdtempSync(join(tmpdir(), 'forja-st-'))
  const git = (...a: string[]) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: repo })
  git('init', '-q', '-b', 'main'); writeFileSync(join(repo, 'a'), '1'); git('add', '.'); git('commit', '-qm', 'i')
  git('checkout', '-qb', 'feature/x'); writeFileSync(join(repo, 'b'), '2'); git('add', '.'); git('commit', '-qm', 'f')
  writeFileSync(join(repo, 'a'), 'changed'); writeFileSync(join(repo, 'c'), 'new')
  expect(gitStatus(repo, { base: 'main' })).toEqual({ changes: [{ path: 'a', status: 'M' }, { path: 'c', status: 'U' }], behind: 0, ahead: 1, branch: 'feature/x' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/git-status.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Parse `git status --porcelain=v1 -z` into M, U, A, D and `rev-list --left-right --count` against the upstream or chat base; refresh after turns and Git operations.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/git-status.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- No upstream and no base shows only the branch.
- Paths with spaces parse correctly.
- Non-Git folders report no changes without failing.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Serve files and status to the renderer

**Requirement:** REQ-053, REQ-054, REQ-055
**Files:**

- Create: `src/renderer/src/shared/api/ipc-files.ts`
- Test: `test/renderer/ipc-files.test.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { fileMethods } from '../../src/renderer/src/shared/api/ipc-files'
it('maps file tree, previews, diffs and status to core requests', async () => {
  const calls: Array<[string, unknown]> = []
  const files = fileMethods({ chatId: () => 'c1', request: async (method, params) => { calls.push([method, params]); return method === 'files.read' ? { kind: 'text', text: 'x' } : { kind: 'text', base: '', working: 'x' } } })
  await files.readFile('src/a.ts')
  await files.readDiff('src/a.ts')
  expect(calls).toEqual([['files.read', { chatId: 'c1', path: 'src/a.ts' }], ['files.diff', { chatId: 'c1', path: 'src/a.ts' }]])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/ipc-files.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`fileMethods({ request, chatId })` implements `readFile`, `readDiff`, the tree and status requests; the IPC source from slice 03 spreads these methods and the snapshot gains real `files`, `changes`, `behind` and `ahead`. Release the `explorer` and `source-control` flags when the slice closes.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/ipc-files.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Core errors show the binary or protected notice, not a crash.
- Requests carry the chat id so the worktree is used.
- The mock source keeps working for the site and tests.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-project-files-source-control.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
