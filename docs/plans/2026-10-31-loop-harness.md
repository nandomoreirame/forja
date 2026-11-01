# Plan: Loop Harness (lessons, proofs, verifier and validators)

> **Spec:** docs/specs/loop-harness/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Add cross-feature lessons, one proven check per requirement, a verifier judgment per check and core validators that keep the approve command unavailable for a malformed spec or plan.
**Architecture:** Pure Markdown validators and a proof line matcher live in `src/core/validators/` and `src/core/proofs/`; lessons live in a SQLite store under `src/core/lessons/` with a scoped MCP tool and a rendered `LESSONS.md` artifact. Existing workflow services (approvals, gates, review, agent context) are extended through their public APIs; the renderer only displays results.
**Tech Stack:** Electron, React, TypeScript, SQLite (`node:sqlite`), Zod; shadcn/ui and Tailwind; Vitest/RTL and Playwright.
**Order:** 12a (after guided-rpi-orchestration)
**Total Tasks:** 7
**Estimated Complexity:** medium
**Lessons applied:** none (the framework lessons store starts with the rpi-loop-harness pilot)
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [artifact-approval-gates](2026-10-30-artifact-approval-gates.md)
- [agent-settings-skills](2026-10-30-agent-settings-skills.md)
- [managed-command-runtime](2026-10-30-managed-command-runtime.md)
- [document-review-reader](2026-10-30-document-review-reader.md)
- [guided-rpi-orchestration](2026-10-30-guided-rpi-orchestration.md)
- [project-sidebar-navigator](2026-10-31-project-sidebar-navigator.md)
- External: the personal framework's pilot report (`~/.claude/docs/specs/rpi-loop-harness/PILOT.md`, REQ-013). Do not start Task 1 before its verdict; apply its keep/adjust/drop decisions to this plan first and record them in `docs/specs/loop-harness/STATE.md`.

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules.
- `Extend:` paths are created by the dependency plans above and do not exist at planning time; extend their public APIs without losing behavior. `Modify:` paths exist today.
- Source snippets are seed contract tests. Expand fixtures to the acceptance cases; do not hardcode test-only results.
- The framework scripts (`~/.claude/scripts/rpi_docs.py`, `lessons.py`, `check_proofs.py`) are the reference behavior. Port the rules, not the code; when the pilot changed a rule, the pilot wins.

## Acceptance

- A lesson exists only when it cites a real finding or failed proof of its feature, and is promoted only by a second feature.
- No final approval while any check of the reviewed commit is FAIL or NO TEST RAN.
- No review publication without a verdict per check; a `no` is a High finding.
- No spec or plan approval while its validator reports a problem.

## Checks

**Run core**: `rtk npm test -- test/validators test/lessons test/proofs test/workflow/verifier.test.ts test/workflow/validation-gate.test.ts --reporter=verbose`

**Run ui**: `rtk npm test -- test/ui/lessons-section.test.tsx test/ui/validation-panel.test.tsx --reporter=verbose`

- C1 (REQ-091): a lesson citing no finding of its own feature is rejected. Proof: run core | ✓ rejects a lesson whose source is not a finding of the feature
- C2 (REQ-091): the same rule from a second feature promotes the lesson. Proof: run core | ✓ promotes at the second distinct feature
- C3 (REQ-091): two penalties quarantine a confirmed lesson. Proof: run core | ✓ quarantines after two penalties
- C4 (REQ-091): Research and Planner context get at most 20 confirmed lessons as untrusted data. Proof: run core | ✓ injects at most 20 confirmed lessons as untrusted data
- C5 (REQ-091): Memories lists lessons with status and quarantine or restore actions. Proof: run ui | ✓ lists lessons with status and quarantine action
- C6 (REQ-092): a passing line absent from a run's output reads NO TEST RAN. Proof: run core | ✓ reads NO TEST RAN when the passing line is absent
- C7 (REQ-092): final approval is blocked while a check fails at the reviewed commit. Proof: run core | ✓ blocks final approval while a check is not PASS at the reviewed commit
- C8 (REQ-093): a review without a verdict for every check is rejected. Proof: run core | ✓ rejects a review missing a verdict for a check
- C9 (REQ-093): a "does not hold" verdict becomes a High finding linked to its check. Proof: run core | ✓ records a does-not-hold verdict as a High finding
- C10 (REQ-094): a non-EARS requirement and a P1 requirement without a check are reported. Proof: run core | ✓ reports non-EARS requirements and uncovered P1 requirements
- C11 (REQ-094): approve is unavailable while validation fails and problems return to the role. Proof: run core | ✓ keeps approve unavailable and returns problems to the publishing role
- C12 (REQ-094): the document viewer shows each problem and disables Approve. Proof: run ui | ✓ shows validation problems and disables Approve

