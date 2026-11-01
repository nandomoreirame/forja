# Plan: Five Controlled CLI Adapters and Agent Sessions

> **Spec:** docs/specs/cli-agent-sessions/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Connect the five installed CLIs to scoped feature/agent sessions with observable controlled execution and truthful cancellation/resume.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 08 of 13
**Total Tasks:** 10
**Estimated Complexity:** medium
**Status:** Approved scope, planned; not implemented.

## Dependencies

- [cli-capability-contracts](2026-10-30-cli-capability-contracts.md)
- [agent-settings-skills](2026-10-30-agent-settings-skills.md)
- [artifact-approval-gates](2026-10-30-artifact-approval-gates.md)
- [managed-command-runtime](2026-10-30-managed-command-runtime.md)

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- Each requested CLI has a separately verified controlled adapter; no unsupported tool is called supported.
- User-auth sessions are reused without copying credentials.
- Interrupt/queue, permission requests and resume behavior are per-feature and recorded.
- Waiting and turn-end states arrive even when a CLI stream omits them, from content-free fallback signals (REQ-095).
- Opted-in plan usage is read on the AIBar model without ever persisting or logging a credential (REQ-102).

## Checks

Checks for the requirements added on 2026-11-01 (2026-11-01 improvement review). Requirements planned before the checks format keep their acceptance and per-task checks above.

**Run sessions**: `npx vitest run test/engines/fallback-status.test.ts test/usage/plan-usage.test.ts --reporter=verbose`

- C1 (REQ-095): fallback signals become waiting or done events with only type and time. Proof: run sessions | PASS maps fallback signals to content-free events
- C2 (REQ-102): plan usage is queried only for opted-in tools and never exposes the token. Proof: run sessions | PASS reads usage only when opted in

## Tasks

### Task 1: Implement shared engine events, transport cancellation and registry

**Requirement:** REQ-007, REQ-018, REQ-019, REQ-034, REQ-048
**Depends on:** none within this plan
**Files:**

