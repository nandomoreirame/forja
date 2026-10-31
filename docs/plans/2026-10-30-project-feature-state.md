# Plan: Project Windows and Feature State

> **Spec:** docs/specs/project-feature-state/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Create durable project/feature identities, validated IPC and per-feature execution ownership without introducing a workspace abstraction.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 03 of 13
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [cli-capability-contracts](2026-10-30-cli-capability-contracts.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Any existing folder opens as a project and duplicate canonical folders focus the existing window.
- Feature identity/name/target are persisted separately with schema migrations.
- Cross-window requests are scoped and feature execution is serialized.

## Tasks

### Task 1: Add transactional migrations and versioned feature JSON

**Requirement:** REQ-002, REQ-008, REQ-012
**Depends on:** none within this plan
**Files:**
- Create: `src/core/storage/migrations.ts`
- Create: `src/core/storage/feature-store.ts`
- Create: `src/shared/domain/feature.ts`
- Create: `test/storage/features.test.ts`
- Modify: `src/core/database.ts`
- Test: `test/storage/features.test.ts`

**Team:**
- Track: data
- Implementer: backend-engineer (skills: security-guardrails, test-driven-development)
- Reviewers: consequences-reviewer, security-reviewer, business-logic-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createDatabase } from '../../src/core/database'
import { FeatureStore } from '../../src/core/storage/feature-store'
it('reopens a named feature without conflating its slug and label', () => {
  const db = createDatabase(':memory:')
  db.prepare('INSERT INTO projects (id, root_path, created_at) VALUES (?, ?, ?)').run('project-a', '/tmp/project-a', 0)
  const store = new FeatureStore(db)
  const feature = store.create({ projectId: 'project-a', slug: 'login', name: 'Login' })
  store.rename(feature.id, 'OAuth login')
  expect(store.get(feature.id)).toMatchObject({ slug: 'login', name: 'OAuth login', stateVersion: 1 })
  db.close()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/storage/features.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Extend migrations without dropping the existing settings table; add canonical projects, features with unique project/slug, role conversations, messages, executions, artifacts/versions, approvals and events. Store RPI workflow JSON plus schemaVersion/revision; use transactions and compare-and-swap for state updates. The projects table includes id, root_path and created_at as used in the fixture. FeatureStore.create requires a valid project foreign key; never weaken foreign keys to satisfy the test.

```typescript
export interface WorkflowState {
  schemaVersion: 1
  revision: number
  phase: 'research' | 'plan' | 'implement' | 'test' | 'review' | 'done'
  correctionRounds: number
  paused: boolean
}
export function initialWorkflow(): WorkflowState {
  return { schemaVersion: 1, revision: 0, phase: 'research', correctionRounds: 0, paused: false }
}
```

Keep JSON parsing/schema validation in core. Unknown optional JSON fields survive compatible updates. Split schema upgrades into named immutable migrations and apply atomically; reopen a temporary on-disk DB twice.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/storage/features.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Migration rerun is idempotent; rollback leaves previous user_version intact.
- Stale revision update fails without lost writes; two feature slugs cannot collide in one project.
- Preserve preexisting settings and reject malformed JSON with recoverable diagnostics.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Canonicalize opened folders and create one window per project

**Requirement:** REQ-001, REQ-003, REQ-050
**Depends on:** Task 1
**Files:**
- Create: `src/core/projects/project-store.ts`
- Create: `src/main/project-windows.ts`
- Create: `test/projects/identity.test.ts`
- Modify: `src/main/index.ts`
- Test: `test/projects/identity.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { mkdtempSync, symlinkSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canonicalProjectPath } from '../../src/core/projects/project-store'
it('treats a symlink and its existing folder as the same project', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-project-'))
  try {
    mkdirSync(join(root, 'dev')); symlinkSync(join(root, 'dev'), join(root, 'alias'))
    expect(await canonicalProjectPath(join(root, 'alias'))).toBe(await canonicalProjectPath(join(root, 'dev')))
  } finally { rmSync(root, { recursive: true, force: true }) }
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/projects/identity.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement canonical folder identity using realpath/stat, bounded explicit ~ expansion and platform path normalization. No Git requirement and no recursive child-repo discovery that changes ownership. Main maps canonical project ID to BrowserWindow, focuses an existing window or creates a new sandboxed one with its project capability. Project records and feature target repo remain distinct.

```typescript
import { realpath, stat } from 'node:fs/promises'
export async function canonicalProjectPath(path: string): Promise<string> {
  const canonical = await realpath(path)
  if (!(await stat(canonical)).isDirectory()) throw new Error('Choose an existing folder')
  return canonical
}
```

Folder picker returns a trusted selection into the main/core path registry. Never accept model-generated arbitrary folder selections as equivalent to a human picker grant.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/projects/identity.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Non-Git root opens; different selected folders create different windows.
- File/nonexistent/unreadable folder rejected without exposing internal stack.
- Window-specific bridge cannot access another project.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Implement validated bridge requests and paginated feature events

**Requirement:** REQ-002, REQ-007, REQ-012, REQ-048
**Depends on:** Task 2
**Files:**
- Create: `src/shared/ipc/schema.ts`
- Create: `src/core/ipc/dispatch.ts`
- Create: `src/preload/bridge.ts`
- Create: `src/renderer/src/shared/api/client.ts`
- Create: `test/ipc/dispatch.test.ts`
- Modify: `src/shared/contracts.ts`
- Modify: `src/core/index.ts`
- Modify: `src/preload/index.ts`
- Test: `test/ipc/dispatch.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { validateEnvelope } from '../../src/shared/ipc/schema'
it('rejects arbitrary method injection and invalid owners', () => {
  expect(validateEnvelope({ id: 'r1', projectId: 'p1', method: 'features.list', params: {} }).success).toBe(true)
  expect(validateEnvelope({ id: 'r2', projectId: 'p1', method: '__proto__', params: {} }).success).toBe(false)
  expect(validateEnvelope({ id: '', method: 'features.list', params: {} }).success).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ipc/dispatch.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Replace health-only dispatch with an explicit method registry and Zod discriminated envelopes. Main validates sender frame/window against its bound project; core independently validates feature ownership. Preload exposes only typed request/subscription capabilities, never raw ipcRenderer or shell access. Add unsubscribe/disconnect cancellation and stream sequence numbers; snapshots load metadata and paginated messages/logs, not the entire database.

```typescript
import { z } from 'zod'
const envelope = z.object({ id: z.string().min(1), projectId: z.string().min(1), method: z.enum(['features.list', 'features.create', 'features.rename']), params: z.record(z.string(), z.unknown()) }).strict()
export const validateEnvelope = (input: unknown) => envelope.safeParse(input)
```

This seed schema is extended with method-specific params as each service is introduced. Unknown methods return a structured safe error. Preserve health smoke support during migration, without dual unvalidated bypasses.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ipc/dispatch.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Reject wrong sender/frame/feature, prototype keys and oversized payloads.
- Event replay after reconnect uses durable sequence and no duplicate messages.
- Listeners are removed when windows close; no Node access in renderer.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Serialize turns per feature while preserving cross-feature concurrency

**Requirement:** REQ-007, REQ-008, REQ-012, REQ-054
**Depends on:** Task 3
**Files:**
- Create: `src/core/execution/feature-lease.ts`
- Create: `test/execution/lease.test.ts`
- Test: `test/execution/lease.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { FeatureLease } from '../../src/core/execution/feature-lease'
it('allows another feature but rejects a duplicate turn in the same one', () => {
  const leases = new FeatureLease()
  const release = leases.acquire('a')
  expect(() => leases.acquire('a')).toThrow('Feature is busy')
  const releaseB = leases.acquire('b')
  release(); expect(() => leases.acquire('a')).not.toThrow()
  releaseB()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/execution/lease.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement a core-owned feature lease using execution IDs, compare-and-swap persistent state and idempotent release. A memory lock alone is insufficient if the process restarts. Session ownership includes project, feature, agent and engine. A lost connection does not release a still-running turn automatically; supervisor termination confirmation releases it.

```typescript
export class FeatureLease {
  private active = new Set<string>()
  acquire(featureId: string): () => void {
    if (this.active.has(featureId)) throw new Error('Feature is busy')
    this.active.add(featureId)
    let released = false
    return () => { if (!released) { released = true; this.active.delete(featureId) } }
  }
}
```

Use this in-memory component inside the durable execution service, not as a replacement for the SQLite ownership check. Closing a tab hides presentation only; project-close with active work requests confirmation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/execution/lease.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Concurrent requests contend on one DB revision and cannot create two active run records.
- Different features execute independently.
- Crash-recovered runs are interrupted, not unlocked while a verified owned process is still live.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
