# Spec: Chat Core Store

## Problem Statement

The core only stores settings; chats, backlog items and history exist only in the renderer mock and vanish on restart.

## Goals

- Persist projects, chats, backlog items and chat history in core SQLite as the single source of truth.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 02 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-001]** WHEN a folder is opened THEN the system SHALL open or focus its own project window by canonical path, including non-Git folders such as `~/dev`.
2. **[REQ-002]** WHEN the user sends the first prompt of a New chat THEN the system SHALL create a chat with an immutable identity, a unique slug and a visible name derived from the prompt, in phase `talk` unless the prompt mentions an RPI agent, and persist the prompt as its first turn.
3. **[REQ-003]** WHEN chats are listed THEN the system SHALL return every non-archived chat of the project ordered by attention (waiting, running, then by last activity), with phase, state, agent of the phase, tool and outputs, whether or not its tab is open.
4. **[REQ-004]** WHEN a chat is renamed THEN the system SHALL change only its visible name, keeping its identity, slug, outputs and branch.
5. **[REQ-005]** WHEN the user archives a chat THEN the system SHALL hide it from Chats, tabs and the command bar without deleting files, archive its unlinked drafts, keep its outputs readable from Archived, and refuse while a turn of the chat is running.
6. **[REQ-006]** WHEN the user abandons a chat THEN the system SHALL require confirmation, stop its owned processes, move it to the read-only `abandoned` state and keep its branch and worktree until an explicit cleanup.
7. **[REQ-031]** WHEN the user adds, edits or removes a backlog item on the Backlog page THEN the system SHALL persist it per project with title, description, source `manual`, creation date and status `open`.
8. **[REQ-033]** WHEN backlog items are attached to a New chat or inserted into an existing chat THEN the system SHALL add them to the chat context (title, description, source) for the next turn, link each item to the chat and move it to status `linked`, removing it from the active backlog while keeping it readable as history.
9. **[REQ-063]** WHEN the application restarts THEN the system SHALL restore windows, tabs, chats, turns, outputs, backlog and valid approvals, and mark previously running turns and commands interrupted without restarting them.
10. **[REQ-064]** WHEN workflow state changes THEN the system SHALL persist versioned JSON and an event history in SQLite and expose scoped state through the Forja MCP, without creating runtime `STATE.md` files in the user project.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A version 1 database upgrades in place.
- Symlinked folders map to one project.
- A second link of the same backlog item is refused.

## Architecture Decisions

- Stores take a `DatabaseSync` and never import Electron.
- Slugs are unique per project.

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
| REQ-001 | Project window per folder | P1 | Approved 2026-11-01; not implemented |
| REQ-002 | Chat creation from the first prompt | P1 | Approved 2026-11-01; not implemented |
| REQ-003 | Chat list | P1 | Approved 2026-11-01; not implemented |
| REQ-004 | Chat rename | P1 | Approved 2026-11-01; not implemented |
| REQ-005 | Chat archive | P1 | Approved 2026-11-01; not implemented |
| REQ-006 | Chat abandon | P1 | Approved 2026-11-01; not implemented |
| REQ-031 | Manual backlog items | P1 | Approved 2026-11-01; not implemented |
| REQ-033 | Attaching backlog items | P1 | Approved 2026-11-01; not implemented |
| REQ-063 | Restore after restart | P1 | Approved 2026-11-01; not implemented |
| REQ-064 | Workflow state in SQLite | P1 | Approved 2026-11-01; not implemented |
