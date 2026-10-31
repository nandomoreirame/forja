# Plan: Artifact Reader and Selected-Text Feedback

> **Spec:** docs/specs/document-review-reader/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Read versioned artifacts safely and prepare revision requests for selected passages without losing the global conversation context.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 10 of 13
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [artifact-approval-gates](2026-10-30-artifact-approval-gates.md)
- [feature-workbench-composer](2026-10-30-feature-workbench-composer.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Sidebar artifacts open safe formatted content with exact author/version context.
- Selected text prepares an unsent excerpt request.
- Human approvals cannot be inferred from rendered text or stale UI.

## Tasks

### Task 1: Load scoped artifact source with version identity and safe resource URLs

**Requirement:** REQ-011, REQ-013, REQ-035, REQ-037, REQ-048
**Depends on:** none within this plan
**Files:**
- Create: `src/core/artifacts/reader.ts`
- Create: `src/main/artifact-protocol.ts`
- Create: `test/artifacts/reader.test.ts`
- Modify: `src/main/index.ts`
- Modify: `src/shared/contracts.ts`
- Test: `test/artifacts/reader.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { safeResourcePath } from '../../src/core/artifacts/reader'
it('rejects traversal and active URL schemes in local document resources', () => {
  expect(() => safeResourcePath('../secrets.txt')).toThrow()
  expect(() => safeResourcePath('javascript:alert(1)')).toThrow()
  expect(safeResourcePath('images/diagram.png')).toBe('images/diagram.png')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/artifacts/reader.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Return artifact identity, author role, exact source hash/revision and bounded content through project-scoped IPC. Serve authorized local images through a restricted custom protocol with artifact ownership, validated canonical roots and MIME/size limits. Block arbitrary file://, remote tracking fetches and symlink escapes. External links require trusted main-process protocol allowlist and explicit user activation.

```typescript
export function safeResourcePath(value: string): string {
  const normalized = value.replace(/\\/g, '/')
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..') || /^[a-z][a-z0-9+.-]*:/i.test(normalized)) throw new Error('Unauthorized document resource')
  return normalized
}
```

Use the seed path guard only before authoritative realpath checks. Missing or externally edited files trigger reconciliation and stale state, not an empty success view.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/artifacts/reader.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real temp paths cover encoded traversal, symlink escape, wrong feature and image MIME/size.
- Remote URLs do not cause silent network requests; no secret file content in errors.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Render safe GFM and strict Mermaid with readable fallbacks

**Requirement:** REQ-035, REQ-043, REQ-048
**Depends on:** Task 1
**Files:**
- Create: `src/renderer/src/features/document-reader/render.tsx`
- Create: `src/renderer/src/features/document-reader/mermaid.tsx`
- Create: `test/ui/markdown.test.tsx`
- Test: `test/ui/markdown.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { render, screen } from '@testing-library/react'
 import { expect, it } from 'vitest'
 import { DocumentMarkdown } from '../../src/renderer/src/features/document-reader/render'
 it('renders GFM while refusing active HTML', () => {
   const { container } = render(<DocumentMarkdown source={'# Goal\n\n- [x] Done\n\n<script>alert(1)</script>'} />)
   expect(screen.getByRole('heading', { name: 'Goal' })).toBeInTheDocument()
   expect(container.querySelector('script')).toBeNull()
   expect(screen.getByRole('checkbox')).toBeChecked()
 })
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/markdown.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Reuse the shared Markdown/Mermaid rendering introduced in the gallery and add desktop source/resource adapters only. CommonMark/GFM includes tables, fenced code/highlighting, tasks, links and bounded images. Do not enable arbitrary raw HTML. Mermaid is lazy-loaded, strict, callback-free, complexity-bounded and isolated; sanitize resulting SVG before rendering. Surface parse errors as readable text without leaking stack traces.

```typescript
export const diagramPolicy = { securityLevel: 'strict', startOnLoad: false, maxTextSize: 50000, maxEdges: 500 } as const
```

Cancellation/unmount prevents stale diagram output from replacing a new document. Theme matches the approved design and readable code contrast. Do not copy CDN scripts or external font styles from Stitch HTML.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/markdown.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Test tables/task lists/fences, malformed Mermaid, unsafe links/HTML and huge input.
- Mermaid script/click directives cannot execute; document view is independent of core settings.
- Matching diagram state in the gallery and desktop has the same component anatomy.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Prepare exact-version excerpt requests for the artifact author

**Requirement:** REQ-004, REQ-005, REQ-011, REQ-036
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/features/document-reader/selection.ts`
- Create: `src/renderer/src/features/document-reader/selection-popover.tsx`
- Create: `test/ui/selection.test.ts`
- Test: `test/ui/selection.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { prepareExcerpt } from '../../src/renderer/src/features/document-reader/selection'
it('preserves the selected artifact version and author without sending', () => {
  const draft = prepareExcerpt({ artifactId: 'a', hash: 'h1', featureId: 'f', author: 'planner' }, 'Use token rotation')
  expect(draft).toMatchObject({ featureId: 'f', recipient: 'planner', excerpt: { artifactId: 'a', hash: 'h1', text: 'Use token rotation' } })
  expect(draft).not.toHaveProperty('sentAt')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/selection.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Track text selection only within the rendered document root and exclude controls/code copy buttons outside it. Display the localized Review with agent popover anchored to the selected range; support keyboard equivalent and preserve selection until activation. Prepare a structured excerpt in the global feature draft, with artifact ID/hash, author, text and optional source offset. Never automatically submit. If the source changed before send, show stale excerpt status and ask to refresh/reconfirm.

```typescript
export function prepareExcerpt(artifact: { artifactId: string; hash: string; featureId: string; author: string }, text: string) {
  return { featureId: artifact.featureId, recipient: artifact.author, excerpt: { artifactId: artifact.artifactId, hash: artifact.hash, text } }
}
```

Prevent one feature's selection from overwriting another feature's unrelated unsent draft silently; preserve or ask before replacing draft content.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/selection.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Select text across elements, dismiss/reselect, keyboard activate and retain focus.
- No blank/outside-root selection popup and no auto-send.
- Spec/plan/review author routing is correct and blocked lifecycle gates remain effective.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Wire document navigation and human approval views

**Requirement:** REQ-010, REQ-011, REQ-035, REQ-036, REQ-037, REQ-043, REQ-045
**Depends on:** Task 3
**Files:**
- Create: `src/renderer/src/pages/document/index.ts`
- Create: `src/renderer/src/pages/document/document-page.tsx`
- Create: `test/ui/document-page.test.tsx`
- Test: `test/ui/document-page.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { DocumentPage } from '../../src/renderer/src/pages/document'
it('passes the exact displayed version to human approval', () => {
  const approvals: unknown[] = []
  render(<DocumentPage artifact={{ id: 'a', featureId: 'f', kind: 'spec', hash: 'v1', status: 'draft', source: '# Goal' }} onApprove={request => approvals.push(request)} />)
  fireEvent.click(screen.getByRole('button', { name: 'Approve spec' }))
  expect(approvals).toEqual([{ artifactId: 'a', expectedHash: 'v1' }])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/document-page.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Connect sidebar document entries to a feature-scoped document view inside the feature tab, not a competing global project context. Header shows name/version/status, actionable stale/prerequisite messages and a human approve control appropriate to artifact type. Preserve source and draft when switching history/settings/document views. Core approval response is authoritative; pending/error UI does not optimistically release Planner/Implementer.

```typescript
export interface ArtifactApprovalRequest { artifactId: string; expectedHash: string }
```

Keep the one global composer mounted outside DocumentPage. Support navigating back to the relevant agent and its linked conversation without creating a second composer.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/document-page.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Spec approval and subsequent external edit show stale status and block next stage.
- Approval card can fail due to changed hash without losing the document or user draft.
- Reader still functions when no CLI is available.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
