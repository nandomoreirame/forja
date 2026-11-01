# Plan: Guided RPI Flow, Handoffs and Corrections

> **Spec:** docs/specs/guided-rpi-orchestration/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Connect all stages into the user-approved guided RPI workflow with traceable correction requests and bounded automation.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 12 of 13
**Total Tasks:** 6
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [artifact-approval-gates](2026-10-30-artifact-approval-gates.md)
- [feature-git-worktrees](2026-10-30-feature-git-worktrees.md)
- [cli-agent-sessions](2026-10-30-cli-agent-sessions.md)
- [feature-workbench-composer](2026-10-30-feature-workbench-composer.md)
- [document-review-reader](2026-10-30-document-review-reader.md)
- [terminal-panel-footer](2026-10-30-terminal-panel-footer.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Guided transitions are core-enforced and human approvals remain authoritative.
- Corrections are bidirectionally linked and automatic attempts bounded.
- Final approval and integration are one human action bound to current code, confirmed gates on the merge result and review.
- Human gates are only spec, plan, final approval and push; the correction loop runs on machine gates.
- Implementer subtasks run one at a time in the feature worktree, at most three per turn and one level deep (REQ-100).

## Checks

Checks for the requirements added on 2026-11-01 (2026-11-01 improvement review). Requirements planned before the checks format keep their acceptance and per-task checks above.

**Run subtasks**: `npx vitest run test/workflow/subtasks.test.ts --reporter=verbose`

- C1 (REQ-100): subtasks run sequentially, at most three per Implementer turn and never nested. Proof: run subtasks | PASS runs implementer subtasks one at a time within limits

## Tasks

### Task 1: Define the transition state machine and prerequisite guards

**Requirement:** REQ-009, REQ-010, REQ-011, REQ-045
**Depends on:** none within this plan
**Files:**

- Create: `src/core/workflow/transitions.ts`
- Create: `test/workflow/transitions.test.ts`
- Test: `test/workflow/transitions.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { requiredGate } from '../../src/core/workflow/transitions'
it('requires approved predecessor artifacts for plan and implementation', () => {
  expect(requiredGate('planner')).toBe('spec-approved')
  expect(requiredGate('implementer')).toBe('plan-approved')
  expect(requiredGate('tester')).toBe('implementation-validated')
  expect(requiredGate('reviewer')).toBe('tests-current')
  expect(requiredGate('final')).toBe('review-current')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/workflow/transitions.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Model phase/status/approval requests explicitly and persist compare-and-swap transitions with the feature lease. Derive start permission from current content-bound evidence, not only a phase label. Research creates draft spec; human approves it; Planner creates draft plan; human approves it; Implementer produces code that core validates with the confirmed repository gates and commits (`implementation-validated`, a machine gate with no human approval); Tester extends tests and core re-runs the gates (`tests-current`); Reviewer reviews current code/tests (`review-current`, no open unwaived Critical/High findings); the human grants one final approval that also authorizes integration; push is a separate approval.

```typescript
export function requiredGate(role: string): string {
  const gates: Record<string, string> = { research: 'none', planner: 'spec-approved', implementer: 'plan-approved', tester: 'implementation-validated', reviewer: 'tests-current', final: 'review-current' }
  if (!(role in gates)) throw new Error('Unknown role')
  return gates[role]
}
```

A disabled toggle means a ready next role awaits user start. AutoInvoke may request its start but never grants a missing approval. Corrections inside the Tester/Reviewer loop need no human approval: each correction re-enters at `implementation-validated` through the machine gate. Only spec, plan and final approval are human gates, and a correction that stales the spec or plan pauses there.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/workflow/transitions.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Every direct IPC/MCP start path uses the same core gate.
- Draft/missing/stale spec/plan/current-code proof blocks before CLI spawn.
- A model text message saying approved changes no approval state.
- Red, skipped or missing repository gates keep `implementation-validated` false; agent-run commands never satisfy it.
- An RPI artifact write does not stale `implementation-validated` or `tests-current`.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Persist bidirectional handoff and correction links

**Requirement:** REQ-020, REQ-022, REQ-027, REQ-048, REQ-056
**Depends on:** Task 1
**Files:**

- Create: `src/core/workflow/handoffs.ts`
- Create: `test/workflow/handoffs.test.ts`
- Test: `test/workflow/handoffs.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { handoffAllowed, handoffAnchors } from '../../src/core/workflow/handoffs'
it('keeps both ends in the same feature with stable conversation IDs', () => {
  const link = handoffAnchors('f1', { conversationId: 'tester', messageId: 'request' }, { conversationId: 'implementer', messageId: 'result' })
  expect(link.from.featureId).toBe('f1')
  expect(link.to.featureId).toBe('f1')
  expect(link.to.messageId).toBe('result')
})
it('allows only the approved handoff matrix', () => {
  expect(handoffAllowed('tester', 'implementer')).toBe(true)
  expect(handoffAllowed('reviewer', 'implementer')).toBe(true)
  expect(handoffAllowed('implementer', 'planner')).toBe(true)
  expect(handoffAllowed('planner', 'research')).toBe(true)
  expect(handoffAllowed('reviewer', 'planner')).toBe(false)
  expect(handoffAllowed('tester', 'research')).toBe(false)
  expect(handoffAllowed('implementer', 'reviewer')).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/workflow/handoffs.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Record source role/conversation/message, target role/conversation/message, feature, artifact and code fingerprints, finding/request IDs, reason and correction round. Create outgoing request and destination event atomically and idempotently by request ID. A role may request a handoff, not forge a completed correction or approve its own review. Reviewer maintains finding state; Implementer links changed commit/results to the request. Only the matrix above is accepted. Implementer to Planner and Planner to Research invalidate the plan (and the spec, for Research) plus every downstream approval and evidence in the same transaction, and work resumes only after new human approval. A human rejection of the spec, plan or final approval records its reason and opens a request to Research, Planner or Implementer respectively.

```typescript
type Anchor = { conversationId: string; messageId: string }
const matrix: Record<string, readonly string[]> = { tester: ['implementer'], reviewer: ['implementer'], implementer: ['planner'], planner: ['research'] }
export function handoffAllowed(from: string, to: string): boolean {
  return matrix[from]?.includes(to) ?? false
}
export function handoffAnchors(featureId: string, from: Anchor, to: Anchor) {
  return { from: { featureId, ...from }, to: { featureId, ...to } }
}
```

Use same-feature typed references throughout; navigation never creates a separate feature tab for an agent. Preserve a review-round JSONL sidecar only as the existing RPI review compatibility contract requires, not as runtime state authority.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/workflow/handoffs.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Duplicate tool calls cannot create two correction rounds or histories.
- Reject another feature message/artifact/finding link.
- Only Reviewer resolves/removes findings after inspecting updated work.
- A backward handoff invalidates downstream approvals atomically; a rejected matrix pair creates no request or event.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Enforce per-agent auto-invocation and three correction attempts

**Requirement:** REQ-009, REQ-020, REQ-021, REQ-045
**Depends on:** Task 2
**Files:**

- Create: `src/core/workflow/automation.ts`
- Create: `test/workflow/automation.test.ts`
- Test: `test/workflow/automation.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { automaticCorrectionAllowed } from '../../src/core/workflow/automation'
it('shares a three-round limit and never bypasses a gate', () => {
  expect(automaticCorrectionAllowed({ enabled: true, rounds: 2, gateReady: true })).toBe(true)
  expect(automaticCorrectionAllowed({ enabled: true, rounds: 3, gateReady: true })).toBe(false)
  expect(automaticCorrectionAllowed({ enabled: true, rounds: 0, gateReady: false })).toBe(false)
  expect(automaticCorrectionAllowed({ enabled: false, rounds: 0, gateReady: true })).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/workflow/automation.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Count a correction attempt only when a new Implementer correction run is actually started from a recorded Tester/Reviewer request; declined/blocked starts do not consume a round. Share the counter across requesters in one feature, with idempotent request IDs. At three, pause and offer explicit human continuation; record a new bounded budget window without erasing total history. Gate checks and current fingerprints run before every automatic start. Within the budget the loop runs unattended: Implementer correction, core gates and commit, Tester, core gates, Reviewer, with no human approval between them.

```typescript
export function automaticCorrectionAllowed(input: { enabled: boolean; rounds: number; gateReady: boolean }): boolean {
  return input.enabled && input.rounds < 3 && input.gateReady
}
```

Settings are snapshot-based; toggling automation does not retroactively approve/replay old requests. No recursive delegated CLI invocation or detached hidden correction executor.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/workflow/automation.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Mixed Tester/Reviewer failures consume the same feature budget.
- One failure forwarded twice starts one correction; stale plan pauses regardless of toggle.
- Human continuation is auditable and no auto-approved spec/plan/final/integration state appears.
- A full correction round (Reviewer finding to re-review) completes without a human click while the budget lasts.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Bind testing and review evidence to code and expose final integration readiness

**Requirement:** REQ-011, REQ-022, REQ-025, REQ-026, REQ-027, REQ-050, REQ-055, REQ-057
**Depends on:** Task 3
**Files:**

- Create: `src/core/workflow/validation.ts`
- Create: `src/core/workflow/review.ts`
- Create: `src/renderer/src/features/approvals/integration-card.tsx`
- Create: `test/workflow/validation.test.ts`
- Test: `test/workflow/validation.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { validationCurrent } from '../../src/core/workflow/validation'
it('does not reuse successful tests from another code fingerprint', () => {
  expect(validationCurrent({ fingerprint: 'a', passed: true }, 'a')).toBe(true)
  expect(validationCurrent({ fingerprint: 'a', passed: true }, 'b')).toBe(false)
  expect(validationCurrent({ fingerprint: 'a', passed: false }, 'a')).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/workflow/validation.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Validation evidence comes only from core running the confirmed repository gates (feature-git-worktrees Task 5) through the managed command runtime on the current fingerprint; wire this runner into the commit service (feature-git-worktrees Task 3) and into `validateMergeResult` (feature-git-worktrees Task 4); agent-run commands are recorded as diagnostics. The Tester edits only files matching the confirmed test patterns; a write outside them is rejected. Reviewer reads approved plan, current diff and gate evidence and publishes compatible review findings/rounds. Missing tools/skipped gates are not pass. If user shell or background tooling changes code, invalidate those checks and review; do not rely on static branch commit alone. The final approval card links current artifacts/results, shows open and waived findings, and its single "Approve and integrate" action prepares and executes the integration request with exact source/target IDs. Waiving a blocking finding is a human-only IPC command with a mandatory reason and an extra confirmation for Critical; it records actor, time and finding revision and keeps the finding visible as waived.

```typescript
export function validationCurrent(result: { fingerprint: string; passed: boolean }, current: string): boolean {
  return result.passed && result.fingerprint === current
}
```

The reviewer is a distinct role/session from Implementer even if the user selected the same CLI tool. Record actual identities; no self-approval shortcut. Independent code review for building Forja itself still follows the engineering workflow separately.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/workflow/validation.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Untracked/manual code edit invalidates validation and review before integration.
- Open unwaived Critical/High findings or failed gates block final approval.
- A waiver without a reason, or a Critical waiver without the second confirmation, is rejected; no MCP tool can waive.
- A Tester write to a non-test path is rejected and recorded.
- Human rejection returns actionable context to the correct feature/role.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Exercise an entire guided feature and correction loop through Electron

**Requirement:** REQ-009, REQ-010, REQ-020, REQ-021, REQ-026, REQ-043, REQ-045, REQ-049
**Depends on:** Task 4
**Files:**

- Create: `test/e2e/playwright.config.ts`
- Create: `test/e2e/electron-fixture.ts`
- Create: `test/e2e/guided-flow.spec.ts`
- Create: `test/e2e/fixtures/fake-cli.mjs`
- Create: `test/e2e/fixtures/fake-cli-contract.json`
- Create: `test/workflow/fake-adapter.test.ts`
- Test: `test/e2e/guided-flow.spec.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, test } from './electron-fixture'
test('draft spec blocks planning until exact human approval', async ({ window: page }) => {
  await page.getByRole('button', { name: 'Planner', exact: true }).click()
  await page.getByRole('button', { name: 'Start agent', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Approve the spec')
  await page.getByRole('button', { name: 'Approve spec', exact: true }).click()
  await page.getByRole('button', { name: 'Start agent', exact: true }).click()
  await expect(page.getByTestId('active-agent')).toHaveText('Planner')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx playwright test --config test/e2e/playwright.config.ts test/e2e/guided-flow.spec.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Create test/e2e/playwright.config.ts and electron-fixture.ts for Electron tests using _electron.launch, isolated data/temp repos and a fixture API exposing window plus feature navigation/start helpers. Exclude site.spec.ts. Implement a deterministic E2E CLI fixture behind the normal adapter contract and capability checks, only enabled by a dedicated isolated test-mode flag with temporary data directory. The test harness must launch Electron and provide the first-window page fixture; no nonexistent generic browser page test pretending to exercise Electron. Seed an unapproved spec/feature before this scenario and assert no process spawned before the approval.

Add the accompanying fake-adapter unit test to validate fixture ordering/events against the real EngineEvent schema. Extend the Electron scenario through repository gate confirmation, plan approval, worktree code change with machine validation and commit (no implementation approval click), failing Tester request, unattended correction link, review findings, bounded auto-invoke pause, a finding waiver, single final approval with merge-result gates and merge in a disposable repository. Use runtime events to assert absence of unauthorized starts, not only a disabled button.

**Step 4: Run test to verify it passes**

Run: `rtk npx playwright test --config test/e2e/playwright.config.ts test/e2e/guided-flow.spec.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Record both conversations and exact approval/correction event chain.
- Real Git/worktrees in temp folders; no developer repository touched.
- No model/API network calls during deterministic E2E.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 6: Run sequential Implementer subtasks through the Forja MCP

**Requirement:** REQ-100, REQ-007, REQ-025, REQ-048
**Depends on:** Task 3
**Files:**

- Create: `src/core/workflow/subtasks.ts`
- Test: `test/workflow/subtasks.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createSubtaskQueue } from '../../src/core/workflow/subtasks'
it('runs implementer subtasks one at a time within limits', async () => {
  const order: string[] = []
  const queue = createSubtaskQueue({ run: async (task) => { order.push(task.prompt); return 'ok' } })
  await Promise.all(['a', 'b', 'c'].map((prompt) => queue.delegate({ from: 'implementer', prompt, engine: 'codex' })))
  expect(order).toEqual(['a', 'b', 'c'])
  await expect(queue.delegate({ from: 'implementer', prompt: 'd', engine: 'codex' })).rejects.toThrow('limit')
  await expect(queue.delegate({ from: 'subtask', prompt: 'e', engine: 'codex' })).rejects.toThrow('nested')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/workflow/subtasks.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Expose a `delegate_subtask` Forja MCP tool to the Implementer only. Each call is validated in core (role, feature ownership, configured engine), queued per Implementer turn and run sequentially in the same feature worktree while the Implementer turn waits, so REQ-007 still holds one active turn per feature. A subtask gets the Implementer restrictions, cannot approve, waive or commit, and cannot call `delegate_subtask`; the REQ-025 turn commit includes its delta. Record each subtask (engine, prompt summary, state, result, timestamps) linked to the Implementer turn and show it under that turn in the conversation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/workflow/subtasks.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A Tester or Reviewer calling `delegate_subtask` is rejected in core.
- Stopping the Implementer turn stops the running subtask and cancels queued ones.
- A subtask's file changes appear in the Implementer turn commit, never in a separate commit.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
