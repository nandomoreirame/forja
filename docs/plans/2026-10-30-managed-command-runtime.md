# Plan: Scoped MCP Command Runtime

> **Spec:** docs/specs/managed-command-runtime/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Run development commands and explicit background servers in a core-owned supervisor with observable output and scoped MCP access.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 07 of 13
**Total Tasks:** 4
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [cli-capability-contracts](2026-10-30-cli-capability-contracts.md)
- [artifact-approval-gates](2026-10-30-artifact-approval-gates.md)
- [feature-git-worktrees](2026-10-30-feature-git-worktrees.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Agent commands are scoped, observable and separate from manual shells.
- Foreground cancellation and persistent servers have distinct lifecycles.
- Bounded logs and MCP results share the same execution identity.

## Tasks

### Task 1: Validate run capabilities, working directories and command requests

**Requirement:** REQ-019, REQ-022, REQ-028, REQ-048, REQ-055
**Depends on:** none within this plan
**Files:**

- Create: `src/core/commands/schema.ts`
- Create: `src/core/commands/authority.ts`
- Create: `test/commands/authority.test.ts`
- Test: `test/commands/authority.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { commandRequestSchema } from '../../src/core/commands/schema'
it('requires explicit lifecycle mode and never accepts model approval flags', () => {
  const request = { command: 'npm run dev', mode: 'background' }
  expect(commandRequestSchema.safeParse(request).success).toBe(true)
  expect(commandRequestSchema.safeParse({ ...request, approved: true }).success).toBe(false)
  expect(commandRequestSchema.safeParse({ command: 'npm test' }).success).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/commands/authority.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Resolve feature, role, cwd and granted execution scope exclusively from the run capability. Accept a bounded command and explicit foreground/background mode, optional bounded timeout; never trust model cwd/featureId/environment as authorization. Only human-authorized implementation/test/review commands reach the supervisor. Research/Planner do not receive unrestricted production-code execution grants. Confirmed repository gates run through the same supervisor under a core-owned capability that no agent can obtain; their results are the only validation evidence, while agent-run commands are recorded as diagnostics.

```typescript
import { z } from 'zod'
export const commandRequestSchema = z.object({
  command: z.string().trim().min(1).max(32768),
  mode: z.enum(['foreground', 'background']),
  timeoutMs: z.number().int().positive().max(3600000).optional(),
}).strict()
```

Command scripts are trusted development code, not an OS sandbox. Explicit Forja Git integration actions stay outside this API; inspect tool policy and credentials/environment. Reject direct privileged merge/push shortcuts, but never claim a string denylist secures arbitrary npm scripts or a malicious host. Surface unsupported isolation requirements rather than inventing guarantees.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/commands/authority.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Cross-feature capability, expired token and wrong role fail before spawn.
- Cwd resolves to the owned worktree, and symlink replacement is detected.
- No model-supplied approval, secrets or unrestricted environment variables.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Supervise foreground process groups with ordered bounded logs

**Requirement:** REQ-028, REQ-029, REQ-034, REQ-052
**Depends on:** Task 1
**Files:**

- Create: `src/core/commands/supervisor.ts`
- Create: `src/core/commands/log-store.ts`
- Create: `test/commands/supervisor.test.ts`
- Test: `test/commands/supervisor.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { runProcess } from '../../src/core/commands/supervisor'
it('captures stdout, stderr and exit status without invoking a shell for argv input', async () => {
  const result = await runProcess({ file: process.execPath, args: ['-e', "process.stdout.write('ok'); process.stderr.write('warn'); process.exitCode=2"], cwd: process.cwd(), timeoutMs: 2000 })
  expect(result.stdout).toBe('ok')
  expect(result.stderr).toBe('warn')
  expect(result.exitCode).toBe(2)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/commands/supervisor.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement spawn argv execution and an explicit account-shell command mode for developer command strings. Keep command text separate from invocation assembly; never concatenate model strings into an outer shell command. Spawn owned Linux process groups, stream stdout/stderr as ordered sequenced chunks and track start/end/exit/signal. Bound chunks, per-execution spool and renderer windows with durable paging and explicit truncation markers.

```typescript
export const commandLimits = { chunkBytes: 65536, inMemoryBytes: 1048576, retainedBytes: 10485760, terminateGraceMs: 5000 } as const
```

Use async writes/backpressure and retention, not a synchronous database write on every byte. Stop foreground groups on timeout/abort, escalating only the owned process group. Completion/error/abort persist exactly once; renderer closure does not kill by itself.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/commands/supervisor.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A child-spawning timeout fixture leaves no owned subprocess running.
- Flood stdout/stderr beyond caps and verify bounded memory, ordering and truncation notice.
- No stack trace or environment dump in renderer errors.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Manage persistent servers independently from foreground turns

**Requirement:** REQ-028, REQ-030, REQ-034
**Depends on:** Task 2
**Files:**

- Create: `src/core/commands/background.ts`
- Create: `test/commands/background.test.ts`
- Test: `test/commands/background.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { BackgroundProcesses } from '../../src/core/commands/background'
it('keeps background ownership after a turn ends and stops explicitly', async () => {
  const processes = new BackgroundProcesses()
  const run = await processes.start({ projectId: 'p1', featureId: 'f1', runId: 'r1', agent: 'implementer', file: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], cwd: process.cwd() })
  try {
    expect(processes.get(run.id)?.state).toBe('running')
    await processes.stop(run.id, 'f1')
    expect(processes.get(run.id)?.state).toBe('stopped')
  } finally { await processes.stop(run.id, 'f1') }
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/commands/background.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Start background servers through the same supervisor but return executionId promptly with initial output, not an indefinitely waiting MCP response. Parent feature ownership outlives the requesting turn; read logs by cursor and stop by executionId. Duplicate tool-request IDs return the same process record. Port-in-use is a failed process with actual output, never a fabricated running server. Destroying a feature requires explicit process cleanup.

```typescript
export type ProcessState = 'starting' | 'running' | 'completed' | 'failed' | 'stopped' | 'interrupted'
export interface ProcessOwner { projectId: string; featureId: string; runId: string; agent: string }
```

The supervisor test supplies the complete owner. Production MCP entry resolves these fields from the server capability, never from model arguments.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/commands/background.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Other features cannot list, read or stop this process.
- Stopping twice is idempotent, and process exit just before stop produces truthful state.
- Turn cancellation leaves explicitly backgrounded server active, while full app shutdown stops it.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Expose observable command tools through the existing MCP gateway

**Requirement:** REQ-019, REQ-028, REQ-029, REQ-030, REQ-048
**Depends on:** Task 3
**Files:**

- Create: `src/core/mcp/command-tools.ts`
- Create: `test/mcp/command-tools.test.ts`
- Modify: `src/core/index.ts`
- Test: `test/mcp/command-tools.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { commandToolNames } from '../../src/core/mcp/command-tools'
it('separates starting, reading and stopping a managed command', () => {
  expect(commandToolNames).toEqual(['forja.commands.run', 'forja.commands.logs', 'forja.commands.stop'])
  expect(commandToolNames).not.toContain('forja.git.merge')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/mcp/command-tools.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Register commands.run/logs/stop into the gateway's per-run grant manifest and reuse supervisor authority. Foreground responses include bounded final result; background responses include executionId/state/cursor. Emit the exact same execution ID and chunks to UI and MCP, so agents and developer see the same execution. Never pipe agent input into the manual PTY. Add schemas for logs cursors, bounded page size and stop ID; validate against server-bound owner.

```typescript
export const commandToolNames = ['forja.commands.run', 'forja.commands.logs', 'forja.commands.stop'] as const
```

Extend the gateway through its public registration API, leaving artifact/state grants intact. Core starts the supervisor and passes dependencies; do not create a second unauthenticated HTTP command endpoint.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/mcp/command-tools.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Real local MCP test runs benign commands, reads ordered log pages and rejects another owner.
- Capability revocation denies new commands but preserves explicit owned cleanup.
- All shell execution observable in command UI events; native CLI bypass tested later.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
