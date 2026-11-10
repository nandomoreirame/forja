# Spec: Recovery and MVP Acceptance

## Problem Statement

Restart behavior, context handling, error truthfulness and live CLI acceptance are not covered.

## Goals

- Restore the workbench after restarts, keep context as data, fail truthfully and verify the MVP with live CLIs.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 17 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-063]** WHEN the application restarts THEN the system SHALL restore windows, tabs, chats, turns, outputs, backlog and valid approvals, and mark previously running turns and commands interrupted without restarting them.
2. **[REQ-067]** WHEN native configuration, skills, documents or backlog items enter context THEN the system SHALL treat their content as data under role and tool constraints, without editing user files.
3. **[REQ-068]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable message without secrets and a truthful failed state, never faking completion or weakening controls.
4. **[REQ-070]** WHEN the MVP is accepted THEN the system SHALL pass unit, integration and Electron end-to-end checks plus authenticated smoke checks for the five CLIs on Linux, without shipping an adapter falsely marked supported.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Restart with a chat in acceptance shows Start preview.
- A CLI that fails smoke stays unverified.

## Architecture Decisions

- Live checks are explicit acceptance steps, never part of `npm test`.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Source | Requirements, decisions and scope inherited from the approved parent spec | Parent spec approved on 2026-11-01. |

## Constraints

- Inherit the parent spec constraints.

## Out of Scope

| Item | Reason |
| --- | --- |
| Work owned by other slices | See the parent Implementation Sequence. |

## Test Strategy

- Vitest unit and integration tests named in the plan; core tests run in the node environment with temporary databases, folders and Git repositories.

## Requirement Traceability

| ID | Name | Priority | Status |
| --- | --- | --- | --- |
| REQ-063 | Restore after restart | P1 | Approved 2026-11-01; not implemented |
| REQ-067 | Context as data | P1 | Approved 2026-11-01; not implemented |
| REQ-068 | Truthful failures | P1 | Approved 2026-11-01; not implemented |
| REQ-070 | MVP acceptance | P1 | Approved 2026-11-01; not implemented |
