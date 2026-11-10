# Plan: IPC WorkbenchSource

> **Spec:** docs/specs/ipc-workbench-source/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Replace the renderer mock with a validated IPC bridge to the core without changing screens.
**Architecture:** Strict zod request union in `src/shared/contracts.ts`, a router in the utility process with ownership checks, a main-process bridge and a preload API; the renderer gets `createIpcSource` implementing `WorkbenchSource`.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 03
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

- The desktop app reads chats, backlog and settings from core.
- Flagged screens open in production only after their slice releases them.

## Checks

**Run slice**: `npx vitest run test/core/contracts.test.ts test/core/router.test.ts test/main/core-bridge.test.ts test/renderer/flag-release.test.ts test/renderer/ipc-source.test.ts --reporter=verbose`

- C1 (REQ-065): input validation and ownership holds as specified. Proof: run slice | ✓ accepts known requests and rejects malformed or unknown ones
- C2 (REQ-069): ipc-backed workbenchsource and flag release holds as specified. Proof: run slice | ✓ implements the WorkbenchSource contract over the core bridge

## Tasks

### Task 1: Define validated core request contracts

**Requirement:** REQ-065
**Files:**

- Modify: `src/shared/contracts.ts`
- Test: `test/core/contracts.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { coreRequestSchema } from '../../src/shared/contracts'
it('accepts known requests and rejects malformed or unknown ones', () => {
  expect(coreRequestSchema.safeParse({ id: 'r1', method: 'chats.create', params: { projectId: 'p1', prompt: 'Idea' } }).success).toBe(true)
  expect(coreRequestSchema.safeParse({ id: 'r1', method: 'chats.create', params: { projectId: 'p1', prompt: '' } }).success).toBe(false)
  expect(coreRequestSchema.safeParse({ id: 'r1', method: 'chats.delete', params: {} }).success).toBe(false)
  expect(coreRequestSchema.safeParse({ id: 'r1', method: 'health', extra: 1 }).success).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/contracts.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Replace the health-only schema with a strict discriminated union by `method` (`health`, `projects.open|list`, `chats.create|list|rename|archive|abandon|send|interrupt`, `backlog.add|update|remove|link|list`, `settings.load|save`, `files.tree|read|diff`, `usage.load`), bounded strings and ids; responses are `{ id, result } | { id, error: { code, message } }`.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/contracts.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Oversized prompts are refused.
- Every method has a params schema.
- Responses never include stack traces.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Route core requests with ownership checks

**Requirement:** REQ-065
**Depends on:** Task 1
**Files:**

- Create: `src/core/router.ts`
- Modify: `src/core/index.ts`
- Test: `test/core/router.test.ts`

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
import { createRouter } from '../../src/core/router'
it('serves requests for the window project and refuses foreign chat ids', async () => {
  const router = createRouter(createDatabase(':memory:'))
  const project = (await router.handle({ id: '1', method: 'projects.open', params: { path: process.cwd() } })) as any
  const other = (await router.handle({ id: '2', method: 'projects.open', params: { path: '/tmp' } })) as any
  const chat = (await router.handle({ id: '3', method: 'chats.create', params: { projectId: project.result.id, prompt: 'Idea' } })) as any
  const foreign = await router.handle({ id: '4', method: 'chats.rename', params: { projectId: other.result.id, chatId: chat.result.id, name: 'X' } })
  expect(foreign).toMatchObject({ id: '4', error: { code: 'not_found' } })
  expect(await router.handle({ id: '5', method: 'nope' } as any)).toMatchObject({ error: { code: 'invalid_request' } })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/router.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`createRouter(db)` validates with `coreRequestSchema`, checks that every chat or item belongs to the request project, maps store errors to typed codes (`invalid_request`, `not_found`, `conflict`, `refused`) and never echoes internal messages. `src/core/index.ts` runs `recoverAfterRestart` then answers parent-port messages through the router.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/router.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A store exception becomes `{ code: 'internal' }` without details.
- Requests are handled in arrival order per chat.
- Health still answers `ready`.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Bridge renderer, main and core

**Requirement:** REQ-065
**Depends on:** Task 2
**Files:**

- Create: `src/main/core-bridge.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/desktop.ts`
- Test: `test/main/core-bridge.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createCoreBridge } from '../../src/main/core-bridge'
it('forwards validated requests to the core and resolves the matching response', async () => {
  const sent: unknown[] = []
  let deliver: (msg: unknown) => void = () => {}
  const bridge = createCoreBridge({ postMessage: (m) => sent.push(m), onMessage: (fn) => (deliver = fn) })
  const pending = bridge.request({ method: 'health' })
  const { id } = sent[0] as { id: string }
  deliver({ id, result: { status: 'ready' } })
  await expect(pending).resolves.toEqual({ status: 'ready' })
  await expect(bridge.request({ method: 'chats.delete' } as any)).rejects.toThrow(/invalid/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/main/core-bridge.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Main validates renderer payloads, assigns request ids, times out after a bounded wait and exposes `window.forja.core.request(method, params)` and an event subscription through the preload (context isolation stays on; no raw `ipcRenderer` in the renderer).

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/main/core-bridge.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A response for an unknown id is ignored.
- A core crash rejects pending requests with a typed error.
- Renderer payloads over the size bound are refused.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Serve the renderer through an IPC WorkbenchSource

**Requirement:** REQ-069
**Depends on:** Task 3
**Files:**

- Create: `src/renderer/src/shared/api/ipc-source.ts`
- Modify: `src/renderer/src/shared/api/workbench-source.ts`
- Test: `test/renderer/ipc-source.test.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { createIpcSource } from '../../src/renderer/src/shared/api/ipc-source'
import { createMockSource } from '../../src/renderer/src/shared/api'
it('implements the WorkbenchSource contract over the core bridge', async () => {
  const calls: string[] = []
  const source = createIpcSource({ locale: 'en', request: async (method) => { calls.push(method); return method === 'projects.list' ? [] : { ok: true } } })
  const mock = createMockSource({ locale: 'en' })
  expect(Object.keys(source).sort()).toEqual(Object.keys(mock).sort())
  await source.listProjects()
  expect(calls).toEqual(['projects.list'])
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/ipc-source.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`createIpcSource({ locale, request })` maps every `WorkbenchSource` method to a core method and converts core records (chat with `phase`, backlog items with `source`/`status`) to the renderer types; add `phase` to the chat snapshot type and keep the mock in sync. The renderer entry picks the IPC source when `window.forja.core` exists and the mock otherwise (site, tests).

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/ipc-source.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Core errors surface as typed renderer errors, not crashes.
- The mock and IPC sources pass the same contract suite.
- No screen imports the IPC module directly.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Release flagged screens when their core slice passes

**Requirement:** REQ-069
**Depends on:** Task 4
**Files:**

- Modify: `src/renderer/src/shared/lib/feature-flags.ts`
- Test: `test/renderer/flag-release.test.ts`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
import { expect, it } from 'vitest'
import { flagDefaults } from '../../src/renderer/src/shared/lib/feature-flags'
it('turns a flag on in production only once its slice is released', () => {
  expect(flagDefaults({ PROD: true }, []).explorer).toBe(false)
  expect(flagDefaults({ PROD: true }, ['explorer']).explorer).toBe(true)
  expect(flagDefaults({ PROD: false }, []).explorer).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/flag-release.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add a `releasedFlags` constant (empty now) that a closing slice updates when its checks pass; `flagDefaults(env, released)` turns a released flag on in production. Document in the registry which slice releases each flag (Explorer and source control: 14; backlog-board: 12).

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/flag-release.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Unknown names in the released list fail typecheck.
- Development keeps every flag on.
- Overrides still win in tests.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-ipc-workbench-source.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
