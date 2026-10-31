# Spec: Fixed Agent Settings and Local Skills

## Problem Statement

Configure the five fixed roles and read-only local skills through the approved simple settings view.

## Goals

- Configure exactly five agents and the permitted settings.
- Read arbitrary explicitly configured skill folders without edits.
- Global composer remains independent from manual settings saves.

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

1. **[REQ-014]** WHEN agent settings are opened THEN the system SHALL offer exactly Research, Planner, Implementer, Tester and Reviewer, without creating, renaming or deleting roles.
2. **[REQ-015]** WHEN an agent is configured THEN the system SHALL target claude, codex, opencode, agy and grok with verified version/capability records, native authentication reuse and no credential copying or persistent user configuration edits.
3. **[REQ-016]** WHEN the user saves a profile THEN the system SHALL persist CLI, optional model, supported effort, additional instructions, selected skills and the default-off next-agent auto-invocation switch.
4. **[REQ-017]** WHEN the skills catalog is loaded or refreshed THEN the system SHALL read SKILL.md files from a configurable folder defaulting to ~/.skills, preserve source files, handle symlinks safely and report malformed or unreadable entries.
5. **[REQ-046]** WHEN settings are opened or refreshed THEN the system SHALL detect executable/version/capabilities with bounded local probes, distinguish installation from authentication and defer model-network calls to explicit smoke tests.
6. **[REQ-047]** WHEN the user views settings THEN the system SHALL keep the global composer available but separate from manual form saves; agents SHALL NOT read or alter settings merely because the screen is visible.
7. **[REQ-051]** WHEN native configuration, skills or documents enter context THEN the system SHALL treat their content as data subject to role/tool constraints and adapt RPI state instructions for the current invocation without editing user skill/config files.
8. **[REQ-053]** WHEN agent configuration changes while work is active THEN the system SHALL apply it to future turns; preserve the current turn settings snapshot and explicit recipient context.
9. **[REQ-059]** WHEN an agent turn emits no events for the configurable inactivity window (default 10 minutes) THEN the system SHALL mark it unresponsive and let the user keep waiting or stop it; a forced stop SHALL always be available and release the feature lease only after the owned process group terminates.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: web-foundation-landing-styleguide, project-feature-state.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-agent-settings-skills.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-014 | Fixed agents | P1 | Approved; not implemented |
| REQ-015 | Five CLI adapters | P1 | Approved; not implemented |
| REQ-016 | Agent settings | P1 | Approved; not implemented |
| REQ-017 | Read-only skills | P1 | Approved; not implemented |
| REQ-046 | CLI discovery | P1 | Approved; not implemented |
| REQ-047 | Manual app configuration | P1 | Approved; not implemented |
| REQ-051 | Untrusted context | P1 | Approved; not implemented |
| REQ-053 | Settings snapshots | P1 | Approved; not implemented |
| REQ-059 | Stalled turns | P1 | Approved 2026-10-31; not implemented |
