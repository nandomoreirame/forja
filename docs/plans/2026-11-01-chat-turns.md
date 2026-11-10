# Plan: Chat Turns

> **Spec:** docs/specs/chat-turns/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Run agent turns per chat in core with the right agent, leases, interrupts, resume and usage.
**Architecture:** A turn runner with per-chat leases over the slice 04 adapters and slice 05 grants; agent resolution shared with the renderer.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 06
**Total Tasks:** 7
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slices 03 `ipc-workbench-source`, 04 `cli-capability-adapters`, 05 `forja-mcp-gateway`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Prompts reach the right agent and stream real replies.
- A busy chat interrupts or queues as configured.

## Checks

**Run slice**: `npx vitest run test/core/resume.test.ts test/core/turn-agent.test.ts test/core/turn-roles.test.ts test/core/turn-runner.test.ts test/core/turn-settings.test.ts test/core/turn-usage.test.ts test/core/watchdog.test.ts --reporter=verbose`

- C1 (REQ-007): agent of the turn holds as specified. Proof: run slice | ✓ uses the mention, then a pending hand-off, then the agent of the phase
- C2 (REQ-008): busy chat: interrupt or queue holds as specified. Proof: run slice | ✓ interrupts by default, queues when asked and runs chats in parallel
- C3 (REQ-009): concurrent chats holds as specified. Proof: run slice | ✓ interrupts by default, queues when asked and runs chats in parallel
- C4 (REQ-010): role restrictions holds as specified. Proof: run slice | ✓ launches each agent with its role grant and the chat phase context
- C5 (REQ-013): unresponsive turns holds as specified. Proof: run slice | ✓ marks a silent turn unresponsive without killing it
- C6 (REQ-014): session resume holds as specified. Proof: run slice | ✓ reuses the native session of the same chat and agent or asks first
- C7 (REQ-015): usage per turn and chat holds as specified. Proof: run slice | ✓ sums reported usage and keeps unreported turns unavailable
- C8 (REQ-016): settings snapshot per turn holds as specified. Proof: run slice | ✓ keeps the running turn settings and applies changes to later turns

## Tasks

### Task 1: Resolve the agent of each turn in core

**Requirement:** REQ-007
**Files:**

