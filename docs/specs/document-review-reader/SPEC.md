# Spec: Artifact Reader and Selected-Text Feedback

## Problem Statement

Read versioned artifacts safely and prepare revision requests for selected passages without losing the global conversation context.

## Goals

- Sidebar artifacts open safe formatted content with exact author/version context.
- Selected text prepares an unsent excerpt request.
- Human approvals cannot be inferred from rendered text or stale UI.

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

1. **[REQ-010]** WHEN an agent start is requested THEN the system SHALL check required approved artifacts and dependencies in the core before spawning a CLI; disabled UI or prompt text alone SHALL NOT implement the gate.
2. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time.
3. **[REQ-013]** WHEN an agent publishes a spec, plan or review THEN the system SHALL write only the scoped approved artifact type under the opened folder layout, honoring optional .claude/rpi-paths.json and default docs/specs, docs/plans and docs/reviews paths.
4. **[REQ-035]** WHEN a document is opened from the sidebar THEN the system SHALL render CommonMark/GFM, highlighted fenced code, tables, tasks, authorized local images and strict Mermaid with no arbitrary HTML or script execution.
5. **[REQ-036]** WHEN the user selects document text and chooses Review with agent THEN the system SHALL prepare its author, feature, artifact identity/hash and selected excerpt in the global composer without sending automatically.
6. **[REQ-037]** WHEN an artifact is written or externally changed THEN the system SHALL use atomic publication, preserve content/history and unknown fields, reconcile filesystem changes, and never silently approve imported, missing, stale or malformed artifacts.
7. **[REQ-043]** WHEN a functional screen is implemented THEN the system SHALL reuse approved component anatomy and recorded user exceptions, compare deterministic captures at matching viewports and fix drift before accepting the screen.
8. **[REQ-045]** WHEN a tool or agent requests approval mutation THEN the system SHALL reject it; human-authorized core commands alone approve artifacts, implementation, final completion and Git integration.
9. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: artifact-approval-gates, feature-workbench-composer.
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

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-document-review-reader.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-010 | Authoritative gates | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-013 | Artifact placement | P1 | Approved; not implemented |
| REQ-035 | Document reader | P1 | Approved; not implemented |
| REQ-036 | Excerpt feedback | P1 | Approved; not implemented |
| REQ-037 | Artifact publishing | P1 | Approved; not implemented |
| REQ-043 | Visual fidelity | P1 | Approved; not implemented |
| REQ-045 | Human approval ownership | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
