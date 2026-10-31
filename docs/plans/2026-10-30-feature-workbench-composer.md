# Plan: Feature Workbench and Global Composer

> **Spec:** docs/specs/feature-workbench-composer/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Replace the static welcome screen with approved feature tabs, contextual sidebars and one global composer.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 09 of 13
**Total Tasks:** 5
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [web-foundation-landing-styleguide](2026-10-30-web-foundation-landing-styleguide.md)
- [project-feature-state](2026-10-30-project-feature-state.md)
- [agent-settings-skills](2026-10-30-agent-settings-skills.md)
- [artifact-approval-gates](2026-10-30-artifact-approval-gates.md)
- [cli-agent-sessions](2026-10-30-cli-agent-sessions.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Renameable feature tabs preserve distinct Git and chat contexts.
- One persistent composer works across conversation/settings/document views.
- Background feature activity cannot steal message recipients or drafts.

## Tasks

### Task 1: Create feature-scoped presentation state without cross-feature stealing

**Requirement:** REQ-002, REQ-004, REQ-005, REQ-007
**Depends on:** none within this plan
**Files:**
- Create: `src/renderer/src/entities/feature/model/store.ts`
- Create: `test/ui/feature-context.test.ts`
- Test: `test/ui/feature-context.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { applyBackgroundEvent } from '../../src/renderer/src/entities/feature/model/store'
it('does not change active context when another feature emits progress', () => {
  const state = { selectedFeatureId: 'a', recipient: 'research', activity: {} }
  const next = applyBackgroundEvent(state, { featureId: 'b', agent: 'implementer' })
  expect(next.selectedFeatureId).toBe('a')
  expect(next.recipient).toBe('research')
  expect(next.activity.b).toBe('implementer')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/feature-context.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Use Zustand slices keyed by stable project/feature/role IDs, separating persistent core records from view/draft state. Apply server events only to their owner; selected feature changes are explicit user events. Keep draft text and explicit recipient per feature. Subscribe with selectors to avoid repainting the entire app for every log/text token.

```typescript
type ViewState = { selectedFeatureId: string; recipient: string; activity: Record<string, string> }
export function applyBackgroundEvent(state: ViewState, event: { featureId: string; agent: string }): ViewState {
  return { ...state, activity: { ...state.activity, [event.featureId]: event.agent } }
}
```

A separate selected-feature event computes default recipient from its running agent or active role conversation, without overwriting a user's explicit selection/draft.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/feature-context.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Selected-agent and selected-feature are not one global last-event variable.
- Pagination, reconnect and duplicate event handling preserve draft and history.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Wire folder entry, renameable feature tabs, sidebar and Git context

**Requirement:** REQ-001, REQ-002, REQ-003, REQ-043, REQ-054
**Depends on:** Task 1
**Files:**
- Create: `src/renderer/src/pages/workbench/index.ts`
- Create: `src/renderer/src/pages/workbench/workbench-page.tsx`
- Create: `src/renderer/src/features/feature-tabs/rename.tsx`
- Create: `src/renderer/src/widgets/project-sidebar.tsx`
- Create: `src/renderer/src/widgets/git-context.tsx`
- Create: `test/ui/workbench.test.tsx`
- Modify: `src/renderer/src/app/App.tsx`
- Modify: `src/renderer/src/app/styles.css`
- Modify: `src/renderer/src/app/Shell.module.css`
- Modify: `src/renderer/src/main.tsx`
- Modify: `test/welcome.test.tsx`
- Test: `test/ui/workbench.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { WorkbenchPage } from '../../src/renderer/src/pages/workbench'
it('distinguishes the opened folder from the feature Git target', () => {
  render(<WorkbenchPage project={{ id: 'p', path: '/tmp/dev' }} feature={{ id: 'f', name: 'Login', slug: 'login', targetPath: '/tmp/dev/projects/forja' }} />)
  expect(screen.getByTestId('opened-folder')).toHaveTextContent('/tmp/dev')
  expect(screen.getByTestId('feature-target')).toHaveTextContent('/tmp/dev/projects/forja')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/workbench.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Consume shared app-chrome/feature/sidebar widgets through their public APIs. Main folder picker opens/focuses project windows. Feature creation/rename calls core; display-only rename preserves slug. Render five fixed role rows, artifact lists and read-only skills. Clicking an agent changes the selected feature's role conversation, not a main agent tab. Git panel shows the target worktree/branch with full directory available.

```typescript
export interface WorkbenchFeatureView { id: string; name: string; slug: string; targetPath?: string }
```

Wire the root App to welcome when no folder exists and Workbench when bound to a project. Preserve the initial screen's style. Existing welcome tests must now test real enabled actions where wired; do not keep all controls disabled to satisfy obsolete scaffold tests. Closing a tab preserves feature history and distinguishes active-process confirmation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/workbench.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Rename one of two simultaneous features and preserve target/session references.
- Folder entry works without Git; no inferred workspace picker.
- Capture approved topbar/sidebar/main/right-pane anatomy at desktop viewport.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Implement one recipient combobox, @ mentions and global drafts

**Requirement:** REQ-004, REQ-005, REQ-006, REQ-036, REQ-047
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/features/composer/recipient.ts`
- Create: `src/renderer/src/features/composer/controller.tsx`
- Create: `test/ui/recipient.test.ts`
- Test: `test/ui/recipient.test.ts`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { mentionedRecipient } from '../../src/renderer/src/features/composer/recipient'
it('takes the last valid standalone role mention without matching email addresses', () => {
  expect(mentionedRecipient('@Research ask @Planner next')).toBe('planner')
  expect(mentionedRecipient('email@Planner.example')).toBeNull()
  expect(mentionedRecipient('hello @Unknown')).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/recipient.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Parse supported localized/English role mentions using token boundaries and fixed aliases, update the combobox and keep a single visible recipient. Resolve mentions at edit/send consistently; do not interpret code fences/email/unknown handles as hidden routing. Keep one draft per selected feature with optional explicit recipient override and artifact excerpt payload. Send exact target IDs and idempotent request ID through typed IPC; reflect interrupting/queued/waiting state.

```typescript
export const roleMentionAliases = {
  research: 'research', pesquisador: 'research', planner: 'planner', planejador: 'planner',
  implementer: 'implementer', implementador: 'implementer', tester: 'tester', testador: 'tester',
  reviewer: 'reviewer', revisor: 'reviewer',
} as const
```

Ctrl+Enter submits with accessible button behavior; pending execution never turns an absent approval into a runnable next step. Settings/doc views use this same controller outside their page body, not embedded copies.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/recipient.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Mention replacement, combobox selection, unknown mention and email/code content.
- Change tabs during streaming, keep independent drafts and do not send to the old hidden context.
- Blocked recipient shows the exact unmet prerequisite without spawning a CLI.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Render scoped conversations, handoff links and approval affordances

**Requirement:** REQ-004, REQ-020, REQ-043, REQ-045
**Depends on:** Task 3
**Files:**
- Create: `src/renderer/src/features/conversation/history.tsx`
- Create: `src/renderer/src/features/conversation/handoff-link.tsx`
- Create: `src/renderer/src/features/approvals/request-card.tsx`
- Create: `test/ui/conversation.test.tsx`
- Test: `test/ui/conversation.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { HandoffLink } from '../../src/renderer/src/features/conversation/handoff-link'
it('navigates to the linked request within the same feature', () => {
  const visited: unknown[] = []
  render(<HandoffLink featureId="f1" conversationId="tester-1" messageId="m1" label="View request" onNavigate={value => visited.push(value)} />)
  fireEvent.click(screen.getByRole('button', { name: 'View request' }))
  expect(visited).toEqual([{ featureId: 'f1', conversationId: 'tester-1', messageId: 'm1' }])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/conversation.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Compose paginated role histories using shared messages/handoff widgets. Show durable run state, no invented timestamps/avatars, and safe streamed Markdown. Link both request and correction result to exact message IDs and restore scroll targets. Auto-scroll only when the user is already near the end. Approval affordances reflect authoritative revision-bound requests and require explicit clicks, never auto-accept based on a conversation sentence.

```typescript
export interface ConversationAnchor { featureId: string; conversationId: string; messageId: string }
```

Frame pending/completed/failure/interruption distinctly, with output references to command panels rather than duplicating unbounded logs in chat. Mount settings/doc/history under one persistent composer shell; opening an approval must not lose the draft.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/conversation.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Navigate a cross-agent correction request and return to result without switching feature.
- Reconnect preserves message order and does not duplicate streaming deltas.
- Core still refuses a stale approval even if an old card is visible.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Bind a feature target repository and destination branch explicitly

**Requirement:** REQ-003, REQ-024, REQ-026, REQ-043, REQ-050
**Depends on:** Task 4
**Files:**
- Create: `src/renderer/src/features/git-target/target-dialog.tsx`
- Create: `src/renderer/src/features/git-target/index.ts`
- Create: `test/ui/git-target.test.tsx`
- Test: `test/ui/git-target.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { GitTargetDialog } from '../../src/renderer/src/features/git-target'
it('requires an explicit branch before binding a repository', () => {
  const saved: unknown[] = []
  render(<GitTargetDialog featureId="f1" repository="/tmp/repo" branches={['release/2.0', 'main']} onSave={value => saved.push(value)} />)
  expect(screen.getByRole('button', { name: 'Use repository' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Destination branch'), { target: { value: 'release/2.0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Use repository' }))
  expect(saved).toEqual([{ featureId: 'f1', repository: '/tmp/repo', branch: 'release/2.0' }])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/git-target.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add the minimum feature-target control using existing gallery Dialog/Input/Select/Button primitives, opened from the feature context's target path action. Use trusted folder picker and a core-returned branch list, not arbitrary inferred child projects. Binding records repository canonical identity, destination branch and base commit; before implementation a non-Git opened folder may choose any explicit target. Block rebinding an active/implemented feature without explicit stop and re-evaluation of all dependent approvals.

```typescript
export interface GitTargetSelection { featureId: string; repository: string; branch: string }
```

Use user-level keyboard/selection interactions against the shared shadcn Select. The seed change event may target a native backing select only if one exists; otherwise use the actual accessible combobox/listbox, preserving the same assertion rather than adding a test-only hidden select. Do not add a workspace abstraction, global project switcher in the composer or new project-wide settings screen.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/git-target.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Opening ~/dev and selecting two different targets works in one window by feature tab.
- Dirty/invalid target errors come from core and preserve prior bindings.
- Target/base changes cannot silently reuse old worktree or code approvals.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
