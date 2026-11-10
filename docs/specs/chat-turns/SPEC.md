# Spec: Chat Turns

## Problem Statement

Turns exist only as scripted mock replies in the renderer.

## Goals

- Run agent turns per chat in core with the right agent, leases, interrupts, resume and usage.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 06 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-007]** WHEN the user sends a prompt THEN the system SHALL hand the turn to the last agent mentioned with `@` outside code (by id, role, forge name in either language or the user's display name); without a mention, to a pending one-turn hand-off (such as Review with agent); otherwise to the agent of the phase. A mention SHALL apply to that turn only.
2. **[REQ-008]** WHEN a prompt targets a chat with a running turn THEN the system SHALL interrupt it and wait for the foreground process to end by default, or enqueue the prompt in order when interruption is disabled, never running two turns of one chat at once.
3. **[REQ-009]** WHEN several chats run THEN the system SHALL allow turns across chats concurrently while enforcing one turn per chat and separate session, process and Git ownership.
4. **[REQ-010]** WHEN an agent of an RPI phase receives a turn THEN the system SHALL restrict it to its role: Minerador publishes specs, Moldador publishes plans, Bigorneiro changes authorized code, Temperador adds or edits files matching the confirmed test patterns and reports gaps, Polidor publishes review findings; work outside the role SHALL be refused by core tools, not only by prompt text.
5. **[REQ-013]** WHEN a turn emits no events for the configurable inactivity window (default 10 minutes) THEN the system SHALL mark it unresponsive, let the user wait or stop it, and release the chat lease only after the owned process group ends.
6. **[REQ-014]** WHEN an interrupted chat resumes THEN the system SHALL reuse the native CLI session of the same chat and agent when supported, and ask before rebuilding context in a new session otherwise.
7. **[REQ-015]** WHEN a CLI reports token or cost usage THEN the system SHALL record it per turn and per chat and show it; without a report it SHALL show usage as unavailable instead of estimating.
8. **[REQ-016]** WHEN agent settings change while a turn runs THEN the system SHALL apply them to later turns and keep the running turn's snapshot.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Interrupt during termination never starts two turns.
- A mentioned later-phase agent answers but does not move the phase.

## Architecture Decisions

- The alias table lives in `src/shared` so renderer and core agree.

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
| REQ-007 | Agent of the turn | P1 | Approved 2026-11-01; not implemented |
| REQ-008 | Busy chat: interrupt or queue | P1 | Approved 2026-11-01; not implemented |
| REQ-009 | Concurrent chats | P1 | Approved 2026-11-01; not implemented |
| REQ-010 | Role restrictions | P1 | Approved 2026-11-01; not implemented |
| REQ-013 | Unresponsive turns | P1 | Approved 2026-11-01; not implemented |
| REQ-014 | Session resume | P1 | Approved 2026-11-01; not implemented |
| REQ-015 | Usage per turn and chat | P1 | Approved 2026-11-01; not implemented |
| REQ-016 | Settings snapshot per turn | P1 | Approved 2026-11-01; not implemented |