---

### Task 1: Markdown parser and spec/plan validators

**Requirement:** REQ-094
**Depends on:** none within this plan
**Files:**

- Create: `src/core/validators/rpi-docs.ts`
- Create: `src/core/validators/spec.ts`
- Create: `src/core/validators/plan.ts`
- Create: `test/validators/validators.test.ts`
- Test: `test/validators/validators.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateSpec } from '../../src/core/validators/spec'
import { validatePlan } from '../../src/core/validators/plan'

const spec = `## Requirements

### P1 (MVP)

1. **[REQ-091]** WHEN a lesson is proposed THEN the system SHALL require a source.
2. **[REQ-093]** The reviewer judges each check.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-091 | Lessons | P1 | Approved |
| REQ-093 | Verifier | P1 | Approved |
`

const plan = `# Plan: X

## Checks

**Run core**: \`npm test -- --reporter=verbose\`

- C1 (REQ-091): a lesson needs a source. Proof: run core | ✓ rejects a lesson without source

### Task 1: Lessons

**Requirement:** REQ-091
**Files:**
- Create: \`src/core/lessons/store.ts\`

**Team:**
- Track: backend

**Step 1: Write the failing test**
Run: \`npm test\`
Expected: FAIL
`

describe('validators', () => {
  it('reports non-EARS requirements and uncovered P1 requirements', () => {
    expect(validateSpec(spec)).toEqual(["REQ-093: not in 'WHEN ... THEN ... SHALL ...' form"])
    expect(validatePlan(plan, { specText: spec, exists: () => true })).toEqual([
      'REQ-093: P1 requirement covered by no task',
      'REQ-093: P1 requirement has no check',
    ])
  })

  it('ignores headings and checks inside fenced blocks', () => {
    const fenced = plan.replace('## Checks', '```\n## Checks\n```')
    expect(validatePlan(fenced, { specText: spec, exists: () => true })).toContain('missing ## Checks section')
  })

  it('accepts skipped but ascending IDs and rejects duplicates', () => {
    expect(validateSpec(spec.replace('[REQ-093]', '[REQ-091]'))).toContain('REQ-091: duplicate ID')
  })

  it('rejects a Modify path that exists nowhere and was not created earlier', () => {
    const modify = plan.replace('- Create: `src/core/lessons/store.ts`', '- Modify: `src/ghost.ts`')
    expect(validatePlan(modify, { specText: null, exists: () => false })).toContain(
      'Task 1: Modify path does not exist: src/ghost.ts',
    )
  })
})
```

**Step 2: Run test to verify it fails**
Run: `rtk npm test -- test/validators/validators.test.ts`
Expected: FAIL because `validateSpec`/`validatePlan` are not implemented (a compiling no-op surface returning `[]`; not an import error).

**Step 3: Write minimal implementation**

Port `~/.claude/scripts/rpi_docs.py`, `validate_spec.py` and `validate_plan.py` rule by rule (as adjusted by the pilot): `withoutFences`, `section`, `parseRequirements`, `parseTraceability`, `parseTasks`, `parseChecks` (only `- C<n>` lines are checks), unique ascending IDs, `WHEN … THEN … SHALL` form, task fields, Modify paths through an injected `exists(path)` (so the core passes a canonical-path check scoped to the artifact root, REQ-048), P1 coverage by tasks and checks, run group existence. Pure functions over text, no I/O.

```typescript
export interface PlanValidationContext { specText: string | null; exists: (path: string) => boolean }
export function validateSpec(specText: string): string[]
export function validatePlan(planText: string, context: PlanValidationContext): string[]
```

**Step 4: Run test to verify it passes**
Run: `rtk npm test -- test/validators/validators.test.ts`. Expected: PASS. Add cases for every rule (orphan traceability row, malformed check line, unknown run group, duplicate check ID, legacy plan without `## Checks` flagged only on publish of a new plan) and run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`.

