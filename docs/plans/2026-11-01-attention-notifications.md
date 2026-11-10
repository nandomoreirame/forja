# Plan: Attention Notifications

> **Spec:** docs/specs/attention-notifications/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Tell the user when an off-screen chat waits or finishes, with notifications, counts and a topbar bell.
**Architecture:** A core attention tracker fed by turn events; main-process notifications, sounds, title and badge; a renderer bell.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 16
**Total Tasks:** 3
**Estimated Complexity:** small
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slice 06 `chat-turns`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Off-screen chats raise notifications and counts.
- The bell lists and opens unread chats.

## Checks

**Run slice**: `npx vitest run test/core/attention.test.ts test/main/notifications.test.ts test/renderer/attention-bell.test.tsx --reporter=verbose`

- C1 (REQ-061): attention notifications holds as specified. Proof: run slice | ✓ counts waiting and finished chats that are not on screen and clears them when seen

## Tasks

### Task 1: Track attention items per chat

**Requirement:** REQ-061
**Files:**

- Create: `src/core/attention/attention.ts`
- Test: `test/core/attention.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createAttention } from '../../src/core/attention/attention'
it('counts waiting and finished chats that are not on screen and clears them when seen', () => {
  const attention = createAttention()
  attention.event({ chatId: 'a', kind: 'waiting', visible: false })
  attention.event({ chatId: 'b', kind: 'finished', visible: false })
  attention.event({ chatId: 'c', kind: 'finished', visible: true })
  expect(attention.counts()).toEqual({ waiting: 1, finished: 1 })
  attention.seen('a')
  expect(attention.counts()).toEqual({ waiting: 0, finished: 1 })
  expect(attention.unread().map((i) => i.chatId)).toEqual(['b'])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/attention.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Keep unread attention items per chat from turn events (waiting, finished), ignoring the chat on screen, cleared when the chat is opened.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/attention.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Repeated events do not double count.
- Archived chats drop their items.
- Counts survive a renderer reload.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Notify with sound, title count and taskbar badge

**Requirement:** REQ-061
**Depends on:** Task 1
**Files:**

- Create: `src/main/notifications.ts`
- Test: `test/main/notifications.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { notifyAttention } from '../../src/main/notifications'
it('raises a notification and sound per kind when enabled and updates title and badge', () => {
  const show = vi.fn(); const play = vi.fn(); const setTitle = vi.fn(); const setBadge = vi.fn()
  notifyAttention({ item: { chatName: 'Rate limits', kind: 'waiting' }, counts: { waiting: 1, finished: 2 }, settings: { notify: true, sound: { waiting: true, finished: false } }, show, play, setTitle, setBadge })
  expect(show).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Rate limits') }))
  expect(play).toHaveBeenCalledWith('waiting')
  expect(setTitle).toHaveBeenCalledWith(expect.stringContaining('(1 · 2)'))
  expect(setBadge).toHaveBeenCalledWith(3)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/main/notifications.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Electron `Notification`, a short sound per kind (each switchable in Settings), `(waiting · finished)` in the window title and the taskbar badge count; nothing shows for the chat on screen.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/main/notifications.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Disabled notifications still update the title and badge.
- Notification text never includes message content.
- Zero counts clear the badge and title suffix.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Show unread items in the topbar bell

**Requirement:** REQ-061
**Depends on:** Task 1
**Files:**

- Create: `src/renderer/src/features/attention/attention-bell.tsx`
- Test: `test/renderer/attention-bell.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { AttentionBell } from '../../src/renderer/src/features/attention/attention-bell'
it('lists unread chats and opens one on click', () => {
  const onOpen = vi.fn()
  render(<AttentionBell locale="en" items={[{ chatId: 'b', chatName: 'Exports', kind: 'finished' }]} onOpen={onOpen} />)
  fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
  fireEvent.click(screen.getByRole('menuitem', { name: /Exports/ }))
  expect(onOpen).toHaveBeenCalledWith('b')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/attention-bell.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A bell button in the topbar (next to the usage button) with the unread count in its accessible name and a menu of items; opening an item opens its chat and clears it.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/attention-bell.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- With no items the bell shows no count.
- Keyboard opens and navigates the menu.
- pt-br copy is complete.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-attention-notifications.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
