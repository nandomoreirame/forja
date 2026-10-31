# Plan: Feature Git Worktrees and Approved Integration

> **Spec:** docs/specs/feature-git-worktrees/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Isolate code work by feature and provide explicit, revision-bound Git integration without losing user work.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 06 of 13
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [project-feature-state](2026-10-30-project-feature-state.md)
- [artifact-approval-gates](2026-10-30-artifact-approval-gates.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Each feature has a traceable owned branch/worktree and explicit destination.
- Validation and review are exact-code-bound.
- Integration never proceeds on stale approval, conflicts or unrelated dirty work; push is separate.

## Tasks

### Task 1: Inspect Git target identity, base branch and worktree ownership

**Requirement:** REQ-003, REQ-024, REQ-050
**Depends on:** none within this plan
**Files:**
- Create: `src/core/git/repository.ts`
- Create: `src/core/git/exec.ts`
- Create: `test/git/repository.test.ts`
- Test: `test/git/repository.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { validateBranchName } from '../../src/core/git/repository'
it('rejects branch input that would become command options or unsafe refs', () => {
  expect(validateBranchName('release/2.0')).toBe('release/2.0')
  expect(() => validateBranchName('--all')).toThrow()
  expect(() => validateBranchName('main..evil')).toThrow()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/repository.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Inspect rev-parse/show-toplevel, symbolic-ref and worktree list using argv arrays and an explicit cwd. Require the selected target to be a real repo and select/record its existing base branch, HEAD and common Git directory. Resolve linked worktrees canonically. Never infer a base from main/master spelling or execute shell-concatenated Git. Use git check-ref-format --branch in addition to a cheap input guard.

```typescript
export function validateBranchName(value: string): string {
  if (!value || value.startsWith('-') || value.includes('..') || /[\s~^:?*\[\\]/.test(value)) throw new Error('Invalid branch')
  return value
}
```

Inspect project worktree conventions; choose an owned collision-safe worktree path outside the destination worktree, record it, and do not modify repository ignore files merely to create it.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/repository.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Temp repos cover detached HEAD, no commits, dirty destination and path with spaces.
- A non-Git opened folder can choose a separate Git target.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Create or reuse a feature-owned branch and worktree

**Requirement:** REQ-024, REQ-048, REQ-050
**Depends on:** Task 1
**Files:**
- Create: `src/core/git/worktrees.ts`
- Create: `test/git/worktrees.test.ts`
- Test: `test/git/worktrees.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { worktreeKey } from '../../src/core/git/worktrees'
it('isolates identical display names in different features', () => {
  expect(worktreeKey('f1', 'login')).not.toBe(worktreeKey('f2', 'login'))
  expect(worktreeKey('f1', 'login')).toBe(worktreeKey('f1', 'login'))
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/worktrees.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Prepare worktree only after plan approval and target/base confirmation, under a per-repo creation lock. Persist intent before git worktree add; reuse only if the existing path and branch are recorded as owned by the same feature. Collision creates a different safe name, never force-claims a branch or deletes existing work. Roll back only newly owned empty resources after a verified partial failure.

```typescript
import { createHash } from 'node:crypto'
export function worktreeKey(featureId: string, slug: string): string {
  return `${slug}-${createHash('sha256').update(featureId).digest('hex').slice(0, 8)}`
}
```

Implementer/Tester/Reviewer share this exact recorded worktree sequentially. A live feature cannot silently change its target/base; require stop and explicit rebind.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/worktrees.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real temporary git integration creates two worktrees and proves file isolation.
- Repeated request returns the same owned worktree without extra commits/branches.
- Failure preserves preexisting branch/worktree/user files.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Fingerprint and commit only validated feature-owned changes

**Requirement:** REQ-011, REQ-025, REQ-027, REQ-050
**Depends on:** Task 2
**Files:**
- Create: `src/core/git/fingerprint.ts`
- Create: `src/core/git/commits.ts`
- Create: `test/git/fingerprint.test.ts`
- Test: `test/git/fingerprint.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { fingerprintEntries } from '../../src/core/git/fingerprint'
it('includes untracked content and ignores entry enumeration order', () => {
  const a = [{ path: 'src/a.ts', hash: 'one' }, { path: 'new.txt', hash: 'two' }]
  expect(fingerprintEntries(a)).toBe(fingerprintEntries([...a].reverse()))
  expect(fingerprintEntries(a)).not.toBe(fingerprintEntries([{ ...a[0] }, { path: 'new.txt', hash: 'three' }]))
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/fingerprint.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Fingerprint HEAD plus tracked modifications/deletions and relevant untracked files, respecting ignore rules and path bounds. Attach test/review/approval evidence to that fingerprint. A successful validated batch commits only owned paths and preserves user staging; a dirty foreign delta pauses for explicit user review instead of bundling it. Use current repository commit standards, with no secret/env/private-key staging.

```typescript
import { createHash } from 'node:crypto'
export function fingerprintEntries(entries: { path: string; hash: string }[]): string {
  const stable = [...entries].sort((a, b) => a.path.localeCompare(b.path))
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex')
}
```

Keep app-managed Git commit authority separate from agents' free-form development commands. Tester and Reviewer cannot quietly commit code fixes. Include file content changes after manual shell activity in invalidation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/fingerprint.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Temp-index tests preserve unrelated staged hunks and reject secret patterns.
- A failing test run cannot produce a valid commit/integration readiness record.
- Reviewer findings refer to a concrete reviewed fingerprint.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Prepare and execute explicit integration requests with stale checks

**Requirement:** REQ-026, REQ-027, REQ-045, REQ-050
**Depends on:** Task 3
**Files:**
- Create: `src/core/git/integration.ts`
- Create: `test/git/integration.test.ts`
- Test: `test/git/integration.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { integrationMatches } from '../../src/core/git/integration'
it('rejects an approval after either side has moved', () => {
  const approved = { source: 's1', target: 't1' }
  expect(integrationMatches(approved, { source: 's1', target: 't1' })).toBe(true)
  expect(integrationMatches(approved, { source: 's1', target: 't2' })).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/integration.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Expose a human-only integration preparation endpoint with summary/diff, source commit, target branch/HEAD and green validation/review evidence. Execute a normal no-fast-forward merge in an owned integration worktree after user approval; validate before and after. If the destination branch is checked out, only update through its clean owning worktree with expected-HEAD checks; do not update its ref behind a dirty working tree. Conflicts stop and preserve diagnostic state for the user. No auto-fix, force reset, stash or rebase. Merge commit evidence is recorded separately from optional explicit push approval.

```typescript
export function integrationMatches(a: { source: string; target: string }, b: { source: string; target: string }): boolean {
  return a.source === b.source && a.target === b.target
}
```

Never allow an agent MCP call to approve or directly invoke this privileged service. Worktree cleanup is not implicit in successful merge.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/integration.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real temp repos cover clean merge, conflict, target moved after approval, dirty target and missing review.
- Repeated integration request cannot merge or push twice.
- Reject user-controlled target options and preserve destination index on every failure.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
