# Plan: Document Viewer Tabs

> **Spec:** docs/specs/document-viewer-screen/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Open sidebar specs, plans and reviews as closable document tabs and send selected excerpts to the composer.
**Architecture:** Frontend-only mock screen in the desktop renderer. Screens read data only through `WorkbenchSource` and the `createWorkbenchStore` Zustand store; widgets and primitives come from `src/widgets` and `src/shared/ui`. No CLI, Git, MCP, PTY, filesystem or network access.
**Tech Stack:** Electron renderer (React 19, TypeScript), Tailwind 4, shadcn/ui (radix-nova), Zustand, Vitest + RTL, Playwright for the dev:web smoke.
**Order:** 01f of the mock screens (frontend mock screens, implementation batch 2)
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Spec approved 2026-10-31; planned; not implemented.

## Dependencies

- [conversation-screen](2026-10-31-conversation-screen.md)

## Execution Contract

- Read the spec, the shared decisions in its Context section and `docs/design/forja-2.0/component-fidelity.md` before Task 1.
- Paths under `src/renderer/src/` follow the renderer FSD layers (`app`, `pages`, `widgets`, `features`, `entities`, `shared`). Several match paths later slices list; those slices modify these files to wire core.
- Mock timers are injected; tests use `vi.useFakeTimers()` and never wait on real time.
- Visual acceptance: compare each block with the referenced Stitch screen using the stitch-fidelity skill against `npm run dev:web` (ask before starting a dev server). Recorded exceptions win over the Stitch image.
- Seed snippets are contract tests. Expand them to the listed checks; do not hardcode test-only results.

## Acceptance

- Sidebar documents open (or focus) a closable tab with header, state, mock approve for drafts, Markdown and Mermaid.
- "Review with agent" prefills the composer with the artifact, the quoted excerpt and the author agent, without sending.

## Tasks

### Task 1: Serve mock artifact content and track document tabs in the store

