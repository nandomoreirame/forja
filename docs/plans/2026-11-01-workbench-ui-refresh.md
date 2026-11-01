# Plan: Workbench Interface Refresh

> **Spec:** docs/specs/workbench-ui-refresh/SPEC.md
> **Parent spec:** docs/specs/functional-mvp/SPEC.md

**Goal:** Keep the refreshed interface requirements backed by tests.
**Architecture:** Evidence-only plan: the behavior already exists; each task confirms or extends the test that proves a refreshed requirement.
**Tech Stack:** Electron, React, TypeScript; shadcn/ui and Tailwind for UI; Vitest/RTL and Playwright for tests.
**Order:** 01i (evidence for 2026-11-01 work)
**Total Tasks:** 5
**Estimated Complexity:** medium
**Status:** Approved scope, planned; implemented.
**Lessons applied:** none

## Dependencies

- ui-quick-adjustments only for the flags referenced by REQ-105.

## Execution Contract

- Later rpi-implement execution honors its current task-commit authorization and independent-review rules. This planning run writes no code and no commits.
- Read the complete spec and current source before Task 1. Seed snippets are contract tests; expand them to the acceptance cases without test-only shortcuts.


## Acceptance

- Each refreshed requirement has a passing test that asserts its observable behavior.

## Checks

**Run refresh**: `npx vitest run test/renderer/framed-layout.test.tsx test/renderer/page-tabs.test.tsx test/renderer/close-tab-shortcut.test.tsx test/renderer/empty-tabs-footer.test.tsx test/renderer/settings-language.test.tsx test/renderer/sidebar-panes.test.tsx test/renderer/sidebar-rail.test.tsx test/renderer/context-panel.test.tsx test/renderer/conversation-header.test.tsx --reporter=verbose`

- C1 (REQ-062): the shell frames each part on surface.base. Proof: run refresh | PASS frames each workbench part with its own rounded border on the app background
- C2 (REQ-068): destination and branch live in the right panel. Proof: run refresh | PASS keeps destination and branch in the right panel, not in the conversation header
- C3 (REQ-071): closing a running feature tab keeps its agent running. Proof: run refresh | PASS keeps a running agent going in the background when its tab closes
- C4 (REQ-072): Ctrl+B toggles the sidebar and shows the icon rail. Proof: run refresh | PASS toggles the sidebar with Ctrl+B and shows a section icon rail while collapsed
- C5 (REQ-076): Settings opens on General with Agents second. Proof: run refresh | PASS opens Settings on General, with Agents second
- C6 (REQ-081): Archived opens as a tab from the sidebar menu. Proof: run refresh | PASS opens Archived as a tab and keeps the open tabs
- C7 (REQ-083): feature rows show the running AI tool. Proof: run refresh | PASS shows the running AI tool instead of the agent name in the feature row
- C8 (REQ-086): panes collapse to their header and expand. Proof: run refresh | PASS collapses a pane to its header and expands it again
- C9 (REQ-103): Ctrl+W closes the active tab. Proof: run refresh | PASS closes the active tab with Ctrl+W, even from the composer
- C10 (REQ-104): the language switches on save. Proof: run refresh | PASS lists English first and switches the app language on save
- C11 (REQ-105): the project panel resizes from a sash. Proof: run refresh | PASS resizes the project panel from a sash, like the sidebar and terminal

## Tasks

### Task 1: Confirm the evidence: Framed shell, topbar toggles and statusbar

**Requirement:** REQ-062, REQ-072
**Files:**

- Modify: `test/renderer/framed-layout.test.tsx`
- Test: `test/renderer/framed-layout.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// Existing test (implemented 2026-11-01): it('frames each workbench part with its own rounded border on the app background', ...)
// Keep it; extend it only if the refreshed requirement text adds a case it misses.
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/framed-layout.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implemented on 2026-11-01 (commits `5682288` to `bc90587`). Re-read the refreshed requirement text and confirm the existing test asserts each observable clause; add a case for any clause it misses. Step 2 is expected to PASS for implemented clauses; only a newly added case must fail first.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/framed-layout.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Every clause of the refreshed requirement maps to an assertion.
- No assertion depends on mock-only data that the MVP will not provide.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 2: Confirm the evidence: Tabs for every page and background agents

**Requirement:** REQ-068, REQ-071, REQ-103
**Files:**

- Modify: `test/renderer/page-tabs.test.tsx`
- Test: `test/renderer/page-tabs.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// Existing test (implemented 2026-11-01): it('keeps a running agent going in the background when its tab closes', ...)
// Keep it; extend it only if the refreshed requirement text adds a case it misses.
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/page-tabs.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implemented on 2026-11-01 (commits `5682288` to `bc90587`). Re-read the refreshed requirement text and confirm the existing test asserts each observable clause; add a case for any clause it misses. Step 2 is expected to PASS for implemented clauses; only a newly added case must fail first.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/page-tabs.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Every clause of the refreshed requirement maps to an assertion.
- No assertion depends on mock-only data that the MVP will not provide.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 3: Confirm the evidence: Settings entry and live language

