# Plan: Project Sidebar Navigator

> **Spec:** docs/specs/project-sidebar-navigator/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Replace the sidebar Agents menu with Features, Specs, Plans, Skills and Memories sections, and let the user archive and restore features, specs and plans.
**Architecture:** Frontend-only mock slice in the desktop renderer. Grouping, ordering and archive cascade are pure functions in `features/project-navigator/model.ts`; data comes through `WorkbenchSource`; the sidebar composes one section component per block. No CLI, Git, MCP, PTY or filesystem access.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui, Zustand, Vitest + RTL, Playwright.
**Order:** 01g of the mock screens, after document-viewer-screen (01f).
**Total Tasks:** 6
**Estimated Complexity:** medium

## Dependencies

- [document-viewer-screen](2026-10-31-document-viewer-screen.md): the document tab that opens specs, plans, skills and memories.
- [settings-screen](2026-10-31-settings-screen.md): the workspace menu and the Settings Memory tab this slice removes.

## Execution Contract

- Read the spec before Task 1. Mock timers are injected; tests never wait on real time.
- Copy is added to `src/shared/i18n/en.ts` and `pt-br.ts` (correct pt-BR accents); identifiers and paths are never translated.
- Every icon-only button has a dark tooltip and an `aria-label`; rows and section headers are keyboard reachable.
- Commit each task through `git-commit` after its gates pass; never push.

## Acceptance

- The sidebar shows Features, Specs, Plans, Skills and Memories, in that order, and no Agents menu.
- Features are grouped by what needs the user, finished ones are collapsed, and a row opens or reopens its tab.
- Specs and plans show their link and state; the selected feature's artifacts are highlighted.
- Skills and memories are labeled project or global and open with "Edit with agent".
- Sections collapse and stay collapsed after a restart; archived items disappear and come back from "Archived".

## Tasks

### Task 1: Model project items, grouping and the archive cascade

**Requirement:** REQ-083, REQ-084, REQ-087
**Depends on:** none within this plan
**Files:**
- Modify: `src/renderer/src/shared/api/workbench-source.ts`
- Modify: `src/renderer/src/shared/api/mock-data.ts`
- Create: `src/renderer/src/features/project-navigator/model.ts`
- Create: `test/renderer/project-navigator-model.test.ts`
- Test: `test/renderer/project-navigator-model.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: nextjs-fsd-conventions, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import {
  archiveCascade,
  groupFeatures,
  restoreCascade,
} from '../../src/renderer/src/features/project-navigator/model'

const feature = (id: string, state: string, activity: string, extra = {}) =>
  ({ id, name: id, state, stage: 'research', lastActivityAt: activity, ...extra }) as never

it('puts features needing the user first, then running, then idle, and finished last', () => {
  const groups = groupFeatures([
    feature('idle-old', 'draft', '2026-10-01'),
    feature('running', 'running', '2026-10-20'),
    feature('approval', 'waiting', '2026-10-10'),
    feature('fix', 'failed', '2026-10-25'),
    feature('done', 'completed', '2026-10-30', { endState: 'integrated' }),
    feature('hidden', 'draft', '2026-10-31', { archived: true }),
    feature('idle-new', 'draft', '2026-10-15'),
  ])
  expect(groups.attention.map((f) => f.id)).toEqual(['fix', 'approval'])
  expect(groups.running.map((f) => f.id)).toEqual(['running'])
  expect(groups.idle.map((f) => f.id)).toEqual(['idle-new', 'idle-old'])
  expect(groups.finished.map((f) => f.id)).toEqual(['done'])
})

it('archives a feature with its spec and plans and restores a plan with its spec', () => {
  const items = {
    features: [{ id: 'f1', archived: false }],
    artifacts: [
      { id: 's1', kind: 'spec', featureId: 'f1', archived: false },
      { id: 'p1', kind: 'plan', specId: 's1', featureId: 'f1', archived: false },
      { id: 's2', kind: 'spec', featureId: 'f2', archived: false },
    ],
  } as never
  const archived = archiveCascade(items, { kind: 'feature', id: 'f1' })
  expect(archived.features[0].archived).toBe(true)
  expect(archived.artifacts.filter((a: { archived: boolean }) => a.archived).map((a: { id: string }) => a.id)).toEqual(['s1', 'p1'])
  const restored = restoreCascade(archived, { kind: 'plan', id: 'p1' })
  expect(restored.artifacts.find((a: { id: string }) => a.id === 's1').archived).toBe(false)
  expect(restored.features[0].archived).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/project-navigator-model.test.ts`
