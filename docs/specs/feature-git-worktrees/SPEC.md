# Spec: Feature Git Worktrees and Approved Integration

## Problem Statement

Isolate code work by feature and provide explicit, revision-bound Git integration without losing user work.

## Goals

- Each feature has a traceable owned branch/worktree and explicit destination.
- Validation and review are exact-code-bound.
- Integration never proceeds on stale approval, conflicts or unrelated dirty work; push is separate.

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

1. **[REQ-003]** WHEN a feature selects a target repository THEN the system SHALL bind execution, branch and worktree to that repository and display its directory without moving the opened folder or its artifacts.
2. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time.
3. **[REQ-024]** WHEN approved implementation starts THEN the system SHALL create or reuse one owned branch and worktree per feature in the selected Git repository and share it sequentially among Implementer, Tester and Reviewer.
4. **[REQ-025]** WHEN an implementation batch passes validation THEN the system SHALL commit only its owned delta on the feature branch, preserving unrelated user changes and index entries; failed checks SHALL NOT be recorded as successful.
5. **[REQ-026]** WHEN the user approves Git integration THEN the system SHALL bind authorization to the exact feature commit and destination HEAD, require valid tests/review, pause on divergence/conflicts and treat push as a separate explicit approval.
6. **[REQ-027]** WHEN review findings are produced or revisited THEN the system SHALL preserve the RPI review format and round trail; only Reviewer updates findings, and implementation does not declare its own independent review approved.
7. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
8. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: project-feature-state, artifact-approval-gates.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-feature-git-worktrees.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-003 | Per-feature repository | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-024 | Feature worktrees | P1 | Approved; not implemented |
| REQ-025 | Feature commits | P1 | Approved; not implemented |
| REQ-026 | Approved integration | P1 | Approved; not implemented |
| REQ-027 | Review ownership | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
