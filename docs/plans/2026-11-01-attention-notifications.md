# Plan: Attention Notifications

> **Spec:** docs/specs/attention-notifications/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Tell the user which background features need them or finished, through desktop notifications, sounds, window title and badge counts and a topbar bell.
**Architecture:** A pure renderer attention model derives events from feature state transitions (REQ-018 events and REQ-095 fallbacks); the renderer owns the bell, settings and tones, and the main process renders notifications, badge and title through a validated IPC channel.
**Tech Stack:** Electron, React, TypeScript, Zod, Web Audio; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 14 of 14
**Total Tasks:** 5
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- [cli-agent-sessions](2026-10-30-cli-agent-sessions.md) (normalized events and fallback signals)
- [settings-screen](2026-10-31-settings-screen.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Source snippets are seed contract tests. Expand fixtures to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved shared components and Terminal Noir tokens.

## Acceptance

- A background feature that starts waiting or finishes raises a notification, a tone, title and badge counts and a bell entry, once per reason within 15 seconds.
- Every channel can be switched off, and an unavailable channel says why while the bell keeps working.
- Alerts never carry prompt, command or output content.

## Checks

**Run attention**: `npx vitest run test/renderer/attention-model.test.ts test/renderer/attention-bell.test.tsx test/renderer/attention-settings.test.tsx test/main/attention.test.ts --reporter=verbose`

- C1 (REQ-096): a background feature alerts once per reason and the feature on screen never alerts. Proof: run attention | PASS alerts once per feature and reason and skips the feature on screen
- C2 (REQ-096): unread events appear in the topbar bell and open their feature. Proof: run attention | PASS lists unread events and opens the feature on click
- C3 (REQ-052): channels are switchable and the tones differ per kind. Proof: run attention | PASS offers switchable channels and distinct tones
- C4 (REQ-096): notification payloads are validated and the window title shows the counts. Proof: run attention | PASS validates payloads and formats window title counts
- C5 (REQ-096): a background feature that waits raises the bell end to end. Proof: `npx playwright test --config test/app-e2e/playwright.config.ts attention`

## Tasks

### Task 1: Derive attention events from feature state transitions

**Requirement:** REQ-096
**Files:**

- Create: `src/renderer/src/features/attention/model.ts`
- Test: `test/renderer/attention-model.test.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { createAttention } from '../../src/renderer/src/features/attention/model'
it('alerts once per feature and reason and skips the feature on screen', () => {
  const attention = createAttention({ dedupeMs: 15_000 })
  expect(attention.observe({ id: 'f1', name: 'Login', state: 'waiting' }, { onScreen: 'f2', now: 0 })).toEqual({ kind: 'waiting', featureId: 'f1', name: 'Login' })
  expect(attention.observe({ id: 'f1', name: 'Login', state: 'running' }, { onScreen: 'f2', now: 1_000 })).toBeUndefined()
  expect(attention.observe({ id: 'f1', name: 'Login', state: 'waiting' }, { onScreen: 'f2', now: 5_000 })).toBeUndefined()
  expect(attention.observe({ id: 'f1', name: 'Login', state: 'completed' }, { onScreen: 'f2', now: 6_000 })).toMatchObject({ kind: 'finished' })
  expect(attention.observe({ id: 'f2', name: 'Search', state: 'waiting' }, { onScreen: 'f2', now: 7_000 })).toBeUndefined()
  expect(attention.counts()).toEqual({ waiting: 1, finished: 1 })
  attention.read('f1')
  expect(attention.unread()).toEqual([])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/attention-model.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A pure model consumed by the workbench store: it remembers each feature's last state, emits `waiting` when a feature enters `waiting` and `finished` when a running turn completes, skips the feature on screen, archived and ended features, suppresses the same feature and reason within the dedupe window, and keeps an ordered unread list with counts. Selecting a feature marks its events read. Event text carries only the feature name and kind.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/attention-model.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Archived and ended features never produce events.
- A different reason within the window still alerts.
- Unread order is newest first and survives re-renders.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Show unread attention events in a topbar bell

**Requirement:** REQ-096
**Depends on:** Task 1
**Files:**

- Create: `src/renderer/src/features/attention/bell.tsx`
- Modify: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Test: `test/renderer/attention-bell.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AttentionBell } from '../../src/renderer/src/features/attention/bell'
it('lists unread events and opens the feature on click', () => {
  const opened: string[] = []
  render(<AttentionBell label="Notifications" events={[{ kind: 'waiting', featureId: 'f1', name: 'Login' }]} kindLabels={{ waiting: 'Needs you', finished: 'Finished' }} onOpen={(id) => opened.push(id)} />)
  const bell = screen.getByRole('button', { name: 'Notifications, 1 unread' })
  fireEvent.click(bell)
  const item = within(screen.getByRole('menu')).getByRole('menuitem', { name: /Login · Needs you/ })
  fireEvent.click(item)
  expect(opened).toEqual(['f1'])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/attention-bell.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Render a ghost icon button with a bell and an unread count badge in the topbar `end` slot, before the right panel toggle, with a dark tooltip. It opens a menu (shared Popover/DropdownMenu anatomy) listing unread events newest first with the feature name and a status dot per kind; an item opens the feature, which marks it read. With no unread events the menu shows an empty message. Localize every label in en and pt-BR.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/attention-bell.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Keyboard: the bell, the menu and its items are reachable and announced with names.
- No badge renders with zero unread.
- The bell is absent while no project is open.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Add notification and sound switches with two tones

**Requirement:** REQ-096, REQ-052
**Depends on:** Task 1
**Files:**

- Create: `src/renderer/src/features/attention/sounds.ts`
- Modify: `src/renderer/src/pages/settings/settings-page.tsx`
- Test: `test/renderer/attention-settings.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { toneFor } from '../../src/renderer/src/features/attention/sounds'
it('offers switchable channels and distinct tones', async () => {
  expect(toneFor('waiting').map((note) => note.hz)).toEqual([880, 660])
  expect(toneFor('finished').map((note) => note.hz)).toEqual([660, 880])
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  expect(await screen.findByRole('switch', { name: 'Desktop notifications' })).toBeChecked()
  expect(screen.getByRole('switch', { name: 'Alert sounds' })).toBeChecked()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/attention-settings.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Synthesize the two tones with the Web Audio API (falling for waiting, rising for finished, under 400 ms, gentle envelope), no bundled files. Add "Desktop notifications" and "Alert sounds" switches to Settings › General, on by default and persisted through the settings source. When the operating system denies notifications or no audio output exists, show that channel as unavailable with the reason instead of failing silently (REQ-052).

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/attention-settings.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Turning sounds off plays nothing on the next event.
- A denied notification permission shows the unavailable reason and keeps the bell working.
- Reduced motion does not affect sounds; muted output does not throw.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Raise desktop notifications, badge and title counts from the main process

**Requirement:** REQ-096, REQ-048
**Files:**

- Create: `src/main/attention.ts`
- Modify: `src/shared/desktop.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Test: `test/main/attention.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { attentionTitle, parseAttentionPayload } from '../../src/main/attention'
it('validates payloads and formats window title counts', () => {
  expect(attentionTitle('Forja', { waiting: 2, finished: 1 })).toBe('‖2 ✔1 · Forja')
  expect(attentionTitle('Forja', { waiting: 0, finished: 0 })).toBe('Forja')
  expect(parseAttentionPayload({ kind: 'waiting', name: 'Login', counts: { waiting: 1, finished: 0 } })).toBeTruthy()
  expect(() => parseAttentionPayload({ kind: 'waiting', name: 'x'.repeat(500), counts: { waiting: 1, finished: 0 } })).toThrow()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/main/attention.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add a `forja:attention` channel: the preload exposes `notifyAttention(payload)`; the main process validates the payload with Zod (kind enum, bounded name, non-negative counts), shows an Electron `Notification` only when the window is not focused or the feature is not on screen, clicking it focuses the window and sends `forja:attention:open` with the feature id, and updates `app.setBadgeCount` and the window title with the counts. Never include prompt, command or output content.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/main/attention.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- An invalid payload is rejected without showing anything.
- Clicking a notification focuses the window and opens the feature.
- Counts at zero restore the plain title and clear the badge.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Prove a background feature raises the bell end to end

**Requirement:** REQ-096
**Depends on:** Task 2
**Files:**

- Create: `test/app-e2e/attention.spec.ts`
- Test: `test/app-e2e/attention.spec.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, test } from '@playwright/test'
test('a background feature that waits raises the bell', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  await page.getByRole('tab', { name: /Catalog search/ }).click()
  await page.evaluate(() => (window as unknown as { forjaMock: { setState(id: string, state: string): void } }).forjaMock.setState('feature-1', 'waiting'))
  await expect(page.getByRole('button', { name: /Notifications, 1 unread/ })).toBeVisible()
  await page.getByRole('button', { name: /Notifications, 1 unread/ }).click()
  await page.getByRole('menuitem', { name: /Login with OAuth/ }).click()
  await expect(page.getByRole('tab', { name: /Login with OAuth/ })).toHaveAttribute('aria-selected', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/app-e2e/attention.spec.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Expose a development-only mock hook on the web build to change a feature state, then drive the full flow in the browser: a background feature turns waiting, the bell shows one unread, opening it selects the feature and clears the count. Keep the hook out of production builds.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/app-e2e/attention.spec.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The hook is absent from the production bundle (build output check).
- The foreground feature changing state raises no event.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit tests, the build and the app Playwright suite. Check keyboard and screen reader behavior of the bell and the Settings switches. Record actual implementer, results and independent review separately. Update only this slice's STATE.md during engineering execution.
