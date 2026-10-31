# Plan: Five CLI Capability Contracts

> **Spec:** docs/specs/cli-capability-contracts/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Establish verified per-version integration contracts for all five installed CLIs before claiming controlled execution support.
**Architecture:** Follow the parent spec and public module contracts. All backend authority stays in core; browser compositions stay shared and side-effect free. Never depend on site internals from Electron.
**Tech Stack:** Electron, React, TypeScript, SQLite, Zod; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 02 of 13
**Total Tasks:** 3
**Estimated Complexity:** small
**Status:** Approved scope, planned; not implemented.

## Dependencies

- Existing scaffold only.

## Execution Contract

- Planning only now. Later rpi-implement execution honors its current task-commit authorization and independent-review rules; do not interpret old deferred-commit text as overriding a current user instruction.
- No branch switch, merge, push or destructive Git action is authorized by this plan-generation request.
- Read the complete parent/child spec and current source before Task 1. New APIs below are implementation contracts, not claims that modules already exist.
- Each task is a coherent slice; split its stated checks into smaller RED/GREEN increments where needed. Do not skip a dependency or replace a named service with an untested inline shortcut.
- Existing-file modifications are validated against the planning baseline. New files are owned by the named task; later integration must extend their public APIs without losing behavior. Record adaptations and recheck paths before implementation.
- Source snippets are seed contract tests. Expand fixtures and integration wiring to the acceptance cases; do not implement test-only hardcoded results. UI code follows the approved exports and shared components, not invented markup from a test.

## Acceptance

- All five IDs have versioned discovery/protocol records.
- Controlled-ready requires actual restriction proof.
- Missing live validation is reported as pending. A protocol fixture is not model-auth proof.

## Tasks

### Task 1: Define the five engine IDs and capability evidence schema

