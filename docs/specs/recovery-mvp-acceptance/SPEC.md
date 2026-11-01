# Spec: Recovery, Resource Cleanup and MVP Acceptance

## Problem Statement

Finish restart/recovery, resource bounds and full Linux acceptance without hiding pending CLI capabilities or review gaps.

## Goals

- Reopening restores durable state without resurrecting OS processes.
- Full exit stops owned resources and output remains bounded.
- Site, Electron, two-feature Git flow and all five live CLI capabilities have truthful acceptance evidence.

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

1. **[REQ-006]** WHEN a message targets a busy feature agent THEN the system SHALL interrupt and await foreground termination by default, or enqueue in order when interruption is disabled, without concurrent duplicate turns.
2. **[REQ-007]** WHEN multiple features run THEN the system SHALL allow execution across features while enforcing one agent turn per feature and separate session, process and Git ownership.
3. **[REQ-008]** WHEN the application restarts THEN the system SHALL restore windows, tabs, conversations, artifact links and valid approvals, and mark prior active executions interrupted without automatic restart.
4. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals and evidence to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time. RPI artifact paths SHALL be excluded from the code fingerprint and invalidate only through the artifact dependency graph.
5. **[REQ-015]** WHEN an agent is configured THEN the system SHALL target claude, codex, opencode, agy and grok with verified version/capability records, native authentication reuse and no credential copying or persistent user configuration edits; a stored CLI login MAY be read, read-only and in memory, only for opted-in plan usage (REQ-102).
6. **[REQ-019]** WHEN a CLI enters controlled mode THEN the system SHALL verify Forja MCP attachment and effective native-shell restrictions; unsupported tools SHALL remain unavailable for controlled execution instead of silently bypassing permissions.
7. **[REQ-023]** WHEN an interrupted conversation resumes THEN the system SHALL use the matching feature/agent/CLI native session when supported; ask before reconstructing context in a new session when native resume is unavailable.
8. **[REQ-029]** WHEN command output grows THEN the system SHALL stream and persist ordered bounded chunks with backpressure, configurable internal limits and explicit truncation notices rather than growing renderer memory without bounds.
9. **[REQ-034]** WHEN a turn is interrupted or the app exits THEN the system SHALL stop owned foreground process trees before redirecting, keep explicitly persistent servers independent during turns, and gracefully stop owned CLI/PTY/command processes on full application exit.
10. **[REQ-037]** WHEN an artifact is written or externally changed THEN the system SHALL use atomic publication, preserve content/history and unknown fields, reconcile filesystem changes, and never silently approve imported, missing, stale or malformed artifacts.
11. **[REQ-043]** WHEN a functional screen is implemented THEN the system SHALL reuse approved component anatomy and recorded user exceptions, compare deterministic captures at matching viewports and fix drift before accepting the screen.
12. **[REQ-049]** WHEN the MVP is accepted THEN the system SHALL pass unit/integration/Electron E2E and authenticated five-CLI smoke checks in the Linux acceptance environment without shipping a falsely supported adapter.
13. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.
14. **[REQ-052]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable non-secret error and a truthful stopped/failed state without fabricating completion or automatically weakening controls.
15. **[REQ-054]** WHEN an output view or feature tab is closed THEN the system SHALL distinguish hiding a tab from stopping an execution, preserve feature history and require explicit confirmation before abandoning active owned work.
16. **[REQ-099]** WHEN the user quits while owned agent turns or managed commands are running THEN the system SHALL list them and require confirmation before the graceful stop of REQ-034; cancelling SHALL keep the application open and the work running.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: guided-rpi-orchestration, terminal-panel-footer, document-review-reader, web-foundation-landing-styleguide.
- Follow the parent spec's exact boundaries and shared-module layout. Every UI task reuses the shared shadcn/Tailwind layer; every runtime task validates ownership in core.
- Follow [fidelity rules](../../design/forja-2.0/component-fidelity.md); site screenshots and example copy are not authority to add behavior.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Slice scope | Derived from the approved parent spec and user decisions | Avoid repeating resolved questions. |
| 2 | Delivery order | Use the ordered plan index and explicit dependencies | Do not implement dependent features against missing APIs. |
| 3 | 2026-11-01 improvements | REQ-099 (quit confirmation with running work) | Added 2026-11-01 from the 2026-11-01 improvement review, approved by the user. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization; calling rpi-implement is a separate action.

## Out of Scope

All parent-spec exclusions apply. Unlisted integrations, visual redesign and shortcuts that bypass approvals are excluded.

## Test Strategy

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-recovery-mvp-acceptance.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-006 | Interrupt or queue | P1 | Approved; not implemented |
| REQ-007 | Feature concurrency | P1 | Approved; not implemented |
| REQ-008 | Session restoration | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-015 | Five CLI adapters | P1 | Approved; not implemented |
| REQ-019 | Controlled execution compatibility | P1 | Approved; not implemented |
| REQ-023 | Resume capability | P1 | Approved; not implemented |
| REQ-029 | Bounded output | P1 | Approved; not implemented |
| REQ-034 | Process lifecycle | P1 | Approved; not implemented |
| REQ-037 | Artifact publishing | P1 | Approved; not implemented |
| REQ-043 | Visual fidelity | P1 | Approved; not implemented |
| REQ-049 | Linux MVP acceptance | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
| REQ-052 | Operational errors | P1 | Approved; not implemented |
| REQ-054 | Feature archive and sessions | P1 | Approved; not implemented |
| REQ-099 | Quit confirmation with running work | P1 | Approved 2026-11-01; not implemented |
