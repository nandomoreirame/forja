# Spec: Feature Workbench and Global Composer

## Problem Statement

Replace the static welcome screen with approved feature tabs, contextual sidebars and one global composer.

## Goals

- Renameable feature tabs preserve distinct Git and chat contexts.
- One persistent composer works across conversation/settings/document views.
- Background feature activity cannot steal message recipients or drafts.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

This slice derives from the [approved functional MVP](../functional-mvp/SPEC.md). Read that full spec, especially ownership, approval and lifecycle rules, before implementing. The user approved generation of these plans on 2026-10-30. Do not treat this planning approval as permission to start production implementation.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| export function createDatabase(file: string): DatabaseSync { | `src/core/database.ts:3` | yes |
| CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); | `src/core/database.ts:9` | yes |
| export const coreRequestSchema = z.object( | `src/shared/contracts.ts:3` | yes |
| export interface EngineAdapter { | `src/core/engines/types.ts:23` | yes |
| function createWindow(): void { | `src/main/index.ts:6` | yes |
| Five CLI controlled-mode capabilities are supported by the installed versions | n/a | assumption |

## Requirements

### P1 (MVP)

1. **[REQ-001]** WHEN a folder is opened THEN the system SHALL open or focus its own project window using its canonical path, including non-Git folders such as ~/dev.
2. **[REQ-002]** WHEN a feature is created or renamed THEN the system SHALL keep an immutable identity and unique artifact slug while allowing its visible tab name to change.
3. **[REQ-003]** WHEN a feature selects a target repository THEN the system SHALL bind execution, branch and worktree to that repository and display its directory without moving the opened folder or its artifacts.
4. **[REQ-004]** WHEN the selected feature changes THEN the system SHALL switch conversation, composer and terminal context together; background events SHALL NOT steal the selected recipient.
5. **[REQ-005]** WHEN a recipient is selected by combobox or a valid @ mention THEN the system SHALL address one fixed agent; the latest explicit agent mention wins, otherwise follow the active agent in the selected feature.
6. **[REQ-006]** WHEN a message targets a busy feature agent THEN the system SHALL interrupt and await foreground termination by default, or enqueue in order when interruption is disabled, without concurrent duplicate turns.
7. **[REQ-007]** WHEN multiple features run THEN the system SHALL allow execution across features while enforcing one agent turn per feature and separate session, process and Git ownership.
8. **[REQ-008]** WHEN the application restarts THEN the system SHALL restore windows, tabs, conversations, artifact links and valid approvals, and mark prior active executions interrupted without automatic restart.
9. **[REQ-020]** WHEN an agent requests work from another role THEN the system SHALL record source and destination agent conversations, feature, artifact revision, reason and round, with bidirectional navigable links.
10. **[REQ-043]** WHEN a functional screen is implemented THEN the system SHALL reuse approved component anatomy and recorded user exceptions, compare deterministic captures at matching viewports and fix drift before accepting the screen.
11. **[REQ-047]** WHEN the user views settings THEN the system SHALL keep the global composer available but separate from manual form saves; agents SHALL NOT read or alter settings merely because the screen is visible.
12. **[REQ-054]** WHEN an output view or feature tab is closed THEN the system SHALL distinguish hiding a tab from stopping an execution, preserve feature history and require explicit confirmation before abandoning active owned work.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: web-foundation-landing-styleguide, project-feature-state, agent-settings-skills, artifact-approval-gates, cli-agent-sessions.
- Follow the parent spec's exact boundaries and shared-module layout. Every UI task reuses the shared shadcn/Tailwind layer; every runtime task validates ownership in core.
- Follow [fidelity rules](../../design/forja-2.0/component-fidelity.md); site screenshots and example copy are not authority to add behavior.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Slice scope | Derived from the approved parent spec and user decisions | Avoid repeating resolved questions. |
| 2 | Delivery order | Use the ordered plan index and explicit dependencies | Do not implement dependent features against missing APIs. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization; calling rpi-implement is a separate action.

## Out of Scope

All parent-spec exclusions apply. Unlisted integrations, visual redesign and shortcuts that bypass approvals are excluded.

## Test Strategy

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-feature-workbench-composer.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-001 | Folder projects | P1 | Approved; not implemented |
| REQ-002 | Feature tabs | P1 | Approved; not implemented |
| REQ-003 | Per-feature repository | P1 | Approved; not implemented |
| REQ-004 | Composer context | P1 | Approved; not implemented |
| REQ-005 | Single recipient | P1 | Approved; not implemented |
| REQ-006 | Interrupt or queue | P1 | Approved; not implemented |
| REQ-007 | Feature concurrency | P1 | Approved; not implemented |
| REQ-008 | Session restoration | P1 | Approved; not implemented |
| REQ-020 | Linked handoffs | P1 | Approved; not implemented |
| REQ-043 | Visual fidelity | P1 | Approved; not implemented |
| REQ-047 | Manual app configuration | P1 | Approved; not implemented |
| REQ-054 | Feature archive and sessions | P1 | Approved; not implemented |
