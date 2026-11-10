# Plan: Test and Review Loop

> **Spec:** docs/specs/test-review-loop/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Run test and review with bounded automatic corrections, defined backward moves and enforced findings.
**Architecture:** Extensions of the pure phase module plus a findings module; all decisions recorded as chat events.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 10
**Total Tasks:** 3
**Estimated Complexity:** small
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 08 `ferreiro-orchestrator` and 09 `chat-worktrees`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Corrections loop automatically up to three times per chat.
- Blocking findings stop the chat at review.

## Checks

**Run slice**: `npx vitest run test/core/backward-moves.test.ts test/core/corrections.test.ts test/core/findings.test.ts --reporter=verbose`

- C1 (REQ-019): backward moves holds as specified. Proof: run slice | ✓ allows corrections and plan or spec returns and invalidates later approvals
- C2 (REQ-020): automatic corrections holds as specified. Proof: run slice | ✓ loops test or review back to implement automatically until the budget is spent
- C3 (REQ-047): review findings and waivers holds as specified. Proof: run slice | ✓ blocks leaving review on open blocking findings until a reasoned waiver

## Tasks

### Task 1: Allow only the defined backward moves

**Requirement:** REQ-019
**Files:**

- Create: `src/core/chats/backward-moves.ts`
- Test: `test/core/backward-moves.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { backwardMove } from '../../src/core/chats/backward-moves'
it('allows corrections and plan or spec returns and invalidates later approvals', () => {
  expect(backwardMove({ from: 'test', by: 'tester', to: 'implement' })).toMatchObject({ phase: 'implement', invalidate: [] })
  expect(backwardMove({ from: 'implement', by: 'implementer', to: 'plan' })).toMatchObject({ phase: 'plan', invalidate: ['plan', 'evidence'] })
  expect(backwardMove({ from: 'plan', by: 'planner', to: 'research' })).toMatchObject({ phase: 'research', invalidate: ['spec', 'plan', 'evidence'] })
  expect(() => backwardMove({ from: 'review', by: 'reviewer', to: 'plan' })).toThrow(/not allowed/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/backward-moves.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Only Temperador or Polidor to Bigorneiro, Bigorneiro to Moldador and Moldador to Minerador; returns to `plan` or `research` invalidate later approvals and evidence and announce the move.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/backward-moves.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The Ferreiro cannot request backward moves.
- A rejected human approval follows the same table.
- History keeps the invalidated approvals.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Run automatic corrections within a budget of three

**Requirement:** REQ-020
**Depends on:** Task 1
**Files:**

- Create: `src/core/chats/corrections.ts`
- Test: `test/core/corrections.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { nextCorrection } from '../../src/core/chats/corrections'
it('loops test or review back to implement automatically until the budget is spent', () => {
  let state = { used: 0, auto: true }
  for (let i = 0; i < 3; i++) { const step = nextCorrection(state); expect(step.kind).toBe('auto'); state = step.state }
  expect(nextCorrection(state)).toMatchObject({ kind: 'stop', reason: 'correction-budget' })
  expect(nextCorrection({ used: 0, auto: false })).toMatchObject({ kind: 'continue' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/corrections.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

The budget is per chat, shared across test and review; a stop shows Continue, and continuing records the manual decision without erasing history.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/corrections.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The budget resets only on a new plan approval.
- Manual continuation does not consume the budget.
- Each automatic round is announced.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Keep review findings and block on unwaived Critical or High

**Requirement:** REQ-047
**Depends on:** Task 1
**Files:**

- Create: `src/core/review/findings.ts`
- Test: `test/core/findings.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { canLeaveReview, waive } from '../../src/core/review/findings'
it('blocks leaving review on open blocking findings until a reasoned waiver', () => {
  const findings = [{ id: 'f1', severity: 'High', status: 'open' }, { id: 'f2', severity: 'Low', status: 'open' }]
  expect(canLeaveReview(findings)).toBe(false)
  expect(() => waive(findings[0], { reason: '', actor: 'user' })).toThrow(/reason/)
  const waived = waive(findings[0], { reason: 'false positive', actor: 'user' })
  expect(canLeaveReview([waived, findings[1]])).toBe(true)
  expect(() => waive({ id: 'f3', severity: 'Critical', status: 'open' }, { reason: 'ok', actor: 'user' })).toThrow(/confirm/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/findings.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Parse and keep the RPI review format and round trail; only the Polidor resolves findings; waivers need a reason, an extra confirmation for Critical, and keep the finding visible as waived; agents cannot waive.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/findings.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Re-running review keeps the round trail.
- A waived finding shows actor and time.
- The implementer cannot mark its own review approved.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-test-review-loop.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
