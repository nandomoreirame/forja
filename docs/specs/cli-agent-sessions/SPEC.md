# Spec: Five Controlled CLI Adapters and Agent Sessions

## Problem Statement

Connect the five installed CLIs to scoped feature/agent sessions with observable controlled execution and truthful cancellation/resume.

## Goals

- Each requested CLI has a separately verified controlled adapter; no unsupported tool is called supported.
- User-auth sessions are reused without copying credentials.
- Interrupt/queue, permission requests and resume behavior are per-feature and recorded.

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
3. **[REQ-015]** WHEN an agent is configured THEN the system SHALL target claude, codex, opencode, agy and grok with verified version/capability records, native authentication reuse and no credential copying or persistent user configuration edits.
4. **[REQ-018]** WHEN a CLI produces output THEN the system SHALL normalize versioned structured events for session identity, text, tool activity, permissions, completion and errors while retaining bounded diagnostic context.
5. **[REQ-019]** WHEN a CLI enters controlled mode THEN the system SHALL verify Forja MCP attachment and effective native-shell restrictions; unsupported tools SHALL remain unavailable for controlled execution instead of silently bypassing permissions.
6. **[REQ-023]** WHEN an interrupted conversation resumes THEN the system SHALL use the matching feature/agent/CLI native session when supported; ask before reconstructing context in a new session when native resume is unavailable.
7. **[REQ-028]** WHEN an agent invokes development commands THEN the system SHALL run them exclusively through the scoped Forja MCP executor and expose command, authorized cwd, live stdout/stderr, state and eventual exit code.
8. **[REQ-034]** WHEN a turn is interrupted or the app exits THEN the system SHALL stop owned foreground process trees before redirecting, keep explicitly persistent servers independent during turns, and gracefully stop owned CLI/PTY/command processes on full application exit.
9. **[REQ-046]** WHEN settings are opened or refreshed THEN the system SHALL detect executable/version/capabilities with bounded local probes, distinguish installation from authentication and defer model-network calls to explicit smoke tests.
10. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
11. **[REQ-051]** WHEN native configuration, skills or documents enter context THEN the system SHALL treat their content as data subject to role/tool constraints and adapt RPI state instructions for the current invocation without editing user skill/config files.
12. **[REQ-052]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable non-secret error and a truthful stopped/failed state without fabricating completion or automatically weakening controls.
13. **[REQ-053]** WHEN agent configuration changes while work is active THEN the system SHALL apply it to future turns; preserve the current turn settings snapshot and explicit recipient context.
14. **[REQ-059]** WHEN an agent turn emits no events for the configurable inactivity window (default 10 minutes) THEN the system SHALL mark it unresponsive and let the user keep waiting or stop it; a forced stop SHALL always be available and release the feature lease only after the owned process group terminates.
15. **[REQ-060]** WHEN a CLI reports token or cost usage THEN the system SHALL record and display it per turn and per feature; when a CLI does not report usage the system SHALL show it as unavailable instead of estimating.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: cli-capability-contracts, agent-settings-skills, artifact-approval-gates, managed-command-runtime.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-cli-agent-sessions.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-006 | Interrupt or queue | P1 | Approved; not implemented |
| REQ-007 | Feature concurrency | P1 | Approved; not implemented |
| REQ-015 | Five CLI adapters | P1 | Approved; not implemented |
| REQ-018 | Normalized CLI events | P1 | Approved; not implemented |
| REQ-019 | Controlled execution compatibility | P1 | Approved; not implemented |
| REQ-023 | Resume capability | P1 | Approved; not implemented |
| REQ-028 | MCP command runner | P1 | Approved; not implemented |
| REQ-034 | Process lifecycle | P1 | Approved; not implemented |
| REQ-046 | CLI discovery | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-051 | Untrusted context | P1 | Approved; not implemented |
| REQ-052 | Operational errors | P1 | Approved; not implemented |
| REQ-053 | Settings snapshots | P1 | Approved; not implemented |
| REQ-059 | Stalled turns | P1 | Approved 2026-10-31; not implemented |
| REQ-060 | Usage visibility | P1 | Approved 2026-10-31; not implemented |
