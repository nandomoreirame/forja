# Plan: New Conversation with Centered Composer

> **Spec:** docs/specs/new-conversation-composer/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Start a conversation from a centered composer with the right agent preselected and turn the first prompt into a mock feature tab.
**Architecture:** Frontend-only mock screen in the desktop renderer. Screens read data only through `WorkbenchSource` and the `createWorkbenchStore` Zustand store; widgets and primitives come from `src/widgets` and `src/shared/ui`. No CLI, Git, MCP, PTY, filesystem or network access.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui (radix-nova), Zustand, Vitest + RTL, Playwright for the dev:web smoke.
**Order:** 01c of the mock screens (frontend mock screens, implementation batch 1)
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Spec approved 2026-10-31; planned; not implemented.

## Dependencies

- [project-home-screen](2026-10-31-project-home-screen.md)
- [command-palette](2026-10-31-command-palette.md)

## Execution Contract

- Read the spec, the shared decisions in its Context section and `docs/design/forja-2.0/component-fidelity.md` before Task 1.
- Paths under `src/renderer/src/` follow the renderer FSD layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`). Several match paths later slices list; those slices modify these files to wire core.
- Mock timers are injected; tests use `vi.useFakeTimers()` and never wait on real time.
- Visual acceptance: compare each block with the referenced Stitch screen using the stitch-fidelity skill against `npm run dev:web` (ask before starting a dev server). Recorded exceptions win over the Stitch image.
- Seed snippets are contract tests. Expand them to the listed checks; do not hardcode test-only results.

## Acceptance

- New conversation (home, Ctrl+N, command bar) and "+ Add spec" open the centered composer with Research focused; "+ Add plan" uses the Planner; an agent row with no open feature uses that agent.
- Sending creates a uniquely named mock feature, opens its tab and shows the user message.

## Tasks

### Task 1: Derive feature names and unique slugs from the first prompt

**Requirement:** REQ-067
**Depends on:** none within this plan
**Files:**
- Create: `src/renderer/src/entities/feature/model/feature-name.ts`
- Create: `test/renderer/feature-name.test.ts`
- Test: `test/renderer/feature-name.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { featureIdentity } from '../../src/renderer/src/entities/feature/model/feature-name'
it('names a feature from the prompt and keeps the slug unique', () => {
  expect(featureIdentity('Adicionar rate limiting com Redis nos endpoints públicos da API', [])).toEqual({
    name: 'Adicionar rate limiting com Redis nos…',
    slug: 'adicionar-rate-limiting-com-redis-nos',
  })
  expect(featureIdentity('Login', ['login', 'login-2']).slug).toBe('login-3')
  expect(() => featureIdentity('   ', [])).toThrow('Empty prompt')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/feature-name.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Name: first line, whitespace collapsed, cut at the last word boundary within 40 characters plus an ellipsis when truncated. Slug: lowercase, accents removed with `normalize('NFD')`, non-alphanumerics to single hyphens, trimmed, at most the words kept in the name, suffixed `-2`, `-3` against existing slugs; a slug with no letters falls back to `feature`.

```typescript
export function featureIdentity(prompt: string, existing: readonly string[]) {
  const line = prompt.trim().split('\n')[0].replace(/\s+/g, ' ')
  if (!line) throw new Error('Empty prompt')
  // name truncation and slug normalization as described above
}
```

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/feature-name.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- Accented Portuguese prompts produce ASCII slugs.
- Emoji-only prompts fall back to `feature`.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Add compose and feature-creation actions to the store

**Requirement:** REQ-066, REQ-067, REQ-073
**Depends on:** Task 1
**Files:**
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Create: `test/renderer/compose-store.test.ts`
- Test: `test/renderer/compose-store.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
it('creates a feature from the first prompt and opens its conversation', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('acme-api')
  store.getState().startCompose('planner')
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'planner' })
  const id = store.getState().createFeatureFromPrompt('Rate limit public endpoints', 'planner')
  const state = store.getState()
  expect(state.view).toEqual({ kind: 'conversation', featureId: id })
  expect(state.openFeatureIds).toEqual([id])
  expect(state.recipients[id]).toBe('planner')
  expect(state.snapshot?.features.find((f) => f.id === id)?.messages[0]).toMatchObject({ role: 'user', text: 'Rate limit public endpoints' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/compose-store.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `openFeatureIds`, `recipients` (per feature) and actions `startCompose(role)`, `createFeatureFromPrompt(prompt, role)` and `selectFeature(id)`. The new feature uses `featureIdentity`, state `running`, stage = role, destination = project path, a mock branch `feature/<slug>`, and the prompt as its first user message. The reply is requested by conversation-screen; this slice only records the message. `snapshot` updates immutably.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/compose-store.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- Creating a feature never mutates the mock source fixtures.
- `startCompose` defaults to `research` when no role is passed.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Render the centered composer and wire every entry point

**Requirement:** REQ-066, REQ-073
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/pages/compose/compose-page.tsx`
- Create: `src/renderer/src/pages/compose/index.ts`
- Create: `src/renderer/src/pages/conversation/conversation-page.tsx`
- Create: `src/renderer/src/pages/conversation/index.ts`
- Modify: `src/widgets/conversation/ui/composer.tsx`
- Modify: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Modify: `src/renderer/src/pages/home/home-page.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Modify: `test/welcome.test.tsx`
- Create: `test/renderer/compose-page.test.tsx`
- Test: `test/renderer/compose-page.test.tsx`

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
it('opens the centered composer from Add plan and sends into a new feature tab', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="acme-api" />)
  fireEvent.click(await screen.findByRole('button', { name: '+ Add plan' }))
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  expect(field).toHaveFocus()
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Planner')
  expect(screen.queryByRole('tablist')).toBeNull()
  fireEvent.change(field, { target: { value: 'Rate limit public endpoints' } })
  fireEvent.click(screen.getByRole('button', { name: /Send/ }))
  expect(screen.getByRole('tab', { name: /Rate limit public endpoints/ })).toHaveAttribute('aria-selected', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/compose-page.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `autoFocus` to `Composer` (focus the textarea on mount). `ComposePage` centers the composer (`max-w-[760px]`, vertically centered) with the recipient preselected from the view, context "New conversation" and destination = project path; no tab bar or "Conversation" tab. `ConversationPage` is created here in its minimal form (feature tabs + `Messages` + docked `Composer`) so the new feature is visible; conversation-screen extends it. Wire: home New conversation, Ctrl+N and the command bar command call `startCompose('research')`; sidebar "+ Add spec" uses `research`, "+ Add plan" uses `planner`; an agent row with no feature open uses that agent. Extend `test/welcome.test.tsx` so New conversation ends with the focused prompt field.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/compose-page.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- Send stays disabled for empty or whitespace input; Ctrl+Enter sends.
- Changing the recipient before sending creates the feature with that recipient.
- Per-block stitch-fidelity review of the centered composer against `02e65671524b4ea8ade154cb310d66ff`, keeping the refined composer finish already recorded.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Cover the new conversation flow in the dev:web smoke

**Requirement:** REQ-066, REQ-067
**Depends on:** Task 3
**Files:**
- Create: `test/app-e2e/new-conversation.spec.ts`
- Test: `test/app-e2e/new-conversation.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
import { expect, test } from '@playwright/test'
test('New conversation focuses Research and the first prompt opens a feature tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /New conversation|Nova conversa/ }).click()
  await page.keyboard.type('Add OAuth login')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('tab', { name: /Add OAuth login/ })).toBeVisible()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/app-e2e/new-conversation.spec.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add the spec to `test/app-e2e`. It types without clicking the field, which proves the autofocus.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/app-e2e/new-conversation.spec.ts`. Expected: PASS. Add and run these checks before completing the task:

- `rtk npm run test:e2e:app` passes.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run typecheck, lint, the full Vitest suite with coverage (the renderer is added to the coverage include in project-home-screen Task 1), `npm run build`, and the Playwright smoke for the navigation paths of this plan. Record the stitch-fidelity block review. Update only this slice's STATE.md during implementation. Stop after this plan; use the ordered queue for the next slice.
