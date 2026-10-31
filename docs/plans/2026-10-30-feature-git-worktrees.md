# Plan: Feature Git Worktrees and Approved Integration

> **Spec:** docs/specs/feature-git-worktrees/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Isolate code work by feature and provide explicit, revision-bound Git integration without losing user work.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 06 of 13
**Total Tasks:** 6
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
- Integration never proceeds on stale approval, conflicts, red gates on the merge result or unrelated dirty work; push is separate.
- Each Git target has human-confirmed repository gates and test patterns before implementation.
- Integrated and abandoned features are read-only and cleanup is explicit.

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

**Requirement:** REQ-013, REQ-024, REQ-048, REQ-050
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

Prepare the worktree as soon as the feature is bound to a Git target and its base is confirmed, before any role publishes, under a per-repo creation lock. Then set the feature artifact root to the worktree. If the feature already has artifacts in the opened folder, move them into the worktree as its first owned commit, verify identical bytes, keep only approvals whose hashes still match, and remove the originals only after that commit succeeds. Persist intent before git worktree add; reuse only if the existing path and branch are recorded as owned by the same feature. Collision creates a different safe name, never force-claims a branch or deletes existing work. Roll back only newly owned empty resources after a verified partial failure.

```typescript
import { createHash } from 'node:crypto'
export function worktreeKey(featureId: string, slug: string): string {
  return `${slug}-${createHash('sha256').update(featureId).digest('hex').slice(0, 8)}`
}
```

All five roles share this exact recorded worktree sequentially. A live feature cannot silently change its target/base; require stop and explicit rebind.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/worktrees.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real temporary git integration creates two worktrees and proves file isolation.
- Repeated request returns the same owned worktree without extra commits/branches.
- Failure preserves preexisting branch/worktree/user files.
- Binding a feature with existing artifacts moves them with identical bytes and keeps their approvals; a failed move leaves the originals untouched.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Fingerprint and commit only validated feature-owned changes

