# Spec: Backlog and Board

## Problem Statement

Backlog demands are mock-only, cannot be attached to chats, and the Board uses the old stage model.

## Goals

- Make backlog items real inputs with sources, attachable to chats, and the Board a view of chats by phase.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 12 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-031]** WHEN the user adds, edits or removes a backlog item on the Backlog page THEN the system SHALL persist it per project with title, description, source `manual`, creation date and status `open`.
2. **[REQ-032]** WHEN the Ferreiro proposes a backlog item during a chat THEN the system SHALL show it as a draft in the chat and create it with source `agent` and a link to the originating chat only after the user confirms.
3. **[REQ-033]** WHEN backlog items are attached to a New chat or inserted into an existing chat THEN the system SHALL add them to the chat context (title, description, source) for the next turn, link each item to the chat and move it to status `linked`, removing it from the active backlog while keeping it readable as history.
4. **[REQ-034]** WHEN backlog sources are read THEN the system SHALL accept items through one source interface so later connectors (GitHub issues, Notion) can add items with their origin URL, without connector code in this MVP.
5. **[REQ-035]** WHEN the Board opens THEN the system SHALL show open backlog items in the first column and every non-archived chat in the column of its phase (Research, Plan, Implement, Testing, Review, Acceptance, Done), leaving `talk` chats out; cards SHALL open the chat or the Backlog and SHALL NOT be draggable.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Two chats cannot link the same item at once.
- Connector items keep their origin URL.

## Architecture Decisions

- Connectors implement `BacklogSource`; none ships in this MVP.

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
| REQ-031 | Manual backlog items | P1 | Approved 2026-11-01; not implemented |
| REQ-032 | Backlog items from the Ferreiro | P1 | Approved 2026-11-01; not implemented |
| REQ-033 | Attaching backlog items | P1 | Approved 2026-11-01; not implemented |
| REQ-034 | Backlog source interface | P1 | Approved 2026-11-01; not implemented |
| REQ-035 | Board by phase | P1 | Approved 2026-11-01; not implemented |
