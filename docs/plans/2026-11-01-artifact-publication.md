# Plan: Artifact Publication

> **Spec:** docs/specs/artifact-publication/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Publish, validate and approve chat outputs with hash-bound approvals.
**Architecture:** Artifact path resolution, atomic section-preserving publication, TypeScript validators matching the RPI rules and an approvals table keyed by exact hashes.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 07
**Total Tasks:** 5
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

- Agents publish only their artifact type.
- Approvals follow the exact bytes approved.

## Checks

**Run slice**: `npx vitest run test/core/artifact-approvals.test.ts test/core/artifact-paths.test.ts test/core/artifact-publish.test.ts test/core/artifact-validate.test.ts test/core/outputs.test.ts --reporter=verbose`

- C1 (REQ-025): artifact publication holds as specified. Proof: run slice | ✓ uses the worktree when present and honors rpi-paths.json
- C2 (REQ-026): artifact validation holds as specified. Proof: run slice | ✓ rejects specs and plans that break the RPI format
- C3 (REQ-027): hash-bound approvals holds as specified. Proof: run slice | ✓ keeps an approval only while the approved bytes and dependencies are unchanged
- C4 (REQ-029): atomic publication and reconciliation holds as specified. Proof: run slice | ✓ writes atomically, is idempotent and keeps unknown sections
- C5 (REQ-030): outputs in the sidebar holds as specified. Proof: run slice | ✓ lists outputs per kind with the name of the chat that produced them

## Tasks

### Task 1: Resolve the chat artifact root

**Requirement:** REQ-025
**Files:**

