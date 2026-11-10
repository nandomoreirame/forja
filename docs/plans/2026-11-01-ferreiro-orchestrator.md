# Plan: Ferreiro Orchestrator

> **Spec:** docs/specs/ferreiro-orchestrator/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Let the Ferreiro talk, propose and orchestrate while approvals advance phases automatically.
**Architecture:** A pure phase transition table applied with compare-and-swap; Ferreiro MCP proposal tools backed by draft outputs; conversation cards for approvals.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 08
**Total Tasks:** 8
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 06 `chat-turns` and 07 `artifact-publication`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- A chat goes from talk to acceptance with approvals only at spec, plan and start.
- Every phase change is visible in the chat history.

## Checks

**Run slice**: `npx vitest run test/core/announcements.test.ts test/core/backlog-proposal.test.ts test/core/drafts.test.ts test/core/ferreiro-profile.test.ts test/core/phases.test.ts test/core/start-proposal.test.ts test/core/summary.test.ts test/renderer/proposal-card.test.tsx --reporter=verbose`

- C1 (REQ-011): ferreiro tool grant holds as specified. Proof: run slice | ✓ launches the Ferreiro without write, command or approval tools
- C2 (REQ-017): start proposal holds as specified. Proof: run slice | ✓ moves a talk chat to research only when the user approves the proposal
- C3 (REQ-018): automatic phase advance holds as specified. Proof: run slice | ✓ advances on the approval or validation that closes each phase
- C4 (REQ-021): orchestration events holds as specified. Proof: run slice | ✓ describes phase changes, hand-offs and stops with links to their cause
- C5 (REQ-022): chat summary holds as specified. Proof: run slice | ✓ runs the summary as the Ferreiro with no tools and records it with date and usage
- C6 (REQ-023): skill and memory drafts holds as specified. Proof: run slice | ✓ shows the exact content or diff and writes only on confirmation
- C7 (REQ-032): backlog items from the ferreiro holds as specified. Proof: run slice | ✓ creates an agent backlog item linked to its origin chat only when confirmed

## Tasks

### Task 1: Advance chat phases automatically after approvals and validations

**Requirement:** REQ-018
**Files:**

