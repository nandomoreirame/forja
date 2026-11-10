# Spec: Forja MCP Gateway and Executor

## Problem Statement

Agents have no controlled way to read state, publish artifacts or run commands.

## Goals

- Give agents a scoped MCP gateway with role grants and a managed command executor.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 05 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-011]** WHEN the Ferreiro receives a turn THEN it SHALL run with read-only tools plus the Forja MCP tools for proposals (phase moves, backlog items, skill and memory drafts, summaries) and SHALL NOT write project files, run development commands or approve anything.
2. **[REQ-028]** WHEN a tool or agent tries to mutate an approval THEN core SHALL reject it; only human-authorized core commands approve start proposals, specs, plans, merges, finding waivers and pushes.
3. **[REQ-048]** WHEN an agent runs a development command THEN the system SHALL run it only through the scoped Forja MCP executor bound to the chat and its authorized directory, showing command, directory, live stdout and stderr, state and exit code.
4. **[REQ-049]** WHEN command output grows THEN the system SHALL stream and persist ordered bounded chunks with backpressure, configurable limits and explicit truncation notices.
5. **[REQ-050]** WHEN a server is launched in background mode THEN the system SHALL return an owned execution id and allow scoped log reads and stops independent of the turn.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A token leaked to another chat is useless outside its chat.
- Commands through symlinked cwd are checked canonically.

## Architecture Decisions

- This is an audited local tool, not a hostile-code sandbox.

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
| REQ-011 | Ferreiro tool grant | P1 | Approved 2026-11-01; not implemented |
| REQ-028 | Human-only approvals | P1 | Approved 2026-11-01; not implemented |
| REQ-048 | Managed commands | P1 | Approved 2026-11-01; not implemented |
| REQ-049 | Bounded output | P1 | Approved 2026-11-01; not implemented |
| REQ-050 | Background servers | P1 | Approved 2026-11-01; not implemented |
