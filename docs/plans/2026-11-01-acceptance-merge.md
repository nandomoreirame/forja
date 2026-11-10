# Plan: Acceptance and Merge

> **Spec:** docs/specs/acceptance-merge/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Let the user test a running preview and merge only after manual acceptance by default.
**Architecture:** Preview through executor background ownership; merge in an owned integration worktree with gates on the result; a per-project merge policy.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 11
**Total Tasks:** 6
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 09 `chat-worktrees` and 10 `test-review-loop`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- After review, a running preview waits for the user.
- Merges land only after acceptance and green gates on the result.

## Checks

**Run slice**: `npx vitest run test/core/acceptance-preview.test.ts test/core/acceptance-reject.test.ts test/core/cleanup.test.ts test/core/merge-policy.test.ts test/core/merge.test.ts test/renderer/acceptance-bar.test.tsx --reporter=verbose`

- C1 (REQ-042): acceptance preview holds as specified. Proof: run slice | ✓ runs the confirmed preview command as an owned background server and reports its address
- C2 (REQ-043): accepted merge holds as specified. Proof: run slice | ✓ merges with --no-ff only when gates pass on the result and HEAD did not move
- C3 (REQ-044): acceptance rejection holds as specified. Proof: run slice | ✓ records the reason and hands the next turn to the Bigorneiro
- C4 (REQ-045): merge policy holds as specified. Proof: run slice | ✓ defaults to manual acceptance and merges right away only when set to automatic
- C5 (REQ-046): worktree cleanup holds as specified. Proof: run slice | ✓ removes owned resources and asks before losing unmerged commits

## Tasks

### Task 1: Start the acceptance preview when review closes

**Requirement:** REQ-042
**Files:**

