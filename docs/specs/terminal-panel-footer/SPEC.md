# Spec: User Terminals, Agent Tabs and Collapsed Footer

## Problem Statement

Provide real default-shell PTYs beside read-only agent command tabs and a non-destructive collapsed footer toolbar.

## Goals

- User terminals run the account default shell with multiple independent tabs.
- Agent tabs are read only and show observable managed processes.
- Collapse preserves execution and footer click restores the exact tab.

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

1. **[REQ-004]** WHEN the selected feature changes THEN the system SHALL switch conversation, composer and terminal context together; background events SHALL NOT steal the selected recipient.
2. **[REQ-028]** WHEN an agent invokes development commands THEN the system SHALL run them exclusively through the scoped Forja MCP executor and expose command, authorized cwd, live stdout/stderr, state and eventual exit code.
3. **[REQ-029]** WHEN command output grows THEN the system SHALL stream and persist ordered bounded chunks with backpressure, configurable internal limits and explicit truncation notices rather than growing renderer memory without bounds.
4. **[REQ-030]** WHEN a server is explicitly launched in background mode THEN the system SHALL return an owned execution identifier and allow scoped log reads and stop requests independently from the agent turn.
5. **[REQ-031]** WHEN the user opens a terminal with + THEN the system SHALL start an independent PTY using the system account default shell and the feature worktree, target repository or opened folder in that priority order.
6. **[REQ-032]** WHEN terminal sessions are displayed THEN the system SHALL show a terminal-window icon on every tab, the actual shell basename for manual tabs, agent and command labels for read-only executions, and + on the right.
7. **[REQ-033]** WHEN the downward chevron is clicked THEN the system SHALL collapse without terminating into a feature-scoped footer toolbar with state/loading, hover details and click-to-expand the exact tab.
8. **[REQ-034]** WHEN a turn is interrupted or the app exits THEN the system SHALL stop owned foreground process trees before redirecting, keep explicitly persistent servers independent during turns, and gracefully stop owned CLI/PTY/command processes on full application exit.
9. **[REQ-043]** WHEN a functional screen is implemented THEN the system SHALL reuse approved component anatomy and recorded user exceptions, compare deterministic captures at matching viewports and fix drift before accepting the screen.
10. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
11. **[REQ-054]** WHEN an output view or feature tab is closed THEN the system SHALL distinguish hiding a tab from stopping an execution, preserve feature history and require explicit confirmation before abandoning active owned work.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: web-foundation-landing-styleguide, managed-command-runtime, feature-workbench-composer.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-terminal-panel-footer.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-004 | Composer context | P1 | Approved; not implemented |
| REQ-028 | MCP command runner | P1 | Approved; not implemented |
| REQ-029 | Bounded output | P1 | Approved; not implemented |
| REQ-030 | Persistent processes | P1 | Approved; not implemented |
| REQ-031 | Manual shells | P1 | Approved; not implemented |
| REQ-032 | Terminal tabs | P1 | Approved; not implemented |
| REQ-033 | Collapsed footer | P1 | Approved; not implemented |
| REQ-034 | Process lifecycle | P1 | Approved; not implemented |
| REQ-043 | Visual fidelity | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-054 | Feature archive and sessions | P1 | Approved; not implemented |
