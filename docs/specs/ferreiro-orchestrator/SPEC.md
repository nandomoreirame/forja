# Spec: Ferreiro Orchestrator

## Problem Statement

Chats have a stage but no phase machine, proposals or orchestration; the Ferreiro is a mock reply.

## Goals

- Let the Ferreiro talk, propose and orchestrate while approvals advance phases automatically.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 08 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-011]** WHEN the Ferreiro receives a turn THEN it SHALL run with read-only tools plus the Forja MCP tools for proposals (phase moves, backlog items, skill and memory drafts, summaries) and SHALL NOT write project files, run development commands or approve anything.
2. **[REQ-017]** WHEN a chat is in `talk` and the Ferreiro judges the scope clear THEN it SHALL publish a start proposal (problem, goal, linked backlog items) through the Forja MCP; the user approving the proposal SHALL move the chat to `research` and hand the next turn to the Minerador with the proposal as context.
3. **[REQ-018]** WHEN an artifact that closes a phase is approved (spec closes `research`, plan closes `plan`) or the core validates a phase result (gates green on the committed fingerprint closes `implement`; tests green with no open coverage gap closes `test`; a review round with no open blocking finding closes `review`) THEN the system SHALL advance the chat to the next phase automatically, record the transition in the chat history and start the next agent only when automatic hand-offs are enabled, otherwise show a Continue action.
4. **[REQ-021]** WHEN the Ferreiro orchestrates THEN it SHALL announce each phase change, each automatic hand-off and each stop in the chat history as workflow events, with links to the artifact or result that caused it.
5. **[REQ-022]** WHEN the user asks for a chat summary THEN the Ferreiro SHALL produce it in a tool-less turn, and the system SHALL store it with date, author and usage.
6. **[REQ-023]** WHEN the Ferreiro proposes a skill or memory THEN the system SHALL show the exact content, or a diff for an existing file, and write it in the configured folder only after the user confirms.
7. **[REQ-032]** WHEN the Ferreiro proposes a backlog item during a chat THEN the system SHALL show it as a draft in the chat and create it with source `agent` and a link to the originating chat only after the user confirms.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A later-phase mention answers but never moves the phase.
- Automatic advance never skips spec, plan or acceptance approval.

## Architecture Decisions

- Orchestration rules are core code; the Ferreiro prompt only explains them.

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
| REQ-017 | Start proposal | P1 | Approved 2026-11-01; not implemented |
| REQ-018 | Automatic phase advance | P1 | Approved 2026-11-01; not implemented |
| REQ-021 | Orchestration events | P1 | Approved 2026-11-01; not implemented |
| REQ-022 | Chat summary | P1 | Approved 2026-11-01; not implemented |
| REQ-023 | Skill and memory drafts | P1 | Approved 2026-11-01; not implemented |
| REQ-032 | Backlog items from the Ferreiro | P1 | Approved 2026-11-01; not implemented |
