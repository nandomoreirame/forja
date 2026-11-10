# Spec: IPC WorkbenchSource

## Problem Statement

The renderer only talks to a mock; the core accepts a single health message.

## Goals

- Replace the renderer mock with a validated IPC bridge to the core without changing screens.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 03 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-065]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project and chat ownership, canonical paths and tool grants, and never treat model-supplied ids or connector annotations as authorization.
2. **[REQ-069]** WHEN the renderer starts in the desktop app THEN it SHALL read and write through an IPC-backed `WorkbenchSource` with the same contract as the mock, and a flagged screen SHALL turn on in production only when its core requirements pass their checks.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A core crash rejects pending requests.
- The site and tests keep the mock source.

## Architecture Decisions

- Context isolation stays on; the renderer never sees `ipcRenderer`.

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
| REQ-065 | Input validation and ownership | P1 | Approved 2026-11-01; not implemented |
| REQ-069 | IPC-backed WorkbenchSource and flag release | P1 | Approved 2026-11-01; not implemented |
