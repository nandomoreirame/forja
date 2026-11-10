# Spec: Attention Notifications

## Problem Statement

Nothing signals work that finishes or waits in a chat that is not on screen.

## Goals

- Tell the user when an off-screen chat waits or finishes, with notifications, counts and a topbar bell.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 16 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-061]** WHEN a chat that is not on screen starts waiting for the user or finishes a turn THEN the system SHALL raise a desktop notification and a distinct sound per kind (each switchable), show the counts in the window title and taskbar badge and list unread items in the topbar bell.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- The chat on screen never notifies.
- Many events collapse into one item per chat.

## Architecture Decisions

- Settings control notification and sound per kind.

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
| REQ-061 | Attention notifications | P1 | Approved 2026-11-01; not implemented |
