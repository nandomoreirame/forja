# Spec: Guided RPI Flow, Handoffs and Corrections

## Problem Statement

Connect all stages into the user-approved guided RPI workflow with traceable correction requests and bounded automation.

## Goals

- Guided transitions are core-enforced and human approvals remain authoritative.
- Corrections are bidirectionally linked and automatic attempts bounded.
- Final integration uses current code/tests/review and explicit consent.

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

1. **[REQ-009]** WHEN a feature advances THEN the system SHALL follow Research, approved spec, Planner, approved plan, Implementer, approved implementation, Tester, Reviewer and final human approval.
2. **[REQ-010]** WHEN an agent start is requested THEN the system SHALL check required approved artifacts and dependencies in the core before spawning a CLI; disabled UI or prompt text alone SHALL NOT implement the gate.
3. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time.
4. **[REQ-020]** WHEN an agent requests work from another role THEN the system SHALL record source and destination agent conversations, feature, artifact revision, reason and round, with bidirectional navigable links.
5. **[REQ-021]** WHEN automatic handoffs are enabled THEN the system SHALL preserve human approval gates and stop after three automatic correction attempts per feature shared across Tester and Reviewer until explicit human continuation.
6. **[REQ-022]** WHEN a role performs work THEN the system SHALL let Research and Planner publish their artifacts, Implementer modify authorized feature code, Tester validate and Reviewer publish findings; corrections SHALL return to Implementer.
7. **[REQ-024]** WHEN approved implementation starts THEN the system SHALL create or reuse one owned branch and worktree per feature in the selected Git repository and share it sequentially among Implementer, Tester and Reviewer.
8. **[REQ-025]** WHEN an implementation batch passes validation THEN the system SHALL commit only its owned delta on the feature branch, preserving unrelated user changes and index entries; failed checks SHALL NOT be recorded as successful.
9. **[REQ-026]** WHEN the user approves Git integration THEN the system SHALL bind authorization to the exact feature commit and destination HEAD, require valid tests/review, pause on divergence/conflicts and treat push as a separate explicit approval.
10. **[REQ-027]** WHEN review findings are produced or revisited THEN the system SHALL preserve the RPI review format and round trail; only Reviewer updates findings, and implementation does not declare its own independent review approved.
11. **[REQ-045]** WHEN a tool or agent requests approval mutation THEN the system SHALL reject it; human-authorized core commands alone approve artifacts, implementation, final completion and Git integration.
12. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
13. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: artifact-approval-gates, feature-git-worktrees, cli-agent-sessions, feature-workbench-composer, document-review-reader, terminal-panel-footer.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-guided-rpi-orchestration.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-009 | Guided RPI | P1 | Approved; not implemented |
| REQ-010 | Authoritative gates | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-020 | Linked handoffs | P1 | Approved; not implemented |
| REQ-021 | Bounded correction loop | P1 | Approved; not implemented |
| REQ-022 | Role boundaries | P1 | Approved; not implemented |
| REQ-024 | Feature worktrees | P1 | Approved; not implemented |
| REQ-025 | Feature commits | P1 | Approved; not implemented |
| REQ-026 | Approved integration | P1 | Approved; not implemented |
| REQ-027 | Review ownership | P1 | Approved; not implemented |
| REQ-045 | Human approval ownership | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
