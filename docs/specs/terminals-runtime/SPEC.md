# Spec: Terminals Runtime

## Problem Statement

User shells already run on a real PTY with xterm (delivered under the former terminal-panel-footer slice: account shell, validated cwd, owner-checked IPC, bounded transcript per tab), but agent commands are mock text, transcripts vanish on restart, shells ignore chat worktrees and quitting does not ask about running work.

## Goals

- Open user terminals in the right folder, show agent commands read-only, keep transcripts and stop owned processes safely.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 13 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-048]** WHEN an agent runs a development command THEN the system SHALL run it only through the scoped Forja MCP executor bound to the chat and its authorized directory, showing command, directory, live stdout and stderr, state and exit code.
2. **[REQ-051]** WHEN the user opens a terminal with `+` THEN the system SHALL start an independent PTY with the account's default shell in the chat worktree, target repository or opened folder, in that order.
3. **[REQ-052]** WHEN a turn is interrupted or the app exits THEN the system SHALL stop owned foreground process trees first, keep explicit background servers during turns, ask before quitting with running work, and stop every owned process on full exit.
4. **[REQ-063]** WHEN the application restarts THEN the system SHALL restore windows, tabs, chats, turns, outputs, backlog and valid approvals, and mark previously running turns and commands interrupted without restarting them.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A deleted worktree falls back to the repository.
- Quit during termination waits for it.

## Architecture Decisions

- User terminals and agent executions stay separate.

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
| REQ-048 | Managed commands | P1 | Approved 2026-11-01; not implemented |
| REQ-051 | User terminals | P1 | Approved 2026-11-01; not implemented |
| REQ-052 | Stop and quit | P1 | Approved 2026-11-01; not implemented |
| REQ-063 | Restore after restart | P1 | Approved 2026-11-01; not implemented |
