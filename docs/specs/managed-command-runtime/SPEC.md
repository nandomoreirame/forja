# Spec: Scoped MCP Command Runtime

## Problem Statement

Run development commands and explicit background servers in a core-owned supervisor with observable output and scoped MCP access.

## Goals

- Agent commands are scoped, observable and separate from manual shells.
- Foreground cancellation and persistent servers have distinct lifecycles.
- Bounded logs and MCP results share the same execution identity.

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

1. **[REQ-007]** WHEN multiple features run THEN the system SHALL allow execution across features while enforcing one agent turn per feature and separate session, process and Git ownership.
2. **[REQ-019]** WHEN a CLI enters controlled mode THEN the system SHALL verify Forja MCP attachment and effective native-shell restrictions; unsupported tools SHALL remain unavailable for controlled execution instead of silently bypassing permissions.
3. **[REQ-022]** WHEN a role performs work THEN the system SHALL let Research and Planner publish their artifacts, Implementer modify authorized feature code, Tester validate and Reviewer publish findings; corrections SHALL return to Implementer.
4. **[REQ-028]** WHEN an agent invokes development commands THEN the system SHALL run them exclusively through the scoped Forja MCP executor and expose command, authorized cwd, live stdout/stderr, state and eventual exit code.
5. **[REQ-029]** WHEN command output grows THEN the system SHALL stream and persist ordered bounded chunks with backpressure, configurable internal limits and explicit truncation notices rather than growing renderer memory without bounds.
6. **[REQ-030]** WHEN a server is explicitly launched in background mode THEN the system SHALL return an owned execution identifier and allow scoped log reads and stop requests independently from the agent turn.
7. **[REQ-034]** WHEN a turn is interrupted or the app exits THEN the system SHALL stop owned foreground process trees before redirecting, keep explicitly persistent servers independent during turns, and gracefully stop owned CLI/PTY/command processes on full application exit.
8. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
9. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.
10. **[REQ-052]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable non-secret error and a truthful stopped/failed state without fabricating completion or automatically weakening controls.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: cli-capability-contracts, artifact-approval-gates, feature-git-worktrees.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-managed-command-runtime.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-007 | Feature concurrency | P1 | Approved; not implemented |
| REQ-019 | Controlled execution compatibility | P1 | Approved; not implemented |
| REQ-022 | Role boundaries | P1 | Approved; not implemented |
| REQ-028 | MCP command runner | P1 | Approved; not implemented |
| REQ-029 | Bounded output | P1 | Approved; not implemented |
| REQ-030 | Persistent processes | P1 | Approved; not implemented |
| REQ-034 | Process lifecycle | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
| REQ-052 | Operational errors | P1 | Approved; not implemented |
