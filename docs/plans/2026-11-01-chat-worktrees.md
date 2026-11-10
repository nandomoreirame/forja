# Plan: Chat Worktrees

> **Spec:** docs/specs/chat-worktrees/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Give each chat that reaches Implement an owned branch, worktree, gates and safe commits.
**Architecture:** Git through `execFile` against temporary-repo integration tests; ownership records in SQLite; gates detected, confirmed and executed by core.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 09
**Total Tasks:** 7
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 02 `chat-core-store` and 05 `forja-mcp-gateway`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Implementation happens in an isolated worktree per chat.
- Only gated, owned changes are committed.

## Checks

**Run slice**: `npx vitest run test/core/external-changes.test.ts test/core/gated-commit.test.ts test/core/gates.test.ts test/core/local-files.test.ts test/core/overlap.test.ts test/core/work-output.test.ts test/core/worktree.test.ts --reporter=verbose`

- C1 (REQ-024): feature or bug output holds as specified. Proof: run slice | ✓ names the branch from the output kind chosen in the proposal
- C2 (REQ-036): chat branch and worktree holds as specified. Proof: run slice | ✓ creates one owned branch and worktree outside the destination tree from the chosen base
- C3 (REQ-037): confirmed repository gates holds as specified. Proof: run slice | ✓ proposes gates and test patterns from manifests for the user to confirm
- C4 (REQ-038): local file copies holds as specified. Proof: run slice | ✓ copies only confirmed git-ignored files without reading their content
- C5 (REQ-039): gated commits holds as specified. Proof: run slice | ✓ commits with a validated message only when every gate passed
- C6 (REQ-040): overlap warnings holds as specified. Proof: run slice | ✓ marks files changed by two active chats of the same repository
- C7 (REQ-041): safe git with external changes holds as specified. Proof: run slice | ✓ asks for re-evaluation instead of resetting user work

## Tasks

### Task 1: Create the feature or bug output when implementation starts

**Requirement:** REQ-024
**Files:**

