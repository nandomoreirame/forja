# Plan: Backlog and Board

> **Spec:** docs/specs/backlog-board-core/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Make backlog items real inputs with sources, attachable to chats, and the Board a view of chats by phase.
**Architecture:** Renderer backlog model with source and status, a composer picker, Ferreiro draft cards, a core source interface and a phase-based Board.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 12
**Total Tasks:** 5
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 02 `chat-core-store` and 08 `ferreiro-orchestrator`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Backlog items attach to chats and leave the active list.
- The Board shows chats by phase, Acceptance included.

## Checks

**Run slice**: `npx vitest run test/core/backlog-sources.test.ts test/renderer/backlog-draft.test.tsx test/renderer/backlog-items.test.tsx test/renderer/backlog-picker.test.tsx test/renderer/board-phases.test.tsx --reporter=verbose`

- C1 (REQ-031): manual backlog items holds as specified. Proof: run slice | ✓ lists open backlog items with their source and hides linked ones
- C2 (REQ-032): backlog items from the ferreiro holds as specified. Proof: run slice | ✓ creates the proposed item only when the user confirms
- C3 (REQ-033): attaching backlog items holds as specified. Proof: run slice | ✓ adds chosen backlog items as context and removes them from the active backlog
- C4 (REQ-034): backlog source interface holds as specified. Proof: run slice | ✓ imports items from a source with their origin URL without duplicating them
- C5 (REQ-035): board by phase holds as specified. Proof: run slice | ✓ places open backlog items first and chats by phase, leaving talk chats out

## Tasks

### Task 1: Model backlog items with source and status in the renderer

**Requirement:** REQ-031
**Files:**

- Modify: `src/renderer/src/shared/api/workbench-source.ts`
- Modify: `src/renderer/src/pages/backlog/backlog-page.tsx`
- Test: `test/renderer/backlog-items.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('lists open backlog items with their source and hides linked ones', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(within(await screen.findByRole('complementary', { name: 'dev' })).getByRole('button', { name: 'Backlog' }))
  const list = screen.getByRole('list', { name: 'Backlog' })
  expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent(/Manual|Agent/)
  expect(within(list).queryByText('Linked demand')).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/backlog-items.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Rename `Demand` to `BacklogItem` with `source` (`manual`, `agent`, later connectors), `status` (`open`, `linked`), `originUrl` and `chatId`; the Backlog page lists open items newest first with a source label and a History toggle for linked items.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/backlog-items.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Linked items show their chat in History.
- Adding stays manual with source `manual`.
- pt-br labels read Manual and Agente.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Attach backlog items to a New chat or an existing chat

**Requirement:** REQ-033
**Depends on:** Task 1
**Files:**

- Create: `src/renderer/src/features/composer/backlog-picker.tsx`
- Modify: `src/widgets/conversation/ui/composer.tsx`
- Test: `test/renderer/backlog-picker.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('adds chosen backlog items as context and removes them from the active backlog', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(screen.getByRole('button', { name: 'Add backlog items' }))
  fireEvent.click(screen.getByRole('checkbox', { name: /Dark mode for exports/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Add to chat' }))
  expect(screen.getByRole('list', { name: 'Chat context' })).toHaveTextContent('Dark mode for exports')
  fireEvent.click(within(screen.getByRole('complementary', { name: 'dev' })).getByRole('button', { name: 'Backlog' }))
  expect(screen.queryByRole('listitem', { name: /Dark mode for exports/ })).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/backlog-picker.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A composer action opens a picker of open items (multi-select); attaching links each item to the chat (source call `linkBacklogItems`), shows them as context chips on the next prompt and moves them to History.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/backlog-picker.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Already linked items are not offered.
- Cancel attaches nothing.
- The picker works from the keyboard.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Show Ferreiro backlog drafts for confirmation

**Requirement:** REQ-032
**Depends on:** Task 1
**Files:**

- Create: `src/renderer/src/features/conversation/backlog-draft.tsx`
- Test: `test/renderer/backlog-draft.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { BacklogDraft } from '../../src/renderer/src/features/conversation/backlog-draft'
it('creates the proposed item only when the user confirms', () => {
  const onCreate = vi.fn(); const onDismiss = vi.fn()
  render(<BacklogDraft locale="en" draft={{ id: 'd1', title: 'Audit log', description: 'Track admin actions' }} onCreate={onCreate} onDismiss={onDismiss} />)
  fireEvent.click(screen.getByRole('button', { name: 'Create backlog item' }))
  expect(onCreate).toHaveBeenCalledWith('d1')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/backlog-draft.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Render the draft card in the conversation (title, description, Create, Dismiss); creation calls the core confirm method from slice 26.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/backlog-draft.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Dismiss calls only onDismiss.
- Created drafts become read-only.
- pt-br copy is complete.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Accept backlog items through one source interface

**Requirement:** REQ-034
**Files:**

- Create: `src/core/backlog/sources.ts`
- Test: `test/core/backlog-sources.test.ts`

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
import { importFromSource, type BacklogSource } from '../../src/core/backlog/sources'
it('imports items from a source with their origin URL without duplicating them', async () => {
  const db = createDatabase(':memory:')
  const project = createProjectStore(db).open(process.cwd())
  const source: BacklogSource = { id: 'fake', listItems: async () => [{ externalId: '42', title: 'Bug', description: 'x', url: 'https://example.com/42' }] }
  await importFromSource(db, project.id, source)
  await importFromSource(db, project.id, source)
  const rows = db.prepare('SELECT title, source, origin_url FROM backlog_items').all()
  expect(rows).toEqual([{ title: 'Bug', source: 'fake', origin_url: 'https://example.com/42' }])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/backlog-sources.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Define `BacklogSource` (`id`, `listItems`) and `importFromSource` with de-duplication by source and external id; item text is data (REQ-067), never instructions. No connector ships in this MVP.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/backlog-sources.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Non-https origin URLs are refused.
- Imported items start `open`.
- A failing source reports an error without partial writes.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Board chats by phase with backlog first

**Requirement:** REQ-035
**Depends on:** Task 1
**Files:**

- Modify: `src/renderer/src/pages/board/board-page.tsx`
- Test: `test/renderer/board-phases.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { boardColumns } from '../../src/renderer/src/pages/board'
import { createMockSource } from '../../src/renderer/src/shared/api'
it('places open backlog items first and chats by phase, leaving talk chats out', async () => {
  const snapshot = await createMockSource({ locale: 'en' }).loadProject('dev')
  const [first, second] = snapshot.features
  const columns = boardColumns({ ...snapshot, features: [{ ...first, phase: 'acceptance' }, { ...second, phase: 'talk' }] } as never)
  expect(columns.map((c) => c.id)).toEqual(['backlog', 'research', 'plan', 'implement', 'testing', 'review', 'acceptance', 'done'])
  expect(columns.find((c) => c.id === 'acceptance')!.cards.map((c) => c.id)).toEqual([first.id])
  expect(columns.flatMap((c) => c.cards.map((x) => x.id))).not.toContain(second.id)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/board-phases.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Columns follow the chat `phase` (adds Acceptance between Review and Done); talk chats stay off; linked backlog items leave the first column. Release the `backlog-board` flag when the slice closes (slice 03 rule).

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/board-phases.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Done holds chats in `done`; abandoned chats stay off.
- Cards stay non-draggable.
- Column counts update when a phase changes.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-backlog-board-core.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
