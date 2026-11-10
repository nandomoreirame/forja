# Plan: CLI Capability Adapters

> **Spec:** docs/specs/cli-capability-adapters/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Detect, verify and normalize the five supported CLIs behind one engine interface.
**Architecture:** Capability contracts per CLI, bounded local probes, line parsers from recorded fixtures into a versioned normalized event schema, and a controlled-mode guard.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 04
**Total Tasks:** 10
**Estimated Complexity:** large
**Status:** Approved scope, planned; not implemented.
**Lessons applied:** none

## Dependencies

- None.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the parent spec, this slice spec and the current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.
- Core code lives in `src/core/<area>/`, runs in the Electron utility process and is tested in the Vitest node environment (`// @vitest-environment node`) with temporary databases, folders and Git repositories; no paid model calls.
- The renderer keeps reading through `WorkbenchSource`; screens never import core modules.

## Acceptance

- Settings show each CLI installed, authenticated or missing.
- Every adapter turns its stream into normalized events.

## Checks

**Run slice**: `npx vitest run test/core/capabilities.test.ts test/core/controlled-mode.test.ts test/core/detect.test.ts test/core/engine-agy.test.ts test/core/engine-claude.test.ts test/core/engine-codex.test.ts test/core/engine-events.test.ts test/core/engine-grok.test.ts test/core/engine-opencode.test.ts test/core/secondary-signals.test.ts --reporter=verbose`

- C1 (REQ-012): normalized cli events holds as specified. Proof: run slice | ✓ validates normalized events and bounds diagnostic context
- C2 (REQ-057): supported clis holds as specified. Proof: run slice | ✓ records a contract per supported CLI and parses version output
- C3 (REQ-058): cli detection holds as specified. Proof: run slice | ✓ tells installation from authentication without network calls
- C4 (REQ-062): derived waiting and completion holds as specified. Proof: run slice | ✓ derives waiting and completed from the contract signal only
- C5 (REQ-066): controlled mode holds as specified. Proof: run slice | ✓ starts a turn only when the Forja MCP is attached and native shell tools are restricted

## Tasks

### Task 1: Normalize CLI events in a versioned schema

**Requirement:** REQ-012
**Files:**

