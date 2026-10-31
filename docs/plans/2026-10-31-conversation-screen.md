# Plan: Feature Conversation Screen

> **Spec:** docs/specs/conversation-screen/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Make the feature conversation screen navigable: streamed mock replies, recipient switching, closable feature tabs and mock terminals.
**Architecture:** Frontend-only mock screen in the desktop renderer. Screens read data only through `WorkbenchSource` and the `createWorkbenchStore` Zustand store; widgets and primitives come from `src/widgets` and `src/shared/ui`. No CLI, Git, MCP, PTY, filesystem or network access.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui (radix-nova), Zustand, Vitest + RTL, Playwright for the dev:web smoke.
**Order:** 01d of the mock screens (frontend mock screens, implementation batch 2)
**Total Tasks:** 6
**Estimated Complexity:** medium
**Status:** Spec approved 2026-10-31; planned; not implemented.

## Dependencies

- [new-conversation-composer](2026-10-31-new-conversation-composer.md)
- [command-palette](2026-10-31-command-palette.md)

## Execution Contract

- Read the spec, the shared decisions in its Context section and `docs/design/forja-2.0/component-fidelity.md` before Task 1.
- Paths under `src/renderer/src/` follow the renderer FSD layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`). Several match paths later slices list; those slices modify these files to wire core.
- Mock timers are injected; tests use `vi.useFakeTimers()` and never wait on real time.
- Visual acceptance: compare each block with the referenced Stitch screen using the stitch-fidelity skill against `npm run dev:web` (ask before starting a dev server). Recorded exceptions win over the Stitch image.
- Seed snippets are contract tests. Expand them to the listed checks; do not hardcode test-only results.

## Acceptance

- Sending a prompt streams a scripted reply from the selected recipient, with Interrupt; Implementer and Tester replies add terminal output.
- Terminals open, collapse to the footer toolbar, switch, add a manual shell and stop without losing output.
- Closing feature tabs selects a neighbor and ends on the centered composer.
- Sidebar agents and @mentions switch the recipient; "View request" highlights its source message.

## Tasks

### Task 1: Stream scripted mock replies from the mock source

**Requirement:** REQ-069
**Depends on:** none within this plan
**Files:**
- Modify: `src/renderer/src/shared/api/workbench-source.ts`
- Modify: `src/renderer/src/shared/api/mock-source.ts`
- Create: `src/renderer/src/shared/api/mock-replies.ts`
- Create: `test/renderer/mock-replies.test.ts`
- Test: `test/renderer/mock-replies.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
afterEach(() => vi.useRealTimers())
it('streams chunks in order, adds terminal output for the Implementer and supports cancel', () => {
  vi.useFakeTimers()
  const events: string[] = []
  const source = createMockSource({ locale: 'en' })
  const cancel = source.streamReply({ featureId: 'f1', role: 'implementer', prompt: 'Fix the token' }, (event) => events.push(event.type))
  vi.advanceTimersByTime(400)
  expect(events).toContain('text')
  expect(events).toContain('terminal')
  cancel()
  vi.advanceTimersByTime(5000)
  expect(events.at(-1)).toBe('interrupted')
  expect(events.filter((type) => type === 'completed')).toHaveLength(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/mock-replies.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `streamReply(request, onEvent, options?)` to `WorkbenchSource`; it returns a cancel function. Events: `start`, `text` (chunk), `terminal` (terminal id, line), `completed`, `interrupted`. `mock-replies.ts` holds one localized script per role (Research asks clarifying questions, Planner lists tasks, Implementer reports changes, Tester reports a check, Reviewer lists a finding); Implementer and Tester scripts also emit lines for a mock terminal (`npm test` or `npm run dev`). Chunks are scheduled with an injectable `setTimeout` at about 120 ms each for roughly 1.5 s in total; `options.instant` emits everything synchronously (reduced motion). Cancel emits `interrupted` once and stops pending timers.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/mock-replies.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- `instant` delivers the same chunks and ends with `completed` synchronously.
- Cancel after completion is a no-op.
- Scripts exist for all five roles in both locales.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Send, interrupt and record replies in the store

**Requirement:** REQ-068, REQ-069
**Depends on:** Task 1
**Files:**
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Create: `test/renderer/conversation-store.test.ts`
- Test: `test/renderer/conversation-store.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
afterEach(() => vi.useRealTimers())
it('interrupts a running reply before starting the next one', async () => {
  vi.useFakeTimers()
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const id = store.getState().openFeatureIds[0]
  store.getState().sendMessage(id, 'First')
  vi.advanceTimersByTime(200)
  store.getState().sendMessage(id, 'Second')
  vi.runAllTimers()
  const agent = store.getState().snapshot!.features.find((f) => f.id === id)!.messages.filter((m) => m.role === 'agent')
  expect(agent.at(-2)?.status).toBe('interrupted')
  expect(agent.at(-1)?.status).toBe('completed')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/conversation-store.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`sendMessage(featureId, text)` appends the user message, cancels any running reply of that feature (interrupt is the default policy), adds an agent message with `running` status for the feature's recipient and applies stream events: text chunks append to that message, terminal lines go to the matching mock terminal (created if absent, marked `running`, then `done` on completion), `completed`/`interrupted` set the final status and the feature state. `interrupt(featureId)` cancels explicitly. Pass `instant: true` when `matchMedia('(prefers-reduced-motion: reduce)')` matches. Background features keep streaming; nothing changes the selected feature or its recipient.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/conversation-store.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- Two features stream at the same time without mixing messages or terminals.
- Interrupt on an idle feature is a no-op.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Compose the full conversation page with closable feature tabs

**Requirement:** REQ-068, REQ-071
**Depends on:** Task 2
**Files:**
- Modify: `src/renderer/src/pages/conversation/conversation-page.tsx`
- Modify: `src/widgets/workbench/ui/feature-tabs.tsx`
- Create: `src/renderer/src/features/conversation/history.tsx`
- Create: `src/renderer/src/features/conversation/handoff-link.tsx`
- Create: `src/renderer/src/features/feature-tabs/close-feature-dialog.tsx`
- Modify: `src/renderer/src/widgets/git-context.tsx`
- Create: `test/renderer/conversation-page.test.tsx`
- Test: `test/renderer/conversation-page.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('confirms closing a running feature and ends on the centered composer', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Close Catalog search' }))
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Close Login with OAuth' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close feature' }))
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/conversation-page.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Extend `FeatureTabs` with an optional `onClose(id)` and a close button per tab (`aria-label` "Close <name>", visible on hover, focus and the selected tab). `ConversationPage` shows the tabs, `FeatureContext` (mode badge, destination, branch, cycle from the feature stage), `history.tsx` (paginated-ready list using `Messages`, auto-scroll only when near the end), `handoff-link.tsx` for event items, and the docked `Composer` with the feature's recipient. `git-context.tsx` switches to the selected feature: repository, directory, worktree, branch, destination and state. Closing a tab whose agent is running opens `close-feature-dialog.tsx` (shadcn Dialog: "Close feature" / "Keep open"); closing selects the right neighbor, otherwise the left; after the last tab the view becomes `compose` with Research. Messages show no avatars, initials or timestamps.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/conversation-page.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- Per-block stitch-fidelity review against `b1e7dc73f23d4af5b81d37d978ef4b68`, applying the recorded exceptions.
- Closing keeps the feature in the mock snapshot (history preserved).
- Keyboard: tabs use arrow keys; the close button is reachable with Tab.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Switch recipients from sidebar agents and @mentions

**Requirement:** REQ-074
**Depends on:** Task 3
**Files:**
- Create: `src/renderer/src/features/composer/recipient.ts`
- Create: `src/renderer/src/features/composer/controller.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Create: `test/renderer/recipient.test.ts`
- Test: `test/renderer/recipient.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { mentionedRole } from '../../src/renderer/src/features/composer/recipient'
it('takes the last explicit mention and ignores e-mails, unknown handles and code', () => {
  expect(mentionedRole('@research then @tester please')).toBe('tester')
  expect(mentionedRole('ask @pesquisador')).toBe('research')
  expect(mentionedRole('mail me at dev@tester.io')).toBeNull()
  expect(mentionedRole('@someone')).toBeNull()
  const fence = '`'.repeat(3)
  expect(mentionedRole(`${fence}\n@tester\n${fence}`)).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/recipient.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`mentionedRole(text)` strips fenced and inline code, then matches `(^|\s)@(alias)\b` against fixed aliases: English role names and the pt-BR names from the shared dictionary (pesquisador, planejador, implementador, testador, revisor). `controller.tsx` wraps `Composer` for the selected feature: on change it updates the recipient when a mention is found (latest explicit choice wins over the combobox), on send it calls `sendMessage`. Sidebar agent rows set the selected feature's recipient and focus the composer; with no feature open they keep the new-conversation behavior.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/recipient.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- Mentions are case-insensitive.
- Changing the combobox after a mention overrides it until the next mention.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Open, collapse, switch, add and stop mock terminals

**Requirement:** REQ-070, REQ-072, REQ-075
**Depends on:** Task 3
**Files:**
- Create: `src/widgets/terminal/ui/collapsed-toolbar.tsx`
- Modify: `src/widgets/terminal/index.ts`
- Modify: `site/src/pages/styleguide.tsx`
- Create: `src/renderer/src/features/terminal/panel.tsx`
- Create: `src/renderer/src/features/terminal/footer-toolbar.tsx`
- Modify: `src/renderer/src/pages/conversation/conversation-page.tsx`
- Create: `test/renderer/terminals.test.tsx`
- Test: `test/renderer/terminals.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('collapses to the toolbar, reopens the exact tab and adds a manual shell', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Toggle terminals' }))
  fireEvent.click(screen.getByRole('tab', { name: /Implementer · tests/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Collapse terminals' }))
  fireEvent.click(screen.getByRole('button', { name: /tests/ }))
  expect(screen.getByRole('tab', { name: /Implementer · tests/ })).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  expect(screen.getByRole('tab', { name: /zsh/ })).toHaveAttribute('aria-selected', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/terminals.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Move the styleguide's `CollapsedToolbar` and `ToolbarDetail` into `src/widgets/terminal/ui/collapsed-toolbar.tsx` with a public API (items, labels, `onExpand(id)`) and import it back into the styleguide so both use one implementation. `panel.tsx` renders `TerminalPreview` for the selected feature's mock terminals (header with agent, via MCP, state, command and Stop process for agent executions; cwd line; output), `+` adds a manual `zsh` tab whose prompt is the feature worktree, Stop marks the execution `stopped` and keeps output. `footer-toolbar.tsx` shows when the panel is collapsed and reopens the clicked tab. The topbar terminal icon, the panel chevron and the toolbar share the store `panels.terminal` state; terminals belong to their feature, so switching features switches the panel content.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/terminals.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- Collapsing never stops a running mock; its toolbar item keeps the running state.
- The styleguide still renders the toolbar from the shared widget (gallery tests stay green).
- Per-block stitch-fidelity review against `2551431dbc994626a9fd20cd8290a8d7` with the user terminal refinement.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 6: Highlight handoff sources and cover the screen in the dev:web smoke

**Requirement:** REQ-075, REQ-069, REQ-071
**Depends on:** Task 5
**Files:**
- Modify: `src/renderer/src/features/conversation/handoff-link.tsx`
- Create: `test/app-e2e/conversation.spec.ts`
- Test: `test/app-e2e/conversation.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
import { expect, test } from '@playwright/test'
test('a prompt streams a reply and View request highlights the source message', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+R')
  await page.getByRole('option', { name: /dev/ }).click()
  await page.getByRole('textbox', { name: /Send an instruction|Envie uma instrução/ }).fill('Add the regression test')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('listitem').filter({ hasText: 'Add the regression test' })).toBeVisible()
  await page.getByRole('button', { name: /View request|Ver solicitação/ }).click()
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(1)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/app-e2e/conversation.spec.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Event items carry `linkTo` (message id). "View request" scrolls the linked message into view (`block: 'center'`, instant under reduced motion), sets `data-highlighted="true"` with an accent ring for about two seconds and keeps focus on the composer. Add the conversation spec to `test/app-e2e`.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/app-e2e/conversation.spec.ts`. Expected: PASS. Add and run these checks before completing the task:

- `rtk npm run test:e2e:app` passes.
- A missing link target shows nothing and logs no error to the user.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run typecheck, lint, the full Vitest suite with coverage (the renderer is added to the coverage include in project-home-screen Task 1), `npm run build`, and the Playwright smoke for the navigation paths of this plan. Record the stitch-fidelity block review. Update only this slice's STATE.md during implementation. Stop after this plan; use the ordered queue for the next slice.