- Create: `src/core/worktrees/outputs.ts`
- Test: `test/core/work-output.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { workOutput } from '../../src/core/worktrees/outputs'
it('names the branch from the output kind chosen in the proposal', () => {
  expect(workOutput({ kind: 'feature', slug: 'rate-limits' })).toMatchObject({ kind: 'feature', branch: 'feature/rate-limits' })
  expect(workOutput({ kind: 'bug', slug: 'login-loop' })).toMatchObject({ kind: 'bug', branch: 'fix/login-loop' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/work-output.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Entering `implement` records the feature or bug output linked to the chat with target repository, base and branch; the kind comes from the approved start proposal and stays editable until the worktree exists.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/work-output.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Changing kind after the worktree exists is refused.
- The output lists commits as they land.
- Branch names collide safely with a suffix.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Bind a Git target and create the chat worktree

**Requirement:** REQ-036
**Depends on:** Task 1
**Files:**

- Create: `src/core/worktrees/worktree.ts`
- Test: `test/core/worktree.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { ensureWorktree } from '../../src/core/worktrees/worktree'
it('creates one owned branch and worktree outside the destination tree from the chosen base', () => {
  const repo = mkdtempSync(join(tmpdir(), 'forja-repo-'))
  const git = (...a: string[]) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' })
  git('init', '-q', '-b', 'main'); writeFileSync(join(repo, 'a.txt'), 'a'); git('add', '.'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init')
  const wt = ensureWorktree({ repo, base: 'main', branch: 'feature/rate-limits', dataDir: mkdtempSync(join(tmpdir(), 'forja-data-')) })
  expect(existsSync(join(wt.path, 'a.txt'))).toBe(true)
  expect(wt.path.startsWith(repo)).toBe(false)
  expect(ensureWorktree({ repo, base: 'main', branch: 'feature/rate-limits', dataDir: wt.dataDir }).path).toBe(wt.path)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/worktree.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Require an explicit repository and base; create or reuse the owned branch and a managed worktree under the app data folder; record ownership; never touch the destination working tree.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/worktree.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A branch that exists but is not owned is refused.
- Rebinding a live worktree is refused until the chat stops.
- Non-Git folders refuse `implement` with a clear message.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Detect and confirm repository gates and test patterns

**Requirement:** REQ-037
**Depends on:** Task 2
**Files:**

- Create: `src/core/worktrees/gates.ts`
- Test: `test/core/gates.test.ts`

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
import { detectGates } from '../../src/core/worktrees/gates'
it('proposes gates and test patterns from manifests for the user to confirm', () => {
  const repo = mkdtempSync(join(tmpdir(), 'forja-gates-'))
  writeFileSync(join(repo, 'package.json'), JSON.stringify({ scripts: { lint: 'eslint .', test: 'vitest run', typecheck: 'tsc --noEmit' } }))
  expect(detectGates(repo)).toMatchObject({ commands: ['npm run lint', 'npm run typecheck', 'npm test'], testPatterns: expect.arrayContaining(['test/**']), confirmed: false })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/gates.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Detect from `package.json`, `pyproject.toml` and `Cargo.toml`; store per repository after explicit confirmation; core runs them through the executor as the only validation evidence; missing or skipped gates count as failure.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/gates.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Unconfirmed gates block leaving `implement`.
- Agent-run commands never count as gate evidence.
- Editing confirmed gates needs a new confirmation.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Copy confirmed local files into new worktrees

**Requirement:** REQ-038
**Depends on:** Task 2
**Files:**

- Create: `src/core/worktrees/local-files.ts`
- Test: `test/core/local-files.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { proposeLocalFiles, copyLocalFiles } from '../../src/core/worktrees/local-files'
it('copies only confirmed git-ignored files without reading their content', () => {
  const repo = mkdtempSync(join(tmpdir(), 'forja-env-'))
  execFileSync('git', ['init', '-q'], { cwd: repo })
  writeFileSync(join(repo, '.gitignore'), '.env*\n'); writeFileSync(join(repo, '.env'), 'X=1'); writeFileSync(join(repo, 'tracked.txt'), 't')
  expect(proposeLocalFiles(repo)).toEqual(['.env'])
  const target = mkdtempSync(join(tmpdir(), 'forja-wt-'))
  copyLocalFiles({ repo, target, confirmed: ['.env', 'tracked.txt'] })
  expect(existsSync(join(target, '.env'))).toBe(true)
  expect(existsSync(join(target, 'tracked.txt'))).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/local-files.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Propose `.env*` at the repository root by default; copy only confirmed files that git ignores and that resolve inside the repository; log names, never content.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/local-files.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Symlinks pointing outside the repository are skipped.
- Unconfirmed files are never copied.
- Content never appears in logs or events.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Commit only the owned delta when gates pass

**Requirement:** REQ-039
**Depends on:** Task 3
**Files:**

- Create: `src/core/worktrees/commit.ts`
- Test: `test/core/gated-commit.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { commitIfGreen } from '../../src/core/worktrees/commit'
it('commits with a validated message only when every gate passed', async () => {
  const calls: string[][] = []
  const git = async (args: string[]) => { calls.push(args); return '' }
  expect(await commitIfGreen({ git, gates: ['pass', 'fail'], files: ['src/a.ts'], message: '✨ feat(api): add limits' })).toEqual({ committed: false, reason: 'gates' })
  expect(await commitIfGreen({ git, gates: ['pass'], files: ['src/a.ts'], message: 'bad message' })).toEqual({ committed: false, reason: 'message' })
  expect(await commitIfGreen({ git, gates: ['pass'], files: ['src/a.ts'], message: '✨ feat(api): add limits' })).toEqual({ committed: true })
  expect(calls.some((a) => a[0] === 'add' && a.includes('src/a.ts'))).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/gated-commit.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Stage only the turn's owned paths, validate the Conventional Commits message, commit on the chat branch, preserve unrelated index entries; failed or skipped gates never commit.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/gated-commit.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Unrelated staged files stay staged and uncommitted.
- A skipped gate counts as failure.
- Commit failures surface as actionable errors.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 6: Warn about overlapping files between chats

**Requirement:** REQ-040
**Depends on:** Task 5
**Files:**

- Create: `src/core/worktrees/overlap.ts`
- Test: `test/core/overlap.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { overlaps } from '../../src/core/worktrees/overlap'
it('marks files changed by two active chats of the same repository', () => {
  const result = overlaps([
    { chatId: 'a', repo: '/r', files: ['src/x.ts', 'src/y.ts'] },
    { chatId: 'b', repo: '/r', files: ['src/y.ts'] },
    { chatId: 'c', repo: '/other', files: ['src/y.ts'] },
  ])
  expect(result).toEqual({ a: ['src/y.ts'], b: ['src/y.ts'] })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/overlap.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Recompute after each commit and show the overlap in both chats and again before merge; never block.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/overlap.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Done and abandoned chats are ignored.
- Renamed files count by their new path.
- No overlap yields an empty map.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 7: Fail safely on external changes

**Requirement:** REQ-041
**Depends on:** Task 2
**Files:**

- Create: `src/core/worktrees/external-changes.ts`
- Test: `test/core/external-changes.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { checkClean } from '../../src/core/worktrees/external-changes'
it('asks for re-evaluation instead of resetting user work', () => {
  expect(checkClean({ owned: ['src/a.ts'], dirty: ['src/a.ts'] })).toEqual({ ok: true })
  expect(checkClean({ owned: ['src/a.ts'], dirty: ['src/a.ts', 'notes.md'] })).toEqual({ ok: false, foreign: ['notes.md'], action: 're-evaluate' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/external-changes.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Before any Git write, compare dirty paths with the owned set; foreign changes stop the operation with a re-evaluate action; never reset, clean or include them.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/external-changes.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Conflicts stop with the conflicting paths listed.
- No `reset --hard` or `clean` is ever issued.
- The user can include foreign changes only by an explicit action.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-chat-worktrees.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
