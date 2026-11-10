# Spec: Test and Review Loop

## Problem Statement

Corrections, backward moves and finding enforcement exist only as plan text.

## Goals

- Run test and review with bounded automatic corrections, defined backward moves and enforced findings.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 10 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-019]** WHEN an agent asks to move work backwards THEN the system SHALL allow only Temperador or Polidor to Bigorneiro (correction), Bigorneiro to Moldador (infeasible plan) and Moldador to Minerador (ambiguous spec); moving back to `plan` or `research` SHALL invalidate later approvals and evidence.
2. **[REQ-020]** WHEN automatic hand-offs are enabled THEN the system SHALL run correction rounds from test or review back to implement and the following re-test and re-review without asking, stopping after three automatic corrections per chat until the user continues.
3. **[REQ-047]** WHEN review findings are produced THEN the system SHALL keep the RPI review format and round trail; only Polidor resolves findings, and open Critical or High findings without a human waiver (reason required, extra confirmation for Critical) SHALL block leaving `review`.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A correction after a manual continue still respects the budget.
- Waivers cannot be issued by agents.

## Architecture Decisions

- Budget and findings live in the versioned workflow JSON.

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
| REQ-019 | Backward moves | P1 | Approved 2026-11-01; not implemented |
| REQ-020 | Automatic corrections | P1 | Approved 2026-11-01; not implemented |
| REQ-047 | Review findings and waivers | P1 | Approved 2026-11-01; not implemented |