- Create: `src/core/chats/phases.ts`
- Test: `test/core/phases.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { nextPhase } from '../../src/core/chats/phases'
it('advances on the approval or validation that closes each phase', () => {
  expect(nextPhase('talk', { kind: 'approved', subject: 'start' })).toEqual({ phase: 'research', agent: 'research' })
  expect(nextPhase('research', { kind: 'approved', subject: 'spec' })).toEqual({ phase: 'plan', agent: 'planner' })
  expect(nextPhase('plan', { kind: 'approved', subject: 'plan' })).toEqual({ phase: 'implement', agent: 'implementer' })
  expect(nextPhase('implement', { kind: 'validated', result: 'gates-green' })).toEqual({ phase: 'test', agent: 'tester' })
  expect(nextPhase('test', { kind: 'validated', result: 'tests-green' })).toEqual({ phase: 'review', agent: 'reviewer' })
  expect(nextPhase('review', { kind: 'validated', result: 'no-blocking-findings' })).toEqual({ phase: 'acceptance', agent: 'smith' })
  expect(nextPhase('research', { kind: 'approved', subject: 'plan' })).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/phases.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A pure transition table: every closing event maps to the next phase and its agent; anything else returns `null`. The orchestrator applies the transition with a compare-and-swap, appends a phase event and starts the next agent only when automatic hand-offs are on, otherwise records a Continue prompt.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/phases.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Events from a stale revision are refused.
- With automatic hand-offs off, the phase advances but no turn starts.
- Terminal phases accept no events.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Approve the Ferreiro start proposal into Research

**Requirement:** REQ-017
**Depends on:** Task 1
**Files:**

- Create: `src/core/ferreiro/proposals.ts`
- Test: `test/core/start-proposal.test.ts`

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
import { proposeStart, approveStart } from '../../src/core/ferreiro/proposals'
it('moves a talk chat to research only when the user approves the proposal', () => {
  const db = createDatabase(':memory:')
  const chats = createChatStore(db)
  const chat = chats.create(createProjectStore(db).open(process.cwd()).id, { prompt: 'Exports' })
  const proposal = proposeStart(db, chat.id, { problem: 'No exports', goal: 'CSV export', kind: 'feature', backlogItemIds: [] })
  expect(chats.get(chat.id).phase).toBe('talk')
  const result = approveStart(db, chat.id, { proposalId: proposal.id, hash: proposal.hash, actor: 'user' })
  expect(result).toMatchObject({ phase: 'research', handoff: 'research' })
  expect(() => approveStart(db, chat.id, { proposalId: proposal.id, hash: 'other', actor: 'user' })).toThrow(/stale|phase/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/start-proposal.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`propose_start` (Ferreiro MCP tool) stores the proposal as a draft output with its hash; the renderer shows it with Approve and Edit; approving binds the approved hash, moves the chat to `research` and sets a one-turn hand-off to the Minerador carrying the proposal as context.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/start-proposal.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- An edited proposal is approved as edited.
- Approving outside `talk` is refused.
- Agents cannot call `approveStart`.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Announce orchestration events in the chat history

**Requirement:** REQ-021
**Depends on:** Task 1
**Files:**

- Create: `src/core/ferreiro/announcements.ts`
- Test: `test/core/announcements.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { announcement } from '../../src/core/ferreiro/announcements'
it('describes phase changes, hand-offs and stops with links to their cause', () => {
  expect(announcement({ kind: 'phase', from: 'research', to: 'plan', cause: { output: 'o1' } })).toMatchObject({ role: 'event', author: 'smith', linkTo: 'o1' })
  expect(announcement({ kind: 'stop', reason: 'correction-budget', cause: { turn: 't9' } })).toMatchObject({ role: 'event', linkTo: 't9' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/announcements.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Every transition, automatic hand-off and stop appends a workflow event authored by the Ferreiro with a localized message key and a link to the artifact, result or turn that caused it.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/announcements.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Events never contain secrets or raw command output.
- Each event links to an existing record.
- Duplicate transitions do not announce twice.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Summarize a chat in a tool-less Ferreiro turn

**Requirement:** REQ-022
**Depends on:** Task 1
**Files:**

- Create: `src/core/ferreiro/summary.ts`
- Test: `test/core/summary.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { summaryLaunch } from '../../src/core/ferreiro/summary'
it('runs the summary as the Ferreiro with no tools and records it with date and usage', () => {
  const launch = summaryLaunch({ chatId: 'c1' })
  expect(launch).toMatchObject({ agent: 'smith', grants: [] })
  expect(launch.store({ text: 'Done so far', usage: { input: 5, cached: 0, output: 2 }, at: '2026-11-01T00:00:00Z' })).toMatchObject({ author: 'smith', createdAt: '2026-11-01T00:00:00Z' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/summary.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

The summary turn uses the Ferreiro profile with an empty grant, stores text, date, author and usage, and replaces the previous summary while keeping it in history.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/summary.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A failed summary keeps the previous one.
- Summaries never run commands.
- Usage is recorded like any turn.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Write skill and memory drafts only after confirmation

**Requirement:** REQ-023
**Depends on:** Task 1
**Files:**

- Create: `src/core/ferreiro/drafts.ts`
- Test: `test/core/drafts.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { proposeFile, confirmFile } from '../../src/core/ferreiro/drafts'
it('shows the exact content or diff and writes only on confirmation', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-skills-'))
  const draft = proposeFile({ root, relative: 'release/SKILL.md', content: '# Release\n' })
  expect(draft.preview).toContain('# Release')
  expect(existsSync(join(root, 'release/SKILL.md'))).toBe(false)
  confirmFile(draft, { actor: 'user' })
  expect(readFileSync(join(root, 'release/SKILL.md'), 'utf8')).toBe('# Release\n')
  expect(() => proposeFile({ root, relative: '../escape.md', content: 'x' })).toThrow(/path/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/drafts.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Drafts compute a unified diff for existing files; confirmation re-checks that the file did not change since the draft and writes atomically inside the configured folder only.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/drafts.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A file changed after the draft refuses the stale confirmation.
- Paths escaping the folder are refused.
- Declined drafts leave no file.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 6: Create backlog items proposed by the Ferreiro after confirmation

**Requirement:** REQ-032
**Depends on:** Task 2
**Files:**

- Modify: `src/core/ferreiro/proposals.ts`
- Test: `test/core/backlog-proposal.test.ts`

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
import { createBacklogStore } from '../../src/core/backlog/backlog-store'
import { proposeBacklogItem, confirmBacklogItem } from '../../src/core/ferreiro/proposals'
it('creates an agent backlog item linked to its origin chat only when confirmed', () => {
  const db = createDatabase(':memory:')
  const project = createProjectStore(db).open(process.cwd())
  const chat = createChatStore(db).create(project.id, { prompt: 'Ideas' })
  const draft = proposeBacklogItem(db, chat.id, { title: 'Audit log', description: 'Track admin actions' })
  expect(createBacklogStore(db).open(project.id)).toEqual([])
  confirmBacklogItem(db, draft.id, { actor: 'user' })
  expect(createBacklogStore(db).open(project.id)[0]).toMatchObject({ title: 'Audit log', source: 'agent', originChatId: chat.id })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/backlog-proposal.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

The draft appears in the chat as a card with Create and Dismiss; confirming creates the item with source `agent` and the origin chat.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/backlog-proposal.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Dismissed drafts create nothing.
- Confirming twice creates one item.
- The origin chat link survives archiving the chat.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 7: Show proposals and Continue in the conversation

**Requirement:** REQ-017, REQ-018
**Depends on:** Task 2
**Files:**

- Create: `src/renderer/src/features/conversation/proposal-card.tsx`
- Test: `test/renderer/proposal-card.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ProposalCard } from '../../src/renderer/src/features/conversation/proposal-card'
it('lets the user approve or edit a start proposal and continue a stopped hand-off', () => {
  const onApprove = vi.fn()
  render(<ProposalCard locale="en" proposal={{ id: 'p1', kind: 'start', problem: 'No exports', goal: 'CSV export' }} onApprove={onApprove} onEdit={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Start research' }))
  expect(onApprove).toHaveBeenCalledWith('p1')
  expect(screen.getByText('CSV export')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/proposal-card.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Render start proposals, backlog drafts and skill or memory drafts as cards in the conversation with their actions; a stopped automatic hand-off shows Continue. All copy in en and pt-br.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/proposal-card.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Keyboard reaches every action.
- Approved cards become read-only with the approval time.
- Drafts show diffs with added and removed lines marked.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 8: Run the Ferreiro with its read-only and proposal grant

**Requirement:** REQ-011
**Depends on:** Task 1
**Files:**

- Create: `src/core/ferreiro/profile.ts`
- Test: `test/core/ferreiro-profile.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { ferreiroLaunch } from '../../src/core/ferreiro/profile'
it('launches the Ferreiro without write, command or approval tools', () => {
  const launch = ferreiroLaunch({ chatId: 'c1', phase: 'talk' })
  expect(launch.grants).toEqual(expect.arrayContaining(['read_state', 'propose_start']))
  for (const tool of ['run_command', 'write_code', 'publish_spec', 'approve_spec']) expect(launch.grants).not.toContain(tool)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/ferreiro-profile.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

The Ferreiro profile uses the configured CLI with the slice 05 grant and orchestration instructions per invocation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/ferreiro-profile.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The grant is identical in talk and acceptance.
- Instructions are never written to user config.
- A CLI without controlled mode refuses the Ferreiro turn.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-ferreiro-orchestrator.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
