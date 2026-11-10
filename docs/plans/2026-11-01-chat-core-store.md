# Plan: Chat Core Store

> **Spec:** docs/specs/chat-core-store/SPEC.md
> **Parent spec:** docs/specs/chat-workflow/SPEC.md

**Goal:** Persist projects, chats, backlog items and chat history in core SQLite as the single source of truth.
**Architecture:** Plain stores over `node:sqlite` (`createProjectStore`, `createChatStore`, `createBacklogStore`) owned by the utility process; one transaction per mutation; compare-and-swap revisions for workflow state.
**Tech Stack:** Electron (main, utility-process core, preload), Node `node:sqlite`, TypeScript, zod; React renderer with shadcn/ui; Vitest (node and jsdom) and Playwright.
**Order:** 02
**Total Tasks:** 7
**Estimated Complexity:** medium
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

- Chats, backlog items and history survive a restart.
- Running work is marked interrupted, never restarted.

## Checks

**Run slice**: `npx vitest run test/core/backlog-store.test.ts test/core/chat-events.test.ts test/core/chat-lifecycle.test.ts test/core/chat-schema.test.ts test/core/chat-store.test.ts test/core/project-store.test.ts test/core/recovery.test.ts --reporter=verbose`

- C1 (REQ-001): project window per folder holds as specified. Proof: run slice | ✓ opens one project per canonical folder, including non-Git folders
- C2 (REQ-002): chat creation from the first prompt holds as specified. Proof: run slice | ✓ creates a chat from the first prompt and keeps its identity on rename
- C3 (REQ-003): chat list holds as specified. Proof: run slice | ✓ creates a chat from the first prompt and keeps its identity on rename
- C4 (REQ-004): chat rename holds as specified. Proof: run slice | ✓ creates a chat from the first prompt and keeps its identity on rename
- C5 (REQ-005): chat archive holds as specified. Proof: run slice | ✓ archives idle chats, refuses running ones and abandons with confirmation
- C6 (REQ-006): chat abandon holds as specified. Proof: run slice | ✓ archives idle chats, refuses running ones and abandons with confirmation
- C7 (REQ-031): manual backlog items holds as specified. Proof: run slice | ✓ keeps open items in the backlog and moves linked ones to history
- C8 (REQ-033): attaching backlog items holds as specified. Proof: run slice | ✓ keeps open items in the backlog and moves linked ones to history
- C9 (REQ-063): restore after restart holds as specified. Proof: run slice | ✓ migrates to the chat schema without losing settings
- C10 (REQ-064): workflow state in sqlite holds as specified. Proof: run slice | ✓ appends ordered events and rejects stale workflow revisions

## Tasks

### Task 1: Migrate the database to the chat schema

**Requirement:** REQ-063
**Files:**

- Modify: `src/core/database.ts`
- Test: `test/core/chat-schema.test.ts`

**Team:**

