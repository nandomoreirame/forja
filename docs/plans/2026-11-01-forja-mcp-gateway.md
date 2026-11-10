# Plan: Forja MCP Gateway and Executor

> **Spec:** docs/specs/forja-mcp-gateway/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Give agents a scoped MCP gateway with role grants and a managed command executor.
**Architecture:** A loopback HTTP MCP gateway with per-run tokens and a static grant table; a process-group executor with bounded chunked output and background ownership.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 05
**Total Tasks:** 5
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- Slice 02 `chat-core-store`.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Every agent command is observable with its exit code.
- No agent can approve anything.

## Checks

**Run slice**: `npx vitest run test/core/executor-background.test.ts test/core/executor.test.ts test/core/mcp-approvals.test.ts test/core/mcp-gateway.test.ts test/core/mcp-grants.test.ts --reporter=verbose`

- C1 (REQ-011): ferreiro tool grant holds as specified. Proof: run slice | ✓ gives the Ferreiro read-only and proposal tools and the RPI agents their role tools
- C2 (REQ-028): human-only approvals holds as specified. Proof: run slice | ✓ never exposes or accepts approval tools from any agent
- C3 (REQ-048): managed commands holds as specified. Proof: run slice | ✓ binds to loopback and refuses calls without the per-run token
- C4 (REQ-049): bounded output holds as specified. Proof: run slice | ✓ runs inside the authorized folder, streams bounded chunks and reports the exit code
- C5 (REQ-050): background servers holds as specified. Proof: run slice | ✓ returns an execution id for background servers and allows scoped logs and stop

## Tasks

### Task 1: Serve a scoped loopback MCP gateway

**Requirement:** REQ-048
**Files:**

- Create: `src/core/mcp/gateway.ts`
- Test: `test/core/mcp-gateway.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { startGateway } from '../../src/core/mcp/gateway'
it('binds to loopback and refuses calls without the per-run token', async () => {
  const gateway = await startGateway({ tools: { ping: async () => 'pong' } })
  try {
    expect(gateway.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\//)
    expect((await fetch(gateway.url, { method: 'POST', body: '{}' })).status).toBe(401)
    const ok = await gateway.call(gateway.issueToken({ chatId: 'c1', agent: 'implementer' }), 'ping', {})
    expect(ok).toBe('pong')
  } finally { await gateway.close() }
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/mcp-gateway.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Per-run random tokens bound to chat and agent, loopback only, bounded request size, revocation on turn end; tools receive the verified chat and agent from the token, never from arguments.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/mcp-gateway.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A revoked token is refused.
- Requests over the size bound are refused.
- Model-supplied chat ids in arguments are ignored.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Grant tools per agent role

**Requirement:** REQ-011
**Depends on:** Task 1
**Files:**

- Create: `src/core/mcp/grants.ts`
- Test: `test/core/mcp-grants.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { toolsFor } from '../../src/core/mcp/grants'
it('gives the Ferreiro read-only and proposal tools and the RPI agents their role tools', () => {
  expect(toolsFor('smith')).toEqual(expect.arrayContaining(['read_state', 'propose_start', 'propose_backlog_item', 'propose_skill', 'propose_memory']))
  expect(toolsFor('smith')).not.toContain('run_command')
  expect(toolsFor('implementer')).toContain('run_command')
  expect(toolsFor('research')).toContain('publish_spec')
  expect(toolsFor('research')).not.toContain('publish_plan')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/mcp-grants.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

One static grant table per agent; the gateway refuses tools outside the token's grant with `refused`.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/mcp-grants.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- The Polidor can publish reviews but not run commands outside tests.
- Unknown agents get no tools.
- Grants are enforced in the gateway, not only listed.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Reject approval mutations from agents

**Requirement:** REQ-028
**Depends on:** Task 2
**Files:**

- Modify: `src/core/mcp/gateway.ts`
- Test: `test/core/mcp-approvals.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { startGateway } from '../../src/core/mcp/gateway'
it('never exposes or accepts approval tools from any agent', async () => {
  const gateway = await startGateway({ tools: {} })
  try {
    for (const agent of ['smith', 'research', 'planner', 'implementer', 'tester', 'reviewer'] as const)
      await expect(gateway.call(gateway.issueToken({ chatId: 'c1', agent }), 'approve_spec', {})).rejects.toThrow(/refused/)
  } finally { await gateway.close() }
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/mcp-approvals.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Approval, waiver, merge and push commands exist only as human-authorized core methods from the renderer; the gateway rejects any tool name in that family regardless of grants.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/mcp-approvals.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A tool named like an approval with different casing is refused.
- Refusals are logged as events on the chat.
- No approval method is reachable through MCP.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Run agent commands through the managed executor

**Requirement:** REQ-048, REQ-049
**Depends on:** Task 1
**Files:**

- Create: `src/core/executor/executor.ts`
- Test: `test/core/executor.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createExecutor } from '../../src/core/executor/executor'
it('runs inside the authorized folder, streams bounded chunks and reports the exit code', async () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-exec-'))
  const chunks: string[] = []
  const exec = createExecutor({ maxChunkBytes: 64, maxRetainedBytes: 256 })
  const result = await exec.run({ chatId: 'c1', cwd: root, allowedRoots: [root], command: 'node -e "console.log(\'x\'.repeat(1000))"', onChunk: (c) => chunks.push(c.text) })
  expect(result.exitCode).toBe(0)
  expect(chunks.every((c) => c.length <= 64)).toBe(true)
  expect(result.truncated).toBe(true)
  await expect(exec.run({ chatId: 'c1', cwd: '/', allowedRoots: [root], command: 'pwd', onChunk: () => {} })).rejects.toThrow(/cwd/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/executor.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Spawn in a new process group with the authorized canonical cwd, keep stdout/stderr identity and order, apply backpressure, persist bounded chunks with explicit truncation notices and return the exit code; stopping kills the group and waits for exit.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/executor.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Invalid UTF-8 and ANSI are cleaned before display.
- A cwd outside the allowed roots through a symlink is refused.
- Stop escalates after a timeout and confirms termination.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Own background servers independently of turns

**Requirement:** REQ-050
**Depends on:** Task 4
**Files:**

- Modify: `src/core/executor/executor.ts`
- Test: `test/core/executor-background.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createExecutor } from '../../src/core/executor/executor'
it('returns an execution id for background servers and allows scoped logs and stop', async () => {
  const exec = createExecutor({ maxChunkBytes: 1024, maxRetainedBytes: 65536 })
  const { executionId } = await exec.start({ chatId: 'c1', cwd: process.cwd(), allowedRoots: [process.cwd()], command: 'node -e "setInterval(() => console.log(\'tick\'), 50)"' })
  await new Promise((r) => setTimeout(r, 200))
  expect(exec.logs('c1', executionId).text).toContain('tick')
  expect(() => exec.logs('c2', executionId)).toThrow(/not_found/)
  await exec.stop('c1', executionId)
  expect(exec.status('c1', executionId)).toBe('stopped')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/executor-background.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Background executions survive the turn that started them, are listed per chat and stop on explicit request or full app exit.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/executor-background.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Another chat cannot read or stop the execution.
- Stopping twice is idempotent.
- A crashed server reports failed with its exit code.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-forja-mcp-gateway.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