**Requirement:** REQ-011, REQ-022, REQ-025, REQ-027, REQ-050
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
const artifactDirs = ['docs/specs', 'docs/plans', 'docs/reviews']
it('includes untracked content and ignores entry enumeration order', () => {
  const a = [{ path: 'src/a.ts', hash: 'one' }, { path: 'new.txt', hash: 'two' }]
  expect(fingerprintEntries(a, artifactDirs)).toBe(fingerprintEntries([...a].reverse(), artifactDirs))
  expect(fingerprintEntries(a, artifactDirs)).not.toBe(fingerprintEntries([{ ...a[0] }, { path: 'new.txt', hash: 'three' }], artifactDirs))
})
it('ignores RPI artifact paths so a review write does not stale its own evidence', () => {
  const code = [{ path: 'src/a.ts', hash: 'one' }]
  expect(fingerprintEntries([...code, { path: 'docs/reviews/login.md', hash: 'r1' }], artifactDirs)).toBe(fingerprintEntries(code, artifactDirs))
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/fingerprint.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Fingerprint HEAD plus tracked modifications/deletions and relevant untracked files, respecting ignore rules and path bounds, excluding the RPI artifact directories resolved for the feature artifact root. Attach test/review/approval evidence to that fingerprint. The commit service takes gate evidence as input: it commits only when that evidence is green for the current fingerprint (guided-rpi-orchestration wires the real gate runner). An Implementer or Tester turn with green gates commits only owned paths and preserves user staging; a Tester delta with red gates stays uncommitted and is included in the Implementer's next validated commit. The agent proposes the commit message; core validates Conventional Commits format and falls back to a generated `<type>(<slug>): <summary>` message when the proposal is invalid. Core also commits approved spec/plan versions and published reviews; a dirty foreign delta pauses for explicit user review instead of bundling it. Use current repository commit standards, with no secret/env/private-key staging.

```typescript
import { createHash } from 'node:crypto'
export function fingerprintEntries(entries: { path: string; hash: string }[], artifactDirs: readonly string[]): string {
  const code = entries.filter(e => !artifactDirs.some(dir => e.path === dir || e.path.startsWith(`${dir}/`)))
  const stable = [...code].sort((a, b) => a.path.localeCompare(b.path))
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex')
}
```

Keep app-managed Git commit authority separate from agents' free-form development commands. Tester and Reviewer cannot quietly commit code fixes. Include file content changes after manual shell activity in invalidation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/fingerprint.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Temp-index tests preserve unrelated staged hunks and reject secret patterns.
- A failing test run cannot produce a valid commit/integration readiness record.
- Reviewer findings refer to a concrete reviewed fingerprint.
- An invalid proposed message falls back to the generated format; a red Tester delta is not committed.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Prepare and execute explicit integration requests with stale checks

**Requirement:** REQ-026, REQ-027, REQ-045, REQ-050, REQ-055
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

Expose a human-only integration preparation endpoint with summary/diff, source commit, target branch/HEAD and green validation/review evidence; the final approval and the integration are the same human action. Execute a normal no-fast-forward merge in an owned integration worktree after that approval, then call an injected `validateMergeResult` (wired to the confirmed repository gates by guided-rpi-orchestration Task 4) on the merge result. Update the destination only when the merge result is green and the destination HEAD still equals the HEAD recorded at approval. A destination that advanced since the feature base is normal and does not pause; a destination that moved after approval, red gates or conflicts pause with diagnostics. If the destination branch is checked out, only update through its clean owning worktree with expected-HEAD checks; do not update its ref behind a dirty working tree. Conflicts stop and preserve diagnostic state for the user. No auto-fix, force reset, stash or rebase. Merge commit evidence is recorded separately from optional explicit push approval.

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
- Red merge-result validation leaves the destination ref unchanged; a destination that advanced before approval still integrates.
- Reject user-controlled target options and preserve destination index on every failure.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Detect and confirm repository gates and test patterns

**Requirement:** REQ-022, REQ-025, REQ-055
**Depends on:** Task 1
**Files:**

- Create: `src/core/git/gates.ts`
- Create: `test/git/gates.test.ts`
- Test: `test/git/gates.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { detectGates, gatesReady } from '../../src/core/git/gates'
it('proposes gates from package scripts and requires human confirmation', () => {
  const detected = detectGates({ 'package.json': JSON.stringify({ scripts: { typecheck: 'tsc', lint: 'eslint .', test: 'vitest run', dev: 'vite' } }) })
  expect(detected.commands.map(c => c.argv.join(' '))).toEqual(['npm run typecheck', 'npm run lint', 'npm test'])
  expect(detected.testPatterns).toContain('test/**')
  expect(gatesReady({ ...detected, confirmedBy: null })).toBe(false)
  expect(gatesReady({ ...detected, confirmedBy: 'human' })).toBe(true)
  expect(gatesReady({ commands: [], testPatterns: ['test/**'], confirmedBy: 'human' })).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/gates.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Detect candidate gates from bounded manifest reads (package.json scripts in typecheck, lint, test order; Makefile `test`/`lint` targets; Cargo.toml; pyproject.toml with pytest) and candidate test-file patterns from existing test directories and naming conventions. Never execute anything during detection and never run long-lived scripts such as `dev` or `start`. Store the confirmed set per canonical target repository with the confirming actor and time; the human may edit, remove or add commands as argv arrays before confirming. Implementation cannot start until a confirmed, non-empty set exists. Changing the set invalidates validation evidence for every active feature on that repository.

```typescript
export interface GateSet { commands: { argv: string[] }[]; testPatterns: string[]; confirmedBy: 'human' | null }
export function detectGates(files: Record<string, string>): GateSet {
  const commands: { argv: string[] }[] = []
  const pkg = files['package.json'] ? JSON.parse(files['package.json']) : null
  for (const name of ['typecheck', 'lint', 'test']) {
    if (pkg?.scripts?.[name]) commands.push({ argv: name === 'test' ? ['npm', 'test'] : ['npm', 'run', name] })
  }
  return { commands, testPatterns: ['test/**', '**/*.test.*', '**/*.spec.*'], confirmedBy: null }
}
export function gatesReady(gates: GateSet): boolean {
  return gates.confirmedBy === 'human' && gates.commands.length > 0
}
```

Confirmation is a human-only IPC command; no MCP tool reads or edits the gate set beyond a read-only view. The managed command runtime executes these argv arrays under a core-owned capability, not an agent grant.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/gates.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Malformed or oversized manifests produce a diagnostic, not a crash or an empty confirmed set.
- An MCP attempt to change or confirm gates is rejected.
- Editing the confirmed set invalidates existing validation evidence on that repository.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 6: Close integrated and abandoned features with explicit cleanup

**Requirement:** REQ-050, REQ-054, REQ-058
**Depends on:** Task 4
**Files:**

- Create: `src/core/git/cleanup.ts`
- Create: `test/git/cleanup.test.ts`
- Test: `test/git/cleanup.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, consequences-reviewer, security-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { cleanupPlan } from '../../src/core/git/cleanup'
it('removes only owned resources and protects unmerged commits', () => {
  expect(cleanupPlan({ status: 'integrated', owned: true, unmergedCommits: 0 })).toEqual({ removeWorktree: true, deleteBranch: true, needsLossConfirmation: false })
  expect(cleanupPlan({ status: 'abandoned', owned: true, unmergedCommits: 3 })).toEqual({ removeWorktree: true, deleteBranch: true, needsLossConfirmation: true })
  expect(cleanupPlan({ status: 'abandoned', owned: false, unmergedCommits: 0 })).toEqual({ removeWorktree: false, deleteBranch: false, needsLossConfirmation: false })
  expect(() => cleanupPlan({ status: 'active', owned: true, unmergedCommits: 0 })).toThrow()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/git/cleanup.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A successful integration moves the feature to `integrated`; abandoning requires a human confirmation, stops owned work through an injected `stopOwnedWork` dependency (wired to the session and command supervisors by later slices) and moves it to `abandoned` only after termination is confirmed. Both states are read-only: history, artifacts and conversations remain viewable and no role can start. Cleanup is a separate human action offered after integration and available after abandonment. It removes only the worktree and branch recorded as owned by the feature, uses `git worktree remove` without force on a dirty worktree, and deletes a branch with commits not contained in the destination only after the user confirms that exact loss.

```typescript
export function cleanupPlan(input: { status: 'active' | 'integrated' | 'abandoned'; owned: boolean; unmergedCommits: number }) {
  if (input.status === 'active') throw new Error('Feature is still active')
  if (!input.owned) return { removeWorktree: false, deleteBranch: false, needsLossConfirmation: false }
  return { removeWorktree: true, deleteBranch: true, needsLossConfirmation: input.unmergedCommits > 0 }
}
```

Cleanup never runs implicitly after merge and never touches the destination worktree or a branch the feature did not create.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/git/cleanup.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real temp repos: a dirty owned worktree blocks removal with a diagnostic instead of forcing it.
- Abandoning with a running turn stops it and confirms termination before changing state.
- A start request on an integrated or abandoned feature is rejected in core.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