Expected: FAIL on the asserted behavior (compiling stubs first; an import failure does not count as RED).

**Step 3: Write minimal implementation**

Extend the contract: `FeatureSnapshot` gains `lastActivityAt: string`, `endState?: 'integrated' | 'abandoned'`, `stalled?: boolean` and `archived?: boolean`; project artifacts gain `featureId: string`, `specId?: string` (plans) and `archived?: boolean`; `skills` and `MemoryRecord` gain `scope: 'project' | 'global'`. `model.ts` exports `groupFeatures(features)` (attention = `waiting`, `failed` or `stalled`; running = `running`; finished = has `endState`; the rest idle; archived excluded; each group by `lastActivityAt` descending), `archiveCascade(items, target)` (a feature archives its artifacts; a spec archives its plans) and `restoreCascade(items, target)` (a plan restores its spec; a feature restores its artifacts). Enrich the `dev` mock project: the two existing features plus a stalled one, a finished `integrated` one and one archived; one spec per feature linked by `featureId`, plans linked by `specId`; project and global skills; memories with scope, in both locales.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/project-navigator-model.test.ts`. Expected: PASS. Also check: restoring a feature restores its artifacts; archiving an already archived item is a no-op; `npm test` stays green after the fixture change (update seed-dependent assertions only where the new features change counts).

**Step 5: Commit**

Run: `/git commit`

### Task 2: Replace the Agents menu with the Features section

**Requirement:** REQ-083
**Depends on:** Task 1
**Files:**
- Create: `src/renderer/src/features/project-navigator/features-section.tsx`
- Create: `src/renderer/src/features/project-navigator/index.ts`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Create: `test/renderer/features-section.test.tsx`
- Test: `test/renderer/features-section.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('lists every feature by attention, reopens a closed tab and drops the Agents menu', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).queryByText('Agents')).toBeNull()
  expect(within(sidebar).queryByRole('button', { name: /Edit agents/ })).toBeNull()
  const features = within(sidebar).getByRole('region', { name: /Features/ })
  const rows = within(features).getAllByRole('button', { name: /·/ })
  expect(rows[0]).toHaveAccessibleName(/Catalog search/)
  fireEvent.click(screen.getByRole('button', { name: 'Close Catalog search' }))
  expect(screen.queryByRole('tab', { name: /Catalog search/ })).toBeNull()
  fireEvent.click(within(features).getByRole('button', { name: /Catalog search/ }))
  expect(screen.getByRole('tab', { name: /Catalog search/ })).toHaveAttribute('aria-selected', 'true')
  expect(within(features).getByRole('button', { name: /Finished/ })).toHaveAttribute('aria-expanded', 'false')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/features-section.test.tsx`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

`FeaturesSection` renders a labelled `section` (heading "Features"/"Features" with count) and the groups from `groupFeatures`: each row is a button with the state dot, the name (truncate, tooltip with the full name) and a second line with the stage agent icon, the localized role and a `StatusBadge` ("Awaiting approval", "Needs fix", "Stalled", "Running", "Idle"); its accessible name is `"<name> · <role> · <state>"`. A "Finished" disclosure (collapsed by default) holds finished features with their end state. "+ New conversation" calls `startCompose()`. Store: `openFeature(id)` adds the id back to `openFeatureIds` when the tab was closed, then selects it. Remove the Agents block and "Edit agents" from `project-sidebar.tsx`; keep the collapse chevron on the Features header.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/features-section.test.tsx`. Expected: PASS. Also check: a project without features shows only "+ New conversation"; keyboard Tab reaches every row; existing sidebar tests are updated where they relied on agent rows (recipient selection by sidebar is replaced by the composer and @mentions, REQ-074 stays covered there).

**Step 5: Commit**

Run: `/git commit`

### Task 3: Link specs and plans to their feature and highlight the selected one