**Step 5: Commit**
Run: `/git commit`

### Task 2: Validation gate on publish and approve

**Requirement:** REQ-094
**Depends on:** Task 1
**Files:**

- Create: `src/core/workflow/validation-gate.ts`
- Create: `test/workflow/validation-gate.test.ts`
- Extend: `src/core/workflow/approvals.ts` (created by artifact-approval-gates)
- Extend: `src/core/artifacts/publisher.ts` (created by artifact-approval-gates)
- Test: `test/workflow/validation-gate.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, test-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createValidationGate } from '../../src/core/workflow/validation-gate'

it('keeps approve unavailable and returns problems to the publishing role', () => {
  const corrections: Array<{ role: string; problems: string[] }> = []
  const gate = createValidationGate({
    validate: () => ['REQ-002: P1 requirement has no check'],
    requestCorrection: (role, problems) => corrections.push({ role, problems }),
  })
  const result = gate.onPublish({ kind: 'plan', revision: 'r1', role: 'planner', text: '# Plan' })
  expect(result.approvable).toBe(false)
  expect(gate.canApprove('r1')).toEqual({ ok: false, problems: ['REQ-002: P1 requirement has no check'] })
  expect(corrections).toEqual([{ role: 'planner', problems: ['REQ-002: P1 requirement has no check'] }])
})
```

**Step 2: Run test to verify it fails**
Run: `rtk npm test -- test/workflow/validation-gate.test.ts`
Expected: FAIL because the gate does not record validation per revision.

**Step 3: Write minimal implementation**

On every spec or plan publication (agent or external change reconciled under REQ-037), run the matching validator, persist the problems bound to the artifact content hash (REQ-011), and send them to the publishing role through the existing correction path (Planner or Research; REQ-056). The human approve command in `approvals.ts` calls `canApprove(revision)` and rejects with the problems while the list is not empty; a new revision re-validates. Agents never bypass it (REQ-045).

```typescript
export interface ValidationGate {
  onPublish(input: { kind: 'spec' | 'plan'; revision: string; role: string; text: string }): { approvable: boolean; problems: string[] }
  canApprove(revision: string): { ok: true } | { ok: false; problems: string[] }
}
```

**Step 4: Run test to verify it passes**
Run: `rtk npm test -- test/workflow/validation-gate.test.ts`. Expected: PASS. Add: a corrected revision becomes approvable; an older revision's result never approves a newer one; an IPC approve call with problems is rejected in core, not only in the UI. Then the repo gates.

**Step 5: Commit**
Run: `/git commit`

### Task 3: Lessons store (SQLite)

**Requirement:** REQ-091
**Depends on:** none within this plan
**Files:**

- Create: `src/core/lessons/store.ts`
- Create: `src/core/lessons/normalize.ts`
- Create: `test/lessons/store.test.ts`
- Test: `test/lessons/store.test.ts`

**Team:**

- Track: data
- Implementer: backend-engineer (skills: test-driven-development)
- Reviewers: consequences-reviewer, security-reviewer, business-logic-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../../src/core/database'
import { createLessonStore } from '../../src/core/lessons/store'

const rule = { signal: 'weak_test', text: 'Assert the exact persisted status', source: 'finding:7' } as const

