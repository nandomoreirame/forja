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

1. **[REQ-009]** WHEN a feature advances THEN the system SHALL follow Research, human-approved spec, Planner, human-approved plan, Implementer, machine-validated implementation (confirmed repository gates green on the committed fingerprint), Tester, Reviewer and one human final approval that also authorizes integration.
2. **[REQ-010]** WHEN an agent start is requested THEN the system SHALL check required approved artifacts and dependencies in the core before spawning a CLI; disabled UI or prompt text alone SHALL NOT implement the gate.
3. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals and evidence to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time. RPI artifact paths SHALL be excluded from the code fingerprint and invalidate only through the artifact dependency graph.
4. **[REQ-020]** WHEN an agent requests work from another role THEN the system SHALL record source and destination agent conversations, feature, artifact revision, reason and round, with bidirectional navigable links.
5. **[REQ-021]** WHEN automatic handoffs are enabled THEN the system SHALL run Tester/Reviewer to Implementer corrections and the following machine-validated re-test and re-review without human approval, stopping after three automatic correction attempts per feature shared across Tester and Reviewer until explicit human continuation; spec, plan and final approvals SHALL never be automated.
6. **[REQ-022]** WHEN a role performs work THEN the system SHALL let Research and Planner publish their artifacts, Implementer modify authorized feature code, Tester add or edit only files matching the confirmed test patterns and report coverage gaps, and Reviewer publish findings; corrections SHALL return to Implementer.
7. **[REQ-024]** WHEN a feature is bound to a Git target repository THEN the system SHALL create or reuse one owned branch and worktree for it from the explicitly selected base before any role publishes, and share it sequentially among all five roles.
8. **[REQ-025]** WHEN an Implementer or Tester turn ends with the confirmed repository gates passing THEN the system SHALL commit only the owned delta on the feature branch with an agent-proposed Conventional Commits message validated by core, preserving unrelated user changes and index entries; failed or skipped gates SHALL NOT be recorded as successful or advance the workflow. Approved spec/plan versions and published reviews are committed by core.
9. **[REQ-026]** WHEN the user grants final approval THEN the system SHALL bind it to the exact feature commit, destination branch and HEAD, perform a no-fast-forward merge in an owned integration worktree, run the confirmed gates on the merge result and update the destination only if they pass and its HEAD is unchanged since approval; otherwise pause with diagnostics. Push SHALL be a separate explicit approval.
10. **[REQ-027]** WHEN review findings are produced or revisited THEN the system SHALL preserve the RPI review format and round trail; only Reviewer resolves findings, implementation does not declare its own independent review approved, and open Critical/High findings without a human waiver block final approval.
11. **[REQ-045]** WHEN a tool or agent requests approval mutation THEN the system SHALL reject it; human-authorized core commands alone approve specs, plans, final approval/integration, finding waivers and push.
12. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
13. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.
14. **[REQ-055]** WHEN a Git target is bound THEN the system SHALL detect candidate validation commands and test-file patterns from repository manifests, require human confirmation, store them per target repository and run them itself through the managed executor as the only authoritative validation evidence.
15. **[REQ-056]** WHEN a role requests a handoff or a human rejects an approval THEN the system SHALL allow only Tester/Reviewer to Implementer (correction), Implementer to Planner (infeasible plan) and Planner to Research (ambiguous spec); returning to Planner or Research SHALL invalidate downstream approvals and evidence, and a human rejection SHALL return its reason to the owning role.
16. **[REQ-057]** WHEN the user waives a blocking review finding THEN the system SHALL require a reason, an extra confirmation for Critical, record actor, time and finding revision, and keep the finding visible as waived; agents SHALL NOT waive findings.

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
| REQ-009 | Guided RPI with machine-validated implementation | P1 | Approved; not implemented |
| REQ-010 | Authoritative gates | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-020 | Linked handoffs | P1 | Approved; not implemented |
| REQ-021 | Bounded automatic correction loop | P1 | Approved; not implemented |
| REQ-022 | Role boundaries | P1 | Approved; not implemented |
| REQ-024 | Feature worktrees from binding | P1 | Approved; not implemented |
| REQ-025 | Feature commits | P1 | Approved; not implemented |
| REQ-026 | Final approval with tested merge | P1 | Approved; not implemented |
| REQ-027 | Review ownership | P1 | Approved; not implemented |
| REQ-045 | Human approval ownership | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
| REQ-055 | Repository gates | P1 | Approved 2026-10-31; not implemented |
| REQ-056 | Handoff matrix | P1 | Approved 2026-10-31; not implemented |
| REQ-057 | Finding waivers | P1 | Approved 2026-10-31; not implemented |