**Requirement:** REQ-015, REQ-019, REQ-046
**Depends on:** none within this plan
**Files:**
- Create: `src/core/engines/capabilities.ts`
- Create: `test/engines/capabilities.test.ts`
- Modify: `src/core/engines/types.ts`
- Test: `test/engines/capabilities.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { controlledReady } from '../../src/core/engines/capabilities'
it('refuses a nominally installed CLI without restriction evidence', () => {
  expect(controlledReady({ installed: true, version: 'test', mcp: true, nativeShellBlocked: false, verified: false })).toBe(false)
  expect(controlledReady({ installed: true, version: 'test', mcp: true, nativeShellBlocked: true, verified: true })).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/capabilities.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Replace the scaffold's unused Gemini/Pi IDs with claude, codex, opencode, agy and grok. Expand the engine contract to distinguish discovered, authenticated, verified and controlled-ready states, with version, transport, MCP/restriction proof, cancellation/resume support and error reason. Do not infer authentication from installation.

```typescript
export interface CapabilityEvidence {
  installed: boolean; version: string; mcp: boolean; nativeShellBlocked: boolean; verified: boolean
}
export function controlledReady(evidence: CapabilityEvidence): boolean {
  return evidence.installed && evidence.mcp && evidence.nativeShellBlocked && evidence.verified
}
```

Actual approval routing and alternate native shell paths must also have explicit evidence before setting verified true; a flag name alone is not proof.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/capabilities.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Reject missing/unknown IDs and unsupported effort values.
- Keep installed-but-unverified tools visible with an actionable unavailable reason.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Discover executable and version using bounded local probes

**Requirement:** REQ-015, REQ-046, REQ-052
**Depends on:** Task 1
**Files:**
- Create: `src/core/engines/discovery.ts`
- Create: `src/core/engines/probe.ts`
- Create: `test/engines/discovery.test.ts`
- Test: `test/engines/discovery.test.ts`

**Team:**
- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { probeVersion } from '../../src/core/engines/probe'
it('does not treat a missing executable as a successful installation', async () => {
  const result = await probeVersion('/not/a/forja-cli', { timeoutMs: 100 })
  expect(result.installed).toBe(false)
  expect(result.error).toBeTruthy()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/discovery.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Resolve binaries using the GUI's actual PATH plus a bounded login-shell PATH discovery without printing its environment. Invoke version/help with execFile/spawn argv arrays and timeout/output caps. Store only path/version/capability diagnostics. Never run a model prompt or read auth files on startup. Handle the agy/grok wrappers and npm shims explicitly rather than assuming executable suffixes.

```typescript
export const cliNames = ['claude', 'codex', 'opencode', 'agy', 'grok'] as const
export const discoveryLimits = { timeoutMs: 5000, maxOutputBytes: 65536 } as const
```

Expose cancellation and preserve enough non-secret stderr to distinguish not-found, denied and malformed probe output.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/discovery.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Probe a fake executable with spaces in its path and a timeout fixture that spawns children.
- No prompt, provider network call or credential content in discovery logs.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Record installed protocol fixtures and a controlled-execution proof matrix

**Requirement:** REQ-018, REQ-019, REQ-023, REQ-046, REQ-051
**Depends on:** Task 2
**Files:**
- Create: `scripts/probe-engines.ts`
- Create: `test/fixtures/engines/contracts.json`
- Create: `test/fixtures/engines/claude.jsonl`
- Create: `test/fixtures/engines/codex.jsonl`
- Create: `test/fixtures/engines/opencode.jsonl`
- Create: `test/fixtures/engines/agy.jsonl`
- Create: `test/fixtures/engines/grok.jsonl`
- Create: `test/engines/contract-matrix.test.ts`
- Create: `docs/technical/cli-capabilities.md`
- Test: `test/engines/contract-matrix.test.ts`

**Team:**
- Track: infra
- Implementer: infra-engineer (skills: bash-linux, security-guardrails, test-driven-development)
- Reviewers: security-reviewer, consequences-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
it('records every requested CLI without fabricating a compatible tool', () => {
  const rows = JSON.parse(readFileSync('test/fixtures/engines/contracts.json', 'utf8'))
  expect(rows.map((row: { id: string }) => row.id).sort()).toEqual(['agy', 'claude', 'codex', 'grok', 'opencode'])
  for (const row of rows) {
    if (row.controlledReady) expect(row.restrictionProof?.length).toBeGreaterThan(0)
  }
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/engines/contract-matrix.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Inspect installed versions/help and official primary documentation; record exact launch/stream/resume/permission/MCP mechanisms for each version. Capture sanitized fixtures, explicitly tagged recorded vs synthetic, including errors and tool events. Write a probe script that defaults to help-only and requires --live for authenticated checks. Live proof uses a disposable directory and benign echo/file-read command, verifies MCP execution and attempted native shell refusal, then stops/resumes safely.

```typescript
export type VerificationStatus = 'unverified' | 'verified' | 'unsupported'
export interface ToolContract {
  id: 'claude' | 'codex' | 'opencode' | 'agy' | 'grok'
  version: string
  status: VerificationStatus
  controlledReady: boolean
  restrictionProof: string[]
  fixtureKind: 'recorded' | 'synthetic'
}
```

If a CLI cannot enforce the required shell/privileged-tool boundary, mark unsupported with reproduction and keep its later adapter task pending. Do not silently substitute an API provider or remove it from the five-CLI acceptance scope. This spike may identify a real dependency blocker; independent website/core tasks still proceed.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/engines/contract-matrix.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Matrix distinguishes live auth proof from help/fixture evidence.
- Verify session identity, interruption, native tool visibility and inherited MCP/plugin escape routes.
- Never capture tokens/system environment/auth-store files; sanitize fixtures before versioning.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. Once the site exists, keep its typecheck/build covered by the root checks. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run lint, authoritative local tsc, all unit/integration tests and both relevant builds. Run the declared browser/Electron E2E and visual checks for this slice. Record actual implementer, test results, capabilities still unverified and independent review separately. A missing live CLI capability is pending, not PASS. Update only this slice's STATE.md during engineering execution. The product itself stores runtime state in SQLite.

Reviewers must check idempotent file writers and tolerant round trips, ownership checks, no credential leaks, and preservation of user Git work. Stop after the plan has been implemented and validated; use the ordered index for the next authorized slice.