**Requirement:** REQ-084
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/features/project-navigator/artifact-sections.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Create: `test/renderer/artifact-sections.test.tsx`
- Test: `test/renderer/artifact-sections.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('shows linked specs and plans, highlights the selected feature and has no add-plan action', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const specs = within(sidebar).getByRole('region', { name: /Specs/ })
  const plans = within(sidebar).getByRole('region', { name: /Plans/ })
  const oauthSpec = within(specs).getByRole('button', { name: /Login with OAuth/ })
  expect(oauthSpec).toHaveAttribute('data-current', 'true')
  expect(within(specs).getByRole('button', { name: /Catalog search/ })).not.toHaveAttribute('data-current')
  expect(within(plans).getAllByRole('button')[0]).toHaveTextContent(/spec/i)
  expect(within(sidebar).queryByRole('button', { name: /Add plan/ })).toBeNull()
  fireEvent.click(within(specs).getByRole('button', { name: /New spec/ }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Research')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/artifact-sections.test.tsx`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

`SpecsSection` and `PlansSection` (labelled sections with counts) list non-archived artifacts: name, a subtitle with the feature name (spec) or the spec name (plan), and a `StatusBadge` for draft, approved or stale. Rows of the selected feature get `data-current="true"` and full contrast; the rest are dimmed (`text-muted-foreground`). Activating a row navigates to `{ kind: 'document', artifactId }`. "+ New spec" calls `startCompose('research')`; plans have no add action.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/artifact-sections.test.tsx`. Expected: PASS. Also check: with no feature selected nothing is dimmed; empty sections keep their header with count 0.

**Step 5: Commit**

Run: `/git commit`

### Task 4: Show skills and memories with scope and move Memory out of Settings

**Requirement:** REQ-085
**Depends on:** Task 3
**Files:**
- Create: `src/renderer/src/features/project-navigator/library-sections.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Modify: `src/renderer/src/pages/settings/settings-page.tsx`
- Modify: `src/renderer/src/shared/api/mock-source.ts`
- Modify: `src/renderer/src/shared/api/mock-replies.ts`
- Create: `test/renderer/library-sections.test.tsx`
- Test: `test/renderer/library-sections.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

it('labels skills and memories by scope and removes Memory from the workspace menu and Settings', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const skills = within(sidebar).getByRole('region', { name: /Skills/ })
  const memories = within(sidebar).getByRole('region', { name: /Memories/ })
  expect(within(skills).getAllByText(/^(project|global)$/).length).toBeGreaterThan(1)
  expect(await within(memories).findAllByText(/^(project|global)$/)).not.toHaveLength(0)
  const workspace = within(sidebar).getByRole('navigation', { name: 'Workspace' })
  expect(within(workspace).queryByRole('button', { name: 'Memory' })).toBeNull()
  fireEvent.click(within(workspace).getByRole('button', { name: 'Settings' }))
  expect(screen.queryByRole('tab', { name: 'Memory' })).toBeNull()
  fireEvent.click(within(skills).getByRole('button', { name: /New skill/ }))
  expect(screen.getByRole('dialog', { name: /Skill scope/ })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/library-sections.test.tsx`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

`SkillsSection` and `MemoriesSection` list entries with a scope label ("project"/"projeto", "global") and open them in the document tab; the document header offers "Edit with agent", which starts a mock authoring conversation (a feature-less conversation whose recipient is labelled "Skill author" or "Memory curator" and whose scripted reply lives in `mock-replies.ts`). "+ New skill" and "+ New memory" open a small Dialog asking for the scope (Project, Global) and then start the authoring conversation. Remove the Memory workspace button and the Settings Memory tab (and its `SettingsTab` member); Settings keeps Agents, General and Connectors.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/library-sections.test.tsx`. Expected: PASS. Also check: settings tests are updated for the removed tab; the scope dialog is keyboard operable and Escape cancels.

**Step 5: Commit**

Run: `/git commit`

### Task 5: Collapse sections, archive items and restore them from Archived

**Requirement:** REQ-086, REQ-087
**Depends on:** Task 4
**Files:**
- Create: `src/renderer/src/features/project-navigator/section.tsx`
- Create: `src/renderer/src/pages/archived/archived-page.tsx`
- Create: `src/renderer/src/pages/archived/index.ts`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Modify: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Create: `test/renderer/archive.test.tsx`
- Test: `test/renderer/archive.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'

beforeEach(() => localStorage.clear())

