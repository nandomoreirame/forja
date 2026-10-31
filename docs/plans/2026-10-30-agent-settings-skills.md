# Plan: Fixed Agent Settings and Local Skills

> **Spec:** docs/specs/agent-settings-skills/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Configure the five fixed roles and read-only local skills through the approved simple settings view.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 04 of 13
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [web-foundation-landing-styleguide](2026-10-30-web-foundation-landing-styleguide.md)
- [project-feature-state](2026-10-30-project-feature-state.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Configure exactly five agents and the permitted settings.
- Read arbitrary explicitly configured skill folders without edits.
- Global composer remains independent from manual settings saves.

## Tasks

### Task 1: Validate and persist fixed-role profile snapshots

**Requirement:** REQ-014, REQ-016, REQ-053
**Depends on:** none within this plan
**Files:**

- Create: `src/shared/domain/agents.ts`
- Create: `src/core/agents/profile-store.ts`
- Create: `test/agents/profiles.test.ts`
- Test: `test/agents/profiles.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { agentProfileSchema } from '../../src/shared/domain/agents'
it('accepts fixed roles while rejecting custom agents and automatic approval fields', () => {
  const profile = { role: 'implementer', engine: 'codex', instructions: '', skillIds: [], autoInvoke: false }
  expect(agentProfileSchema.safeParse(profile).success).toBe(true)
  expect(agentProfileSchema.safeParse({ ...profile, role: 'manager' }).success).toBe(false)
  expect(agentProfileSchema.safeParse({ ...profile, autoApprove: true }).success).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/agents/profiles.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Define stable role IDs and strict profiles, with model/effort optional and capability-validated. Save global agent defaults in settings; take an immutable profile snapshot at run creation. UI labels are localized while IDs are English. Unknown config keys cannot grant extra permissions.

```typescript
import { z } from 'zod'
export const roleIds = ['research', 'planner', 'implementer', 'tester', 'reviewer'] as const
export const agentProfileSchema = z.object({
  role: z.enum(roleIds), engine: z.enum(['claude', 'codex', 'opencode', 'agy', 'grok']),
  model: z.string().min(1).optional(), effort: z.string().min(1).optional(),
  instructions: z.string().max(64000), skillIds: z.array(z.string().min(1)), autoInvoke: z.boolean().default(false),
}).strict()
```

Repository/service enforces whether effort is supported; blank model/effort fields normalize to omitted, not an invented model.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/agents/profiles.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- All five defaults exist once and cannot be renamed/deleted.
- Editing an active agent changes future turns only.
- Persisted unknown/corrupt engine ID has actionable migration handling.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Read and refresh bounded canonical skills catalogs

**Requirement:** REQ-017, REQ-051, REQ-052
**Depends on:** Task 1
**Files:**

- Create: `src/core/skills/catalog.ts`
- Create: `src/core/skills/parse-skill.ts`
- Create: `test/skills/catalog.test.ts`
- Test: `test/skills/catalog.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
 import { expect, it } from 'vitest'
 import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
 import { join } from 'node:path'
 import { tmpdir } from 'node:os'
 import { scanSkills } from '../../src/core/skills/catalog'
 it('reads descriptions without mutating the source', async () => {
   const root = mkdtempSync(join(tmpdir(), 'forja-skills-'))
   try {
     mkdirSync(join(root, 'rpi'))
     const file = join(root, 'rpi', 'SKILL.md')
     const body = '---\nname: rpi\ndescription: Plan work\n---\nRead state first.\n'
     writeFileSync(file, body)
     const catalog = await scanSkills(root)
     expect(catalog.skills[0]).toMatchObject({ name: 'rpi', description: 'Plan work' })
     expect(readFileSync(file, 'utf8')).toBe(body)
   } finally { rmSync(root, { recursive: true, force: true }) }
 })
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/skills/catalog.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Expand a user-entered leading ~ against the account home, canonicalize the explicit root and scan only SKILL.md entries with depth/count/file-size bounds. Parse YAML frontmatter with a safe data parser, not execution. Follow explicitly selected symlinked skill directories with cycle detection and retain canonical source/provenance; do not traverse arbitrary linked files as secrets. Catalog entries use canonical-path-derived stable IDs and source hashes, not names alone.

```typescript
export const skillScanLimits = { maxDepth: 6, maxEntries: 5000, maxFileBytes: 262144 } as const
export interface SkillEntry { id: string; name: string; description: string; sourcePath: string; hash: string }
```

Unreadable/malformed skills become per-entry warnings, not total catalog failure. Refresh creates a replacement snapshot and reports removed selected IDs without silently substituting another identically named skill.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/skills/catalog.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Test a symlink cycle, duplicate names, malformed YAML, missing root and file-size bounds.
- Changing root never edits old/new files and normalizes selection invalidation.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Build invocation context without modifying user skills or settings

**Requirement:** REQ-015, REQ-017, REQ-022, REQ-051
**Depends on:** Task 2
**Files:**

- Create: `src/core/agents/context.ts`
- Create: `src/core/agents/role-policy.ts`
- Create: `test/agents/context.test.ts`
- Test: `test/agents/context.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { contextInstructions } from '../../src/core/agents/context'
it('adds a scoped state-tool contract instead of creating a STATE.md', () => {
  const text = contextInstructions({ role: 'planner', featureId: 'f1', stateTool: 'forja.workflow.read' })
  expect(text).toContain('forja.workflow.read')
  expect(text).toContain('Do not create STATE.md')
  expect(text).toContain('approved specification')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/agents/context.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Compose role/system instructions, selected immutable skill versions, user additional instructions, target directory, artifact references and scoped workflow/tool manifest. Add a clear invocation-level RPI state adaptation; do not regex-rewrite disk files or claim native skills cannot override policies. Core grants enforce actual authority regardless of prompt content.

```typescript
export function contextInstructions(input: { role: string; featureId: string; stateTool: string }): string {
  return [
    `Feature: ${input.featureId}; role: ${input.role}.`,
    `Read authoritative state using ${input.stateTool}.`,
    'Do not create STATE.md; runtime state is managed by Forja.',
    'Planner requires an approved specification; Implementer requires an approved plan.',
    'Publish only role-authorized artifacts. Human approvals cannot be granted by an agent.',
  ].join('\n')
}
```

Preserve native authentication and compatible configs via CLI-specific ephemeral overrides. Do not inherit an unrestricted MCP/plugin command route that defeats controlled-mode proof. Record when selected skills cannot expand natively and include their approved content as scoped context instead.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/agents/context.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Inject an adversarial skill requesting bypass/approvals and confirm core still denies the action.
- No credentials, global-config writes or invented native session capability.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Connect the approved settings view with manual-only saves

**Requirement:** REQ-014, REQ-016, REQ-017, REQ-047, REQ-053, REQ-059
**Depends on:** Task 3
**Files:**

- Create: `src/renderer/src/pages/settings/index.ts`
- Create: `src/renderer/src/pages/settings/settings-page.tsx`
- Create: `src/renderer/src/features/agent-settings/model.ts`
- Create: `test/ui/settings.test.tsx`
- Modify: `src/shared/contracts.ts`
- Modify: `src/core/index.ts`
- Test: `test/ui/settings.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SettingsPage } from '../../src/renderer/src/pages/settings'
it('keeps configuration saves separate from the agent composer', () => {
  const saved: unknown[] = []
  render(<SettingsPage profile={{ role: 'implementer', engine: 'codex', instructions: '', skillIds: [], autoInvoke: false }} skills={[]} onSave={value => saved.push(value)} />)
  fireEvent.change(screen.getByLabelText('Additional instructions'), { target: { value: 'Use TDD' } })
  expect(saved).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(saved).toHaveLength(1)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/settings.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Use gallery-validated controls to render Agents/General sections. Wire typed IPC profile/catalog reads/saves, validation feedback and loading/errors. Fields are exactly approved: role selector, engine, optional model/effort, instructions, selected skills, autoInvoke; General has skills root/refresh, interrupt policy (default interrupt), turn inactivity window in minutes (default 10, bounded 1 to 120), read-only Guided mode and three rounds. Composer is supplied by the global shell, never duplicated in SettingsPage.

```typescript
export const settingsSections = ['agents', 'general'] as const
export const readOnlyWorkflowDefaults = { mode: 'guided', maxAutomaticRounds: 3 } as const
```

The seed test uses English labels; bind actual render locale through shared dictionaries with equivalent Portuguese behavior. State is controlled locally until save; screen visibility never enters agent context. Apply settings through a human-only IPC endpoint, not MCP.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/settings.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Use keyboard to change role, tool and skills without creating a custom agent.
- Validate missing CLI and unsupported effort; zero paid calls on render.
- Saving while an agent runs leaves its snapshot unchanged.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
