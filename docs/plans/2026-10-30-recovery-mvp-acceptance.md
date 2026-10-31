# Plan: Recovery, Resource Cleanup and MVP Acceptance

> **Spec:** docs/specs/recovery-mvp-acceptance/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Finish restart/recovery, resource bounds and full Linux acceptance without hiding pending CLI capabilities or review gaps.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 13 of 13
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [guided-rpi-orchestration](2026-10-30-guided-rpi-orchestration.md)
- [terminal-panel-footer](2026-10-30-terminal-panel-footer.md)
- [document-review-reader](2026-10-30-document-review-reader.md)
- [web-foundation-landing-styleguide](2026-10-30-web-foundation-landing-styleguide.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Reopening restores durable state without resurrecting OS processes.
- Full exit stops owned resources and output remains bounded.
- Site, Electron, two-feature Git flow and all five live CLI capabilities have truthful acceptance evidence.

## Tasks

### Task 1: Recover interrupted records and valid approvals transactionally

**Requirement:** REQ-008, REQ-011, REQ-012, REQ-023, REQ-034, REQ-037
**Depends on:** none within this plan
**Files:**
- Create: `src/core/recovery/startup.ts`
- Create: `test/recovery/startup.test.ts`
- Modify: `src/core/index.ts`
- Test: `test/recovery/startup.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { recoverRun } from '../../src/core/recovery/startup'
it('restores active records as interrupted and keeps completed records intact', () => {
  expect(recoverRun({ id: 'a', status: 'working' })).toEqual({ id: 'a', status: 'interrupted' })
  expect(recoverRun({ id: 'b', status: 'completed' })).toEqual({ id: 'b', status: 'completed' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/recovery/startup.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

At startup reconcile unfinished artifact intents, transactional execution leases and stale source hashes before presenting readiness. Restore windows/tabs/selected role/drafts/log cursors and valid approval evidence. Mark active historical turns/PTYs/processes interrupted, never automatically start models or shell commands. Validate any potentially live child identity before cleanup; a saved PID alone cannot authorize killing another process.

```typescript
export function recoverRun<T extends { status: string }>(run: T): T {
  return run.status === 'working' || run.status === 'starting' ? { ...run, status: 'interrupted' } : run
}
```

Make recovery idempotent: repeated startup does not create duplicate interrupted events or erase drafts. Native resume is explicitly requested after restoration and follows adapter capabilities.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/recovery/startup.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Kill the test core between artifact rename/DB update; restart preserves content and invalidates unverified approval.
- Recovery twice produces no duplicate records/events.
- No paid calls or arbitrary PID signals during startup.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Coordinate graceful shutdown and bounded storage retention

**Requirement:** REQ-029, REQ-030, REQ-031, REQ-034, REQ-052, REQ-054
**Depends on:** Task 1
**Files:**
- Create: `src/core/recovery/shutdown.ts`
- Create: `src/core/storage/retention.ts`
- Create: `test/recovery/shutdown.test.ts`
- Modify: `src/main/index.ts`
- Modify: `src/core/index.ts`
- Test: `test/recovery/shutdown.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { shutdownOwned } from '../../src/core/recovery/shutdown'
it('awaits all cleanup and reports failures without skipping other owners', async () => {
  const seen: string[] = []
  const result = await shutdownOwned([async () => { seen.push('a'); throw new Error('failed') }, async () => { seen.push('b') }])
  expect(seen).toEqual(['a', 'b'])
  expect(result.failed).toBe(1)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/recovery/shutdown.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Main sends an awaited shutdown request to core before terminating utilityProcess, with a bounded emergency timeout. Core rejects new starts, stops owned CLI/foreground/background/PTY processes and MCP transports, flushes logs/state then closes SQLite. Normal window closure and multi-window app lifecycle must not terminate unrelated project work accidentally. Record failures truthfully and use ownership-safe group escalation.

```typescript
export async function shutdownOwned(actions: Array<() => Promise<void>>): Promise<{ failed: number }> {
  const results = await Promise.allSettled(actions.map(action => action()))
  return { failed: results.filter(result => result.status === 'rejected').length }
}
```

Retention prunes only bounded execution output according to explicit internal policy with visible truncation markers, never silently deletes artifact/review history, feature worktrees or user files. Keep transcript pagination and listener disposal to prevent sustained memory growth.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/recovery/shutdown.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- App normal quit leaves no owned process trees, including explicit background servers.
- Full shutdown timeout still saves interrupted/error state when possible.
- Closing one project window with another active follows project-specific confirmation.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Run multi-feature persistence, ownership and visual E2E

**Requirement:** REQ-003, REQ-004, REQ-006, REQ-007, REQ-008, REQ-011, REQ-033, REQ-035, REQ-036, REQ-043, REQ-049
**Depends on:** Task 2
**Files:**
- Create: `test/e2e/acceptance.config.ts`
- Create: `test/e2e/multi-feature.spec.ts`
- Create: `test/e2e/recovery.spec.ts`
- Create: `test/recovery/e2e-contract.test.ts`
- Test: `test/e2e/multi-feature.spec.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, test } from './electron-fixture'
test('two features keep their repositories, composer and terminal contexts isolated', async ({ window, fixture }) => {
  await fixture.openFeature('feature-a')
  await expect(window.getByTestId('feature-target')).toHaveText(fixture.repoA)
  await fixture.startBackground('feature-b')
  await expect(window.getByTestId('selected-feature')).toHaveAttribute('data-feature-id', 'feature-a')
  await fixture.openFeature('feature-b')
  await expect(window.getByTestId('feature-target')).toHaveText(fixture.repoB)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx playwright test --config test/e2e/acceptance.config.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Reuse the Electron fixture introduced by guided-rpi-orchestration. Add acceptance.config.ts with testDir . and testMatch guided-flow.spec.ts/multi-feature.spec.ts/recovery.spec.ts, excluding site.spec.ts. Launch with isolated FORJA_DATA_DIR, temp project/repo directories and the deterministic fake CLI adapter. The fixture public API already provides selected-feature navigation and background execution helpers; extend only through its documented injection hooks. Add a small e2e-contract unit test validating fixture owner IDs and seeded project/feature topology without launching native UI; do not mistake it for E2E completion.

Cover two parallel features, rename, interrupt/queue, sender isolation, stale approvals, selected excerpt, strict Mermaid error, manual PTY, agent logs, collapse/footer/restore and app restart. Add captured viewports matching approved desktop screens and both site locales. Restore no running processes automatically. Assertions inspect durable records and owned resources as well as DOM.

**Step 4: Run test to verify it passes**

Run: `rtk npx playwright test --config test/e2e/acceptance.config.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Run browser site and Electron suites separately with real native runtime.
- Record actual screenshot review and exclude known Stitch inventions.
- Changing selected feature while background events stream never steals draft or target.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Complete authenticated five-CLI acceptance and operational documentation

**Requirement:** REQ-015, REQ-019, REQ-023, REQ-043, REQ-049, REQ-052
**Depends on:** Task 3
**Files:**
- Create: `scripts/smoke-engines.ts`
- Create: `test/engines/smoke-manifest.test.ts`
- Create: `docs/technical/mvp-acceptance.md`
- Modify: `README.md`
- Test: `test/engines/smoke-manifest.test.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, security-guardrails, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { summarizeAcceptance } from '../../scripts/smoke-engines'
it('does not convert an unverified adapter into complete MVP acceptance', () => {
  const rows = ['claude', 'codex', 'opencode', 'agy', 'grok'].map(id => ({ id, passed: id !== 'grok' }))
  expect(summarizeAcceptance(rows)).toMatchObject({ complete: false, pending: ['grok'] })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/smoke-manifest.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Write an explicit opt-in live smoke runner that uses the configured installed CLI and native auth, a disposable target/worktree, benign MCP command, state gate, session interrupt/resume and process cleanup. Record per-version evidence for each of five tools. No live prompts in default npm test/build or during planning. Never save credential content in results. Unavailable/quota/unsupported stays pending and prevents a complete five-CLI acceptance claim, while independent features remain usable.

```typescript
export function summarizeAcceptance(rows: { id: string; passed: boolean }[]) {
  const pending = rows.filter(row => !row.passed).map(row => row.id)
  return { complete: rows.length === 5 && pending.length === 0, pending }
}
```

Update README truthfully for implemented behavior, site routes/scripts, local data, command/MCP interfaces and Linux scope. Run readme-writer/docs-guardrails; preserve README English. Record test/visual/live/review status separately in the acceptance doc. Request independent review after implementation; no deployment or push is implied.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/smoke-manifest.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- All five tools have actual evidence or explicit blockers; a skipped row is never passed.
- Root lint, tsc, tests, desktop/site builds, browser/Electron E2E and appropriate coverage gates pass.
- Security docs match actual bind/authorization behavior; no invented sandbox/privacy guarantees.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