- Create: `src/core/engines/transport.ts`
- Create: `src/core/engines/registry.ts`
- Create: `test/engines/transport.test.ts`
- Modify: `src/core/engines/types.ts`
- Test: `test/engines/transport.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { normalizedFailure } from '../../src/core/engines/transport'
it('reports a process failure without exposing raw stacks', () => {
  expect(normalizedFailure('not-authenticated')).toEqual({ type: 'error', code: 'not-authenticated', message: 'Sign in with the installed CLI before retrying.' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/transport.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Extend EngineEvent to include run identity, session ID, incremental text/tool/permission events and one terminal completion. Shared transport owns child groups, stdin lifecycle, bounded UTF-8/JSONL parsing, AbortSignal handling and cleanup. Registry is keyed by the five stable IDs and consumes verified capability evidence. Resolve profile/context/capability before spawning; no model invocation in discovery.

```typescript
export function normalizedFailure(code: 'not-authenticated' | 'unavailable') {
  return { type: 'error' as const, code, message: code === 'not-authenticated' ? 'Sign in with the installed CLI before retrying.' : 'The configured CLI is unavailable.' }
}
```

Do not swallow malformed JSON by pretending an empty successful reply. Error messages are user-safe; diagnostic raw streams remain bounded and sanitized. All five subsequent adapters implement one factory/public interface.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/transport.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Abort a child-spawning fixture and verify group termination before releasing feature lease.
- No duplicated done/error and no unresolved stdin/exit promise after early failure.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Implement the verified claude transport, parser and resume path

**Requirement:** REQ-015, REQ-018, REQ-019, REQ-023, REQ-046, REQ-048, REQ-051, REQ-052
**Depends on:** shared session transport task for this plan
**Files:**

- Create: `src/core/engines/claude/index.ts`
- Create: `src/core/engines/claude/launch.ts`
- Create: `src/core/engines/claude/parser.ts`
- Create: `test/engines/claude.test.ts`
- Test: `test/engines/claude.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createParser } from '../../src/core/engines/claude/parser'
it('parses the versioned claude fixture without dropping terminal completion', () => {
  const parser = createParser()
  const fixture = readFileSync('test/fixtures/engines/claude.jsonl', 'utf8')
  const events = fixture.split('\n').filter(Boolean).flatMap(line => parser.line(line))
  expect(events.some(event => event.type === 'done' || event.type === 'error')).toBe(true)
  expect(parser.end(0, '').filter(event => event.type === 'done')).toHaveLength(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/claude.test.ts`

Expected: FAIL because the claude parser/controlled adapter does not yet implement the verified protocol. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Read the claude row in docs/technical/cli-capabilities.md before selecting flags or transport. Implement launch configuration, incremental parser and engine factory through the normalized EngineAdapter. Use the actually installed version contract, not guessed compatibility with another CLI. Attach the per-run Forja MCP capability and effective native-shell/privileged-tool restrictions while preserving supported native auth/config. Refuse an unverified/unsupported controlled mode before spawn.

```typescript
export interface Parser {
  line(value: string): import('../types').EngineEvent[]
  end(code: number | null, stderr: string): import('../types').EngineEvent[]
}
```

Normalize text/session/tool/permission/final events, no double completion, bounded invalid lines and error context. Preserve the exact session ID per feature and role; resume only through this CLI's supported mechanism. The parser instance needs a terminal-seen state for end(). Test incremental events and structured nested tool output against recorded fixtures, not only the seed.

Use the installed print/stream-json behavior and append role context without globally replacing user configuration. Confirm whether bidirectional permission requests are supported in this mode.

This task's production implementation follows the completed probe matrix. If that matrix reports a missing mandatory capability, stop this adapter with a precise blocker; do not fabricate parser fixtures or mark it compatible.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/claude.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Handle fragmented stream lines, malformed events, stderr-only failure and killed process.
- Prove Forja MCP path and native-shell refusal in a disposable authenticated smoke run.
- Feature/role/CLI identity is preserved on resume; login failure is distinct from installed status.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Implement the verified codex transport, parser and resume path

**Requirement:** REQ-015, REQ-018, REQ-019, REQ-023, REQ-046, REQ-048, REQ-051, REQ-052
**Depends on:** shared session transport task for this plan
**Files:**

- Create: `src/core/engines/codex/index.ts`
- Create: `src/core/engines/codex/launch.ts`
- Create: `src/core/engines/codex/parser.ts`
- Create: `test/engines/codex.test.ts`
- Test: `test/engines/codex.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createParser } from '../../src/core/engines/codex/parser'
it('parses the versioned codex fixture without dropping terminal completion', () => {
  const parser = createParser()
  const fixture = readFileSync('test/fixtures/engines/codex.jsonl', 'utf8')
  const events = fixture.split('\n').filter(Boolean).flatMap(line => parser.line(line))
  expect(events.some(event => event.type === 'done' || event.type === 'error')).toBe(true)
  expect(parser.end(0, '').filter(event => event.type === 'done')).toHaveLength(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/codex.test.ts`

Expected: FAIL because the codex parser/controlled adapter does not yet implement the verified protocol. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Read the codex row in docs/technical/cli-capabilities.md before selecting flags or transport. Implement launch configuration, incremental parser and engine factory through the normalized EngineAdapter. Use the actually installed version contract, not guessed compatibility with another CLI. Attach the per-run Forja MCP capability and effective native-shell/privileged-tool restrictions while preserving supported native auth/config. Refuse an unverified/unsupported controlled mode before spawn.

```typescript
export interface Parser {
  line(value: string): import('../types').EngineEvent[]
  end(code: number | null, stderr: string): import('../types').EngineEvent[]
}
```

Normalize text/session/tool/permission/final events, no double completion, bounded invalid lines and error context. Preserve the exact session ID per feature and role; resume only through this CLI's supported mechanism. The parser instance needs a terminal-seen state for end(). Test incremental events and structured nested tool output against recorded fixtures, not only the seed.

Verify exec JSON vs app-server transport and approval limitations. If persistent permission control needs app-server, implement that verified transport behind the adapter rather than bypass approvals in exec.

This task's production implementation follows the completed probe matrix. If that matrix reports a missing mandatory capability, stop this adapter with a precise blocker; do not fabricate parser fixtures or mark it compatible.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/codex.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Handle fragmented stream lines, malformed events, stderr-only failure and killed process.
- Prove Forja MCP path and native-shell refusal in a disposable authenticated smoke run.
- Feature/role/CLI identity is preserved on resume; login failure is distinct from installed status.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Implement the verified opencode transport, parser and resume path

**Requirement:** REQ-015, REQ-018, REQ-019, REQ-023, REQ-046, REQ-048, REQ-051, REQ-052
**Depends on:** shared session transport task for this plan
**Files:**

- Create: `src/core/engines/opencode/index.ts`
- Create: `src/core/engines/opencode/launch.ts`
- Create: `src/core/engines/opencode/parser.ts`
- Create: `test/engines/opencode.test.ts`
- Test: `test/engines/opencode.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createParser } from '../../src/core/engines/opencode/parser'
it('parses the versioned opencode fixture without dropping terminal completion', () => {
  const parser = createParser()
  const fixture = readFileSync('test/fixtures/engines/opencode.jsonl', 'utf8')
  const events = fixture.split('\n').filter(Boolean).flatMap(line => parser.line(line))
  expect(events.some(event => event.type === 'done' || event.type === 'error')).toBe(true)
  expect(parser.end(0, '').filter(event => event.type === 'done')).toHaveLength(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/opencode.test.ts`

Expected: FAIL because the opencode parser/controlled adapter does not yet implement the verified protocol. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Read the opencode row in docs/technical/cli-capabilities.md before selecting flags or transport. Implement launch configuration, incremental parser and engine factory through the normalized EngineAdapter. Use the actually installed version contract, not guessed compatibility with another CLI. Attach the per-run Forja MCP capability and effective native-shell/privileged-tool restrictions while preserving supported native auth/config. Refuse an unverified/unsupported controlled mode before spawn.

```typescript
export interface Parser {
  line(value: string): import('../types').EngineEvent[]
  end(code: number | null, stderr: string): import('../types').EngineEvent[]
}
```

Normalize text/session/tool/permission/final events, no double completion, bounded invalid lines and error context. Preserve the exact session ID per feature and role; resume only through this CLI's supported mechanism. The parser instance needs a terminal-seen state for end(). Test incremental events and structured nested tool output against recorded fixtures, not only the seed.

Use the verified v2 private-server/ACP/API mechanism as appropriate; do not fight the user background service. Own and stop private server processes and scope MCP attachment.

This task's production implementation follows the completed probe matrix. If that matrix reports a missing mandatory capability, stop this adapter with a precise blocker; do not fabricate parser fixtures or mark it compatible.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/opencode.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Handle fragmented stream lines, malformed events, stderr-only failure and killed process.
- Prove Forja MCP path and native-shell refusal in a disposable authenticated smoke run.
- Feature/role/CLI identity is preserved on resume; login failure is distinct from installed status.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Implement the verified agy transport, parser and resume path

**Requirement:** REQ-015, REQ-018, REQ-019, REQ-023, REQ-046, REQ-048, REQ-051, REQ-052
**Depends on:** shared session transport task for this plan
**Files:**

- Create: `src/core/engines/agy/index.ts`
- Create: `src/core/engines/agy/launch.ts`
- Create: `src/core/engines/agy/parser.ts`
- Create: `test/engines/agy.test.ts`
- Test: `test/engines/agy.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createParser } from '../../src/core/engines/agy/parser'
it('parses the versioned agy fixture without dropping terminal completion', () => {
  const parser = createParser()
  const fixture = readFileSync('test/fixtures/engines/agy.jsonl', 'utf8')
  const events = fixture.split('\n').filter(Boolean).flatMap(line => parser.line(line))
  expect(events.some(event => event.type === 'done' || event.type === 'error')).toBe(true)
  expect(parser.end(0, '').filter(event => event.type === 'done')).toHaveLength(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/agy.test.ts`

Expected: FAIL because the agy parser/controlled adapter does not yet implement the verified protocol. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Read the agy row in docs/technical/cli-capabilities.md before selecting flags or transport. Implement launch configuration, incremental parser and engine factory through the normalized EngineAdapter. Use the actually installed version contract, not guessed compatibility with another CLI. Attach the per-run Forja MCP capability and effective native-shell/privileged-tool restrictions while preserving supported native auth/config. Refuse an unverified/unsupported controlled mode before spawn.

```typescript
export interface Parser {
  line(value: string): import('../types').EngineEvent[]
  end(code: number | null, stderr: string): import('../types').EngineEvent[]
}
```

Normalize text/session/tool/permission/final events, no double completion, bounded invalid lines and error context. Preserve the exact session ID per feature and role; resume only through this CLI's supported mechanism. The parser instance needs a terminal-seen state for end(). Test incremental events and structured nested tool output against recorded fixtures, not only the seed.

Use its verified print stream-json or bidirectional stream interface with per-invocation settings. Do not infer settings fields merely from flag names.

This task's production implementation follows the completed probe matrix. If that matrix reports a missing mandatory capability, stop this adapter with a precise blocker; do not fabricate parser fixtures or mark it compatible.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/agy.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Handle fragmented stream lines, malformed events, stderr-only failure and killed process.
- Prove Forja MCP path and native-shell refusal in a disposable authenticated smoke run.
- Feature/role/CLI identity is preserved on resume; login failure is distinct from installed status.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 6: Implement the verified grok transport, parser and resume path

**Requirement:** REQ-015, REQ-018, REQ-019, REQ-023, REQ-046, REQ-048, REQ-051, REQ-052
**Depends on:** shared session transport task for this plan
**Files:**

- Create: `src/core/engines/grok/index.ts`
- Create: `src/core/engines/grok/launch.ts`
- Create: `src/core/engines/grok/parser.ts`
- Create: `test/engines/grok.test.ts`
- Test: `test/engines/grok.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createParser } from '../../src/core/engines/grok/parser'
it('parses the versioned grok fixture without dropping terminal completion', () => {
  const parser = createParser()
  const fixture = readFileSync('test/fixtures/engines/grok.jsonl', 'utf8')
  const events = fixture.split('\n').filter(Boolean).flatMap(line => parser.line(line))
  expect(events.some(event => event.type === 'done' || event.type === 'error')).toBe(true)
  expect(parser.end(0, '').filter(event => event.type === 'done')).toHaveLength(0)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/grok.test.ts`

Expected: FAIL because the grok parser/controlled adapter does not yet implement the verified protocol. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Read the grok row in docs/technical/cli-capabilities.md before selecting flags or transport. Implement launch configuration, incremental parser and engine factory through the normalized EngineAdapter. Use the actually installed version contract, not guessed compatibility with another CLI. Attach the per-run Forja MCP capability and effective native-shell/privileged-tool restrictions while preserving supported native auth/config. Refuse an unverified/unsupported controlled mode before spawn.

```typescript
export interface Parser {
  line(value: string): import('../types').EngineEvent[]
  end(code: number | null, stderr: string): import('../types').EngineEvent[]
}
```

Normalize text/session/tool/permission/final events, no double completion, bounded invalid lines and error context. Preserve the exact session ID per feature and role; resume only through this CLI's supported mechanism. The parser instance needs a terminal-seen state for end(). Test incremental events and structured nested tool output against recorded fixtures, not only the seed.

Use the installed streaming format, resume and tool restriction controls; distinguish streaming-json variants. Do not force always-approve or pretend usage is available when absent.

This task's production implementation follows the completed probe matrix. If that matrix reports a missing mandatory capability, stop this adapter with a precise blocker; do not fabricate parser fixtures or mark it compatible.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/grok.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Handle fragmented stream lines, malformed events, stderr-only failure and killed process.
- Prove Forja MCP path and native-shell refusal in a disposable authenticated smoke run.
- Feature/role/CLI identity is preserved on resume; login failure is distinct from installed status.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 7: Persist sessions and implement interrupt/queue with permission routing

**Requirement:** REQ-006, REQ-007, REQ-018, REQ-019, REQ-023, REQ-034, REQ-053
**Depends on:** Task 6
**Files:**

- Create: `src/core/sessions/service.ts`
- Create: `src/core/sessions/queue.ts`
- Create: `src/core/sessions/permissions.ts`
- Create: `test/sessions/queue.test.ts`
- Modify: `src/core/index.ts`
- Modify: `src/shared/contracts.ts`
- Test: `test/sessions/queue.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { MessageQueue } from '../../src/core/sessions/queue'
it('preserves ordered messages independently per feature', () => {
  const queue = new MessageQueue()
  queue.push('f1', 'one'); queue.push('f2', 'other'); queue.push('f1', 'two')
  expect(queue.shift('f1')).toBe('one')
  expect(queue.shift('f1')).toBe('two')
  expect(queue.shift('f2')).toBe('other')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/sessions/queue.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement durable role conversation/session records and message queues with idempotent request IDs. Default interrupt waits for CLI and its foreground command to stop, records an interrupted turn and starts/resumes only after gate/lease recheck. Queue mode persists FIFO by feature with explicit requested recipient, never silently readdresses a queued user instruction after a handoff. On selected feature active-agent changes, adjust only its composer default; explicit in-progress draft/recipient choice stays user-controlled.

```typescript
export class MessageQueue {
  private values = new Map<string, string[]>()
  push(featureId: string, text: string): void {
    const list = this.values.get(featureId) ?? []
    list.push(text); this.values.set(featureId, list)
  }
  shift(featureId: string): string | undefined { return this.values.get(featureId)?.shift() }
}
```

Use this FIFO contract inside the SQLite-backed service. Native resume failure requests explicit consent for reconstructed session; profile/engine changes create a new lineage, not cross-engine resume. Where a CLI can surface approval, route exact pending request to the UI; otherwise pause with capability limitation instead of auto-approving.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/sessions/queue.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Two sends during stop cannot create duplicate turns; wrong feature never receives the instruction.
- Native resume unsupported/failed produces a consent state with preserved history.
- Permission rejection and app shutdown leave truthful interrupted state and no orphan foreground process.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 8: Flag stalled turns, force stop and record CLI-reported usage

**Requirement:** REQ-007, REQ-034, REQ-052, REQ-059, REQ-060
**Depends on:** Task 7
**Files:**

- Create: `src/core/sessions/watchdog.ts`
- Create: `src/core/sessions/usage.ts`
- Create: `test/sessions/watchdog.test.ts`
- Test: `test/sessions/watchdog.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { turnHealth } from '../../src/core/sessions/watchdog'
import { aggregateUsage } from '../../src/core/sessions/usage'
it('flags inactivity without killing and keeps unreported usage unavailable', () => {
  const minute = 60_000
  expect(turnHealth({ lastEventAt: 0, now: 9 * minute, windowMinutes: 10 })).toBe('running')
  expect(turnHealth({ lastEventAt: 0, now: 10 * minute, windowMinutes: 10 })).toBe('unresponsive')
  expect(aggregateUsage([{ inputTokens: 10, outputTokens: 5 }, { inputTokens: 1, outputTokens: 2 }])).toEqual({ inputTokens: 11, outputTokens: 7 })
  expect(aggregateUsage([null, { inputTokens: 1, outputTokens: 2 }])).toEqual({ inputTokens: 1, outputTokens: 2, partial: true })
  expect(aggregateUsage([{ inputTokens: 1, outputTokens: 1, costUsd: 0.5 }, { inputTokens: 1, outputTokens: 1 }])).toEqual({ inputTokens: 2, outputTokens: 2, partial: true })
  expect(aggregateUsage([null, null])).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/sessions/watchdog.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Track the last normalized event per running turn. When no event arrives within the snapshot inactivity window, persist the turn as `unresponsive` and surface "keep waiting" and "stop" actions; any later event returns it to `running`. The watchdog never signals a process. A forced stop is always available for a running or unresponsive turn: it terminates the owned process group with the same escalation as interruption and releases the feature lease only after termination is confirmed. Usage comes only from normalized adapter events that report it; aggregate per turn and per feature, mark totals as partial when some turns did not report, and show "unavailable" when none did. Never estimate tokens or cost.

```typescript
export function turnHealth(input: { lastEventAt: number; now: number; windowMinutes: number }): 'running' | 'unresponsive' {
  return input.now - input.lastEventAt >= input.windowMinutes * 60_000 ? 'unresponsive' : 'running'
}
```

```typescript
export type Usage = { inputTokens: number; outputTokens: number; costUsd?: number; partial?: true }
export function aggregateUsage(turns: (Usage | null)[]): Usage | null {
  const reported = turns.filter((t): t is Usage => t !== null)
  if (reported.length === 0) return null
  const out: Usage = {
    inputTokens: reported.reduce((n, t) => n + t.inputTokens, 0),
    outputTokens: reported.reduce((n, t) => n + t.outputTokens, 0),
  }
  const allCost = reported.every(t => t.costUsd !== undefined)
  if (allCost) out.costUsd = reported.reduce((n, t) => n + (t.costUsd ?? 0), 0)
  if (reported.length < turns.length || !allCost && reported.some(t => t.costUsd !== undefined)) out.partial = true
  return out
}
```

Extend EngineEvent with an optional usage payload per adapter only where the probe matrix records it. Cost fields stay absent when a CLI reports tokens only.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/sessions/watchdog.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A fake CLI that stops emitting is flagged, keeps its lease, and a forced stop releases the lease only after the process group exits.
- A late event after the flag returns the turn to running without a duplicate turn.
- Cost from turns with and without cost fields never sums into a fabricated total.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 9: Derive waiting and turn-end states from fallback signals

**Requirement:** REQ-095, REQ-018
**Depends on:** Task 8
**Files:**

- Create: `src/core/engines/fallback-status.ts`
- Test: `test/engines/fallback-status.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { fromFallback } from '../../src/core/engines/fallback-status'
it('maps fallback signals to content-free events', () => {
  const at = '2026-11-01T12:00:00.000Z'
  expect(fromFallback('osc7501', '\u001b]7501;blocked\u0007', at)).toEqual({ type: 'waiting', at })
  expect(fromFallback('osc7501', '\u001b]7501;done\u0007', at)).toEqual({ type: 'done', at })
  expect(fromFallback('hooks', JSON.stringify({ hook_event_name: 'Stop', prompt: 'secret' }), at)).toEqual({ type: 'done', at })
  expect(fromFallback('window-title', '⚠ Action Required · grok', at)).toEqual({ type: 'waiting', at })
  expect(fromFallback('hooks', 'not json', at)).toBeUndefined()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/fallback-status.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Feed each adapter's secondary channel (from its capability contract, REQ-095) into the normalized event stream as `waiting` or `done` only when the structured stream has not already reported that state for the turn. Keep exactly `type` and `at`: drop every other field of hook payloads, OSC sequences or titles before they leave the parser. Hook settings are passed per invocation and write to a per-turn file inside the Forja data folder that is deleted at turn end. Malformed input is ignored with a bounded diagnostic counter, never surfaced as a fabricated state (REQ-052).

```typescript
import type { FallbackSignal } from './capabilities'
export interface FallbackEvent { type: 'waiting' | 'done'; at: string }
const hookStates: Record<string, FallbackEvent['type']> = { Stop: 'done', Notification: 'waiting', PermissionRequest: 'waiting' }
export function fromFallback(signal: FallbackSignal, raw: string, at: string): FallbackEvent | undefined {
  if (signal === 'osc7501') {
    const state = /\u001b\]7501;(\w+)\u0007/.exec(raw)?.[1]
    return state === 'blocked' ? { type: 'waiting', at } : state === 'done' ? { type: 'done', at } : undefined
  }
  if (signal === 'window-title') return /Action Required/.test(raw) ? { type: 'waiting', at } : undefined
  if (signal === 'hooks') {
    try {
      const type = hookStates[(JSON.parse(raw) as { hook_event_name?: string }).hook_event_name ?? '']
      return type ? { type, at } : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}
```

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/fallback-status.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A structured `permission` event already received for the turn suppresses the duplicate fallback event.
- The per-turn hook file lives under the Forja data folder and is removed at turn end, including after a crash on next start.
- A hook payload with a prompt field never reaches persistence or logs (assert on the stored row).

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 10: Query opt-in plan usage on the AIBar model

**Requirement:** REQ-102, REQ-015, REQ-060
**Depends on:** Task 1
**Files:**

- Create: `src/core/usage/plan-usage.ts`
- Create: `src/core/usage/providers.ts`
- Test: `test/usage/plan-usage.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { readPlanUsage } from '../../src/core/usage/plan-usage'
it('reads usage only when opted in and never exposes the token', async () => {
  const readLogin = vi.fn(async () => ({ accessToken: 'tok-123', expiresAt: Date.now() + 60_000 }))
  const fetchUsage = vi.fn(async () => ({ five_hour: { utilization: 42, resets_at: '2026-11-01T15:00:00Z' } }))
  expect(await readPlanUsage('claude', { enabled: false, readLogin, fetchUsage })).toEqual({ status: 'unavailable' })
  expect(readLogin).not.toHaveBeenCalled()
  const usage = await readPlanUsage('claude', { enabled: true, readLogin, fetchUsage })
  expect(usage).toMatchObject({ status: 'ok', windows: [{ kind: 'five-hour', used: 42 }] })
  expect(JSON.stringify(usage)).not.toContain('tok-123')
  const expired = vi.fn(async () => ({ accessToken: 'tok-123', expiresAt: Date.now() - 1 }))
  expect(await readPlanUsage('claude', { enabled: true, readLogin: expired, fetchUsage })).toEqual({ status: 'login-expired' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/usage/plan-usage.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implement one provider per tool with the endpoints already proven by the user's AIBar plugin: Claude `GET https://api.anthropic.com/api/oauth/usage` (headers `Authorization: Bearer`, `anthropic-beta: oauth-2025-04-20`, a Claude CLI `User-Agent`) from `~/.claude/.credentials.json`; Codex `GET https://chatgpt.com/backend-api/wham/usage` from `~/.codex/auth.json`; Grok `GET https://cli-chat-proxy.grok.com/v1/billing?format=credits` from `~/.grok/auth.json`; agy runs `agy -p "/quota" --output-format json` and reads no credential; OpenCode reports unavailable unless its official usage source is verified. Credentials are read only when the tool is enabled in Settings, live only in the function scope and request headers, and are never written, copied, cached, logged, put in argv or refreshed (REQ-015 as amended). Results map to the REQ-082 window model; failures keep the last value marked unavailable.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/usage/plan-usage.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A disabled tool performs no file read and no network call (spies stay untouched).
- Logs and persisted snapshots of a failing request contain no token or Authorization header.
- An expired login returns `login-expired`; no refresh request is sent.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
