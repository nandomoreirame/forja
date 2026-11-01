# Plan: Ferreiro General Agent

> **Spec:** docs/specs/ferreiro-agent/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Give the Ferreiro real CLI turns for chat, summaries and confirmed skill or memory drafts.
**Architecture:** A sixth fixed profile and a restricted turn policy in core reuse the cli-agent-sessions adapters; drafts are core objects that only a user confirmation can apply.
**Tech Stack:** Electron, React, TypeScript; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 15 of 17
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- [cli-agent-sessions](2026-10-30-cli-agent-sessions.md)
- [agent-settings-skills](2026-10-30-agent-settings-skills.md)
- [ui-quick-adjustments](2026-11-01-ui-quick-adjustments.md) for the UI

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the complete spec and current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.


## Acceptance

- The Ferreiro chats, summarizes and drafts through real CLI turns.
- Nothing is created or written without the user confirming.
- Six fixed agents with editable names persist.

## Checks

**Run ferreiro**: `npx vitest run test/agents/ferreiro-profile.test.ts test/agents/ferreiro.test.ts test/agents/summary.test.ts test/skills/drafts.test.ts --reporter=verbose`

- C1 (REQ-014): six fixed agents exist and unknown roles are refused. Proof: run ferreiro | PASS offers six fixed agents with an editable display name
- C2 (REQ-110): agent profiles keep an editable display name. Proof: run ferreiro | PASS offers six fixed agents with an editable display name
- C3 (REQ-107): Ferreiro turns get only proposal tools. Proof: run ferreiro | PASS gives the Ferreiro no workflow or execution tools
- C4 (REQ-108): summaries run as tool-less Ferreiro turns. Proof: run ferreiro | PASS builds a tool-less summary turn bounded by the conversation size
- C5 (REQ-109): skills are written only after confirmation and stale drafts are refused. Proof: run ferreiro | PASS writes a skill only after confirmation and refuses a stale draft
- C6 (REQ-017): the catalog changes only through confirmed drafts. Proof: run ferreiro | PASS writes a skill only after confirmation and refuses a stale draft

## Tasks

### Task 1: Add the Ferreiro as a sixth fixed agent profile

**Requirement:** REQ-014, REQ-110
**Depends on:** agent-settings-skills Task 1
**Files:**

- Create: `src/shared/domain/agents.ts`
- Create: `src/core/agents/profile-store.ts`
- Test: `test/agents/ferreiro-profile.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { fixedAgents, parseProfile } from '../../src/shared/domain/agents'
it('offers six fixed agents with an editable display name', () => {
  expect(fixedAgents).toEqual(['smith', 'research', 'planner', 'implementer', 'tester', 'reviewer'])
  expect(parseProfile({ id: 'smith', engine: 'claude', name: 'Ferreiro', instructions: '', skillIds: [], autoInvoke: false }).name).toBe('Ferreiro')
  expect(() => parseProfile({ id: 'scout', engine: 'claude', name: 'x', instructions: '', skillIds: [], autoInvoke: false })).toThrow()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/agents/ferreiro-profile.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Both files are first planned in agent-settings-skills Task 1; when that task already ran, treat them as Modify and extend them. Extend the profile schema with the `smith` id and a bounded optional `name`; roles stay a closed set and cannot be created, deleted or retyped (REQ-014). Persist names with profiles; the renderer keeps localized defaults.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/agents/ferreiro-profile.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A name over the length bound is rejected.
- Existing five-role profiles migrate with a default Ferreiro profile.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Run Ferreiro turns without workflow tools

**Requirement:** REQ-107, REQ-022
**Depends on:** Task 1
**Files:**

- Create: `src/core/agents/ferreiro.ts`
- Test: `test/agents/ferreiro.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { ferreiroTurnPolicy } from '../../src/core/agents/ferreiro'
it('gives the Ferreiro no workflow or execution tools', () => {
  const policy = ferreiroTurnPolicy()
  expect(policy.tools).toEqual(['propose_feature', 'propose_skill', 'propose_memory'])
  expect(policy.canExecuteCommands).toBe(false)
  expect(policy.canWriteArtifacts).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/agents/ferreiro.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Ferreiro turns use the configured CLI adapter (cli-agent-sessions) with a general system context, the New chat conversation and only proposal tools; no artifact publishing, no managed executor, no approvals. `propose_feature` returns a draft the user confirms in the UI; confirmation creates the feature with Research through the existing core command.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/agents/ferreiro.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A Ferreiro attempt to call a workflow tool is rejected in core.
- Confirming a feature proposal creates exactly one feature; declining creates none.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Summarize a feature conversation in a tool-less Ferreiro turn

**Requirement:** REQ-108, REQ-060
**Depends on:** Task 2
**Files:**

- Create: `src/core/agents/summary.ts`
- Test: `test/agents/summary.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { summaryRequest } from '../../src/core/agents/summary'
it('builds a tool-less summary turn bounded by the conversation size', () => {
  const request = summaryRequest({ featureId: 'f1', messages: [{ author: 'user', text: 'Add OAuth' }], maxChars: 20_000 })
  expect(request.tools).toEqual([])
  expect(request.agent).toBe('smith')
  expect(request.prompt).toContain('Add OAuth')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/agents/summary.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Build the summary turn from the stored feature conversation (truncated from the oldest messages beyond the bound, with a notice), run it with no tools, store the text with date and author `smith`, and record usage per turn (REQ-060). Failures show an actionable error and keep the previous summary.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/agents/summary.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Long conversations are truncated, never sent whole.
- Usage of the summary turn appears in the feature usage.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Write skills and memories only from confirmed Ferreiro drafts

**Requirement:** REQ-109, REQ-017, REQ-045
**Depends on:** Task 2
**Files:**

- Create: `src/core/skills/drafts.ts`
- Test: `test/skills/drafts.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { applyDraft, createDraft } from '../../src/core/skills/drafts'
it('writes a skill only after confirmation and refuses a stale draft', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forja-skills-'))
  const draft = await createDraft(root, { id: 'deploy', markdown: '# Deploy' })
  await expect(readFile(join(root, 'deploy', 'SKILL.md'), 'utf8')).rejects.toThrow()
  await applyDraft(root, draft, { confirmedBy: 'user' })
  expect(await readFile(join(root, 'deploy', 'SKILL.md'), 'utf8')).toBe('# Deploy')
  const edit = await createDraft(root, { id: 'deploy', markdown: '# Deploy v2' })
  await writeFile(join(root, 'deploy', 'SKILL.md'), '# Changed outside')
  await expect(applyDraft(root, edit, { confirmedBy: 'user' })).rejects.toThrow('stale')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/skills/drafts.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A draft records the target path inside the configured folder, the new content and the hash of the current file (absent for new skills). `applyDraft` requires a user confirmation from the UI command (agents cannot confirm, REQ-045), rechecks the hash, writes atomically and preserves unrelated files. Memories follow the same flow in their store.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/skills/drafts.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Paths escaping the configured folder are refused.
- A declined draft leaves the folder untouched.
- The renderer shows a diff for existing files before confirmation.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
