# Plan: Project Home Screen and Workbench Shell

> **Spec:** docs/specs/project-home-screen/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Replace the static welcome scaffold with the workbench shell and the project home of a just-added project, backed by a swappable mock data source.
**Architecture:** Frontend-only mock screen in the desktop renderer. Screens read data only through `WorkbenchSource` and the `createWorkbenchStore` Zustand store; widgets and primitives come from `src/widgets` and `src/shared/ui`. No CLI, Git, MCP, PTY, filesystem or network access.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui (radix-nova), Zustand, Vitest + RTL, Playwright for the dev:web smoke.
**Order:** 01a of the mock screens (after 01, before 02) (frontend mock screens, implementation batch 1)
**Total Tasks:** 6
**Estimated Complexity:** medium
**Status:** Implemented, validated and independently reviewed by agy on 2026-10-31. See STATE.md for task commits and adaptations.

## Dependencies

- [web-foundation-landing-styleguide](2026-10-30-web-foundation-landing-styleguide.md)

## Execution Contract

- Read the spec, the shared decisions in its Context section and `docs/design/forja-2.0/component-fidelity.md` before Task 1.
- Paths under `src/renderer/src/` follow the renderer FSD layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`). Several match paths later slices list; those slices modify these files to wire core.
- Mock timers are injected; tests use `vi.useFakeTimers()` and never wait on real time.
- Visual acceptance: compare each block with the referenced Stitch screen using the stitch-fidelity skill against `npm run dev:web` (ask before starting a dev server). Recorded exceptions win over the Stitch image.
- Seed snippets are contract tests. Expand them to the listed checks; do not hardcode test-only results.

## Startup correction (user decision, 2026-10-31)

The app starts without a project or sidebars. Open project opens mock selection; the shell is loaded only after selection. This supersedes the initial acme-api startup assumption in the original steps below.

## Acceptance

- The app opens on the `acme-api` home with the approved shell in the system language.
- Home actions and their shortcuts work; Ctrl+R never reloads the window.
- Topbar terminal toggle, back/forward and both side panel chevrons work.
- All screen data comes from `WorkbenchSource`.

## Tasks

### Task 1: Wire Tailwind, the shared theme and the `@` alias into the renderer

**Requirement:** REQ-062
**Depends on:** none within this plan
**Files:**
- Modify: `vite.web.config.ts`
- Modify: `src/renderer/src/main.tsx`
- Modify: `vitest.config.ts`
- Create: `test/renderer/foundation.test.ts`
- Test: `test/renderer/foundation.test.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: consequences-reviewer, type-safety-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import config from '../../vite.web.config'
it('builds the browser renderer with Tailwind and the shared @ alias', () => {
  const plugins = (config.plugins ?? []).flat(3) as { name?: string }[]
  expect(plugins.some((plugin) => plugin?.name?.startsWith('@tailwindcss/vite'))).toBe(true)
  const alias = config.resolve?.alias as Record<string, string>
  expect(alias['@']).toMatch(/\/src$/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/foundation.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add `tailwindcss()` and the `@` alias to `vite.web.config.ts` (same shape as the renderer block of `electron.vite.config.ts`). Import `@/shared/styles/theme.css` in `src/renderer/src/main.tsx` before `./app/styles.css`, and keep the JetBrains Mono imports. Add `src/renderer/src/**/*.{ts,tsx}` to the coverage include in `vitest.config.ts`, excluding `src/renderer/src/main.tsx`.

```typescript
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
})
```

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/foundation.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- `npm run dev:web` serves the renderer with theme tokens applied (body background `#0E0E0E`).
- `npm run build` still builds the Electron renderer.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Define `WorkbenchSource` and the deterministic mock source

**Requirement:** REQ-061
**Depends on:** Task 1
**Files:**
- Create: `src/renderer/src/shared/api/workbench-source.ts`
- Create: `src/renderer/src/shared/api/mock-source.ts`
- Create: `src/renderer/src/shared/api/mock-data.ts`
- Create: `src/renderer/src/shared/api/index.ts`
- Create: `test/renderer/mock-source.test.ts`
- Test: `test/renderer/mock-source.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
it('serves a fresh project and a project with two open features', async () => {
  const source = createMockSource({ locale: 'pt-br' })
  const projects = await source.listProjects()
  expect(projects.map((project) => project.name)).toEqual(['acme-api', 'dev'])
  const fresh = await source.loadProject('acme-api')
  expect(fresh.features).toHaveLength(0)
  expect(fresh.agents.map((agent) => agent.id)).toEqual(['research', 'planner', 'implementer', 'tester', 'reviewer'])
  const dev = await source.loadProject('dev')
  expect(dev.features.map((feature) => feature.name)).toEqual(['Login com OAuth', 'Busca no catálogo'])
  await expect(source.loadProject('missing')).rejects.toThrow('Unknown project')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/mock-source.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`workbench-source.ts` declares the contract every later slice implements with core IPC: `RoleId`, `ProjectSummary` (id, name, path, lastOpenedAt ISO), `ProjectSnapshot` (project, agents with state, artifacts with kind/state/author, skills, branches, git changes, features), `FeatureSnapshot` (id, slug, name, state, mode, destination, branch, worktree, target, stage, messages, terminals), `ChatMessage`, `MockTerminal`, `SettingsSnapshot` and the `WorkbenchSource` interface (`listProjects`, `loadProject`, `readArtifact`, `streamReply`, `loadSettings`, `saveSettings`). `mock-data.ts` holds the localized fixtures (copy, never commands or paths, follows the locale). `mock-source.ts` returns deep copies so callers cannot mutate fixtures; `streamReply` is added by conversation-screen and the settings methods by settings-screen, so declare them now and make the mock throw `Not implemented in this slice` until then.

```typescript
export type RoleId = 'research' | 'planner' | 'implementer' | 'tester' | 'reviewer'
export const roleIds: readonly RoleId[] = ['research', 'planner', 'implementer', 'tester', 'reviewer']

export interface ProjectSummary { id: string; name: string; path: string; lastOpenedAt: string }
export interface WorkbenchSource {
  listProjects(): Promise<ProjectSummary[]>
  loadProject(id: string): Promise<ProjectSnapshot>
}
```

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/mock-source.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- Fixtures are identical in shape for `en` and `pt-br`; only display copy differs.
- Mutating a returned snapshot does not change the next `loadProject` result.
- No module under `src/renderer/src/pages` imports `mock-source` or `mock-data` (add a boundary test that greps imports).

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Create the workbench store with views, history and panels

**Requirement:** REQ-061, REQ-062, REQ-072
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/entities/feature/model/store.ts`
- Create: `src/renderer/src/entities/feature/model/provider.tsx`
- Create: `src/renderer/src/entities/feature/index.ts`
- Create: `test/renderer/store.test.ts`
- Test: `test/renderer/store.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { createWorkbenchStore } from '../../src/renderer/src/entities/feature'
it('opens a fresh project on home and keeps a back/forward view history', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('acme-api')
  expect(store.getState().view).toEqual({ kind: 'home' })
  store.getState().navigate({ kind: 'compose', role: 'research' })
  store.getState().back()
  expect(store.getState().view).toEqual({ kind: 'home' })
  store.getState().forward()
  expect(store.getState().view).toEqual({ kind: 'compose', role: 'research' })
  store.getState().togglePanel('terminal')
  expect(store.getState().panels.terminal).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/store.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Use Zustand's vanilla `createStore` so tests run without React; `provider.tsx` exposes `WorkbenchProvider` and `useWorkbench(selector)` through context. State: `projects`, `snapshot`, `view` (`home`, `compose`, `conversation`, `settings`, `document`), `history` and `historyIndex`, `panels` (`left`, `right`, `terminal`), `palette` (`open`, `scope`). Opening a project sets `view` to `conversation` when it has features, otherwise `home`, and resets history. `navigate` truncates forward history. Later slices add feature, recipient, settings and document actions to this same store.

```typescript
import { createStore } from 'zustand/vanilla'
import type { RoleId, WorkbenchSource } from '@/renderer/src/shared/api'
```

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/store.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- `back` at the start and `forward` at the end are no-ops.
- `navigate` to the current view does not add a history entry.
- Opening the `dev` project selects `Login com OAuth` and the `conversation` view.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Build the shell: topbar, project sidebar, project/Git panel and statusbar

**Requirement:** REQ-062, REQ-072
**Depends on:** Task 3
**Files:**
- Modify: `src/widgets/workbench/ui/app-chrome.tsx`
- Create: `src/renderer/src/widgets/project-sidebar.tsx`
- Create: `src/renderer/src/widgets/git-context.tsx`
- Create: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Create: `src/renderer/src/pages/workbench/index.ts`
- Create: `test/renderer/shell.test.tsx`
- Test: `test/renderer/shell.test.tsx`

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
it('renders the acme-api shell and collapses both side panels', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="acme-api" />)
  expect(await screen.findByRole('complementary', { name: 'acme-api' })).toHaveTextContent('Agents5')
  expect(screen.getByRole('complementary', { name: 'Project' })).toHaveTextContent('main')
  expect(screen.getByRole('contentinfo')).toHaveTextContent('~/projects/acme-api')
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  expect(screen.queryByRole('complementary', { name: 'acme-api' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Toggle terminals' }))
  expect(screen.getByRole('button', { name: 'Toggle terminals' })).toHaveAttribute('aria-pressed', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/shell.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Extend `AppTopbar` with optional `onBack`/`onForward` (with `canBack`/`canForward`), a clickable command trigger (`onCommand`, rendered as a button showing the project name and Ctrl+Shift+P), a terminal toggle with `aria-pressed`, and the settings gear; every icon button gets a dark tooltip. `project-sidebar.tsx` composes the project header (folder icon, name, `...`, collapse chevron), Agents with states and the "+ Edit agents" link, Specs, Plans and Skills with counts and add actions, using `SidebarRow` and `StatusBadge`. `git-context.tsx` shows Project (repository, state), Git (changes or "No changes") and a collapsible Branches list. `WorkbenchPage` lays out topbar (40 px), left 240 px, center, right 230 px and statusbar (32 px), all from the store. Copy goes in the shared `en`/`pt-br` dictionaries under a new `app` key.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/shell.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- Landmarks: `banner` (topbar), two named `complementary` panels, `main` center, `contentinfo` statusbar.
- Both locales render with identical structure; the parity test in `test/web/locales.test.ts` stays green.
- Per-block stitch-fidelity review against `ca8041d7befc4d069c830cc7fb77d890`.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Show the project home with actions, shortcuts and locale detection

**Requirement:** REQ-063, REQ-072
**Depends on:** Task 4
**Files:**
- Create: `src/renderer/src/pages/home/home-page.tsx`
- Create: `src/renderer/src/pages/home/index.ts`
- Create: `src/renderer/src/shared/lib/shortcuts.ts`
- Create: `src/renderer/src/shared/lib/locale.ts`
- Modify: `src/renderer/src/app/App.tsx`
- Modify: `test/welcome.test.tsx`
- Test: `test/welcome.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from '../src/renderer/src/app/App'
it('opens the just-added project home and routes its actions and shortcuts', async () => {
  render(<App locale="en" />)
  expect(await screen.findByRole('heading', { name: 'FORJA' })).toBeInTheDocument()
  expect(screen.queryByText('New spec')).toBeNull()
  const reload = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, cancelable: true })
  window.dispatchEvent(reload)
  expect(reload.defaultPrevented).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: /New conversation/ }))
  expect(screen.queryByRole('heading', { name: 'FORJA' })).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/welcome.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`HomePage` shows the Forja mark with version and three action rows with `Kbd` shortcuts: New conversation (Ctrl+N), Recent projects (Ctrl+R) and Show all commands (Ctrl+Shift+P); no "New spec". `shortcuts.ts` exports `useShortcuts(map)` matching `ctrl`/`shift`/`alt` combos, calling `preventDefault` for handled combos and ignoring events from editable fields except Ctrl+Shift+P. Alt+Left/Alt+Right call `back`/`forward`. `locale.ts` maps `navigator.language` to `pt-br` or `en`. `App` accepts an optional `locale`, creates the mock source and store once and renders `WorkbenchPage` with `acme-api`. Replace the obsolete scaffold assertions in `test/welcome.test.tsx` (all-disabled controls) with this behavior. Until command-palette lands, Recent projects and Show all commands only set `palette` state; New conversation navigates to `compose`; the centered composer itself arrives in new-conversation-composer, which extends this test with the focused prompt field.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/welcome.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- Every home action is reachable with Tab and activates with Enter or Space.
