# Plan: User Terminals, Agent Tabs and Collapsed Footer

> **Spec:** docs/specs/terminal-panel-footer/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Provide real default-shell PTYs beside read-only agent command tabs and a non-destructive collapsed footer toolbar.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 11 of 13
**Total Tasks:** 5
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [conversation-screen](2026-10-31-conversation-screen.md)
- [web-foundation-landing-styleguide](2026-10-30-web-foundation-landing-styleguide.md)
- [managed-command-runtime](2026-10-30-managed-command-runtime.md)
- [feature-workbench-composer](2026-10-30-feature-workbench-composer.md)

## Execution Contract

- Revised 2026-10-31: the mock screen slices (conversation-screen) create the renderer files listed as Modify here. Replace their `WorkbenchSource` mock data with core IPC and keep the screen behavior; do not create parallel pages. The seed tests below still apply to the extended files.
- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- User terminals run the account default shell with multiple independent tabs.
- Agent tabs are read only and show observable managed processes.
- Collapse preserves execution and footer click restores the exact tab.

## Tasks

### Task 1: Resolve the user default shell and create scoped PTYs

**Requirement:** REQ-031, REQ-034, REQ-048
**Depends on:** none within this plan
**Files:**
- Create: `src/core/terminals/shell.ts`
- Create: `src/core/terminals/pty-service.ts`
- Create: `test/terminals/shell.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `electron.vite.config.ts`
- Test: `test/terminals/shell.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { shellLabel, terminalCwd } from '../../src/core/terminals/shell'
it('uses the actual shell basename and the feature worktree first', () => {
  expect(shellLabel('/usr/bin/fish')).toBe('fish')
  expect(terminalCwd({ worktree: '/tmp/f1', target: '/tmp/repo', project: '/tmp/dev' })).toBe('/tmp/f1')
  expect(terminalCwd({ project: '/tmp/dev' })).toBe('/tmp/dev')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/terminals/shell.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Resolve the Linux account shell from OS user information with validated executable fallback; $SHELL may be a hint but never hardcode zsh. Use node-pty as a core-owned service with sessions bound to project/feature and independent terminal IDs. Shell argv and env are constructed by the app, not by UI string interpolation. Resize/write/close operations validate sender ownership and size bounds.

```typescript
import { basename } from 'node:path'
export const shellLabel = (path: string): string => basename(path)
export function terminalCwd(input: { worktree?: string; target?: string; project: string }): string {
  return input.worktree ?? input.target ?? input.project
}
```

Validate cwd still exists/canonicalizes before spawn. Install/rebuild the native dependency for the repository's Electron ABI and verify in Electron, not only host Node. Keep browser site free of node-pty imports.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/terminals/shell.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real PTY integration reads/writes/resizes with a temporary cwd and closes its process group.
- Missing/invalid shell gives an actionable fallback; wrong feature write is denied.
- Site build does not bundle native addons and Electron smoke loads the PTY module.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Unify manual-shell and agent-command view models without merging authority

**Requirement:** REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-048
**Depends on:** Task 1
**Files:**
- Create: `src/shared/domain/terminals.ts`
- Create: `src/core/terminals/events.ts`
- Create: `src/renderer/src/entities/terminal/model.ts`
- Create: `test/terminals/model.test.ts`
- Modify: `src/shared/contracts.ts`
- Modify: `src/core/index.ts`
- Test: `test/terminals/model.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { canWriteTerminal } from '../../src/shared/domain/terminals'
it('permits typing only in the user shell', () => {
  expect(canWriteTerminal({ kind: 'user-shell', state: 'running' })).toBe(true)
  expect(canWriteTerminal({ kind: 'agent-command', state: 'running' })).toBe(false)
  expect(canWriteTerminal({ kind: 'user-shell', state: 'stopped' })).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/terminals/model.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Define a discriminated terminal view model with stable terminal/execution IDs, feature ID, shell or agent/command, cwd, lifecycle state, unread output and chunk cursors. A shared UI tab strip is presentation only; core type/owner validation decides writes. Agent command sessions have no write API. Preserve completed outputs with paginated logs and independent active terminal selection per feature.

```typescript
export function canWriteTerminal(value: { kind: 'user-shell' | 'agent-command'; state: string }): boolean {
  return value.kind === 'user-shell' && value.state === 'running'
}
```

Extend IPC with separate terminal.create/write/resize/stop and command.log/stop requests; never expose a generic arbitrary IPC method or use renderer-provided PIDs.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/terminals/model.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Attempt writes on agent execution IDs and cross-feature shell IDs at the core boundary.
- Completed output survives selection changes and reconnect without duplicate bytes.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Render real xterm user shells and read-only command tabs

**Requirement:** REQ-029, REQ-031, REQ-032, REQ-043, REQ-054
**Depends on:** Task 2
**Files:**
- Create: `src/renderer/src/features/terminal/xterm-view.tsx`
- Modify: `src/renderer/src/features/terminal/panel.tsx`
- Create: `test/ui/terminal-panel.test.tsx`
- Test: `test/ui/terminal-panel.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TerminalPanel } from '../../src/renderer/src/features/terminal/panel'
it('opens an independent manual shell using the plus action', () => {
  const requests: string[] = []
  render(<TerminalPanel featureId="f1" terminals={[]} onCreate={id => requests.push(id)} />)
  fireEvent.click(screen.getByRole('button', { name: 'New terminal' }))
  expect(requests).toEqual(['f1'])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/terminal-panel.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Use the shared terminal-tab and metadata compositions. Add xterm with fit/resize lifecycle and sanitized terminal output policy, disposing instances/subscriptions on unmount. User PTY attaches input; agent output has stdin disabled and separate stop process control. + starts a new manual shell only; every tab has the window-terminal icon and correct localized accessible name. Show complete cwd in the metadata/detail area.

```typescript
export const terminalPanelPlacement = { region: 'central-column', composer: 'above-panel', footer: 'below-panel' } as const
```

Agent output may use a read-only xterm instance with input disabled or the same chunk renderer, but must preserve ANSI behavior safely without HTML/clipboard injection. Do not attach app shortcuts while user is typing in xterm.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/terminal-panel.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real browser/Electron test types a benign command into manual PTY and confirms agent tabs reject typing.
- Resize preserves output and does not overflow sidebars.
- Stop process is distinct from collapse; no hidden duplicate shell on rerender.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Collapse into a per-feature footer toolbar and restore the exact terminal

**Requirement:** REQ-004, REQ-030, REQ-032, REQ-033, REQ-043
**Depends on:** Task 3
**Files:**
- Modify: `src/renderer/src/features/terminal/footer-toolbar.tsx`
- Create: `src/renderer/src/features/terminal/presentation.ts`
- Create: `test/ui/terminal-footer.test.tsx`
- Test: `test/ui/terminal-footer.test.tsx`

**Team:**
- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, accessibility-guardrails, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TerminalFooter } from '../../src/renderer/src/features/terminal/footer-toolbar'
it('expands the clicked terminal without stopping its process', () => {
  const selected: string[] = []
  render(<TerminalFooter items={[{ id: 'dev', label: 'Implementer · dev', state: 'running', kind: 'agent-command', cwd: '/tmp/work', command: 'npm run dev' }]} onExpand={id => selected.push(id)} />)
  fireEvent.click(screen.getByRole('button', { name: /Implementer · dev/ }))
  expect(selected).toEqual(['dev'])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/ui/terminal-footer.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Keep collapsed/panel-height/selected-terminal state in presentation state per feature; collapse dispatches no stop request. Footer shows each feature terminal individually, with running loading, completed/failed/stopped states and idle user-shell distinction. Hover and keyboard focus reveal agent, command, full cwd and current state. Clicking or keyboard activating expands and selects that exact ID.

```typescript
export function collapseTerminalView<T extends { collapsed: boolean }>(state: T): T {
  return { ...state, collapsed: true }
}
```

Preserve statusbar path/UTF-8 and the global composer. A long terminal list scrolls/wraps within its bounded region instead of covering the composer or adjacent panels. No fabricated progress percentages.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/ui/terminal-footer.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Collapse has zero process lifecycle side effects, including persistent servers.
- Switch feature and restore its distinct terminal selection; other executions keep running.
- Tooltip is focus-accessible and exposes the full directory even if a compact label truncates.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Close PTYs deliberately and persist transcript presentation state

**Requirement:** REQ-008, REQ-029, REQ-031, REQ-034, REQ-054
**Depends on:** Task 4
**Files:**
- Create: `src/core/terminals/lifecycle.ts`
- Create: `test/terminals/lifecycle.test.ts`
- Test: `test/terminals/lifecycle.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { restoredTerminalState } from '../../src/core/terminals/lifecycle'
it('never treats a saved running shell as a live restored process', () => {
  expect(restoredTerminalState('running')).toBe('interrupted')
  expect(restoredTerminalState('completed')).toBe('completed')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/terminals/lifecycle.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Separate close view, collapse, close shell and full app exit. A requested shell close stops its owned PTY tree and persists exit/interrupted state; hiding a panel does not. Restore retained transcripts and tab metadata but require explicit new PTY creation after restart. Never send signals to persisted PIDs without a verified ownership fingerprint. Route shutdown through the shared process lifecycle plan, not ad-hoc window unmount effects.

```typescript
export function restoredTerminalState(state: string): string {
  return state === 'running' || state === 'starting' ? 'interrupted' : state
}
```

Terminals remain inspectable as completed/interrupted records; no promise to resurrect OS sessions. User shell mutations feed Git fingerprint invalidation.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/terminals/lifecycle.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Close/hide/collapse/reopen distinct operations have corresponding lifecycle tests.
- App normal exit leaves no owned PTY process.
- Persisted output/state restored without auto-running the shell or a model.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