it('archives a feature with its documents, blocks running ones and restores from Archived', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  expect(within(sidebar).getByRole('button', { name: 'Archive Login with OAuth' })).toBeDisabled()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archive Catalog search' }))
  expect(within(sidebar).queryByText('Catalog search')).toBeNull()
  expect(screen.queryByRole('tab', { name: /Catalog search/ })).toBeNull()
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Archived' }))
  const archived = screen.getByRole('region', { name: 'Archived' })
  expect(within(archived).getByText('Catalog search')).toBeInTheDocument()
  fireEvent.click(within(archived).getByRole('button', { name: 'Restore Catalog search' }))
  expect(within(sidebar).getAllByText('Catalog search').length).toBeGreaterThan(0)
})

it('remembers collapsed sections across restarts', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const header = await screen.findByRole('button', { name: /^Specs/ })
  fireEvent.click(header)
  expect(header).toHaveAttribute('aria-expanded', 'false')
  cleanup()
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  expect(await screen.findByRole('button', { name: /^Specs/ })).toHaveAttribute('aria-expanded', 'false')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/archive.test.tsx`
Expected: FAIL on the asserted behavior.

**Step 3: Write minimal implementation**

`NavigatorSection` is a disclosure (header button with chevron, title and count; `aria-expanded`, `aria-controls`) whose open state is read and written through the same safe `localStorage` wrapper used by the resizable layout, keyed `forja.sidebar.<section>`. Rows of features, specs and plans get an archive icon button (tooltip, `aria-label` "Archive <name>"), visible on hover and focus; it is disabled for a running feature with the tooltip "Interrupt the agent before archiving". Store: `archiveItem(target)` and `restoreItem(target)` apply `archiveCascade`/`restoreCascade` to the snapshot, close the tab of an archived feature (selecting a neighbor or the centered composer) and keep restored features closed until opened. Add the `{ kind: 'archived' }` view, the "Archived" workspace button and `ArchivedPage`, a labelled region listing archived features, specs and plans by kind, each with "Restore <name>".

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/archive.test.tsx`. Expected: PASS. Also check: restoring a plan restores its archived spec; archiving the selected feature selects the neighbor tab; nothing is deleted from the mock source (archived items are still returned by `loadProject` with `archived: true`).

**Step 5: Commit**

Run: `/git commit`

### Task 6: Cover the navigator in the dev:web smoke

**Requirement:** REQ-083, REQ-086, REQ-087
**Depends on:** Task 5
**Files:**
- Create: `test/app-e2e/sidebar-navigator.spec.ts`
- Test: `test/app-e2e/sidebar-navigator.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: consequences-reviewer

**Step 1: Write the failing test**

```typescript
import { expect, test } from '@playwright/test'
test('the sidebar opens features, archives and restores them and remembers sections', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  const sidebar = page.getByRole('complementary', { name: 'dev' })
  await expect(sidebar.getByText('Agents')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close Catalog search' }).click()
  await sidebar.getByRole('button', { name: /Catalog search/ }).first().click()
  await expect(page.getByRole('tab', { name: /Catalog search/ })).toHaveAttribute('aria-selected', 'true')
  await sidebar.getByRole('button', { name: 'Archive Catalog search' }).click()
  await sidebar.getByRole('button', { name: 'Archived' }).click()
  await page.getByRole('button', { name: 'Restore Catalog search' }).click()
  await sidebar.getByRole('button', { name: /^Plans/ }).click()
  await page.reload()
  await page.keyboard.press('Control+r')
  await page.getByRole('option', { name: /^dev/ }).click()
  await expect(sidebar.getByRole('button', { name: /^Plans/ })).toHaveAttribute('aria-expanded', 'false')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm run test:e2e:app -- sidebar-navigator.spec.ts`
Expected: FAIL before Tasks 2 to 5 land; PASS after.

**Step 3: Write minimal implementation**

Add the spec; fix any selector drift in the implementation, not in the test intent.

**Step 4: Run test to verify it passes**

Run: `rtk npm run test:e2e:app`. Expected: all specs PASS.

**Step 5: Commit**

Run: `/git commit`

## Final Validation and Handoff

Run typecheck, lint, format check, the full Vitest suite with coverage, `npm run build`, `npm run test:e2e:app` and both desktop smokes (`npm run test:desktop:pty`, `npm run test:desktop:picker`). Visually check the sidebar against the decided layout (Features, Specs, Plans, Skills, Memories; Archived, Connectors, Settings at the bottom). Update this slice's STATE.md, the queue in `docs/plans/README.md` and the requirement map.