**Requirement:** REQ-076, REQ-104
**Files:**

- Modify: `test/renderer/settings-language.test.tsx`
- Test: `test/renderer/settings-language.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// Existing test (implemented 2026-11-01): it('opens Settings on General, with Agents second', ...)
// Keep it; extend it only if the refreshed requirement text adds a case it misses.
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/settings-language.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implemented on 2026-11-01 (commits `5682288` to `bc90587`). Re-read the refreshed requirement text and confirm the existing test asserts each observable clause; add a case for any clause it misses. Step 2 is expected to PASS for implemented clauses; only a newly added case must fail first.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/settings-language.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Every clause of the refreshed requirement maps to an assertion.
- No assertion depends on mock-only data that the MVP will not provide.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 4: Confirm the evidence: Sidebar menu, Features section and panes

**Requirement:** REQ-081, REQ-083, REQ-086
**Files:**

- Modify: `test/renderer/sidebar-panes.test.tsx`
- Test: `test/renderer/sidebar-panes.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// Existing test (implemented 2026-11-01): it('collapses a pane to its header and expands it again', ...)
// Keep it; extend it only if the refreshed requirement text adds a case it misses.
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/sidebar-panes.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implemented on 2026-11-01 (commits `5682288` to `bc90587`). Re-read the refreshed requirement text and confirm the existing test asserts each observable clause; add a case for any clause it misses. Step 2 is expected to PASS for implemented clauses; only a newly added case must fail first.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/sidebar-panes.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Every clause of the refreshed requirement maps to an assertion.
- No assertion depends on mock-only data that the MVP will not provide.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

### Task 5: Confirm the evidence: Resizable right panel

**Requirement:** REQ-105
**Files:**

- Modify: `test/renderer/context-panel.test.tsx`
- Test: `test/renderer/context-panel.test.tsx`

**Team:**

- Track: frontend
- Implementer: frontend-engineer (skills: frontend-design, nextjs-fsd-conventions, test-driven-development)
- Reviewers: type-safety-reviewer, test-reviewer, accessibility-guardrails

**Step 1: Write the failing test**

Write this acceptance-focused test before implementing behavior. If the public module is absent, introduce only a compiling no-op surface to make the stated assertion fail; do not count an import/fixture syntax failure as RED.

```typescript
// Existing test (implemented 2026-11-01): it('resizes the project panel from a sash, like the sidebar and terminal', ...)
// Keep it; extend it only if the refreshed requirement text adds a case it misses.
```

**Step 2: Run test to verify it fails**

Run: `rtk npm test -- test/renderer/context-panel.test.tsx`

Expected: FAIL because the specified behavior is not implemented. Verify the failure concerns this behavior, not a missing dependency, environment or invalid test.

**Step 3: Write minimal implementation**

Implemented on 2026-11-01 (commits `5682288` to `bc90587`). Re-read the refreshed requirement text and confirm the existing test asserts each observable clause; add a case for any clause it misses. Step 2 is expected to PASS for implemented clauses; only a newly added case must fail first.

**Step 4: Run test to verify it passes**

Run: `rtk npm test -- test/renderer/context-panel.test.tsx`. Expected: PASS. Add and run these meaningful negative/integration checks before completing the task:

- Every clause of the refreshed requirement maps to an assertion.
- No assertion depends on mock-only data that the MVP will not provide.

Run the task gates from the repository root: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build`. A passing mock is not evidence of a real process, Git mutation or CLI compatibility.

**Step 5: Commit at implementation time**

Invoke `git-commit` only in the separately authorized implementation workflow after the task gates pass. Include the task-owned code and tests; preserve unrelated index entries. Never push. This planning run does not execute commits.

## Final Validation and Handoff

Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm test`, `rtk npm run build` and `rtk npm run test:e2e:app`. Record the actual implementer, results and independent review separately and update only this slice's STATE.md.