- Create: `src/core/chats/turn-agent.ts`
- Test: `test/core/turn-agent.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { resolveTurnAgent } from '../../src/core/chats/turn-agent'
it('uses the mention, then a pending hand-off, then the agent of the phase', () => {
  expect(resolveTurnAgent({ prompt: 'please @polidor look', phase: 'implement' })).toBe('reviewer')
  expect(resolveTurnAgent({ prompt: 'look', phase: 'implement', handoff: 'planner' })).toBe('planner')
  expect(resolveTurnAgent({ prompt: 'look', phase: 'talk' })).toBe('smith')
  expect(resolveTurnAgent({ prompt: 'look', phase: 'acceptance' })).toBe('smith')
  expect(resolveTurnAgent({ prompt: '`@polidor`', phase: 'test' })).toBe('tester')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/turn-agent.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Share the alias table with the renderer through `src/shared` (ids, roles, forge names in both languages, custom names) so both sides resolve identically; the hand-off is consumed by the turn.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/turn-agent.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Custom display names resolve.
- Unknown mentions fall back to the phase agent.
- Mentions inside fenced code are ignored.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Run one turn per chat with interrupt or queue

**Requirement:** REQ-008, REQ-009
**Depends on:** Task 1
**Files:**

- Create: `src/core/chats/turn-runner.ts`
- Test: `test/core/turn-runner.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createTurnRunner } from '../../src/core/chats/turn-runner'
it('interrupts by default, queues when asked and runs chats in parallel', async () => {
  const log: string[] = []
  const runner = createTurnRunner({ start: async (turn, signal) => { log.push(`start ${turn.chatId}:${turn.prompt}`); await new Promise((r) => signal.addEventListener('abort', r)); log.push(`stop ${turn.chatId}:${turn.prompt}`) } })
  runner.send({ chatId: 'a', prompt: '1' })
  runner.send({ chatId: 'b', prompt: '1' })
  await runner.send({ chatId: 'a', prompt: '2' }, { interrupt: true }).started
  expect(log).toEqual(['start a:1', 'start b:1', 'stop a:1', 'start a:2'])
  runner.send({ chatId: 'b', prompt: '2' }, { interrupt: false })
  expect(runner.queued('b')).toEqual(['2'])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/turn-runner.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

A per-chat lease guarantees one running turn; interruption waits for the foreground process group to end before starting the next turn; the queue runs in order; different chats never block each other.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/turn-runner.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A second interrupt during termination does not start two turns.
- Queued prompts survive an interrupted turn in order.
- Releasing the lease happens only after termination is confirmed.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Restrict each agent to its role

**Requirement:** REQ-010
**Depends on:** Task 2
**Files:**

- Modify: `src/core/chats/turn-runner.ts`
- Test: `test/core/turn-roles.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { turnLaunchFor } from '../../src/core/chats/turn-runner'
it('launches each agent with its role grant and the chat phase context', () => {
  expect(turnLaunchFor({ agent: 'tester', phase: 'test', testPatterns: ['test/**'] }).grants).toEqual(expect.arrayContaining(['write_tests', 'run_gates']))
  expect(turnLaunchFor({ agent: 'tester', phase: 'test', testPatterns: ['test/**'] }).grants).not.toContain('write_code')
  expect(turnLaunchFor({ agent: 'research', phase: 'implement', testPatterns: [] }).grants).toEqual(expect.arrayContaining(['publish_spec']))
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/turn-roles.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

The launch description carries the MCP token with the role grant (slice 05) and the role instructions; a mentioned agent outside its phase still only gets its role tools.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/turn-roles.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The Temperador cannot write outside the confirmed test patterns.
- The Ferreiro launch has no write tools.
- Role instructions are per invocation, never written to user config.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Flag unresponsive turns

**Requirement:** REQ-013
**Depends on:** Task 2
**Files:**

- Create: `src/core/chats/watchdog.ts`
- Test: `test/core/watchdog.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { createWatchdog } from '../../src/core/chats/watchdog'
it('marks a silent turn unresponsive without killing it', () => {
  vi.useFakeTimers()
  const onUnresponsive = vi.fn()
  const dog = createWatchdog({ windowMs: 600_000, onUnresponsive })
  dog.watch('t1')
  vi.advanceTimersByTime(599_000)
  dog.activity('t1')
  vi.advanceTimersByTime(599_000)
  expect(onUnresponsive).not.toHaveBeenCalled()
  vi.advanceTimersByTime(2_000)
  expect(onUnresponsive).toHaveBeenCalledWith('t1')
  vi.useRealTimers()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/watchdog.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

The default window is 10 minutes (setting); unresponsive turns keep their lease until the user stops them and termination is confirmed.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/watchdog.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Stopping a watched turn clears its timer.
- The window setting applies to new turns.
- The watchdog never signals a process itself.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Resume native sessions or ask before rebuilding

**Requirement:** REQ-014
**Depends on:** Task 2
**Files:**

- Create: `src/core/chats/resume.ts`
- Test: `test/core/resume.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { resumePlan } from '../../src/core/chats/resume'
it('reuses the native session of the same chat and agent or asks first', () => {
  expect(resumePlan({ supportsResume: true, last: { agent: 'research', tool: 'claude', sessionId: 's1' }, next: { agent: 'research', tool: 'claude' } })).toEqual({ kind: 'resume', sessionId: 's1' })
  expect(resumePlan({ supportsResume: true, last: { agent: 'research', tool: 'claude', sessionId: 's1' }, next: { agent: 'research', tool: 'codex' } })).toEqual({ kind: 'ask' })
  expect(resumePlan({ supportsResume: false, last: { agent: 'research', tool: 'grok', sessionId: 's1' }, next: { agent: 'research', tool: 'grok' } })).toEqual({ kind: 'ask' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/resume.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Sessions are keyed by chat, agent and tool; rebuilding context in a new session needs the user's answer, recorded as an event.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/resume.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A session from another chat is never reused.
- A declined rebuild leaves the chat interrupted.
- Resume makes no automatic paid call after restart.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 6: Record usage per turn and per chat

**Requirement:** REQ-015
**Depends on:** Task 2
**Files:**

- Create: `src/core/chats/usage.ts`
- Test: `test/core/turn-usage.test.ts`

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
import { recordUsage, chatUsage } from '../../src/core/chats/usage'
it('sums reported usage and keeps unreported turns unavailable', () => {
  const db = createDatabase(':memory:')
  recordUsage(db, { turnId: 't1', chatId: 'c1', usage: { input: 10, cached: 2, output: 5 } })
  recordUsage(db, { turnId: 't2', chatId: 'c1', usage: null })
  expect(chatUsage(db, 'c1')).toEqual({ input: 10, cached: 2, output: 5, unavailableTurns: 1 })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/turn-usage.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Store the CLI-reported usage on the turn; never estimate; expose per-chat totals and the count of turns without a report.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/turn-usage.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Cost is stored only when the CLI reports it.
- Re-recording a turn replaces, not adds.
- Totals exclude archived chats only when asked.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 7: Snapshot agent settings per turn

**Requirement:** REQ-016
**Depends on:** Task 2
**Files:**

- Modify: `src/core/chats/turn-runner.ts`
- Test: `test/core/turn-settings.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createTurnRunner } from '../../src/core/chats/turn-runner'
it('keeps the running turn settings and applies changes to later turns', async () => {
  let settings = { tool: 'claude', model: 'a' }
  const seen: unknown[] = []
  const runner = createTurnRunner({ settings: () => settings, start: async (turn) => { seen.push(turn.settings) } })
  await runner.send({ chatId: 'a', prompt: '1' }).done
  settings = { tool: 'codex', model: 'b' }
  await runner.send({ chatId: 'a', prompt: '2' }).done
  expect(seen).toEqual([{ tool: 'claude', model: 'a' }, { tool: 'codex', model: 'b' }])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/turn-settings.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Freeze the agent profile when a turn starts and store it on the turn record.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/turn-settings.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Changing settings during a turn does not alter it.
- The snapshot is visible in the turn metadata.
- Removed skills stay listed on old turns.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-chat-turns.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