- Ctrl+N works in Electron; in `dev:web` the click path is the supported one (Chrome reserves Ctrl+N).
- Alt+Left/Alt+Right move through the view history.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 6: Add the dev:web Playwright smoke for the shell

**Requirement:** REQ-062, REQ-063
**Depends on:** Task 5
**Files:**
- Create: `test/app-e2e/playwright.config.ts`
- Create: `test/app-e2e/home.spec.ts`
- Modify: `package.json`
- Test: `test/app-e2e/home.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
import { expect, test } from '@playwright/test'
test('home shell renders and the side panels collapse', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'FORJA' })).toBeVisible()
  await page.getByRole('button', { name: /Collapse sidebar|Recolher barra lateral/ }).click()
  await expect(page.getByRole('complementary', { name: 'acme-api' })).toHaveCount(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/app-e2e/home.spec.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Create a Playwright config separate from the Electron one planned in guided-rpi-orchestration (`test/e2e/`): `testDir: test/app-e2e`, `webServer` running `npm run dev:web -- --port 5180 --strictPort`, `baseURL: http://127.0.0.1:5180`, Chromium only, `locale: 'en-US'`. Add `"test:e2e:app": "playwright test --config test/app-e2e/playwright.config.ts"` to `package.json`. Exclude `test/app-e2e/**` in `vitest.config.ts`. Later mock-screen plans add their own specs to this folder.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/app-e2e/home.spec.ts`. Expected: PASS. Add and run these checks before completing the task:

- `rtk npm run test:e2e:app` passes locally with Chromium installed.
- The run starts and stops its own dev server; it never reuses port 5176 from a running session.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run typecheck, lint, the full Vitest suite with coverage (the renderer is added to the coverage include in project-home-screen Task 1), `npm run build`, and the Playwright smoke for the navigation paths of this plan. Record the stitch-fidelity block review. Update only this slice's STATE.md during implementation. Stop after this plan; use the ordered queue for the next slice.