- Create: `src/core/acceptance/preview.ts`
- Test: `test/core/acceptance-preview.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { startPreview } from '../../src/core/acceptance/preview'
it('runs the confirmed preview command as an owned background server and reports its address', async () => {
  const start = vi.fn(async () => ({ executionId: 'e1', firstLines: ['Local: http://localhost:5173/'] }))
  const result = await startPreview({ chatId: 'c1', worktree: '/wt', previewCommand: 'npm run dev', executor: { start } as any })
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ cwd: '/wt', command: 'npm run dev' }))
  expect(result).toEqual({ executionId: 'e1', url: 'http://localhost:5173/' })
  await expect(startPreview({ chatId: 'c1', worktree: '/wt', previewCommand: undefined, executor: { start } as any })).resolves.toEqual({ executionId: null, url: null, needsCommand: true })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/acceptance-preview.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

The preview command is part of the confirmed repository gates (optional); without it the chat asks for one or for a manual test confirmation; the server stays up until accept, reject or stop.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/acceptance-preview.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A failing preview keeps the chat in acceptance with Retry.
- The preview is not restarted automatically after an app restart.
- Only loopback URLs are shown as links.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Merge after acceptance in an integration worktree

**Requirement:** REQ-043
**Depends on:** Task 1
**Files:**

- Create: `src/core/acceptance/merge.ts`
- Test: `test/core/merge.test.ts`

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
import { mergeAccepted } from '../../src/core/acceptance/merge'
it('merges with --no-ff only when gates pass on the result and HEAD did not move', async () => {
  const repo = mkdtempSync(join(tmpdir(), 'forja-merge-'))
  const git = (...a: string[]) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: repo, encoding: 'utf8' }).trim()
  git('init', '-q', '-b', 'main'); writeFileSync(join(repo, 'a'), '1'); git('add', '.'); git('commit', '-qm', 'init')
  git('checkout', '-qb', 'feature/x'); writeFileSync(join(repo, 'b'), '2'); git('add', '.'); git('commit', '-qm', 'feat'); git('checkout', '-q', 'main')
  const head = git('rev-parse', 'main')
  const result = await mergeAccepted({ repo, branch: 'feature/x', destination: 'main', acceptedHead: head, runGates: async () => true, dataDir: mkdtempSync(join(tmpdir(), 'forja-int-')) })
  expect(result).toMatchObject({ merged: true })
  expect(git('log', '-1', '--format=%P', 'main').split(' ')).toHaveLength(2)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/merge.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Bind acceptance to commit, destination and HEAD; merge `--no-ff` in an owned integration worktree; run the confirmed gates on the result; move the destination only if they pass and HEAD is unchanged; then move the chat to `done`.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/merge.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A moved destination HEAD pauses and asks to re-accept.
- Failing gates leave the destination untouched.
- The destination working tree is never checked out by Forja.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Return rejected acceptance to Implement with the reason

**Requirement:** REQ-044
**Depends on:** Task 1
**Files:**

- Create: `src/core/acceptance/reject.ts`
- Test: `test/core/acceptance-reject.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { rejectAcceptance } from '../../src/core/acceptance/reject'
it('records the reason and hands the next turn to the Bigorneiro', () => {
  expect(rejectAcceptance({ phase: 'acceptance', reason: 'Button overlaps on mobile' })).toEqual({ phase: 'implement', handoff: 'implementer', context: 'Button overlaps on mobile' })
  expect(() => rejectAcceptance({ phase: 'review', reason: 'x' })).toThrow(/acceptance/)
  expect(() => rejectAcceptance({ phase: 'acceptance', reason: ' ' })).toThrow(/reason/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/acceptance-reject.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Rejection stops the preview, records the reason as an event and returns the chat to `implement` with the reason in context.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/acceptance-reject.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The correction budget is not consumed by a human rejection.
- The preview server stops on rejection.
- The rejection is announced by the Ferreiro.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Make the merge policy configurable per project

**Requirement:** REQ-045
**Depends on:** Task 2
**Files:**

- Create: `src/core/acceptance/policy.ts`
- Test: `test/core/merge-policy.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { afterReview } from '../../src/core/acceptance/policy'
it('defaults to manual acceptance and merges right away only when set to automatic', () => {
  expect(afterReview({ policy: undefined })).toBe('acceptance')
  expect(afterReview({ policy: 'manual' })).toBe('acceptance')
  expect(afterReview({ policy: 'automatic' })).toBe('merge')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/merge-policy.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Store the policy per project (default manual); automatic still runs the gates on the merge result.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/merge-policy.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The policy change is recorded with actor and time.
- Automatic never skips merge-result gates.
- Unknown values fall back to manual.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Clean up only owned worktrees and branches

**Requirement:** REQ-046
**Depends on:** Task 2
**Files:**

- Create: `src/core/acceptance/cleanup.ts`
- Test: `test/core/cleanup.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { cleanupPlan } from '../../src/core/acceptance/cleanup'
it('removes owned resources and asks before losing unmerged commits', () => {
  expect(cleanupPlan({ owned: true, unmergedCommits: 0 })).toEqual({ remove: ['worktree', 'branch'], confirmLoss: false })
  expect(cleanupPlan({ owned: true, unmergedCommits: 2 })).toEqual({ remove: ['worktree', 'branch'], confirmLoss: true })
  expect(cleanupPlan({ owned: false, unmergedCommits: 0 })).toEqual({ remove: [], confirmLoss: false })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/cleanup.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Offer cleanup after `done` or `abandoned`; remove only recorded owned resources; confirm the exact loss of unmerged commits.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/cleanup.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Cleanup never runs implicitly.
- Missing worktrees are recorded as already removed.
- A branch checked out elsewhere is refused.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 6: Show the acceptance bar in the conversation

**Requirement:** REQ-042, REQ-043, REQ-044
**Depends on:** Task 3
**Files:**

- Create: `src/renderer/src/features/conversation/acceptance-bar.tsx`
- Test: `test/renderer/acceptance-bar.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { AcceptanceBar } from '../../src/renderer/src/features/conversation/acceptance-bar'
it('shows the preview address and asks for a reason before rejecting', () => {
  const onAccept = vi.fn(); const onReject = vi.fn()
  render(<AcceptanceBar locale="en" url="http://localhost:5173/" onAccept={onAccept} onReject={onReject} />)
  expect(screen.getByRole('link', { name: 'http://localhost:5173/' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
  expect(screen.getByRole('button', { name: 'Send rejection' })).toBeDisabled()
  fireEvent.change(screen.getByRole('textbox', { name: 'What needs to change?' }), { target: { value: 'Fix overlap' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send rejection' }))
  expect(onReject).toHaveBeenCalledWith('Fix overlap')
  fireEvent.click(screen.getByRole('button', { name: 'Accept and merge' }))
  expect(onAccept).toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/acceptance-bar.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A bar above the composer while the chat is in `acceptance`: preview link (external browser), Accept and merge, Reject with a required reason, Stop preview; en and pt-br copy.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/acceptance-bar.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Keyboard reaches every action and the reason field.
- Accept asks one confirmation naming the destination branch.
- Without a preview the bar offers to confirm manual testing.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-acceptance-merge.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
