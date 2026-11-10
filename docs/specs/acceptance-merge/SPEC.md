# Spec: Acceptance and Merge

## Problem Statement

There is no acceptance phase; integration was planned as a single final approval without a preview.

## Goals

- Let the user test a running preview and merge only after manual acceptance by default.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 11 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-042]** WHEN a chat leaves `review` THEN the system SHALL enter `acceptance`, start the confirmed preview command of the target repository as an owned background server (or open the configured preview artifact) from the chat worktree, show its address in the chat and keep it running until the user accepts, rejects or stops it.
2. **[REQ-043]** WHEN the user accepts after manual testing THEN the system SHALL bind the acceptance to the exact chat commit, destination branch and HEAD, merge with `--no-ff` in an owned integration worktree, run the confirmed gates on the merge result and move the destination only if they pass and its HEAD did not move since acceptance; the chat SHALL then move to `done`.
3. **[REQ-044]** WHEN the user rejects in acceptance THEN the system SHALL record the reason and return the chat to `implement` with the reason as context for the Bigorneiro.
4. **[REQ-045]** WHEN the merge policy setting is changed from its default (manual test and confirmation) to automatic THEN the system SHALL merge right after review closes, still running the gates on the merge result; the setting SHALL be per project and default to manual.
5. **[REQ-046]** WHEN a chat is done THEN the system SHALL offer explicit removal of its worktree and branch, removing only resources it owns and never a branch with commits missing from the destination without confirming that exact loss.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Destination HEAD moved after acceptance pauses the merge.
- Preview failure does not block a manual acceptance.

## Architecture Decisions

- Merge and push are human-authorized core methods only.

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
| REQ-042 | Acceptance preview | P1 | Approved 2026-11-01; not implemented |
| REQ-043 | Accepted merge | P1 | Approved 2026-11-01; not implemented |
| REQ-044 | Acceptance rejection | P1 | Approved 2026-11-01; not implemented |
| REQ-045 | Merge policy | P1 | Approved 2026-11-01; not implemented |
| REQ-046 | Worktree cleanup | P1 | Approved 2026-11-01; not implemented |
