# Plan: Artifacts, Versions and Human Approval Gates

> **Spec:** docs/specs/artifact-approval-gates/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Publish RPI artifacts under the opened folder and enforce content-bound human approvals from authoritative JSON state.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 05 of 13
**Total Tasks:** 5
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [project-feature-state](2026-10-30-project-feature-state.md)
- [agent-settings-skills](2026-10-30-agent-settings-skills.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Authoritative state stays in SQLite; user folders contain artifact files only.
- Publication is conditional, atomic, idempotent and preserves content.
- Human approval is exact-version-bound and invalidation reaches dependent work.

## Tasks

### Task 1: Resolve RPI artifact paths and validate role publication

**Requirement:** REQ-013, REQ-022, REQ-037, REQ-048
**Depends on:** none within this plan
**Files:**
- Create: `src/core/artifacts/paths.ts`
- Create: `src/core/artifacts/policy.ts`
- Create: `test/artifacts/paths.test.ts`
- Test: `test/artifacts/paths.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { defaultArtifactPath, mayPublish } from '../../src/core/artifacts/policy'
it('keeps Research artifacts separate from production code or approvals', () => {
  expect(defaultArtifactPath('spec', 'login', '2026-10-30')).toBe('docs/specs/login/SPEC.md')
  expect(mayPublish('research', 'spec')).toBe(true)
  expect(mayPublish('research', 'review')).toBe(false)
  expect(mayPublish('reviewer', 'review')).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/artifacts/paths.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Resolve optional specs_dir/plans_dir/spec_filename from the opened folder's rpi-paths.json, with per-key defaults and explicit diagnostics for malformed values. Default reviews remain docs/reviews/<slug>.md plus the compatible review-round history. Do not silently derive paths from the target Git repo. Validate slug, canonical ancestor/root and symlink boundaries at write time; configured roots outside the folder need explicit user authorization.

```typescript
export type ArtifactKind = 'spec' | 'plan' | 'review'
export function defaultArtifactPath(kind: ArtifactKind, slug: string, date: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid feature slug')
  if (kind === 'spec') return `docs/specs/${slug}/SPEC.md`
  if (kind === 'plan') return `docs/plans/${date}-${slug}.md`
  return `docs/reviews/${slug}.md`
}
export function mayPublish(role: string, kind: ArtifactKind): boolean {
  return ({ spec: 'research', plan: 'planner', review: 'reviewer' } as const)[kind] === role
}
```

Review content conforms to the existing rpi-review renderer/parser contract discovered from ~/.claude/scripts at implementation time; don't handcraft an incompatible findings table.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/artifacts/paths.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Reject traversal, slug collisions, unauthorized external roots and symlink escape.
- Two target repos under one opened folder cannot overwrite the same feature artifact.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Publish atomically and version exact artifact bytes

**Requirement:** REQ-011, REQ-013, REQ-037, REQ-050
**Depends on:** Task 1
**Files:**
- Create: `src/core/artifacts/publisher.ts`
- Create: `src/core/artifacts/versions.ts`
- Create: `test/artifacts/publish.test.ts`
- Test: `test/artifacts/publish.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
 import { expect, it } from 'vitest'
 import { contentHash } from '../../src/core/artifacts/versions'
 it('preserves exact content identity including unknown sections', () => {
   const original = '# Spec\n\n<!-- keep -->\nCustom section\n'
   expect(contentHash(original)).toBe(contentHash(original))
   expect(contentHash(original + '\n')).not.toBe(contentHash(original))
 })
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/artifacts/publish.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Write a temporary file in the authorized parent, flush and atomically rename; persist a version/provenance record and reconcile a crash between filesystem and DB with an intent record. Conditional writes require the expected previous hash to prevent overwriting external edits. Store exact UTF-8 source, not parsed-and-regenerated markdown. Same bytes create no duplicate version and produce identical file bytes on repeated publication.

```typescript
import { createHash } from 'node:crypto'
export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}
```

Preserve user unknown sections/media/comments via whole-content edits with expected hash, or document-specific tolerant transformations. Treat first-time external documents as unapproved, with explicit author linkage rather than assuming a Research run created them.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/artifacts/publish.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real temp-file tests publish twice and compare bytes/version counts.
- Inject unknown sections/media and verify round trip preservation.
- Disk failure, stale hash or DB failure leaves recoverable content with no false approval.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Implement content-bound approvals and transitive stale dependencies

**Requirement:** REQ-009, REQ-010, REQ-011, REQ-045
**Depends on:** Task 2
**Files:**
- Create: `src/core/workflow/approvals.ts`
- Create: `src/core/workflow/gates.ts`
- Create: `src/core/workflow/invalidation.ts`
- Create: `test/workflow/approvals.test.ts`
- Test: `test/workflow/approvals.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { canUseApproval } from '../../src/core/workflow/approvals'
it('does not reuse approval after content or dependency changes', () => {
  expect(canUseApproval({ hash: 'v1', dependencyHash: 's1', actor: 'human' }, 'v1', 's1')).toBe(true)
  expect(canUseApproval({ hash: 'v1', dependencyHash: 's1', actor: 'human' }, 'v2', 's1')).toBe(false)
  expect(canUseApproval({ hash: 'v1', dependencyHash: 's1', actor: 'human' }, 'v1', 's2')).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/workflow/approvals.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Create human-only approval records with artifact hash, dependency fingerprints, actor/action timestamp and feature revision. On approval and dispatch reread filesystem content, compare state revision and update in one authoritative transaction. Watchers call the same invalidation service. Spec changes stale plans and downstream implementation/tests/reviews; code changes stale its checks/review. Stale approval requests are rejected, not refreshed silently.

```typescript
export function canUseApproval(approval: { hash: string; dependencyHash: string; actor: string }, hash: string, dependencyHash: string): boolean {
  return approval.actor === 'human' && approval.hash === hash && approval.dependencyHash === dependencyHash
}
```

The persisted graph supports multiple dependencies, not only the one-dependency seed. Model role-specific start gates for Planner and Implementer and later transitions. No MCP method grants approvals.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/workflow/approvals.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Change a file between watcher events and start; gate still blocks.
- Double approval clicks and simultaneous windows cannot approve different revisions.
- Draft/missing/malformed prerequisites block before CLI launch.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Expose scoped state/artifact MCP tools and bridge approvals separately

**Requirement:** REQ-012, REQ-013, REQ-022, REQ-027, REQ-045, REQ-048, REQ-051
**Depends on:** Task 3
**Files:**
- Create: `src/core/mcp/gateway.ts`
- Create: `src/core/mcp/artifact-tools.ts`
- Create: `src/core/mcp/capability.ts`
- Create: `test/mcp/artifact-tools.test.ts`
- Modify: `src/shared/contracts.ts`
- Modify: `src/core/index.ts`
- Test: `test/mcp/artifact-tools.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { toolNamesForRole } from '../../src/core/mcp/artifact-tools'
it('never gives an agent a human approval operation', () => {
  expect(toolNamesForRole('research')).toContain('forja.artifacts.publishSpec')
  expect(toolNamesForRole('research')).not.toContain('forja.artifacts.publishPlan')
  expect(toolNamesForRole('implementer')).not.toContain('forja.workflow.approve')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/mcp/artifact-tools.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Use the official MCP SDK with a local loopback gateway and random revocable per-run capability. Bind the capability server-side to project/feature/role/run, never trust featureId args. Offer workflow.read, role-scoped artifact read/publish, review findings/round publishing and handoff request. Reject non-listed tools and unknown schemas before action. Human approval flows through validated window IPC with sender/project capability, not a model tool.

```typescript
export function toolNamesForRole(role: string): string[] {
  const publication: Record<string, string[]> = {
    research: ['forja.artifacts.publishSpec'], planner: ['forja.artifacts.publishPlan'],
    implementer: [], tester: [], reviewer: ['forja.artifacts.publishReview'],
  }
  return ['forja.workflow.read', 'forja.artifacts.read', 'forja.handoff.request', ...(publication[role] ?? [])]
}
```

Persist review history in the approved format with idempotent run/request IDs; only Reviewer changes findings. Strip/reject caller-controlled approval flags. Define tool contracts now; command tools are added by the managed runtime plan without changing authority.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/mcp/artifact-tools.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real MCP client tests inspect tools/list, call cross-feature IDs, revoke capabilities and reject approval attempts.
- No token in URLs/logged command args; no inherited user MCP server can impersonate a Forja capability.
- Mock malicious tool annotations never bypass role policy.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Scope source file reads and conditional implementation edits

**Requirement:** REQ-011, REQ-022, REQ-037, REQ-048, REQ-050, REQ-051
**Depends on:** Task 4
**Files:**
- Create: `src/core/mcp/file-tools.ts`
- Create: `src/core/files/scoped-files.ts`
- Create: `test/mcp/file-tools.test.ts`
- Test: `test/mcp/file-tools.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { mayWriteCode } from '../../src/core/mcp/file-tools'
it('keeps code correction authority with Implementer only', () => {
  expect(mayWriteCode('implementer', true)).toBe(true)
  expect(mayWriteCode('implementer', false)).toBe(false)
  expect(mayWriteCode('tester', true)).toBe(false)
  expect(mayWriteCode('reviewer', true)).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/mcp/file-tools.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Provide feature-scoped read and conditional write/edit tools for code/document context where native file tools cannot be proven role-safe. Resolve target source reads separately from artifact roots; before implementation the selected repository may be read only. Code writes require Implementer, approved plan and an owned feature worktree, plus expected previous content hash. Do not expose settings files or credentials as convenience context.

```typescript
export function mayWriteCode(role: string, planApproved: boolean): boolean {
  return role === 'implementer' && planApproved
}
```

This predicate is only one condition; authoritative core checks role/run capability, target root, approval revision and canonical path. Implement atomic conditional edits with idempotence and unknown-content round-trip tests, refusing stale source hashes. Protect .git metadata and app approval/settings state from these tools. If the CLI native file tools cannot be scoped equivalently, disable them per invocation and use this gateway. Failure to remove a competing privileged tool route is a controlled-mode compatibility failure, not a reason to widen grants.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/mcp/file-tools.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Read target code without granting writes to Research/Planner/Tester/Reviewer.
- Attempt .git/config, parent traversal and symlink escape and confirm denial.
- Repeat the same conditional file edit, preserve user content and invalidate evidence after a real change.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
