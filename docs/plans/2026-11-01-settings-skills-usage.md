# Plan: Settings, Skills and Usage

> **Spec:** docs/specs/settings-skills-usage/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Persist agent profiles, read the skills catalog safely and serve opt-in plan usage as structured values.
**Architecture:** SQLite-backed profiles, a read-only skills scanner with cycle detection and per-tool usage readers that keep credentials in memory.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 15
**Total Tasks:** 3
**Estimated Complexity:** small
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 02 `chat-core-store` and 04 `cli-capability-adapters`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Settings save real profiles.
- The usage dropdown shows real, structured data.

## Checks

**Run slice**: `npx vitest run test/core/agent-profiles.test.ts test/core/plan-usage.test.ts test/core/skills-catalog.test.ts --reporter=verbose`

- C1 (REQ-056): agent profiles holds as specified. Proof: run slice | ✓ stores exactly six fixed agents with names, tools and the hand-off switch
- C2 (REQ-059): skills catalog holds as specified. Proof: run slice | ✓ reads SKILL.md files from every root, marks origin and survives symlink loops
- C3 (REQ-060): structured plan usage holds as specified. Proof: run slice | ✓ queries only opted-in tools and returns structured windows

## Tasks

### Task 1: Persist the six agent profiles

**Requirement:** REQ-056
**Files:**

- Create: `src/core/settings/agent-profiles.ts`
- Test: `test/core/agent-profiles.test.ts`

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
import { loadProfiles, saveProfiles } from '../../src/core/settings/agent-profiles'
it('stores exactly six fixed agents with names, tools and the hand-off switch', () => {
  const db = createDatabase(':memory:')
  const profiles = loadProfiles(db)
  expect(profiles.map((p) => p.id)).toEqual(['smith', 'research', 'planner', 'implementer', 'tester', 'reviewer'])
  expect(profiles.every((p) => p.autoHandoff === false)).toBe(true)
  saveProfiles(db, profiles.map((p) => (p.id === 'research' ? { ...p, name: 'Scout', tool: 'codex' } : p)))
  expect(loadProfiles(db).find((p) => p.id === 'research')).toMatchObject({ name: 'Scout', tool: 'codex' })
  expect(() => saveProfiles(db, profiles.slice(1))).toThrow(/six/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/agent-profiles.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Profiles hold display name (empty means the localized default), CLI, optional model, supported effort, additional instructions, selected skills and the default-off automatic hand-off; agents can be neither added nor removed.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/agent-profiles.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- An unsupported effort for the CLI is refused.
- Unknown fields are ignored on load.
- Names are trimmed; empty restores the default.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Read the skills catalog read-only from all roots

**Requirement:** REQ-059
**Files:**

- Create: `src/core/settings/skills.ts`
- Test: `test/core/skills-catalog.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { scanSkills } from '../../src/core/settings/skills'
it('reads SKILL.md files from every root, marks origin and survives symlink loops', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-sk-'))
  mkdirSync(join(root, 'a')); writeFileSync(join(root, 'a/SKILL.md'), '---\nname: a\ndescription: A\n---\n')
  mkdirSync(join(root, 'bad')); writeFileSync(join(root, 'bad/SKILL.md'), 'no front matter')
  symlinkSync(root, join(root, 'loop'))
  const result = scanSkills([{ path: root, origin: 'forja' }])
  expect(result.skills).toEqual([expect.objectContaining({ name: 'a', origin: 'forja' })])
  expect(result.problems).toEqual([expect.objectContaining({ path: expect.stringContaining('bad') })])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/skills-catalog.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Scan the configured folder (default `~/.skills`) and the native CLI folders read-only with canonical-path cycle detection and depth bounds; malformed entries become problems; no file is written.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/skills-catalog.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Sibling files outside skill folders are never read.
- Duplicate names keep both with their origin.
- Unreadable roots report a problem.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Read plan usage opt-in and return structured values

**Requirement:** REQ-060
**Files:**

- Create: `src/core/settings/usage.ts`
- Test: `test/core/plan-usage.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { loadUsage } from '../../src/core/settings/usage'
it('queries only opted-in tools and returns structured windows', async () => {
  const fetchUsage = vi.fn(async () => ({ session: { used: 0.71, resetsAt: '2026-11-01T14:29:00Z', start: '2026-11-01T09:29:00Z' } }))
  const result = await loadUsage({ enabled: ['claude'], now: new Date('2026-11-01T12:00:00Z'), readers: { claude: { readLogin: async () => ({ token: 'secret' }), fetchUsage } } })
  expect(result).toEqual([{ tool: 'claude', fetchedAt: '2026-11-01T12:00:00.000Z', windows: [{ id: 'session', usedPercent: 71, pacePercent: 50, resetsAt: '2026-11-01T14:29:00Z' }] }])
  expect(JSON.stringify(result)).not.toContain('secret')
  expect((await loadUsage({ enabled: [], now: new Date(), readers: {} }))).toEqual([])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/plan-usage.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Per-tool readers read the stored login read-only and in memory, call the usage endpoint (agy through `/quota`), compute the pace from window start and reset, and never persist or log credentials; tools not opted in are not touched.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/plan-usage.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A reader error reports the tool unavailable.
- Credentials never reach logs, events or the renderer.
- Enabling shows the file read and endpoint before saving.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-settings-skills-usage.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