**Requirement:** REQ-078
**Depends on:** none within this plan
**Files:**
- Modify: `src/renderer/src/shared/api/mock-source.ts`
- Modify: `src/renderer/src/shared/api/mock-data.ts`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Create: `test/renderer/document-store.test.ts`
- Test: `test/renderer/document-store.test.ts`

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
it('opens each document once and approves only a draft in mock state', async () => {
  const store = createWorkbenchStore(createMockSource({ locale: 'en' }))
  await store.getState().openProject('dev')
  const spec = store.getState().snapshot!.artifacts.find((a) => a.kind === 'spec')!
  await store.getState().openDocument(spec.id)
  await store.getState().openDocument(spec.id)
  expect(store.getState().openDocumentIds).toEqual([spec.id])
  expect(store.getState().view).toEqual({ kind: 'document', documentId: spec.id })
  expect(store.getState().documents[spec.id]).toContain('`'.repeat(3) + 'mermaid')
  expect(() => store.getState().approveDocument(spec.id)).toThrow('Only drafts can be approved')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/document-store.test.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`readArtifact(id)` returns localized mock Markdown per artifact: the `login-oauth` spec (objective, tasks list, parameter table, a fenced `mermaid` flowchart, a code block), the plan and the review (findings table). Never include raw HTML. Store: `openDocumentIds`, `documents` cache, `openDocument(id)` (loads once, focuses an existing tab), `closeDocument(id)` (neighbor selection like feature tabs; after the last tab, the previous view), `approveDocument(id)` (draft to approved in mock state only; throws for any other state).

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/document-store.test.ts`. Expected: PASS. Add and run these checks before completing the task:

- Opening a document of another project is rejected.
- Approval is a stand-in for the human-only core command; no agent path calls it.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Render document tabs with header, Markdown and Mermaid

**Requirement:** REQ-078
**Depends on:** Task 1
**Files:**
- Modify: `src/widgets/documents/ui/markdown-preview.tsx`
- Create: `src/renderer/src/pages/document/document-page.tsx`
- Create: `src/renderer/src/pages/document/index.ts`
- Modify: `src/renderer/src/pages/conversation/conversation-page.tsx`
- Modify: `src/renderer/src/widgets/project-sidebar.tsx`
- Create: `test/renderer/document-page.test.tsx`
- Test: `test/renderer/document-page.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMockSource } from '../../src/renderer/src/shared/api'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: async () => ({ svg: '<svg role="presentation"></svg>' }) } }))
it('opens the spec from the sidebar as a closable tab with rendered content', async () => {
  render(<WorkbenchPage source={createMockSource({ locale: 'en' })} initialProjectId="dev" />)
  fireEvent.click(await screen.findByRole('button', { name: /login-oauth\/SPEC.md/ }))
  expect(await screen.findByRole('tab', { name: /SPEC.md/ })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(await screen.findByRole('img', { name: 'Diagram' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close SPEC.md' }))
  expect(screen.queryByRole('tab', { name: /SPEC.md/ })).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/document-page.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`MarkdownPreview` gains a `code` renderer that sends `language-mermaid` fences to `MermaidPreview` (strict mode stays) and a localized `tooLargeLabel` prop replacing the hardcoded Portuguese message. Document tabs share the tab strip with feature tabs (file icon, name, state badge, close button). `DocumentPage` composes `DocumentPreview` (name, `StatusBadge` state, "Approve spec"/"Approve plan" only for drafts, approval notice) and the rendered body inside a scrollable reading column (max width 760 px). Sidebar spec, plan and review rows become buttons that call `openDocument`.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/document-page.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- A malformed Mermaid block shows the inline fallback, not a crash.
- The English route shows no Portuguese fallback text (the old hardcoded message is gone).
- Per-block stitch-fidelity review of the tab and header anatomy against `019d50093d7141598e511db597552894`.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Prefill the composer from a selected excerpt

**Requirement:** REQ-079
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/features/document-reader/selection-popover.tsx`
- Modify: `src/renderer/src/features/composer/controller.tsx`
- Modify: `src/renderer/src/entities/feature/model/store.ts`
- Modify: `src/renderer/src/pages/document/document-page.tsx`
- Create: `test/renderer/excerpt-review.test.tsx`
- Test: `test/renderer/excerpt-review.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SelectionPopover } from '../../src/renderer/src/features/document-reader/selection-popover'
it('offers Review with agent for a real selection and hands over the excerpt without sending', () => {
  const onReview = vi.fn()
  render(<SelectionPopover selection={{ text: 'deterministic expiration handling', rect: new DOMRect(10, 10, 80, 16) }} label="Review with agent" onReview={onReview} />)
  fireEvent.click(screen.getByRole('button', { name: 'Review with agent' }))
  expect(onReview).toHaveBeenCalledWith('deterministic expiration handling')
  render(<SelectionPopover selection={{ text: 'ab', rect: new DOMRect() }} label="Review with agent" onReview={onReview} />)
  expect(screen.getAllByRole('button', { name: 'Review with agent' })).toHaveLength(1)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/renderer/excerpt-review.test.tsx`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`SelectionPopover` appears above a selection of 3 or more characters inside the document body (listen to `selectionchange`, read the range rect) and hides on Escape or collapse. `onReview` builds a draft through a new store action `prefillDraft(featureId, { recipient: artifact.author, text })` where the text is `Review <artifact name>:` followed by the excerpt as a Markdown quote. The composer controller reads drafts from the store (one draft per feature), so the excerpt lands in the docked composer with the author agent selected and focus moved to the field. Nothing is sent.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/renderer/excerpt-review.test.tsx`. Expected: PASS. Add and run these checks before completing the task:

- The draft replaces nothing the user typed without asking: if the draft is non-empty, append the quote on a new line.
- Keyboard path: selecting text with Shift+arrows also shows the popover.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Cover documents in the dev:web smoke

**Requirement:** REQ-078, REQ-079
**Depends on:** Task 3
**Files:**
- Create: `test/app-e2e/documents.spec.ts`
- Test: `test/app-e2e/documents.spec.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface so the assertion fails for the behavior; an import or syntax failure does not count as RED.

```typescript
import { expect, test } from '@playwright/test'
test('a sidebar spec opens as a tab and an excerpt goes to the composer', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+R')
  await page.getByRole('option', { name: /dev/ }).click()
  await page.getByRole('button', { name: /login-oauth\/SPEC.md/ }).click()
  await page.getByText(/expiration handling|tratamento determinístico/).first().selectText()
  await page.getByRole('button', { name: /Review with agent|Revisar com o agente/ }).click()
  await expect(page.getByRole('textbox', { name: /Send an instruction|Envie uma instrução/ })).toHaveValue(/^Review|^Revisar/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npx vitest run test/app-e2e/documents.spec.ts`

Expected: FAIL on the asserted behavior, not on a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add the spec to `test/app-e2e`.

**Step 4: Run test to verify it passes**

Run: `rtk npx vitest run test/app-e2e/documents.spec.ts`. Expected: PASS. Add and run these checks before completing the task:

- `rtk npm run test:e2e:app` passes.

Run the task gates from the repository root: `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run build`. A passing mock proves only the mock screen; it is not evidence of core, CLI, Git or PTY behavior.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run typecheck, lint, the full Vitest suite with coverage (the renderer is added to the coverage include in project-home-screen Task 1), `npm run build`, and the Playwright smoke for the navigation paths of this plan. Record the stitch-fidelity block review. Update only this slice's STATE.md during implementation. Stop after this plan; use the ordered queue for the next slice.