- Create: `src/core/artifacts/paths.ts`
- Test: `test/core/artifact-paths.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { artifactPath } from '../../src/core/artifacts/paths'
it('uses the worktree when present and honors rpi-paths.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-art-'))
  expect(artifactPath({ root, slug: 'rate-limits', kind: 'spec' })).toBe(join(root, 'docs/specs/rate-limits/SPEC.md'))
  mkdirSync(join(root, '.claude'))
  writeFileSync(join(root, '.claude/rpi-paths.json'), JSON.stringify({ specs_dir: 'projetos/specs', spec_filename: '{slug}-spec.md' }))
  expect(artifactPath({ root, slug: 'rate-limits', kind: 'spec' })).toBe(join(root, 'projetos/specs/rate-limits/rate-limits-spec.md'))
  expect(() => artifactPath({ root, slug: '../x', kind: 'spec' })).toThrow(/slug/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/artifact-paths.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Root is the chat worktree when bound to Git, the opened folder otherwise; invalid slugs and paths escaping the root are refused.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/artifact-paths.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A malformed rpi-paths.json falls back to defaults with a warning.
- Plans keep the date-prefixed name.
- Reviews go under docs/reviews.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Publish artifacts atomically and idempotently

**Requirement:** REQ-025, REQ-029
**Depends on:** Task 1
**Files:**

- Create: `src/core/artifacts/publish.ts`
- Test: `test/core/artifact-publish.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { publishArtifact } from '../../src/core/artifacts/publish'
it('writes atomically, is idempotent and keeps unknown sections', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'forja-pub-')), 'SPEC.md')
  const first = publishArtifact(file, '# Spec\n\n## Requirements\n\nA\n')
  expect(publishArtifact(file, '# Spec\n\n## Requirements\n\nA\n').changed).toBe(false)
  writeFileSync(file, readFileSync(file, 'utf8') + '\n## Notes from me\n\nkeep\n')
  publishArtifact(file, '# Spec\n\n## Requirements\n\nB\n')
  expect(readFileSync(file, 'utf8')).toContain('## Notes from me')
  expect(first.hash).toMatch(/^[a-f0-9]{64}$/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/artifact-publish.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Write to a temp file and rename; compare hashes for idempotence; merge by section keeping sections the agent did not write; record the revision and hash on the output.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/artifact-publish.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Running publish twice produces byte-identical files.
- A section added by the user survives two publishes.
- A partially written temp file never replaces the target.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Validate published specs and plans

**Requirement:** REQ-026
**Depends on:** Task 2
**Files:**

- Create: `src/core/artifacts/validate.ts`
- Test: `test/core/artifact-validate.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { validateSpec, validatePlan } from '../../src/core/artifacts/validate'
it('rejects specs and plans that break the RPI format', () => {
  expect(validateSpec('1. **[REQ-001]** WHEN a THEN the system SHALL b.\n\n| REQ-001 | A | P1 | x |').problems).toEqual([])
  expect(validateSpec('1. **[REQ-002]** WHEN a THEN b.').problems.length).toBeGreaterThan(0)
  expect(validatePlan('## Checks\n\n### Task 1: x\n').problems).toEqual(expect.arrayContaining([expect.stringMatching(/Requirement/)]))
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/artifact-validate.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Port the rules of `validate_plan.py` and the EARS/ID/traceability checks to TypeScript; publication fails with the list of problems and nothing is written.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/artifact-validate.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Duplicate requirement IDs are reported.
- A P1 requirement without a check is reported.
- A malformed proof marker is reported.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Bind approvals to content hashes and invalidate on change

**Requirement:** REQ-027
**Depends on:** Task 2
**Files:**

- Create: `src/core/artifacts/approvals.ts`
- Test: `test/core/artifact-approvals.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createDatabase } from '../../src/core/database'
import { approve, isApproved, invalidateDependents } from '../../src/core/artifacts/approvals'
it('keeps an approval only while the approved bytes and dependencies are unchanged', () => {
  const db = createDatabase(':memory:')
  approve(db, { chatId: 'c1', subject: 'spec', hash: 'h1', actor: 'user' })
  expect(isApproved(db, { chatId: 'c1', subject: 'spec', hash: 'h1' })).toBe(true)
  expect(isApproved(db, { chatId: 'c1', subject: 'spec', hash: 'h2' })).toBe(false)
  approve(db, { chatId: 'c1', subject: 'plan', hash: 'p1', actor: 'user', dependsOn: ['spec:h1'] })
  invalidateDependents(db, 'c1', 'spec')
  expect(isApproved(db, { chatId: 'c1', subject: 'plan', hash: 'p1' })).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/artifact-approvals.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Approvals store subject, exact hash, dependency revisions and actor; changes invalidate the subject and its dependents while history stays; dispatch and approval re-check the current hash. RPI artifact paths are excluded from the code fingerprint.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/artifact-approvals.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Invalidated approvals stay in history.
- Approving a stale hash is refused.
- Artifact path changes do not stale code evidence.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: List outputs with their chat

**Requirement:** REQ-030
**Depends on:** Task 4
**Files:**

- Create: `src/core/artifacts/outputs.ts`
- Test: `test/core/outputs.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createDatabase } from '../../src/core/database'
import { createProjectStore } from '../../src/core/projects/project-store'
import { createChatStore } from '../../src/core/chats/chat-store'
import { recordOutput, outputsByProject } from '../../src/core/artifacts/outputs'
it('lists outputs per kind with the name of the chat that produced them', () => {
  const db = createDatabase(':memory:')
  const project = createProjectStore(db).open(process.cwd())
  const chat = createChatStore(db).create(project.id, { prompt: 'Rate limits' })
  recordOutput(db, { chatId: chat.id, kind: 'spec', path: 'docs/specs/rate-limits/SPEC.md', title: 'rate-limits/SPEC.md', hash: 'h' })
  expect(outputsByProject(db, project.id).spec).toEqual([expect.objectContaining({ chatName: 'Rate limits', state: 'draft' })])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/outputs.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Group outputs by kind (spec, plan, review, skill, memory, feature, bug) with state (draft, approved, stale) and the chat name for the sidebar subtitle.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/outputs.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Outputs of archived chats are excluded unless asked.
- State reflects the current approval.
- Skills and memories without a chat still list.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-artifact-publication.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