describe('lesson store', () => {
  it('promotes at the second distinct feature', () => {
    const store = createLessonStore(createDatabase(':memory:'))
    expect(store.add({ projectId: 'p', featureId: 'a', ...rule }).status).toBe('candidate')
    expect(store.add({ projectId: 'p', featureId: 'a', ...rule }).status).toBe('candidate')
    const second = store.add({ projectId: 'p', featureId: 'b', ...rule, text: 'assert the EXACT persisted status!' })
    expect(second).toMatchObject({ status: 'confirmed', promoted: true, features: ['a', 'b'] })
  })

  it('quarantines after two penalties', () => {
    const store = createLessonStore(createDatabase(':memory:'))
    store.add({ projectId: 'p', featureId: 'a', ...rule })
    const { id } = store.add({ projectId: 'p', featureId: 'b', ...rule })
    store.penalize('p', id)
    expect(store.penalize('p', id).status).toBe('quarantined')
  })

  it('keeps projects apart', () => {
    const store = createLessonStore(createDatabase(':memory:'))
    store.add({ projectId: 'p', featureId: 'a', ...rule })
    expect(store.add({ projectId: 'q', featureId: 'b', ...rule }).status).toBe('candidate')
  })
})
```

**Step 2: Run test to verify it fails**
Run: `rtk npm test -- test/lessons/store.test.ts`
Expected: FAIL because the store does not count features or promote.

**Step 3: Write minimal implementation**

Tables `lessons (id, project_id, key, signal, text, scope, status, penalties, extra_json)` and `lesson_features (lesson_id, feature_id, source)`; `key` = signal plus normalized text (casefold, NFKD without combining marks, punctuation to spaces, collapsed). `add` runs in one transaction (two features closing at once), returns `{ id, status, promoted, features }`; `penalize` accepts only confirmed lessons; `setStatus` for the user's quarantine/restore; `listConfirmed(projectId, { scope, limit })`. Unknown columns in `extra_json` survive rewrites.

**Step 4: Run test to verify it passes**
Run: `rtk npm test -- test/lessons/store.test.ts`. Expected: PASS. Add: accent/punctuation dedup, penalize refuses a candidate, restore from quarantine, concurrent promotion in one transaction. Then the repo gates.

**Step 5: Commit**
Run: `/git commit`

### Task 4: Grounded lesson tool, LESSONS.md artifact and context injection

**Requirement:** REQ-091
**Depends on:** Task 3
**Files:**

- Create: `src/core/mcp/lesson-tools.ts`
- Create: `src/core/lessons/render.ts`
- Create: `test/lessons/tools.test.ts`
- Extend: `src/core/agents/context.ts` (created by agent-settings-skills)
- Extend: `src/core/mcp/gateway.ts` (created by artifact-approval-gates)
- Test: `test/lessons/tools.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: security-reviewer, business-logic-reviewer, test-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createLessonTools } from '../../src/core/mcp/lesson-tools'
import { lessonContext } from '../../src/core/lessons/render'

describe('lesson tools', () => {
  it('rejects a lesson whose source is not a finding of the feature', () => {
    const tools = createLessonTools({
      findingsOf: () => ['finding:7'],
      store: { add: () => { throw new Error('must not be called') } },
      publish: () => undefined,
    })
    expect(() =>
      tools.propose({ projectId: 'p', featureId: 'a', signal: 'weak_test', source: 'finding:99', text: 'x' }),
    ).toThrow(/not a finding of this feature/)
  })

  it('injects at most 20 confirmed lessons as untrusted data', () => {
    const lessons = Array.from({ length: 25 }, (_, i) => ({ id: `L-${i}`, text: `rule ${i}`, scope: '' }))
    const context = lessonContext(lessons)
    expect(context.trust).toBe('untrusted')
    expect(context.items).toHaveLength(20)
  })
})
```

**Step 2: Run test to verify it fails**
Run: `rtk npm test -- test/lessons/tools.test.ts`
Expected: FAIL because proposals are not grounded and the context is not capped.

**Step 3: Write minimal implementation**

Expose `lessons.propose` only to the Reviewer, only on the round that closes the feature with zero open findings (REQ-022, REQ-048): the core resolves `source` against the feature's recorded findings and failed proofs, never trusting a model-supplied ID alone. After each write, render `LESSONS.md` (Confirmed, Candidates, Quarantined; plain text, no HTML) and publish it atomically at the artifact root (REQ-037). `agents/context.ts` adds `lessonContext(listConfirmed(project, { scope: featureArea, limit: 20 }))` to Research and Planner turns, marked untrusted (REQ-051). A closing round that finds the failure an applied lesson covers penalizes it.

**Step 4: Run test to verify it passes**
Run: `rtk npm test -- test/lessons/tools.test.ts`. Expected: PASS. Add: a non-Reviewer role or an open round is refused; a source from another project is refused; `LESSONS.md` is byte-identical when nothing changed; lesson text with Markdown/HTML renders inert. Then the repo gates.

**Step 5: Commit**
Run: `/git commit`

### Task 5: Proof runner and the final-approval block

**Requirement:** REQ-092
**Depends on:** Task 1
**Files:**

- Create: `src/core/proofs/runner.ts`
- Create: `src/core/proofs/store.ts`
- Create: `test/proofs/runner.test.ts`
- Extend: `src/core/workflow/gates.ts` (created by artifact-approval-gates)
- Test: `test/proofs/runner.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, test-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runProofs } from '../../src/core/proofs/runner'
import { finalApprovalBlock } from '../../src/core/proofs/store'