- Track: data
- Implementer: backend-engineer (skills: typescript-backend, test-driven-development)
- Reviewers: consequences-reviewer, security-reviewer, business-logic-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { expect, it } from 'vitest'
import { createDatabase } from '../../src/core/database'
it('migrates to the chat schema without losing settings', () => {
  const db = createDatabase(':memory:')
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name)
  for (const name of ['settings', 'projects', 'chats', 'turns', 'chat_events', 'outputs', 'backlog_items', 'approvals'])
    expect(tables).toContain(name)
  expect(db.prepare('PRAGMA user_version').get()).toEqual({ user_version: 2 })
  db.close()
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/chat-schema.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Add migration 2 inside one transaction: `projects` (id, canonical_path unique, name, opened_at), `chats` (id, project_id, slug unique per project, name, phase, state, revision, workflow_json, created_at, last_activity_at, archived_at), `turns` (id, chat_id, agent, tool, model, settings_json, status, started_at, ended_at, usage_json, session_id), `chat_events` (id, chat_id, seq, kind, payload_json, created_at), `outputs` (id, chat_id, kind, path, title, revision, hash), `backlog_items` (id, project_id, title, description, source, origin_url, status, chat_id, created_at, linked_at), `approvals` (id, chat_id, subject, hash, actor, created_at, invalidated_at). Keep migration 1 intact so existing databases upgrade in place.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/chat-schema.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Opening a version 1 database with settings upgrades it and keeps the rows.
- Running the migration twice is a no-op.
- Foreign keys reject a chat for an unknown project.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 2: Register projects by canonical path

**Requirement:** REQ-001
**Files:**

- Create: `src/core/projects/project-store.ts`
- Test: `test/core/project-store.test.ts`

**Team:**

- Track: backend
- Implementer: backend-engineer (skills: typescript-backend, security-guardrails, test-driven-development)
- Reviewers: business-logic-reviewer, security-reviewer, type-safety-reviewer, test-reviewer

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// @vitest-environment node
import { mkdtempSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createDatabase } from '../../src/core/database'
import { createProjectStore } from '../../src/core/projects/project-store'
it('opens one project per canonical folder, including non-Git folders', () => {
  const root = mkdtempSync(join(tmpdir(), 'forja-'))
  const link = join(tmpdir(), `forja-link-${Date.now()}`)
  symlinkSync(root, link)
  const store = createProjectStore(createDatabase(':memory:'))
  const first = store.open(root)
  expect(store.open(link).id).toBe(first.id)
  expect(first.canonicalPath).toBe(root)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/project-store.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`open(path)` resolves `realpath`, rejects missing or non-directory paths with an actionable error, inserts or returns the project and updates `opened_at`; `list()` returns recent projects newest first.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/project-store.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A file path is refused with a typed error.
- Two different folders get two projects.
- `list()` orders by last opening.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 3: Create, list and rename chats

**Requirement:** REQ-002, REQ-003, REQ-004
**Depends on:** Task 2
**Files:**

- Create: `src/core/chats/chat-store.ts`
- Test: `test/core/chat-store.test.ts`

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
import { createProjectStore } from '../../src/core/projects/project-store'
import { createChatStore } from '../../src/core/chats/chat-store'
it('creates a chat from the first prompt and keeps its identity on rename', () => {
  const db = createDatabase(':memory:')
  const project = createProjectStore(db).open(process.cwd())
  const chats = createChatStore(db)
  const chat = chats.create(project.id, { prompt: 'Add rate limiting to the API' })
  expect(chat).toMatchObject({ name: 'Add rate limiting to the API', slug: 'add-rate-limiting-to-the-api', phase: 'talk' })
  expect(chats.create(project.id, { prompt: 'Add rate limiting to the API' }).slug).toBe('add-rate-limiting-to-the-api-2')
  expect(chats.create(project.id, { prompt: 'Scope it', agent: 'research' }).phase).toBe('research')
  chats.rename(chat.id, 'Rate limits')
  expect(chats.get(chat.id)).toMatchObject({ id: chat.id, slug: chat.slug, name: 'Rate limits' })
  expect(chats.list(project.id).map((c) => c.id)).toContain(chat.id)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/chat-store.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`create` derives name and slug like the renderer's `featureIdentity`, starts in `talk` unless the first prompt mentions the Minerador (REQ-002 edge case: later agents never skip phases), stores the prompt as the first event and returns the chat. `list` orders waiting, running, then by last activity and excludes archived chats. `rename` changes only the name.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/chat-store.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- A mention of the Bigorneiro in the first prompt still starts in `talk`.
- Renaming to an empty name is refused.
- Listing excludes archived chats but includes chats without open tabs.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 4: Archive and abandon chats

**Requirement:** REQ-005, REQ-006
**Depends on:** Task 3
**Files:**

- Modify: `src/core/chats/chat-store.ts`
- Test: `test/core/chat-lifecycle.test.ts`

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
import { createProjectStore } from '../../src/core/projects/project-store'
import { createChatStore } from '../../src/core/chats/chat-store'
it('archives idle chats, refuses running ones and abandons with confirmation', () => {
  const db = createDatabase(':memory:')
  const chats = createChatStore(db)
  const project = createProjectStore(db).open(process.cwd())
  const chat = chats.create(project.id, { prompt: 'Idea' })
  chats.setState(chat.id, 'running')
  expect(() => chats.archive(chat.id)).toThrow(/running/)
  chats.setState(chat.id, 'waiting')
  chats.archive(chat.id)
  expect(chats.list(project.id)).toHaveLength(0)
  const other = chats.create(project.id, { prompt: 'Other' })
  expect(() => chats.abandon(other.id, { confirmed: false })).toThrow(/confirm/)
  expect(chats.abandon(other.id, { confirmed: true }).phase).toBe('abandoned')
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/chat-lifecycle.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

`archive` sets `archived_at`, archives the chat's unlinked drafts and refuses while a turn runs. `abandon` requires `confirmed: true`, moves to the read-only `abandoned` phase and returns the processes and worktree to stop and keep (cleanup stays explicit, slice 11).

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/chat-lifecycle.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Abandoned chats refuse new turns.
- Archived outputs stay readable through `outputs(chatId)`.
- Archiving twice is idempotent.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 5: Store backlog items and link them to chats

**Requirement:** REQ-031, REQ-033
**Depends on:** Task 3
**Files:**

- Create: `src/core/backlog/backlog-store.ts`
- Test: `test/core/backlog-store.test.ts`

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
import { createProjectStore } from '../../src/core/projects/project-store'
import { createChatStore } from '../../src/core/chats/chat-store'
import { createBacklogStore } from '../../src/core/backlog/backlog-store'
it('keeps open items in the backlog and moves linked ones to history', () => {
  const db = createDatabase(':memory:')
  const project = createProjectStore(db).open(process.cwd())
  const backlog = createBacklogStore(db)
  const item = backlog.add(project.id, { title: 'Export reports', description: 'CSV and PDF' })
  expect(item).toMatchObject({ source: 'manual', status: 'open' })
  const chat = createChatStore(db).create(project.id, { prompt: 'Talk about exports' })
  backlog.link(item.id, chat.id)
  expect(backlog.open(project.id)).toEqual([])
  expect(backlog.history(project.id)[0]).toMatchObject({ id: item.id, status: 'linked', chatId: chat.id })
  expect(() => backlog.link(item.id, chat.id)).toThrow(/linked/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/backlog-store.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

CRUD for `open` items with a non-empty trimmed title; `link` moves an open item to `linked` with `chat_id` and `linked_at`, refuses a second active link and returns the item text for the chat context; `history` lists linked items newest first.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/backlog-store.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- An empty title is refused.
- Editing a linked item is refused.
- Removing a linked item is refused; removing an open one deletes it.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 6: Record chat events and versioned workflow state

**Requirement:** REQ-064
**Depends on:** Task 3
**Files:**

- Create: `src/core/chats/chat-events.ts`
- Test: `test/core/chat-events.test.ts`

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
import { createProjectStore } from '../../src/core/projects/project-store'
import { createChatStore } from '../../src/core/chats/chat-store'
import { appendEvent, updateWorkflow } from '../../src/core/chats/chat-events'
it('appends ordered events and rejects stale workflow revisions', () => {
  const db = createDatabase(':memory:')
  const chat = createChatStore(db).create(createProjectStore(db).open(process.cwd()).id, { prompt: 'Idea' })
  appendEvent(db, chat.id, { kind: 'phase', payload: { to: 'research' } })
  appendEvent(db, chat.id, { kind: 'turn', payload: { agent: 'research' } })
  const seqs = (db.prepare('SELECT seq FROM chat_events WHERE chat_id = ? ORDER BY seq').all(chat.id) as { seq: number }[]).map((r) => r.seq)
  expect(seqs).toEqual([1, 2, 3])
  const next = updateWorkflow(db, chat.id, chat.revision, { version: 1, corrections: 0 })
  expect(next).toBe(chat.revision + 1)
  expect(() => updateWorkflow(db, chat.id, chat.revision, { version: 1, corrections: 1 })).toThrow(/stale/)
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/chat-events.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Events get a per-chat increasing `seq` inside the write transaction; `updateWorkflow` is a compare-and-swap on `revision` storing versioned JSON (`version` field required). No `STATE.md` is written anywhere.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/chat-events.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Unknown workflow versions are refused.
- Concurrent appends never duplicate a sequence number.
- Workflow JSON round-trips unknown fields.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


### Task 7: Mark running work interrupted on startup

**Requirement:** REQ-063
**Depends on:** Task 6
**Files:**

- Create: `src/core/chats/recovery.ts`
- Test: `test/core/recovery.test.ts`

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
import { createProjectStore } from '../../src/core/projects/project-store'
import { createChatStore } from '../../src/core/chats/chat-store'
import { recoverAfterRestart } from '../../src/core/chats/recovery'
it('marks turns that were running at shutdown as interrupted without restarting them', () => {
  const db = createDatabase(':memory:')
  const chats = createChatStore(db)
  const chat = chats.create(createProjectStore(db).open(process.cwd()).id, { prompt: 'Idea' })
  db.prepare("INSERT INTO turns (id, chat_id, agent, tool, status, started_at) VALUES ('t1', ?, 'smith', 'claude', 'running', 1)").run(chat.id)
  chats.setState(chat.id, 'running')
  const report = recoverAfterRestart(db)
  expect(report.interruptedTurns).toEqual(['t1'])
  expect(chats.get(chat.id).state).toBe('interrupted')
  expect(db.prepare("SELECT status FROM turns WHERE id = 't1'").get()).toEqual({ status: 'interrupted' })
})
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/core/recovery.test.ts`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

At core start, before serving requests, mark `running` turns and chats `interrupted`, append an event per chat, and return the report for the renderer; nothing is spawned.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/core/recovery.test.ts`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Completed turns are untouched.
- Running it twice reports nothing new.
- Approvals that were valid stay valid.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.


## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`, then `python3 ~/.claude/scripts/check_proofs.py docs/plans/2026-11-01-chat-core-store.md --repo .`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
