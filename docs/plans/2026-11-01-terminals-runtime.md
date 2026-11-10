# Plan: Terminals Runtime

> **Spec:** docs/specs/terminals-runtime/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Open user terminals in the right folder, show agent commands read-only, keep transcripts and stop owned processes safely.
**Architecture:** A cwd rule in the PTY service and a quit guard in the main process backed by core process lists.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 13
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slice 05 `forja-mcp-gateway`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- `+` opens a shell in the chat worktree.
- Quitting with running work asks first.

## Checks

**Run slice**: `npx vitest run test/core/terminal-cwd.test.ts test/core/transcripts.test.ts test/main/quit-guard.test.ts test/renderer/command-view.test.tsx --reporter=verbose`

- C1 (REQ-048): managed commands holds as specified. Proof: run slice | ✓ shows command, folder, live output and exit code without accepting input
- C2 (REQ-051): user terminals holds as specified. Proof: run slice | ✓ prefers the chat worktree, then the target repository, then the opened folder
- C3 (REQ-052): stop and quit holds as specified. Proof: run slice | ✓ lists running work, keeps the app open when cancelled and stops everything when confirmed
- C4 (REQ-063): restore after restart holds as specified. Proof: run slice | ✓ keeps a bounded transcript per terminal and restores it as ended, never as a live shell

## Tasks

### Task 1: Open user terminals in the chat worktree first

**Requirement:** REQ-051
**Files:**

- Modify: `src/core/terminals/pty-service.ts`
- Test: `test/core/terminal-cwd.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { terminalCwd } from '../../src/core/terminals/pty-service'
it('prefers the chat worktree, then the target repository, then the opened folder', () => {
  expect(terminalCwd({ worktree: '/wt', target: '/repo', folder: '/dev' })).toBe('/wt')
  expect(terminalCwd({ target: '/repo', folder: '/dev' })).toBe('/repo')
  expect(terminalCwd({ folder: '/dev' })).toBe('/dev')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/terminal-cwd.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Pick the cwd in that order for `+` terminals with the account default shell; terminals stay independent of agent turns.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/terminal-cwd.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A missing worktree folder falls back to the next option.
- The shell comes from the account, never from a model.
- Closing the terminal view does not stop it.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Stop owned processes on interrupt and ask before quitting

**Requirement:** REQ-052
**Files:**

- Create: `src/main/quit-guard.ts`
- Test: `test/main/quit-guard.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { onBeforeQuit } from '../../src/main/quit-guard'
it('lists running work, keeps the app open when cancelled and stops everything when confirmed', async () => {
  const stopAll = vi.fn(async () => {})
  const running = async () => [{ chat: 'Rate limits', kind: 'turn' }, { chat: 'Exports', kind: 'server' }]
  expect(await onBeforeQuit({ running, confirm: async () => false, stopAll })).toBe('stay')
  expect(stopAll).not.toHaveBeenCalled()
  expect(await onBeforeQuit({ running, confirm: async () => true, stopAll })).toBe('quit')
  expect(stopAll).toHaveBeenCalledOnce()
  expect(await onBeforeQuit({ running: async () => [], confirm: async () => false, stopAll })).toBe('quit')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/main/quit-guard.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Hook `before-quit` in main: list running turns and executions from core, confirm, then stop foreground trees first and all owned processes on full exit; interrupts stop only the foreground tree and keep background servers.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/main/quit-guard.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Cancelling keeps every process running.
- Stop waits for confirmed termination before exit.
- No saved PID is signaled after a restart without identity checks.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Render agent command tabs as read-only xterm views

**Requirement:** REQ-048
**Files:**

- Create: `src/renderer/src/features/terminal/command-view.tsx`
- Test: `test/renderer/command-view.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { CommandView } from '../../src/renderer/src/features/terminal/command-view'
it('shows command, folder, live output and exit code without accepting input', () => {
  render(<CommandView locale="en" execution={{ id: 'e1', command: 'npm test', cwd: '~/dev/app', state: 'completed', exitCode: 0, chunks: ['ok\n'], truncated: true }} />)
  expect(screen.getByText('npm test')).toBeInTheDocument()
  expect(screen.getByText('~/dev/app')).toBeInTheDocument()
  expect(screen.getByText(/exit 0/)).toBeInTheDocument()
  expect(screen.getByText(/Output truncated/)).toBeInTheDocument()
  expect(document.querySelector('[data-slot="command-view"]')).toHaveAttribute('aria-readonly', 'true')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/command-view.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Agent executions from the managed executor (slice 05) open as terminal tabs labeled with agent and command, rendered on xterm with input disabled, live bounded chunks, truncation notice, state and exit code; manual shells keep their interactive view.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/command-view.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Typing in a command tab sends nothing.
- Switching tabs replays the bounded transcript.
- A stopped execution keeps its output.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Persist terminal transcripts across restarts

**Requirement:** REQ-063
**Files:**

- Create: `src/core/terminals/transcripts.ts`
- Test: `test/core/transcripts.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createDatabase } from '../../src/core/database'
import { saveTranscript, loadTranscripts } from '../../src/core/terminals/transcripts'
it('keeps a bounded transcript per terminal and restores it as ended, never as a live shell', () => {
  const db = createDatabase(':memory:')
  saveTranscript(db, { chatId: 'c1', terminalId: 't1', label: 'zsh', text: 'x'.repeat(300_000), maxBytes: 65_536 })
  const [restored] = loadTranscripts(db, 'c1')
  expect(restored).toMatchObject({ terminalId: 't1', label: 'zsh', state: 'ended' })
  expect(restored.text.length).toBeLessThanOrEqual(65_536)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/transcripts.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Store the last bytes of each terminal transcript per chat; after a restart show them as ended tabs with a New shell action; live processes are never reconstructed.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/transcripts.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Transcripts of archived chats are dropped.
- Control sequences that write the clipboard are stripped.
- Saving is throttled while output streams.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-terminals-runtime.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