const checks = {
  runs: { core: 'npm test -- --reporter=verbose' },
  checks: [
    { id: 'C1', requirements: ['REQ-091'], run: 'core', words: '✓ promotes at the second', command: null },
    { id: 'C2', requirements: ['REQ-092'], run: 'core', words: '✓ blocks final approval', command: null },
  ],
}

describe('proofs', () => {
  it('reads NO TEST RAN when the passing line is absent', async () => {
    const calls: string[] = []
    const results = await runProofs(checks, async (command) => {
      calls.push(command)
      return { code: 0, output: ' ✓ promotes at the second distinct feature\n' }
    })
    expect(results.map((r) => r.status)).toEqual(['PASS', 'NO TEST RAN'])
    expect(calls).toHaveLength(1)
  })

  it('blocks final approval while a check is not PASS at the reviewed commit', () => {
    const recorded = { commit: 'abc', results: [{ id: 'C1', status: 'PASS' }, { id: 'C2', status: 'FAIL' }] }
    expect(finalApprovalBlock(recorded, 'abc')).toEqual(['C2 is FAIL at abc'])
    expect(finalApprovalBlock({ ...recorded, results: [{ id: 'C1', status: 'PASS' }] }, 'def')).toEqual([
      'proofs were recorded at abc, not at the reviewed commit def',
    ])
  })
})
```

**Step 2: Run test to verify it fails**
Run: `rtk npm test -- test/proofs/runner.test.ts`
Expected: FAIL because proofs are neither grouped nor matched by line.

**Step 3: Write minimal implementation**

`runProofs(checks, execute)` runs each run group and lone command once, sequentially, through an injected executor; the production executor is the managed command runtime (REQ-055, owned process group, REQ-034 stop semantics, no new timeout). A run proof passes only on exit 0 with its words in order on one output line; a lone proof by exit code. After the last Implementer commit, the core runs them on the committed fingerprint, stores per-check status and output tail bound to that commit, and `gates.ts` adds `finalApprovalBlock(recorded, reviewedCommit)` to the final-approval prerequisites. A legacy plan without checks returns no block and shows "no checks".

**Step 4: Run test to verify it passes**
Run: `rtk npm test -- test/proofs/runner.test.ts`. Expected: PASS. Add: a red run fails every check in its group; a malformed check line blocks; RPI artifact writes after the proof do not stale it (REQ-011 fingerprint excludes artifact paths). Then the repo gates.

**Step 5: Commit**
Run: `/git commit`

### Task 6: Verifier contract for Tester and Reviewer

**Requirement:** REQ-093
**Depends on:** Task 5
**Files:**

- Create: `src/core/workflow/verifier.ts`
- Create: `test/workflow/verifier.test.ts`
- Extend: `src/core/workflow/review.ts` (created by guided-rpi-orchestration)
- Extend: `src/core/agents/role-policy.ts` (created by agent-settings-skills)
- Test: `test/workflow/verifier.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, test-driven-development)
- Reviewers: business-logic-reviewer, test-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkReviewVerdicts } from '../../src/core/workflow/verifier'

const planChecks = ['C1', 'C2']

