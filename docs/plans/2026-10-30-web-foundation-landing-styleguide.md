# Plan: Bilingual Web Foundation, Landing and Component Styleguide

> **Spec:** docs/specs/web-foundation-landing-styleguide/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Deliver site/ with the bilingual landing and visible component gallery, sharing real customized shadcn/Tailwind components with the future desktop UI.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 01 of 13
**Total Tasks:** 8
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- Existing scaffold only.

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Four localized routes build and refresh correctly.
- The landing and gallery reuse real shared customized shadcn/Tailwind components.
- Product mock text, metadata and focus/keyboard behavior match each locale.
- Visual comparisons respect approved anatomy and recorded Stitch exceptions. No deployment or Electron/native calls.

## Tasks

### Task 1: Establish browser-only aliases, Tailwind tokens and shadcn configuration

**Requirement:** REQ-039, REQ-040, REQ-044
**Depends on:** none within this plan
**Files:**
- Create: `site/index.html`
- Create: `site/vite.config.ts`
- Create: `site/src/main.tsx`
- Create: `site/src/app.tsx`
- Create: `src/shared/styles/theme.css`
- Create: `src/shared/ui/index.ts`
- Create: `src/shared/ui/button.tsx`
- Create: `src/shared/ui/utils.ts`
- Create: `components.json`
- Create: `test/web/foundation.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Modify: `electron.vite.config.ts`
- Modify: `vitest.config.ts`
- Modify: `eslint.config.js`
- Test: `test/web/foundation.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Button } from '../../src/shared/ui'
it('keeps a real disabled action inert and exposes its accessible name', () => {
  let calls = 0
  render(<Button disabled onClick={() => calls++}>Save changes</Button>)
  screen.getByRole('button', { name: 'Save changes' }).click()
  expect(calls).toBe(0)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/foundation.test.tsx`

Expected: FAIL because the shared Button is missing or its disabled behavior/style contract is not established. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Before styling, fetch the six approved Stitch HTML/PNG exports referenced by the parent spec into a local design cache using the Stitch download_file tool and map tokens/anatomy. Do not use authenticated download URLs as unauthenticated HTTP files. Configure one root dependency installation, `@tailwindcss/vite` for both browser builds, renderer aliases and Tailwind source scanning that includes site and shared/widget modules. Pin the verified shadcn CLI version as a devDependency; use Radix-backed shadcn primitives to reuse the existing Radix stack. Configure components.json aliases for src/shared/ui and its cn helper. Inspect every generated import/dependency, never install an unrelated cn package.

Implement the Button public contract with generated shadcn behavior and approved variants. The following is the required disabled-event contract, not a replacement for shadcn's accessibility:

```tsx
import type { ButtonHTMLAttributes } from 'react'
export function Button({ type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} {...props} />
}
```

Apply Terminal Noir semantic CSS variables through Tailwind theme mappings, matching the approved tokens. Keep Button styling in the shared variant definition, not per consumer. Add dev:site, build:site, preview:site, test:e2e:site and format:check scripts. Initially test:e2e invokes the site suite; the guided Electron plan extends the test command registry without replacing site coverage. Add a pinned formatter for scoped checks. Include site/shared/widgets in tsc and eslint. Configure Vitest to exclude test/e2e/**, site/dist/** and Playwright configs from unit discovery; use a matching @vitest/coverage-v8 version for scoped 80% coverage. New dependencies are root-only and versions are recorded in the lockfile. Include a deterministic mock home so the new build can start before subsequent page tasks; no API handlers. Do not rewrite the existing desktop welcome screen yet.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/foundation.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Render site without Electron globals; reject any browser dependency on node:, electron, core or preload imports.
- Check computed token values, focus-visible, disabled cursor/contrast and button hover against the styleguide.
- Root desktop build stays green; package-lock changes come only from explicit root installation.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Implement shared locale routing and the complete two-language dictionary

**Requirement:** REQ-038, REQ-041, REQ-042
**Depends on:** Task 1
**Files:**
- Create: `src/shared/i18n/index.ts`
- Create: `src/shared/i18n/en.ts`
- Create: `src/shared/i18n/pt-br.ts`
- Create: `src/shared/i18n/routes.ts`
- Create: `test/web/locales.test.ts`
- Test: `test/web/locales.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { resolvePage, switchLocalePath } from '../../src/shared/i18n'
it('preserves the gallery across an explicit locale switch', () => {
  expect(resolvePage('/')).toEqual({ locale: 'en', page: 'landing' })
  expect(resolvePage('/pt-br/styleguide/')).toEqual({ locale: 'pt-br', page: 'styleguide' })
  expect(switchLocalePath('/styleguide', 'pt-br')).toBe('/pt-br/styleguide')
  expect(switchLocalePath('/pt-br', 'en')).toBe('/')
  expect(resolvePage('/unknown')).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/locales.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Expose Locale, Page, dictionaries and path helpers through the public i18n barrel. Use this complete route mapping and dictionary-key parity enforced by TypeScript:

```typescript
export type Locale = 'en' | 'pt-br'
export type Page = 'landing' | 'styleguide'
const paths: Record<Locale, Record<Page, string>> = {
  en: { landing: '/', styleguide: '/styleguide' },
  'pt-br': { landing: '/pt-br', styleguide: '/pt-br/styleguide' },
}
export function resolvePage(pathname: string): { locale: Locale; page: Page } | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  for (const locale of ['en', 'pt-br'] as const) {
    for (const page of ['landing', 'styleguide'] as const) {
      if (paths[locale][page] === path) return { locale, page }
    }
  }
  return null
}
export function switchLocalePath(pathname: string, locale: Locale): string {
  return paths[locale][resolvePage(pathname)?.page ?? 'landing']
}
```

Populate both dictionaries from the approved English and pt-BR landing prompts, including FAQ, navigation, metadata, accessible names and every visible product-mock string. Keep actual paths/commands/tool identifiers as data, not translatable copy. Unknown paths show a localized minimal not-found view, not an English landing with a false locale. Never use navigator.language to override the explicit route.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/locales.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Assert dictionary key parity recursively and no untranslated agent/status copy in localized previews.
- Switching language on either page preserves the page; trailing slash refresh works.
- Verify html lang is en or pt-BR, including title/description and link accessible names.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Build customized field, selection, status and overlay primitives

**Requirement:** REQ-040, REQ-043, REQ-044
**Depends on:** Task 2
**Files:**
- Create: `src/shared/ui/input.tsx`
- Create: `src/shared/ui/textarea.tsx`
- Create: `src/shared/ui/label.tsx`
- Create: `src/shared/ui/select.tsx`
- Create: `src/shared/ui/checkbox.tsx`
- Create: `src/shared/ui/switch.tsx`
- Create: `src/shared/ui/tabs.tsx`
- Create: `src/shared/ui/tooltip.tsx`
- Create: `src/shared/ui/popover.tsx`
- Create: `src/shared/ui/badge.tsx`
- Create: `src/shared/ui/kbd.tsx`
- Create: `test/web/primitives.test.tsx`
- Test: `test/web/primitives.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Switch } from '../../src/shared/ui/switch'
it('changes only local state through the controlled primitive', () => {
  const values: boolean[] = []
  render(<Switch aria-label="Interrupt when sending" checked={false} onCheckedChange={value => values.push(value)} />)
  fireEvent.click(screen.getByRole('switch', { name: 'Interrupt when sending' }))
  expect(values).toEqual([true])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/primitives.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Generate/customize the listed shadcn components with the pinned CLI. Each keeps standard accessible primitives, controlled props and explicit labels. Keep shared APIs in individual exports; extend the public UI barrel only for existing implementations. Use this typed status mapping rather than per-page arbitrary colors:

```typescript
export type UiState = 'draft' | 'approved' | 'stale' | 'waiting' | 'running' | 'completed' | 'failed' | 'interrupted'
export function statusTone(state: UiState): 'muted' | 'accent' | 'danger' {
  if (state === 'running' || state === 'waiting') return 'accent'
  if (state === 'failed' || state === 'stale') return 'danger'
  return 'muted'
}
```

Input error uses aria-invalid/description IDs; labels remain visible. Combobox is accessible with search and exactly the supplied role options, not hardcoded new agents. Popover/Tooltip open on focus/hover as applicable, escape dismisses, and focus returns to the trigger. Define loading with a text label and reduced-motion-safe indicator. No new native APIs or forms that save settings yet.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/primitives.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Test keyboard selection, Tab order, Escape and focus return using real primitives.
- Check default, hover, selected, loading, disabled, empty and error samples.
- No arbitrary HTML injection, unlabeled icon buttons or color-only state.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Create browser-only workbench, conversation and terminal compositions

**Requirement:** REQ-040, REQ-041, REQ-043, REQ-044
**Depends on:** Task 3
**Files:**
- Create: `src/widgets/workbench/index.ts`
- Create: `src/widgets/workbench/ui/feature-tabs.tsx`
- Create: `src/widgets/workbench/ui/sidebar-row.tsx`
- Create: `src/widgets/workbench/ui/app-chrome.tsx`
- Create: `src/widgets/conversation/index.ts`
- Create: `src/widgets/conversation/ui/composer.tsx`
- Create: `src/widgets/conversation/ui/messages.tsx`
- Create: `src/widgets/terminal/index.ts`
- Create: `src/widgets/terminal/ui/terminal-preview.tsx`
- Create: `src/widgets/documents/index.ts`
- Create: `src/widgets/documents/ui/document-preview.tsx`
- Create: `src/widgets/index.ts`
- Create: `test/web/compositions.test.tsx`
- Test: `test/web/compositions.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FeatureTabs } from '../../src/widgets/workbench'
it('selects a feature by stable id rather than its display label', () => {
  const selected: string[] = []
  render(<FeatureTabs selectedId="a" items={[{ id: 'a', label: 'Login', state: 'running' }, { id: 'b', label: 'Search', state: 'waiting' }]} onSelect={id => selected.push(id)} />)
  fireEvent.click(screen.getByRole('tab', { name: /Search/ }))
  expect(selected).toEqual(['b'])
  expect(screen.getByRole('tab', { name: /Login/ })).toHaveAttribute('aria-selected', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/compositions.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement the named compositions as controlled, browser-only components receiving labels, stable IDs, data and callbacks as props. FeatureTabs uses shadcn Tabs with one selected value and no embedded process state. Composer receives recipient/feature/text props and emits onChange/onSend/onRecipientChange; it does not open files, choose a backend or execute commands. TerminalPreview renders read-only output text and tab state with terminal-window icons, + at right and a downward chevron; UserTerminalPreview is a visual shell mock only.

```typescript
export interface FeatureTabItem { id: string; label: string; state: 'running' | 'waiting' | 'idle' }
export interface FeatureTabsProps {
  selectedId: string
  items: FeatureTabItem[]
  onSelect: (id: string) => void
}
```

Match approved wrapper spacing, topbar/statusbar height, composer anatomy and metadata. Never import one widget's internals from another; compose through public barrels. All example data comes from the caller, including locale and shell name. Preserve full cwd in a readable detail line/tooltip, not only ellipsis.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/compositions.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Agent/composer selection updates mock state without invoking global side effects.
- Render terminal icons on every tab and a focusable + button with accessible name.
- App window controls/history arrows, avatars and arbitrary message timestamps do not appear.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Compose the complete localized landing with truthful product previews

**Requirement:** REQ-038, REQ-040, REQ-041, REQ-042, REQ-043
**Depends on:** Task 4
**Files:**
- Create: `site/src/pages/landing.tsx`
- Create: `site/src/mocks/product.ts`
- Create: `site/src/components/locale-link.tsx`
- Create: `test/web/landing.test.tsx`
- Test: `test/web/landing.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Landing } from '../../site/src/pages/landing'
it('localizes the proposition, CTA and preview labels together', () => {
  render(<Landing locale="pt-br" />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Avance com seus agentes de IA')
  expect(screen.getByText('Um ambiente de desenvolvimento com agentes de IA, opinativo sobre o fluxo RPI, da especificação à revisão, com você no controle de cada etapa.')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /Acompanhar desenvolvimento/ })[0]).toHaveAttribute('href', 'https://github.com/nandomoreirame/forja')
  expect(screen.getByTestId('product-preview')).toHaveTextContent('Implementador')
  expect(screen.getByTestId('product-preview')).not.toHaveTextContent('Implementer')
  expect(screen.queryByRole('link', { name: /download/i })).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/landing.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Use the official product objective from README.md and README.pt-BR.md verbatim in the corresponding locale. The landing presents Forja as an opinionated RPI development environment, not primarily as a CLI GUI. Installed CLIs are the execution mechanism. Render the seven approved landing sections from shared dictionaries: navbar, hero/product preview, problem, guided five-role flow, four planned capabilities, scoped FAQ and final CTA/footer. Use actual shared widgets and deterministic locale-specific mock data for previews; native command text remains literal. Use a single semantic h1, landmarks, meaningful alt text and skip link. Preserve the approved content width, neutral/amber hierarchy and section rhythm. No fake metrics, license claims, paid offerings or 2.0 downloads.

```typescript
export const developmentUrl = 'https://github.com/nandomoreirame/forja'
export const issuesUrl = `${developmentUrl}/issues`
export const previewCommands = { dev: 'npm run dev', shell: 'zsh' } as const
```

Wire the App router to this page through the route resolver, extend its entry point without creating a second React root, and keep the old landing untouched. If the locale-specific Stitch mock has invented code/logs, follow the approved copy and local fidelity exceptions instead.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/landing.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- English landing uses English product mocks, Portuguese landing uses Portuguese mocks.
- CTA links target the verified repository; external links are safe and keyboard accessible.
- Mobile/narrow layout is usable without horizontal page overflow; desktop matches the approved screenshot.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 6: Build the bilingual styleguide using actual primitives and local interactions

**Requirement:** REQ-039, REQ-040, REQ-041, REQ-043, REQ-044
**Depends on:** Task 5
**Files:**
- Create: `site/src/pages/styleguide.tsx`
- Create: `site/src/mocks/gallery.ts`
- Create: `src/widgets/documents/ui/markdown-preview.tsx`
- Create: `src/widgets/documents/ui/mermaid-preview.tsx`
- Create: `test/web/styleguide.test.tsx`
- Test: `test/web/styleguide.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Styleguide } from '../../site/src/pages/styleguide'
it('shows real interactive local components without starting an agent', () => {
  render(<Styleguide locale="en" />)
  fireEvent.click(screen.getByRole('switch', { name: 'Interrupt when sending a new message' }))
  expect(screen.getByRole('switch', { name: 'Interrupt when sending a new message' })).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('heading', { name: /Tokens/ })).toBeInTheDocument()
  expect(screen.getByTestId('gallery-terminal-preview')).toHaveTextContent('npm run dev')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/styleguide.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Build the seven styleguide sections from the closed component inventory. Render real primitive and widget instances in independent local state examples; no iframe copies, screenshots-as-components or test-only hidden controls. Include a real safe GFM sample and lazy strict Mermaid sample, with error/empty states and bounded source size. Keep rendering code in reusable document widgets for later desktop reuse. Locale-switching reloads the same examples with translated labels and deterministic state.

```typescript
export const galleryModes = ['default', 'hover', 'focus', 'disabled', 'loading', 'selected', 'empty', 'error'] as const
export const galleryDiagram = 'flowchart LR\n  Research --> Planner\n  Planner --> Implementer'
```

Localize the diagram node labels with stable internal IDs. Static hover samples may use data-state styling but must not replace real pointer/focus checks. Full terminal mocks include manual zsh, agent test/dev tabs, + and collapsed footer tooltip. Tag every mocked run clearly as preview data. Do not add a production navigation item to the Electron app for this gallery.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/styleguide.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Cover the exact component inventory and accessibility states in both locales.
- Mermaid renders a diagram; invalid source has readable fallback and no script/click execution.
- No network calls except local assets; no Electron or process APIs in the browser module graph.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 7: Produce four refreshable static routes and locale-correct metadata

**Requirement:** REQ-038, REQ-039, REQ-042, REQ-044
**Depends on:** Task 6
**Files:**
- Create: `site/scripts/prerender.ts`
- Create: `site/src/router.tsx`
- Create: `test/web/static-routes.test.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `test/web/static-routes.test.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, security-guardrails, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { outputRoutes } from '../../site/scripts/prerender'
it('declares exactly the four bilingual pages', () => {
  expect(outputRoutes.map(x => x.pathname)).toEqual(['/', '/pt-br', '/styleguide', '/pt-br/styleguide'])
  expect(outputRoutes.find(x => x.pathname === '/pt-br')?.lang).toBe('pt-BR')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/web/static-routes.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add a build:site pipeline that prerenders static entry HTML for each route, using the same page components and dictionaries, with locale-correct title/description/lang and same-page locale links. Guard browser-only diagram initialization for SSR/prerender. The four routes must work via direct request and refresh from site/dist, including trailing slashes; don't rely solely on dev-server fallback.

```typescript
export const outputRoutes = [
  { pathname: '/', locale: 'en', lang: 'en', page: 'landing' },
  { pathname: '/pt-br', locale: 'pt-br', lang: 'pt-BR', page: 'landing' },
  { pathname: '/styleguide', locale: 'en', lang: 'en', page: 'styleguide' },
  { pathname: '/pt-br/styleguide', locale: 'pt-br', lang: 'pt-BR', page: 'styleguide' },
] as const
```

Treat the gallery as separately addressable developer/reference content, no landing navbar promotion, and add noindex metadata to gallery routes. Root lint/tsc cover site/scripts; root build keeps desktop behavior and build:site is explicit. Add build outputs to gitignore. Do not deploy or change Firebase hosting.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/web/static-routes.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Serve built files and request all four routes with browser JS disabled to verify primary copy/lang.
- Missing routes do not silently show the wrong language.
- Prerender twice yields equivalent route content; no external fonts/CDN scripts or absolute local machine paths.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 8: Capture bilingual visual/accessibility baselines and document reuse rules

**Requirement:** REQ-039, REQ-041, REQ-043, REQ-044
**Depends on:** Task 7
**Files:**
- Create: `site/playwright.config.ts`
- Create: `test/e2e/site.spec.ts`
- Create: `docs/design/forja-2.0/component-inventory.md`
- Create: `docs/design/forja-2.0/token-map.md`
- Create: `test/web/inventory.test.ts`
- Test: `test/e2e/site.spec.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, test } from '@playwright/test'
for (const [path, lang, agent] of [['/', 'en', 'Implementer'], ['/pt-br', 'pt-BR', 'Implementador']] as const) {
  test(`landing ${lang} keeps preview language aligned`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)
    await expect(page.getByTestId('product-preview')).toContainText(agent)
    await expect(page).toHaveScreenshot(`landing-${lang}.png`, { fullPage: true })
  })
}
```

**Step 2: Run test to verify it fails**

Run: `rtk npx playwright test --config site/playwright.config.ts`

Expected: FAIL because the expected routes, translated previews or approved visual samples are missing. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Configure a loopback Vite test server, testDir ../test/e2e and testMatch site.spec.ts, with deterministic fonts/data/motion for Playwright, then capture and inspect side-by-side references. Add focused component/state screenshots at native logical scale rather than one enormous board diff. The associated inventory.test.ts asserts gallery groups and required sample IDs from the gallery data contract; do not test merely markdown file existence. Record token-to-shadcn mappings, approved exceptions, component public APIs and which screenshots were human-reviewed.

Use the browser test above as test/e2e/site.spec.ts and add corresponding tests for both gallery routes, keyboard focus/menus, locale switching, no accidental horizontal overflow and reduced motion. Keep generated captures/diffs ignored. Never accept a regenerated baseline simply because it matches new drift.

**Step 4: Run test to verify it passes**

Run: `rtk npx playwright test --config site/playwright.config.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Run site Playwright suite against built routes and the required 1280/1440 desktop viewports.
- Inspect the screenshots; timestamp/model/count inventions are excluded.
- Root tests, tsc, lint, desktop build and build:site all pass, with gallery independent of AI/native tools.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`, `rtk npm run build:site`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
