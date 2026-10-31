# Spec: Artifacts, Versions and Human Approval Gates

## Problem Statement

Publish RPI artifacts under the opened folder and enforce content-bound human approvals from authoritative JSON state.

## Goals

- Authoritative state stays in SQLite; user folders contain artifact files only.
- Publication is conditional, atomic, idempotent and preserves content.
- Human approval is exact-version-bound and invalidation reaches dependent work.

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

1. **[REQ-009]** WHEN a feature advances THEN the system SHALL follow Research, human-approved spec, Planner, human-approved plan, Implementer, machine-validated implementation (confirmed repository gates green on the committed fingerprint), Tester, Reviewer and one human final approval that also authorizes integration.
2. **[REQ-010]** WHEN an agent start is requested THEN the system SHALL check required approved artifacts and dependencies in the core before spawning a CLI; disabled UI or prompt text alone SHALL NOT implement the gate.
3. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals and evidence to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time. RPI artifact paths SHALL be excluded from the code fingerprint and invalidate only through the artifact dependency graph.
4. **[REQ-012]** WHEN workflow state changes THEN the system SHALL persist versioned JSON and event history in SQLite and expose scoped state through Forja MCP without creating runtime STATE.md in the user project.
5. **[REQ-013]** WHEN an agent publishes a spec, plan or review THEN the system SHALL write only the scoped artifact type under the feature artifact root (the feature worktree when the target is a Git repository, otherwise the opened folder), honoring that root's optional .claude/rpi-paths.json and default docs/specs, docs/plans and docs/reviews paths.
6. **[REQ-022]** WHEN a role performs work THEN the system SHALL let Research and Planner publish their artifacts, Implementer modify authorized feature code, Tester add or edit only files matching the confirmed test patterns and report coverage gaps, and Reviewer publish findings; corrections SHALL return to Implementer.
7. **[REQ-027]** WHEN review findings are produced or revisited THEN the system SHALL preserve the RPI review format and round trail; only Reviewer resolves findings, implementation does not declare its own independent review approved, and open Critical/High findings without a human waiver block final approval.
8. **[REQ-037]** WHEN an artifact is written or externally changed THEN the system SHALL use atomic publication, preserve content/history and unknown fields, reconcile filesystem changes, and never silently approve imported, missing, stale or malformed artifacts.
9. **[REQ-045]** WHEN a tool or agent requests approval mutation THEN the system SHALL reject it; human-authorized core commands alone approve specs, plans, final approval/integration, finding waivers and push.
10. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
11. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.
12. **[REQ-051]** WHEN native configuration, skills or documents enter context THEN the system SHALL treat their content as data subject to role/tool constraints and adapt RPI state instructions for the current invocation without editing user skill/config files.
13. **[REQ-056]** WHEN a role requests a handoff or a human rejects an approval THEN the system SHALL allow only Tester/Reviewer to Implementer (correction), Implementer to Planner (infeasible plan) and Planner to Research (ambiguous spec); returning to Planner or Research SHALL invalidate downstream approvals and evidence, and a human rejection SHALL return its reason to the owning role.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: project-feature-state, agent-settings-skills.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-artifact-approval-gates.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-009 | Guided RPI with machine-validated implementation | P1 | Approved; not implemented |
| REQ-010 | Authoritative gates | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-012 | JSON workflow state | P1 | Approved; not implemented |
| REQ-013 | Artifact placement | P1 | Approved; not implemented |
| REQ-022 | Role boundaries | P1 | Approved; not implemented |
| REQ-027 | Review ownership | P1 | Approved; not implemented |
| REQ-037 | Artifact publishing | P1 | Approved; not implemented |
| REQ-045 | Human approval ownership | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
| REQ-051 | Untrusted context | P1 | Approved; not implemented |
| REQ-056 | Handoff matrix | P1 | Approved 2026-10-31; not implemented |