describe('verifier contract', () => {
  it('rejects a review missing a verdict for a check', () => {
    expect(checkReviewVerdicts(planChecks, [{ check: 'C1', test: 't.ts > a', holds: 'yes' }])).toEqual({
      ok: false,
      problems: ['C2: no verdict'],
    })
  })

  it('records a does-not-hold verdict as a High finding', () => {
    const result = checkReviewVerdicts(planChecks, [
      { check: 'C1', test: 't.ts > a', holds: 'yes' },
      { check: 'C2', test: 't.ts > b', holds: 'no - toBeDefined()' },
    ])
    expect(result).toEqual({
      ok: true,
      findings: [{ severity: 'High', checkId: 'C2', issue: 'C2: test does not hold its claim (no - toBeDefined())' }],
    })
  })
})
```

**Step 2: Run test to verify it fails**
Run: `rtk npm test -- test/workflow/verifier.test.ts`
Expected: FAIL because review publication does not require verdicts.

**Step 3: Write minimal implementation**

`review.ts` calls `checkReviewVerdicts` before accepting a Reviewer publication on a plan with checks: a missing verdict rejects the publication with the list; each `no` becomes a High finding linked to the check (it blocks final approval unless waived, REQ-057). `role-policy.ts` adds to the Tester and Reviewer instructions, per check: would the selected test fail if the claim were false; two throwaway examples outside the named cases, kept out of the worktree; assertions looser than their criterion. Instructions are adapted per invocation, never written into the user's skill files (REQ-051).

**Step 4: Run test to verify it passes**
Run: `rtk npm test -- test/workflow/verifier.test.ts`. Expected: PASS. Add: a legacy plan without checks needs no verdicts; a verdict for an unknown check is rejected; an Implementer cannot publish verdicts (REQ-027). Then the repo gates.

**Step 5: Commit**
Run: `/git commit`

### Task 7: Lessons in Memories and validation problems in the document viewer

**Requirement:** REQ-091, REQ-092, REQ-094
**Depends on:** Task 2, Task 4, Task 5
**Files:**

- Create: `src/renderer/src/features/lessons/lessons-section.tsx`
- Create: `src/renderer/src/features/lessons/index.ts`
- Create: `src/renderer/src/features/document-reader/validation-panel.tsx`
- Create: `test/ui/lessons-section.test.tsx`
- Create: `test/ui/validation-panel.test.tsx`
- Extend: `src/renderer/src/features/project-navigator/library-sections.tsx` (created by project-sidebar-navigator)
- Modify: `src/renderer/src/pages/document/document-page.tsx`
- Test: `test/ui/lessons-section.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { LessonsSection } from '../../src/renderer/src/features/lessons'
import { ValidationPanel } from '../../src/renderer/src/features/document-reader/validation-panel'

it('lists lessons with status and quarantine action', async () => {
  const onQuarantine = vi.fn()
  render(
    <LessonsSection
      lessons={[{ id: 'L-001', text: 'Assert the exact persisted status', status: 'confirmed', features: 2 }]}
      onQuarantine={onQuarantine}
      onRestore={vi.fn()}
    />,
  )
  expect(screen.getByText('Assert the exact persisted status')).toBeVisible()
  expect(screen.getByText('confirmed')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Quarantine L-001' }))
  expect(onQuarantine).toHaveBeenCalledWith('L-001')
})

it('shows validation problems and disables Approve', () => {
  render(<ValidationPanel problems={['REQ-002: P1 requirement has no check']} onApprove={vi.fn()} />)
  expect(screen.getByRole('list', { name: 'Validation problems' })).toHaveTextContent('REQ-002')
  expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
})
```

**Step 2: Run test to verify it fails**
Run: `rtk npm test -- test/ui/lessons-section.test.tsx test/ui/validation-panel.test.tsx`
Expected: FAIL because the components render nothing yet (compiling no-op surfaces).

**Step 3: Write minimal implementation**

`LessonsSection` sits inside the Memories section (REQ-085 anatomy, shared shadcn components, VS Code-style tooltips on icon buttons), with a status badge per lesson and Quarantine/Restore icon buttons labelled per lesson; lesson text rendered as plain text. `ValidationPanel` appears above the document in the viewer for a spec or plan: a labelled list of problems, the proof table for a plan (PASS, FAIL, NO TEST RAN, or "no checks" for a legacy plan), and the Approve button disabled with a tooltip while problems exist. Both are keyboard reachable with visible focus.

**Step 4: Run test to verify it passes**
Run: `rtk npm test -- test/ui/lessons-section.test.tsx test/ui/validation-panel.test.tsx`. Expected: PASS. Add a Playwright step in `test/app-e2e/` that opens a plan with a problem and finds Approve disabled. Check the styleguide visually against the component fidelity rules. Then the repo gates.

**Step 5: Commit**
Run: `/git commit`
