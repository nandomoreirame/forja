# Plan: Quick Interface Adjustments

> **Spec:** docs/specs/ui-quick-adjustments/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Ship the frontend-only adjustments: feature flags, forge agent names, the Ferreiro mock chat, the sidebar usage panel, a mascot trial, clear status glyphs, file previews and diffs, and the Backlog and Board pages.
**Architecture:** Renderer-only changes over the mock `WorkbenchSource`; one flag registry gates unfinished features; one agent-name module feeds every place that shows an agent.
**Tech Stack:** Electron, React, TypeScript; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 01j (frontend, before slice 02)
**Total Tasks:** 14
**Estimated Complexity:** large
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- None (frontend-only over the current renderer).

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the complete spec and current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Frontend only: no core, IPC, CLI or dependency change.
- Task 8 is a visual trial: Stitch layout and styleguide preview first; the app keeps the current mascots until the user approves.

## Acceptance

- Explorer, Changes and sync counts never render in production builds.
- Agents show their forge names (editable) with the role in tooltips.
- New chats open a conversation with the Ferreiro on the first prompt; nothing else is created without the user.
- Plan usage is always visible above Archived.
- New faces are previewed in Stitch and the styleguide before any app change.
- Feature states read at a glance with animated and distinct glyphs.
- Explorer files open as previews and changes as side-by-side diffs, behind their flags.
- Backlog and Board open as tabs from the sidebar, behind the `backlog-board` flag.
- The first sidebar section is Chats and lists Ferreiro chats as well as features.

## Checks

**Run quick**: `npx vitest run test/renderer/feature-flags.test.ts test/renderer/flagged-panels.test.tsx test/renderer/agent-names.test.ts test/renderer/agent-names-settings.test.tsx test/renderer/ferreiro-chat.test.tsx test/renderer/summary-author.test.tsx test/renderer/usage-panel.test.tsx test/web/agent-face.test.tsx test/web/feature-status.test.tsx test/renderer/line-diff.test.ts test/renderer/file-view.test.tsx test/renderer/backlog-page.test.tsx test/renderer/board-page.test.tsx test/renderer/chats-section.test.tsx --reporter=verbose`

- C1 (REQ-106): unfinished features are off in production and their panels do not render. Proof: run quick | ✓ renders no Explorer, Changes or sync counts while their flags are off
- C2 (REQ-110): agents show localized forge names that the user can rename. Proof: run quick | ✓ renames an agent in Settings and shows the name with its role in the tooltip
- C3 (REQ-107): the first prompt of a New chat opens the chat with the Ferreiro directly. Proof: run quick | ✓ opens the chat with the Ferreiro as soon as the first prompt is sent
- C4 (REQ-108): summaries are attributed to the Ferreiro. Proof: run quick | ✓ shows the Ferreiro as the author of a summary
- C5 (REQ-082): plan usage sits above Archived for tools with data. Proof: run quick | ✓ shows plan usage above Archived for tools with data
- C6 (REQ-114): minimal faces exist for preview with a distinct Ferreiro mark. Proof: run quick | ✓ draws a face per agent with a distinct Ferreiro mark and moving eyes while speaking
- C7 (REQ-115): each feature state has a distinct glyph and working animates. Proof: run quick | ✓ maps each feature state to a distinct glyph and an animated spinner while working
- C8 (REQ-116): Explorer files open as previews and changes as diffs. Proof: run quick | ✓ opens a file preview from Explorer and a diff from Changes as tabs
- C9 (REQ-117): demands are added and start only after confirmation. Proof: run quick | ✓ adds a demand and starts it only after confirmation
- C10 (REQ-118): the board shows the RPI columns and opens cards without dragging. Proof: run quick | ✓ places features and demands in RPI columns and opens a card
- C11 (REQ-119): the first section is Chats and keeps Ferreiro chats after their tab closes. Proof: run quick | ✓ lists features and Ferreiro chats under Chats

## Tasks

### Task 1: Add the feature flag registry

**Requirement:** REQ-106
**Files:**