- Modify: `src/core/engines/types.ts`
- Create: `src/core/engines/events.ts`
- Test: `test/core/engine-events.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { normalizedEventSchema, boundDiagnostics } from '../../src/core/engines/events'
it('validates normalized events and bounds diagnostic context', () => {
  expect(normalizedEventSchema.safeParse({ v: 1, type: 'text', delta: 'hi' }).success).toBe(true)
  expect(normalizedEventSchema.safeParse({ v: 1, type: 'usage', input: 10, cached: 0, output: 3 }).success).toBe(true)
  expect(normalizedEventSchema.safeParse({ v: 2, type: 'text', delta: 'hi' }).success).toBe(false)
  expect(boundDiagnostics('x'.repeat(10_000)).length).toBeLessThanOrEqual(4096)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/engine-events.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`EngineId` becomes `claude | codex | opencode | agy | grok`. Events (`session`, `text`, `tool`, `permission`, `waiting`, `completed`, `error`, `usage`) carry `v: 1`; diagnostics keep the last 4 KiB.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/engine-events.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Unknown event types are refused.
- Negative usage numbers are refused.
- Diagnostics strip ANSI escape sequences.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Record CLI capability contracts

**Requirement:** REQ-057
**Files:**

- Create: `src/core/engines/capabilities.ts`
- Test: `test/core/capabilities.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { capabilityContracts, parseVersion } from '../../src/core/engines/capabilities'
it('records a contract per supported CLI and parses version output', () => {
  expect(Object.keys(capabilityContracts).sort()).toEqual(['agy', 'claude', 'codex', 'grok', 'opencode'])
  for (const contract of Object.values(capabilityContracts)) expect(contract.minVersion).toMatch(/^\d+\.\d+/)
  expect(parseVersion('claude', '2.1.3 (Claude Code)')).toBe('2.1.3')
  expect(parseVersion('codex', 'garbage')).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/capabilities.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Each contract states min version, stream format, MCP attachment method, resume support, usage reporting and the secondary waiting signal; values come from the slice's spike notes and stay `unverified` until the live smoke checks (slice 17) pass.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/capabilities.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A CLI below its min version is reported unsupported.
- Contracts never contain credentials or paths to them.
- Unverified contracts are labeled so.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Detect installed CLIs with bounded probes

**Requirement:** REQ-058
**Depends on:** Task 2
**Files:**

- Create: `src/core/engines/detect.ts`
- Test: `test/core/detect.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { detectCli } from '../../src/core/engines/detect'
it('tells installation from authentication without network calls', async () => {
  const run = async (cmd: string, args: string[]) => (args.includes('--version') ? { code: 0, stdout: '2.1.3', stderr: '' } : { code: 1, stdout: '', stderr: 'not logged in' })
  expect(await detectCli('claude', { which: async () => '/usr/bin/claude', run, timeoutMs: 2000 })).toMatchObject({ installed: true, version: '2.1.3', authenticated: false })
  expect(await detectCli('grok', { which: async () => null, run, timeoutMs: 2000 })).toMatchObject({ installed: false })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/detect.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Probes use the contract's local auth check (never a model call), a hard timeout and killed process groups on timeout; results are cached per session and refreshed on demand.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/detect.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A hanging probe resolves as unknown after the timeout.
- Stderr content is not shown verbatim when it may contain tokens.
- Detection never writes files.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Parse the claude stream into normalized events

**Requirement:** REQ-012
**Depends on:** Task 1
**Files:**

- Create: `src/core/engines/claude.ts`
- Create: `test/fixtures/engines/claude.jsonl`
- Test: `test/core/engine-claude.test.ts`

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
import { parseClaudeLine } from '../../src/core/engines/claude'
it('maps recorded claude output to session, text, usage and completion events', () => {
  const events = readFileSync('test/fixtures/engines/claude.jsonl', 'utf8').trim().split('\n').flatMap((line) => parseClaudeLine(line))
  expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['session', 'text', 'completed']))
  expect(events.every((e) => e.v === 1)).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/engine-claude.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Record a short real `claude` structured output (no secrets) as the fixture and map each line to zero or more normalized events; malformed lines become one bounded `error` diagnostic instead of throwing.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/engine-claude.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A malformed line yields an error event, not an exception.
- Tool calls map to `tool` events with name and status.
- Usage maps when present and is absent otherwise.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Parse the codex stream into normalized events

**Requirement:** REQ-012
**Depends on:** Task 1
**Files:**

- Create: `src/core/engines/codex.ts`
- Create: `test/fixtures/engines/codex.jsonl`
- Test: `test/core/engine-codex.test.ts`

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
import { parseCodexLine } from '../../src/core/engines/codex'
it('maps recorded codex output to session, text, usage and completion events', () => {
  const events = readFileSync('test/fixtures/engines/codex.jsonl', 'utf8').trim().split('\n').flatMap((line) => parseCodexLine(line))
  expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['session', 'text', 'completed']))
  expect(events.every((e) => e.v === 1)).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/engine-codex.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Record a short real `codex` structured output (no secrets) as the fixture and map each line to zero or more normalized events; malformed lines become one bounded `error` diagnostic instead of throwing.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/engine-codex.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A malformed line yields an error event, not an exception.
- Tool calls map to `tool` events with name and status.
- Usage maps when present and is absent otherwise.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 6: Parse the opencode stream into normalized events

**Requirement:** REQ-012
**Depends on:** Task 1
**Files:**

- Create: `src/core/engines/opencode.ts`
- Create: `test/fixtures/engines/opencode.jsonl`
- Test: `test/core/engine-opencode.test.ts`

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
import { parseOpencodeLine } from '../../src/core/engines/opencode'
it('maps recorded opencode output to session, text, usage and completion events', () => {
  const events = readFileSync('test/fixtures/engines/opencode.jsonl', 'utf8').trim().split('\n').flatMap((line) => parseOpencodeLine(line))
  expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['session', 'text', 'completed']))
  expect(events.every((e) => e.v === 1)).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/engine-opencode.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Record a short real `opencode` structured output (no secrets) as the fixture and map each line to zero or more normalized events; malformed lines become one bounded `error` diagnostic instead of throwing.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/engine-opencode.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A malformed line yields an error event, not an exception.
- Tool calls map to `tool` events with name and status.
- Usage maps when present and is absent otherwise.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 7: Parse the agy stream into normalized events

**Requirement:** REQ-012
**Depends on:** Task 1
**Files:**

- Create: `src/core/engines/agy.ts`
- Create: `test/fixtures/engines/agy.jsonl`
- Test: `test/core/engine-agy.test.ts`

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
import { parseAgyLine } from '../../src/core/engines/agy'
it('maps recorded agy output to session, text, usage and completion events', () => {
  const events = readFileSync('test/fixtures/engines/agy.jsonl', 'utf8').trim().split('\n').flatMap((line) => parseAgyLine(line))
  expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['session', 'text', 'completed']))
  expect(events.every((e) => e.v === 1)).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/engine-agy.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Record a short real `agy` structured output (no secrets) as the fixture and map each line to zero or more normalized events; malformed lines become one bounded `error` diagnostic instead of throwing.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/engine-agy.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A malformed line yields an error event, not an exception.
- Tool calls map to `tool` events with name and status.
- Usage maps when present and is absent otherwise.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 8: Parse the grok stream into normalized events

**Requirement:** REQ-012
**Depends on:** Task 1
**Files:**

- Create: `src/core/engines/grok.ts`
- Create: `test/fixtures/engines/grok.jsonl`
- Test: `test/core/engine-grok.test.ts`

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
import { parseGrokLine } from '../../src/core/engines/grok'
it('maps recorded grok output to session, text, usage and completion events', () => {
  const events = readFileSync('test/fixtures/engines/grok.jsonl', 'utf8').trim().split('\n').flatMap((line) => parseGrokLine(line))
  expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['session', 'text', 'completed']))
  expect(events.every((e) => e.v === 1)).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/engine-grok.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Record a short real `grok` structured output (no secrets) as the fixture and map each line to zero or more normalized events; malformed lines become one bounded `error` diagnostic instead of throwing.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/engine-grok.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A malformed line yields an error event, not an exception.
- Tool calls map to `tool` events with name and status.
- Usage maps when present and is absent otherwise.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 9: Refuse uncontrolled execution

**Requirement:** REQ-066
**Depends on:** Task 2
**Files:**

- Create: `src/core/engines/controlled-mode.ts`
- Test: `test/core/controlled-mode.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { assertControlled } from '../../src/core/engines/controlled-mode'
it('starts a turn only when the Forja MCP is attached and native shell tools are restricted', () => {
  expect(() => assertControlled({ mcpAttached: true, nativeShell: 'denied' })).not.toThrow()
  expect(() => assertControlled({ mcpAttached: false, nativeShell: 'denied' })).toThrow(/MCP/)
  expect(() => assertControlled({ mcpAttached: true, nativeShell: 'allowed' })).toThrow(/shell/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/controlled-mode.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Each adapter reports its effective control from a handshake (MCP tool list visible, native shell tools disabled by per-invocation flags); a turn whose control cannot be verified fails with an actionable message and is never retried uncontrolled.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/controlled-mode.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- An unknown control state refuses the turn.
- The refusal names the CLI and the missing control.
- No user configuration file is edited to gain control.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 10: Derive waiting and completion from secondary signals

**Requirement:** REQ-062
**Depends on:** Task 2
**Files:**

- Create: `src/core/engines/secondary-signals.ts`
- Test: `test/core/secondary-signals.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { deriveState } from '../../src/core/engines/secondary-signals'
it('derives waiting and completed from the contract signal only', () => {
  expect(deriveState({ signal: 'osc7501', data: '\u001b]7501;waiting\u0007' })).toEqual({ v: 1, type: 'waiting' })
  expect(deriveState({ signal: 'title', data: 'agy ✓ done' })).toEqual({ v: 1, type: 'completed' })
  expect(deriveState({ signal: 'title', data: 'random' })).toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/secondary-signals.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Support the signal kinds named in contracts (per-invocation hook output, notify command, OSC 7501, window title); record only the derived state, never the raw terminal content.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/secondary-signals.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Signals for another chat are ignored.
- Duplicate signals do not emit twice.
- A CLI with structured waiting events ignores secondary signals.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-cli-capability-adapters.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
