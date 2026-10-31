# Spec: Project Windows and Feature State

## Problem Statement

Create durable project/feature identities, validated IPC and per-feature execution ownership without introducing a workspace abstraction.

## Goals

- Any existing folder opens as a project and duplicate canonical folders focus the existing window.
- Feature identity/name/target are persisted separately with schema migrations.
- Cross-window requests are scoped and feature execution is serialized.

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
4. **[REQ-007]** WHEN multiple features run THEN the system SHALL allow execution across features while enforcing one agent turn per feature and separate session, process and Git ownership.
5. **[REQ-008]** WHEN the application restarts THEN the system SHALL restore windows, tabs, conversations, artifact links and valid approvals, and mark prior active executions interrupted without automatic restart.
6. **[REQ-012]** WHEN workflow state changes THEN the system SHALL persist versioned JSON and event history in SQLite and expose scoped state through Forja MCP without creating runtime STATE.md in the user project.
7. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
8. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.
9. **[REQ-054]** WHEN an output view or feature tab is closed THEN the system SHALL distinguish hiding a tab from stopping an execution, preserve feature history and require explicit confirmation before abandoning active owned work.
10. **[REQ-058]** WHEN a feature is integrated or abandoned THEN the system SHALL move it to a read-only terminal state preserving history; after integration it SHALL offer explicit worktree/branch removal, and abandoning SHALL require confirmation, stop owned processes and keep branch/worktree until explicit cleanup.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: cli-capability-contracts.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-project-feature-state.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-001 | Folder projects | P1 | Approved; not implemented |
| REQ-002 | Feature tabs | P1 | Approved; not implemented |
| REQ-003 | Per-feature repository | P1 | Approved; not implemented |
| REQ-007 | Feature concurrency | P1 | Approved; not implemented |
| REQ-008 | Session restoration | P1 | Approved; not implemented |
| REQ-012 | JSON workflow state | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
| REQ-054 | Feature archive and sessions | P1 | Approved; not implemented |
| REQ-058 | Feature end states | P1 | Approved 2026-10-31; not implemented |