- Create: `src/renderer/src/shared/lib/feature-flags.ts`
- Test: `test/renderer/feature-flags.test.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { afterEach, expect, it } from 'vitest'
import { flagDefaults, isEnabled, overrideFlags } from '../../src/renderer/src/shared/lib/feature-flags'
afterEach(() => overrideFlags({}))
it('turns unfinished features off in production and on in development', () => {
  expect(flagDefaults({ PROD: true, DEV: false })).toEqual({ explorer: false, 'source-control': false, 'backlog-board': false })
  expect(flagDefaults({ PROD: false, DEV: true })).toEqual({ explorer: true, 'source-control': true, 'backlog-board': true })
  overrideFlags({ explorer: false })
  expect(isEnabled('explorer')).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/feature-flags.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

One typed registry is the only place that knows unfinished features. Defaults come from Vite's `import.meta.env` (`PROD` turns everything off; development, the web mock and Playwright keep it on). `overrideFlags` exists for tests only and never reads storage, so production cannot be switched on by a viewer.

```typescript
export type FeatureFlag = 'explorer' | 'source-control' | 'backlog-board'
type Env = { PROD?: boolean; DEV?: boolean }
export function flagDefaults(env: Env): Record<FeatureFlag, boolean> {
  const on = !env.PROD
  return { explorer: on, 'source-control': on, 'backlog-board': on }
}
let overrides: Partial<Record<FeatureFlag, boolean>> = {}
/** Test-only: force flags on or off. */
export function overrideFlags(next: Partial<Record<FeatureFlag, boolean>>) {
  overrides = next
}
export function isEnabled(flag: FeatureFlag): boolean {
  return overrides[flag] ?? flagDefaults(import.meta.env)[flag]
}
```

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/feature-flags.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The production build bundle contains no Explorer or Changes component when flags are off (inspect `out/renderer` for their section titles).
- Flag names are a closed union; an unknown flag fails typecheck.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Gate Explorer, Changes and the sync counts behind flags

**Requirement:** REQ-106, REQ-105
**Depends on:** Task 1
**Files:**

- Modify: `src/renderer/src/widgets/git-context.tsx`
- Modify: `src/renderer/src/widgets/git-status.tsx`
- Test: `test/renderer/flagged-panels.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
import { overrideFlags } from '../../src/renderer/src/shared/lib/feature-flags'
afterEach(() => overrideFlags({}))
it('renders no Explorer, Changes or sync counts while their flags are off', async () => {
  overrideFlags({ explorer: false, 'source-control': false })
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const panel = await screen.findByRole('complementary', { name: 'Project' })
  expect(within(panel).queryByRole('region', { name: /^Explorer/ })).toBeNull()
  expect(within(panel).queryByRole('region', { name: /^Changes/ })).toBeNull()
  expect(within(panel).getByRole('region', { name: /^Branches/ })).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).not.toHaveTextContent('↑')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/flagged-panels.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Build the right panel pane list from the flags (Project and Branches always; Explorer with `explorer`; Changes with `source-control`), passing the matching ids to `PaneStack` so stored layouts stay valid. In the statusbar keep the branch item and render the behind/ahead item only with `source-control`. Disabled sections are not rendered at all.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/flagged-panels.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- With both flags on, the current tests for Explorer and Changes still pass.
- The separator count of the right panel matches the visible sections in both states.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Name the six agents with localized defaults

**Requirement:** REQ-110
**Files:**

- Create: `src/renderer/src/entities/feature/model/agent-names.ts`
- Modify: `src/shared/i18n/en.ts`
- Modify: `src/shared/i18n/pt-br.ts`
- Test: `test/renderer/agent-names.test.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { agentName, agentIds } from '../../src/renderer/src/entities/feature/model/agent-names'
it('names the forge agents per language and keeps user names', () => {
  expect(agentIds).toEqual(['smith', 'research', 'planner', 'implementer', 'tester', 'reviewer'])
  expect(agentIds.map((id) => agentName(id, 'pt-br', {}))).toEqual(['Ferreiro', 'Minerador', 'Moldador', 'Bigorneiro', 'Temperador', 'Polidor'])
  expect(agentIds.map((id) => agentName(id, 'en', {}))).toEqual(['Smith', 'Miner', 'Moldmaker', 'Anvilsmith', 'Temperer', 'Polisher'])
  expect(agentName('research', 'en', { research: 'Scout' })).toBe('Scout')
  expect(agentName('research', 'en', { research: '   ' })).toBe('Miner')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/agent-names.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `agentNames` to both dictionaries (role labels in `product` stay as the fixed role names). `agentName(id, locale, custom)` returns the trimmed custom name or the localized default. Add `agentNames: Partial<Record<AgentId, string>>` to the store with a setter persisted through the settings source.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/agent-names.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Changing language translates default names and keeps custom ones.
- The role label (Research, Planner…) is unchanged everywhere it identifies the role.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Show display names and edit them in Settings

**Requirement:** REQ-110
**Depends on:** Task 3
**Files:**

- Modify: `src/renderer/src/pages/settings/settings-page.tsx`
- Modify: `src/renderer/src/features/conversation/history.tsx`
- Test: `test/renderer/agent-names-settings.test.tsx`

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
it('renames an agent in Settings and shows the name with its role in the tooltip', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  expect(screen.getByRole('list', { name: 'Conversation' })).toHaveTextContent('Temperer')
  fireEvent.keyDown(window, { key: ',', ctrlKey: true })
  fireEvent.click(await screen.findByRole('tab', { name: 'Agents' }))
  const name = screen.getByRole('textbox', { name: 'Name' })
  fireEvent.change(name, { target: { value: 'Scout' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(within(screen.getByRole('combobox', { name: 'Agent' })).getByText('Scout')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/agent-names-settings.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add a Name field to each agent profile in Settings › Agents (the agent selector lists the six agents by display name, Ferreiro first). Replace role labels with display names in reply authors, the Flow cycle, feature rows' accessible names and recipient pickers; keep the role in the tooltip and accessible name ("Miner, Research"). If the history component path differs, adapt it to the module that renders reply authors and record the adaptation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/agent-names-settings.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- An empty name saves as the default.
- The accessible author still includes the role and tool.
- Tests that matched role labels in authors are updated to names, not deleted.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Talk to the Ferreiro in New chat with mock replies

**Requirement:** REQ-107
**Depends on:** Task 3
**Files:**

- Modify: `src/renderer/src/widgets/feature-composer.tsx`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Modify: `src/renderer/src/shared/api/mock-replies.ts`
- Test: `test/renderer/ferreiro-chat.test.tsx`

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
it('chats with the Ferreiro and starts a feature only after confirmation', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(within(document.querySelector('[data-slot="tab-strip"]') as HTMLElement).getByRole('button', { name: 'New chat' }))
  expect(screen.getByRole('combobox', { name: 'Recipient' })).toHaveTextContent('Smith')
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(field, { target: { value: 'Add rate limiting to the API' } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
  expect(screen.queryByRole('tab', { name: /Add rate limiting/ })).toBeNull()
  fireEvent.click(await screen.findByRole('button', { name: 'Start feature' }))
  expect(screen.getByRole('tab', { name: /Add rate limiting/ })).toHaveAttribute('aria-selected', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/ferreiro-chat.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

New chat tabs default to the recipient `smith`. Sending to the Ferreiro opens the chat directly as a conversation tab with stage `smith` (no intermediate screen or "Start feature" button; user decision 2026-11-01) and streams a scripted mock reply in it. `smith` joins `AgentId` in `shared/api` (stage, author, recipients, `streamReply`), gets a hammer mascot and the role label "General agent", and stays outside the Flow cycle. Picking an RPI agent in the recipient selector keeps the current direct feature creation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/ferreiro-chat.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Ferreiro messages never create a feature or a sidebar row by themselves.
- Each New chat tab keeps its own Ferreiro conversation.
- The Ferreiro is absent from the RPI Flow cycle.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 6: Attribute conversation summaries to the Ferreiro

**Requirement:** REQ-108
**Depends on:** Task 4
**Files:**

- Modify: `src/renderer/src/features/conversation/conversation-summary.tsx`
- Test: `test/renderer/summary-author.test.tsx`

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
it('shows the Ferreiro as the author of a summary', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  await screen.findByRole('tab', { name: /Login with OAuth/ })
  fireEvent.click(screen.getByRole('button', { name: 'Summary' }))
  expect(await screen.findByRole('region', { name: /Summary/ })).toHaveTextContent(/by Smith/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/summary-author.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Show "by <Ferreiro display name>" with the Ferreiro face or mark beside the summary date. The mock text stays in `WorkbenchSource.summarizeConversation`; the real turn is ferreiro-agent's job.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/summary-author.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A renamed Ferreiro shows the custom name.
- The summary keeps its date and close action.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 7: Move plan usage to an always-open sidebar panel

**Requirement:** REQ-082
**Files:**

- Create: `src/renderer/src/features/usage/usage-panel.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Modify: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Modify: `src/renderer/src/widgets/sidebar-rail.tsx`
- Test: `test/renderer/usage-panel.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('shows plan usage above Archived for tools with data', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const usage = await within(sidebar).findByRole('region', { name: 'Plan usage' })
  const archived = within(sidebar).getByRole('button', { name: 'Archived' })
  expect(usage.compareDocumentPosition(archived) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(within(usage).getAllByRole('meter').length).toBeGreaterThan(0)
  expect(document.querySelector('header')).not.toHaveTextContent('Usage')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/usage-panel.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Render a compact panel above the workspace menu: header "Plan usage" with the time since the last update, then per tool with data its name in the tool color and one row per window ("5h", "week") with a `meter` bar (success under 70%, warning from 70%, destructive from 90%), the percentage and the time until reset. Tools without windows are omitted; with none, one muted line says usage is unavailable. Remove the topbar `UsagePopover`; in the collapsed rail add a gauge icon whose tooltip lists the highest window per tool.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/usage-panel.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Bars expose `aria-valuenow` and a label like "claude 5h, 62%".
- Threshold colors switch exactly at 70% and 90%.
- The panel never scrolls the menu out of view on short windows (it shares the sidebar footer).

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 8: Trial minimal agent faces in Stitch and the styleguide

**Requirement:** REQ-114
**Files:**

- Create: `src/shared/ui/agent-face.tsx`
- Modify: `site/src/pages/styleguide.tsx`
- Test: `test/web/agent-face.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { AgentFace } from '../../src/shared/ui/agent-face'
it('draws a face per agent with a distinct Ferreiro mark and moving eyes while speaking', () => {
  const { container, rerender } = render(<AgentFace agent="research" tool="claude" />)
  expect(container.querySelectorAll('[data-slot="face-eye"]')).toHaveLength(2)
  rerender(<AgentFace agent="research" tool="claude" speaking />)
  expect(container.querySelector('[data-speaking="true"]')).not.toBeNull()
  rerender(<AgentFace agent="smith" tool="claude" />)
  expect(container.querySelector('[data-slot="smith-mark"]')).not.toBeNull()
  expect(screen.getAllByRole('img', { hidden: true }).length).toBeGreaterThan(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/agent-face.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

**This task is a visual trial with a decision gate.**
1. Before code, draft the six faces in Google Stitch (Stitch MCP): a rounded square in each agent color with two eyes, the Ferreiro anvil-and-hammer mark, the tool corner badge, at 28 and 56 px on the Terminal Noir background, next to the current pixel mascots. Share the screen with the user.
2. After the user picks a direction, build `AgentFace` (eyes move with a reduced-motion-safe animation while `speaking`) and show it in the styleguide gallery beside `AgentMascot`.
3. **Do not replace `AgentMascot` in the app** in this task. Swapping it (or removing mascots altogether) is a follow-up task created only after the user approves the styleguide preview; record the decision in the parent spec Grilling Log.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/agent-face.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Reduced motion keeps the eyes still.
- Faces stay decorative (`aria-hidden`); the accessible author text is unchanged.
- The styleguide shows both sets side by side for comparison.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 9: Show clear animated status glyphs for features

**Requirement:** REQ-115
**Files:**

- Create: `src/shared/ui/feature-status.tsx`
- Modify: `src/renderer/src/features/project-navigator/features-section.tsx`
- Modify: `src/widgets/workbench/ui/feature-tabs.tsx`
- Test: `test/web/feature-status.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FeatureStatus, statusGlyph } from '../../src/shared/ui/feature-status'
it('maps each feature state to a distinct glyph and an animated spinner while working', () => {
  expect(['waiting', 'done', 'idle', 'interrupted', 'failed', 'ended'].map((state) => statusGlyph(state as never))).toEqual(['‖', '✔', '●', '↻', '✗', '×'])
  const { container } = render(<FeatureStatus state="working" label="Running" />)
  expect(container.querySelector('[data-spinning="true"]')).not.toBeNull()
  expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/feature-status.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

One shared component renders the glyph in the state color: working is a braille spinner (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`, about 80 ms per frame, primary color) that becomes a static `⠿` under reduced motion; waiting `‖` in warning, done `✔` in success, idle `●` muted, interrupted `↻` and failed `✗` in destructive, ended `×` muted. Map feature states: running to working, waiting and stalled to waiting, completed and integrated to done, idle and draft to idle, interrupted, failed, abandoned to ended. Replace the dots in Features rows and feature tabs, keep the glyph column 12 px wide so names stay aligned, and expose the state name as the accessible name and tooltip.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/feature-status.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Reduced motion renders no animation.
- Row and tab widths do not change between states.
- Existing accessible names keep their state wording.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 10: Compute a side-by-side line diff without dependencies

**Requirement:** REQ-116
**Files:**

- Create: `src/renderer/src/shared/lib/line-diff.ts`
- Test: `test/renderer/line-diff.test.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { sideBySide } from '../../src/renderer/src/shared/lib/line-diff'
it('pairs unchanged, removed and added lines for a side-by-side view', () => {
  expect(sideBySide('a\nb\nc', 'a\nB\nc\nd')).toEqual([
    { left: { n: 1, text: 'a' }, right: { n: 1, text: 'a' }, kind: 'same' },
    { left: { n: 2, text: 'b' }, right: { n: 2, text: 'B' }, kind: 'changed' },
    { left: { n: 3, text: 'c' }, right: { n: 3, text: 'c' }, kind: 'same' },
    { left: null, right: { n: 4, text: 'd' }, kind: 'added' },
  ])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/line-diff.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement a longest-common-subsequence line diff (bounded to a few thousand lines; beyond that, return a "too large" marker) and pair removals with additions in the same hunk as `changed` rows, leftovers as `removed` or `added`.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/line-diff.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- An empty base yields only added rows (untracked file).
- An empty working text yields only removed rows (deleted file).
- Inputs over the bound return the too-large marker instead of hanging.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 11: Open Explorer files as previews and changes as diffs

**Requirement:** REQ-116, REQ-106
**Depends on:** Task 10
**Files:**

- Create: `src/renderer/src/pages/file-view/file-view-page.tsx`
- Modify: `src/renderer/src/features/source-control/explorer-section.tsx`
- Modify: `src/renderer/src/features/source-control/changes-section.tsx`
- Test: `test/renderer/file-view.test.tsx`

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
it('opens a file preview from Explorer and a diff from Changes as tabs', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const panel = await screen.findByRole('complementary', { name: 'Project' })
  fireEvent.click(within(within(panel).getByRole('tree', { name: 'Explorer' })).getByRole('treeitem', { name: /^README\.md/ }))
  expect(screen.getByRole('tab', { name: /README\.md/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('region', { name: /README\.md preview/ })).toBeInTheDocument()
  fireEvent.click(within(within(panel).getByRole('list', { name: 'Changes' })).getByRole('listitem', { name: /^en\.ts/ }))
  expect(screen.getByRole('region', { name: /en\.ts diff/ })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/file-view.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `readFile(path)` and `readDiff(path)` to `WorkbenchSource` (mock returns sample text and a base/working pair per change). Explorer files and Changes rows become activatable (button semantics, Enter and click) and open a `file` view kind as a tab (REQ-103), one tab per path and mode. The preview shows line numbers and a light token coloring for common extensions; the diff page renders `sideBySide` with removed lines tinted destructive and added lines tinted success, aligned rows and synchronized scroll. Binary or oversized content shows a notice. Everything stays behind the Explorer and source control flags.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/file-view.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Opening the same file twice focuses the existing tab.
- Ctrl+W closes a preview tab.
- With the flags off no file view can be opened.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 12: Add the Backlog page as a tab

**Requirement:** REQ-117, REQ-106
**Depends on:** Task 1
**Files:**

- Create: `src/renderer/src/pages/backlog/backlog-page.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Test: `test/renderer/backlog-page.test.tsx`

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
it('adds a demand and starts it only after confirmation', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Backlog' }))
  expect(screen.getByRole('tab', { name: /Backlog/ })).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Add demand' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Export reports' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save demand' }))
  const row = screen.getByRole('listitem', { name: /Export reports/ })
  fireEvent.click(within(row).getByRole('button', { name: 'Start research' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  expect(screen.getByRole('tab', { name: /Export reports/ })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/backlog-page.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Keep demands (`id`, `title`, `description`, `createdAt`) in the mock source and the store. Add Backlog and Board entries to the sidebar menu below the plan usage panel and above Archived (and icons to the collapsed rail), shown only with the `backlog-board` flag. The Backlog page lists demands newest first with add, edit and remove, and "Start research" opens a confirmation; confirming creates a feature from the demand with Research and removes it from the backlog.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/backlog-page.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Cancelling the confirmation keeps the demand.
- An empty title cannot be saved.
- With the flag off neither the entries nor the page exist.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 13: Add the RPI Board page as a tab

**Requirement:** REQ-118, REQ-115, REQ-106
**Depends on:** Task 12
**Files:**

- Create: `src/renderer/src/pages/board/board-page.tsx`
- Test: `test/renderer/board-page.test.tsx`

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
it('places features and demands in RPI columns and opens a card', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Board' }))
  const columns = screen.getAllByRole('region', { name: /^(Backlog|Research|Plan|Implement|Testing|Review|Done)/ })
  expect(columns.map((column) => column.getAttribute('aria-label')?.split(' ')[0])).toEqual(['Backlog', 'Research', 'Plan', 'Implement', 'Testing', 'Review', 'Done'])
  const card = screen.getByRole('button', { name: /Login with OAuth/ })
  expect(card).not.toHaveAttribute('draggable', 'true')
  fireEvent.click(card)
  expect(screen.getByRole('tab', { name: /Login with OAuth/ })).toHaveAttribute('aria-selected', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/board-page.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Derive columns from the store: Backlog from demands, Research to Review from each non-archived feature's stage, Done from integrated features (abandoned ones stay out). Columns scroll horizontally on narrow widths and each shows its count. Cards show the name, the current agent tool icon and the status glyph (Task 9); activating a card opens the feature tab or the Backlog page. Cards are not draggable; stage changes only follow approvals and hand-offs.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/board-page.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Keyboard: columns are regions and cards are buttons reachable in order.
- A feature changing stage moves to the next column on re-render.
- With the flag off the page cannot open.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 14: Rename Features to Chats and list Ferreiro chats

**Requirement:** REQ-119, REQ-083
**Depends on:** Task 5
**Files:**

- Modify: `src/renderer/src/features/project-navigator/features-section.tsx`
- Modify: `src/shared/i18n/en.ts`
- Modify: `src/shared/i18n/pt-br.ts`
- Test: `test/renderer/chats-section.test.tsx`

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
it('lists features and Ferreiro chats under Chats', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  const sidebar = await screen.findByRole('complementary', { name: 'dev' })
  const chats = within(sidebar).getByRole('region', { name: /^Chats/ })
  expect(within(sidebar).queryByRole('region', { name: /^Features/ })).toBeNull()
  fireEvent.click(within(document.querySelector('[data-slot="tab-strip"]') as HTMLElement).getByRole('button', { name: 'New chat' }))
  const field = screen.getByRole('textbox', { name: /Send your prompt/ })
  fireEvent.change(field, { target: { value: 'How should we split the backlog?' } })
  fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })
  const row = await within(chats).findByRole('button', { name: /^How should we split the backlog/ })
  fireEvent.click(screen.getByRole('button', { name: /^Close How should we split|^Close New chat/ }))
  expect(row).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/chats-section.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Title the section with a new `chats` dictionary entry ("Chats" in both languages) and keep the section id stored as `features` so remembered layouts survive. Promote a Ferreiro New chat to a listed chat on its first sent message: named from the prompt like features, marked with the Ferreiro avatar, reopening its conversation when activated, and kept when its tab closes. Feature rows keep their ordering, status glyphs and actions; update tests that query the Features heading to Chats instead of deleting them.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/chats-section.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A New chat with no message sent never appears in the list.
- The section count includes Ferreiro chats.
- Archiving a Ferreiro chat hides it like a feature.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
