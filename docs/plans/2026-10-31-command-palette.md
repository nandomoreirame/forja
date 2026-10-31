# Plan: Command Bar and Recent Projects

> **Spec:** docs/specs/command-palette/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Open one centered shadcn command bar for commands and recent projects from the topbar, the sidebar project header and keyboard shortcuts.
**Architecture:** Frontend-only mock screen in the desktop renderer. Screens read data only through `WorkbenchSource` and the `createWorkbenchStore` Zustand store; widgets and primitives come from `src/widgets` and `src/shared/ui`. No CLI, Git, MCP, PTY, filesystem or network access.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui (radix-nova), Zustand, Vitest + RTL, Playwright for the dev:web smoke.
**Order:** 01b of the mock screens (frontend mock screens, implementation batch 1)
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Implemented, validated and independently reviewed by agy on 2026-10-31. See STATE.md for task commits and adaptations.

## Dependencies

- [project-home-screen](2026-10-31-project-home-screen.md)

## Execution Contract

- Read the spec, the shared decisions in its Context section and `docs/design/forja-2.0/component-fidelity.md` before Task 1.
- Paths under `src/renderer/src/` follow the renderer FSD layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`). Several match paths later slices list; those slices modify these files to wire core.
- Mock timers are injected; tests use `vi.useFakeTimers()` and never wait on real time.
- Visual acceptance: compare each block with the referenced Stitch screen using the stitch-fidelity skill against `npm run dev:web` (ask before starting a dev server). Recorded exceptions win over the Stitch image.
- Seed snippets are contract tests. Expand them to the listed checks; do not hardcode test-only results.

## Acceptance

- Topbar search, Ctrl+Shift+P and the sidebar project header open the command bar; Ctrl+R opens it scoped to recent projects.
- Selecting a recent project switches the window to that mock project.
- The bar is fully operable by keyboard and returns focus to its opener.

## Tasks

### Task 1: Add the shadcn Dialog and a `CommandDialog` composition

**Requirement:** REQ-064
**Depends on:** none within this plan
**Files:**
- Create: `src/shared/ui/dialog.tsx`
- Modify: `src/shared/ui/command.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `test/setup.ts`
- Create: `test/web/command-dialog.test.tsx`
- Test: `test/web/command-dialog.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CommandDialog, CommandInput, CommandItem, CommandList } from '../../src/shared/ui'
it('renders an accessible titled dialog that closes on Escape', () => {
  const onOpenChange = vi.fn()
  render(
    <CommandDialog open onOpenChange={onOpenChange} title="Command bar" description="Search commands">
      <CommandInput placeholder="Type a command" />
      <CommandList>
        <CommandItem>Settings</CommandItem>
      </CommandList>
    </CommandDialog>,
  )
  expect(screen.getByRole('dialog', { name: 'Command bar' })).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
  expect(onOpenChange).toHaveBeenCalledWith(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/web/command-dialog.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Generate the Dialog with the pinned CLI (`npx shadcn@4.23.0 add dialog`), then customize it to Terminal Noir (`bg-popover`, `border-border`, `rounded-xl`, dark overlay `bg-black/60`, no default light ring). Add `CommandDialog` to `command.tsx` following the shadcn Command docs: a `Dialog` with a visually hidden `DialogTitle`/`DialogDescription`, `DialogContent` positioned at the top third (`top-[18%]`, width 560 px) and a `Command` inside. Export both from `src/shared/ui/index.ts`. cmdk needs `ResizeObserver` and `Element.prototype.scrollIntoView` in jsdom: add guarded polyfills to `test/setup.ts`.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/web/command-dialog.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- The dialog traps focus and closes on overlay click.
- Reduced motion disables the open/close animation.
- The removed-then-restored `dialog.tsx` is used by real code, so the earlier "unused" cleanup stays valid.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Build the command palette with project and command groups

**Requirement:** REQ-064, REQ-065
**Depends on:** Task 1
**Files:**
- Create: `src/renderer/src/features/command-palette/command-palette.tsx`
- Create: `src/renderer/src/features/command-palette/relative-time.ts`
- Create: `src/renderer/src/features/command-palette/index.ts`
- Create: `test/renderer/command-palette.test.tsx`
- Test: `test/renderer/command-palette.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CommandPalette } from '../../src/renderer/src/features/command-palette'
const projects = [
  { id: 'acme-api', name: 'acme-api', path: '~/projects/acme-api', lastOpenedAt: '2026-10-31T12:00:00Z' },
  { id: 'dev', name: 'dev', path: '~/dev', lastOpenedAt: '2026-10-30T12:00:00Z' },
]
it('filters recent projects, marks the current one and runs the selection', () => {
  const onSelectProject = vi.fn()
  render(
    <CommandPalette open scope="recent" locale="en" now={new Date('2026-10-31T14:00:00Z')}
      projects={projects} currentProjectId="acme-api" onOpenChange={() => {}}
      onSelectProject={onSelectProject} onCommand={() => {}} />,
  )
  expect(screen.getByRole('option', { name: /acme-api/ })).toHaveAttribute('aria-current', 'true')
  expect(screen.getByRole('option', { name: /dev/ })).toHaveTextContent('yesterday')
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dev' } })
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
  expect(onSelectProject).toHaveBeenCalledWith('dev')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/command-palette.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`CommandPalette` renders `CommandDialog` with a Recent projects group (folder icon, name, path, relative time from `relative-time.ts` using `Intl.RelativeTimeFormat`, check mark on the current project) and, unless `scope` is `recent`, a Commands group: New conversation (Ctrl+N), Recent projects (Ctrl+R), Settings, Toggle terminals and "Open folder…" disabled with a localized hint (the trusted picker belongs to project-feature-state). Use `CommandShortcut` for keys and `CommandEmpty` for the localized empty state. The row anatomy follows the Stitch "Menu de projetos aberto" rows, rendered inside the bar. Copy lives in the shared dictionaries.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/command-palette.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- Arrow keys move the active option; Enter runs it; disabled items cannot run.
- An unmatched filter shows the empty state.
- Selecting the current project only closes the bar.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Open the palette from the topbar, sidebar header and shortcuts

**Requirement:** REQ-064, REQ-065
**Depends on:** Task 2
**Files:**
- Modify: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Create: `test/renderer/palette-wiring.test.tsx`
- Test: `test/renderer/palette-wiring.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('switches projects from the sidebar header and restores focus', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="acme-api" />)
  const header = await screen.findByRole('button', { name: 'acme-api, switch project' })
  fireEvent.click(header)
  fireEvent.click(screen.getByRole('option', { name: /dev/ }))
  await screen.findByRole('complementary', { name: 'dev' })
  await waitFor(() => expect(screen.getByRole('button', { name: 'dev, switch project' })).toHaveFocus())
  fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true })
  expect(screen.getByRole('dialog', { name: 'Command bar' })).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/palette-wiring.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Mount `CommandPalette` once in `WorkbenchPage`, driven by the store `palette` state (`openPalette(scope)`, `closePalette()`), remembering the opener element to restore focus. Wire: topbar command trigger and Ctrl+Shift+P (also from inside text fields) open scope `all`; Ctrl+R and the home "Recent projects" open scope `recent`; the sidebar project header becomes a button that opens scope `recent` (no dropdown). `selectProject` calls `openProject` and closes the bar; commands dispatch the existing store actions (navigate compose with Research, navigate settings, toggle terminal).

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/palette-wiring.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- No project dropdown exists in the sidebar.
- Escape closes the bar and focus returns to the opener in each entry path.
- The topbar trigger shows the current project name.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Cover the command bar in the dev:web smoke

**Requirement:** REQ-064, REQ-065
**Depends on:** Task 3
**Files:**
- Create: `test/app-e2e/command-palette.spec.ts`
- Test: `test/app-e2e/command-palette.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
import { expect, test } from '@playwright/test'
test('Ctrl+Shift+P opens the bar and a recent project switches the window', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+Shift+P')
  await page.getByRole('combobox').fill('dev')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('complementary', { name: 'dev' })).toBeVisible()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/app-e2e/command-palette.spec.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add the spec to the existing `test/app-e2e` suite. Use role queries only; no test ids for behavior that has an accessible name.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/app-e2e/command-palette.spec.ts`. Expected: PASS. Add and run these checks before completing the task:

- `rtk npm run test:e2e:app` passes.
- Per-block stitch-fidelity review of the bar rows against `92a017cb51cb48e6b78bb31af079d130` (row anatomy only).

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run typecheck, lint, the full Vitest suite with coverage (the renderer is added to the coverage include in project-home-screen Task 1), `npm run build`, and the Playwright smoke for the navigation paths of this plan. Record the stitch-fidelity block review. Update only this slice's STATE.md during implementation. Stop after this plan; use the ordered queue for the next slice.
