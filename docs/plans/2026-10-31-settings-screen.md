# Plan: Settings Screen

> **Spec:** docs/specs/settings-screen/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Open Settings from the gear and agent links and edit the fixed agent profiles and general options with a manual mock save.
**Architecture:** Frontend-only mock screen in the desktop renderer. Screens read data only through `WorkbenchSource` and the `createWorkbenchStore` Zustand store; widgets and primitives come from `src/widgets` and `src/shared/ui`. No CLI, Git, MCP, PTY, filesystem or network access.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui (radix-nova), Zustand, Vitest + RTL, Playwright for the dev:web smoke.
**Order:** 01e of the mock screens (frontend mock screens, implementation batch 2)
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Spec approved 2026-10-31; planned; not implemented.

## Dependencies

- [project-home-screen](2026-10-31-project-home-screen.md)
- [conversation-screen](2026-10-31-conversation-screen.md)

## Execution Contract

- Read the spec, the shared decisions in its Context section and `docs/design/forja-2.0/component-fidelity.md` before Task 1.
- Paths under `src/renderer/src/` follow the renderer FSD layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`). Several match paths later slices list; those slices modify these files to wire core.
- Mock timers are injected; tests use `vi.useFakeTimers()` and never wait on real time.
- Visual acceptance: compare each block with the referenced Stitch screen using the stitch-fidelity skill against `npm run dev:web` (ask before starting a dev server). Recorded exceptions win over the Stitch image.
- Seed snippets are contract tests. Expand them to the listed checks; do not hardcode test-only results.

## Acceptance

- Gear, "Configure agents"/"+ Edit agents" and "+ Add skill" open the right Settings tab, keeping feature tabs, context and composer.
- The Agents and General fields match the approved settings design and recorded exceptions.
- Save persists only when dirty; leaving or switching agent with unsaved changes asks first.

## Tasks

### Task 1: Model agent profiles, dirty state and capability rules

**Requirement:** REQ-077
**Depends on:** none within this plan
**Files:**
- Create: `src/renderer/src/features/agent-settings/model.ts`
- Create: `test/renderer/settings-model.test.ts`
- Test: `test/renderer/settings-model.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { effortOptions, isDirty, normalizeProfile } from '../../src/renderer/src/features/agent-settings/model'
const saved = { role: 'implementer', tool: 'codex', model: '', effort: 'default', instructions: '', skills: ['rpi-implement'], autoInvoke: false } as const
it('normalizes blanks, detects edits and limits effort to supported tools', () => {
  expect(normalizeProfile({ ...saved, model: '  ' }).model).toBeUndefined()
  expect(isDirty(saved, { ...saved })).toBe(false)
  expect(isDirty(saved, { ...saved, skills: ['rpi-implement', 'git'] })).toBe(true)
  expect(effortOptions('codex')).toContain('high')
  expect(effortOptions('grok')).toEqual(['default'])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/settings-model.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Types: `AgentProfile` (role, tool, optional model, effort, instructions, skills, autoInvoke) and `GeneralSettings` (skillsRoot, interruptPolicy `interrupt | queue`, guidedMode read-only, correctionRounds fixed at 3, inactivityMinutes 1 to 120). `normalizeProfile` trims and turns a blank model into `undefined` (tool default; never invent a model). `isDirty` compares normalized values with set semantics for skills. `effortOptions(tool)` reads a mock capability table (`default` always; extra levels only where the mock marks support) until cli-capability-contracts provides real evidence.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/settings-model.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- Inactivity outside 1 to 120 is rejected with a localized message.
- Unknown tools fall back to `default` effort only.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Serve mock settings and open Settings from every entry point

**Requirement:** REQ-076
**Depends on:** Task 1
**Files:**
- Modify: `src/renderer/src/shared/api/mock-source.ts`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Modify: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Create: `test/renderer/settings-entry.test.tsx`
- Test: `test/renderer/settings-entry.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('opens the General tab from Add skill and keeps the feature context and composer', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: '+ Add skill' }))
  expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: /Send an instruction/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit agents' }))
  expect(screen.getByRole('combobox', { name: 'Agent' })).toHaveTextContent('Research')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/settings-entry.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement `loadSettings`/`saveSettings` in the mock source (in-memory, deep-copied, resets on reload). Store: `openSettings({ tab, role? })` navigates to the `settings` view. Entry points: topbar gear (Agents tab, current recipient or Research), sidebar "Configure agents"/"+ Edit agents" (Agents tab), "+ Add skill" (General tab), and the command bar Settings command. In a project with features, Settings replaces only the conversation area: feature tabs, feature context and the docked composer stay (REQ-047); in a project without features it replaces the home.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/settings-entry.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- The composer keeps sending to the feature while Settings is open and never reads the form.
- Back returns to the previous view.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Build the Settings page with tabs, fields and guarded manual save

**Requirement:** REQ-076, REQ-077
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/pages/settings/settings-page.tsx`
- Create: `src/renderer/src/pages/settings/index.ts`
- Create: `src/renderer/src/features/agent-settings/unsaved-dialog.tsx`
- Create: `test/renderer/settings-page.test.tsx`
- Test: `test/renderer/settings-page.test.tsx`

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
it('enables Save only after an edit and guards leaving with unsaved changes', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Settings' }))
  const save = screen.getByRole('button', { name: 'Save changes' })
  expect(save).toBeDisabled()
  expect(screen.getByText(/of 3 active/)).toHaveTextContent('2 of 3 active')
  fireEvent.click(screen.getByRole('checkbox', { name: 'git' }))
  expect(save).toBeEnabled()
  expect(screen.getByText(/of 3 active/)).toHaveTextContent('3 of 3 active')
  fireEvent.click(screen.getByRole('tab', { name: /Catalog search/ }))
  expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/settings-page.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Port the Stitch settings blocks with the stitch-fidelity per-block flow: title and description, `Tabs` (Agents, General), then for Agents a two-column grid (Agent select with the five fixed roles and the running dot; AI tool select with a "Detected on system" mock indicator; Model input with "Use the tool default" placeholder; Reasoning level select with "Available when supported by the tool" hint), Additional instructions textarea, Agent skills card (description, checkbox list from the project skills, "N of M active"), Auto-invoke card with switch and the description that it never approves specs, plans or Git integration, and the right-aligned Save button. General: skills folder input with Refresh, interrupt policy select, read-only guided mode with "3 automatic correction rounds", inactivity minutes. Save calls `saveSettings`, shows a polite success status and resets dirty. `unsaved-dialog.tsx` (Save, Discard, Cancel) guards navigation, feature switches and agent switches while dirty.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/settings-page.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- Per-block stitch-fidelity review against `a486490d997146329aa2b82c637c98ee`.
- Every field has a visible label; the skills list is a `group` with an accessible name.
- Discard restores the last saved values; Cancel keeps editing.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Cover Settings in the dev:web smoke

**Requirement:** REQ-076, REQ-077
**Depends on:** Task 3
**Files:**
- Create: `test/app-e2e/settings.spec.ts`
- Test: `test/app-e2e/settings.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
import { expect, test } from '@playwright/test'
test('the gear opens Settings and saving clears the dirty state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^(Settings|Configurações)$/ }).click()
  const save = page.getByRole('button', { name: /Save changes|Salvar alterações/ })
  await expect(save).toBeDisabled()
  await page.getByRole('textbox', { name: /Additional instructions|Instruções adicionais/ }).fill('Prefer small commits')
  await save.click()
  await expect(save).toBeDisabled()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/app-e2e/settings.spec.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add the spec to `test/app-e2e`.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/app-e2e/settings.spec.ts`. Expected: PASS. Add and run these checks before completing the task:

- `rtk npm run test:e2e:app` passes.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run typecheck, lint, the full Vitest suite with coverage (the renderer is added to the coverage include in project-home-screen Task 1), `npm run build`, and the Playwright smoke for the navigation paths of this plan. Record the stitch-fidelity block review. Update only this slice's STATE.md during implementation. Stop after this plan; use the ordered queue for the next slice.
