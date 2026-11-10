# Spec: Chat Worktrees

## Problem Statement

No Git integration exists; features cannot be implemented in isolation.

## Goals

- Give each chat that reaches Implement an owned branch, worktree, gates and safe commits.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 09 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-024]** WHEN a chat reaches `implement` THEN the system SHALL create its feature or bug output (kind chosen in the start proposal, editable before implementation), linked to the chat with the target repository, base, branch and commits.
2. **[REQ-036]** WHEN a chat enters `implement` THEN the system SHALL require an explicit target repository and base branch, create or reuse one owned branch (default `feature/<slug>` or `fix/<slug>`) and a managed worktree outside the destination tree, and share it sequentially among the RPI agents.
3. **[REQ-037]** WHEN a Git target is bound THEN the system SHALL detect candidate validation commands and test-file patterns from the repository manifests, require the user to confirm them, store them per target repository and run them itself as the only authoritative validation evidence.
4. **[REQ-038]** WHEN a Git target is bound THEN the system SHALL propose git-ignored local files to copy into new worktrees (default `.env*` at the root), copy only confirmed git-ignored files inside the repository and never read or log their content.
5. **[REQ-039]** WHEN a Bigorneiro or Temperador turn ends with the confirmed gates passing THEN the system SHALL commit only the owned delta on the chat branch with an agent-proposed Conventional Commits message validated by core, preserving unrelated changes and index entries; failed or skipped gates SHALL NOT commit.
6. **[REQ-040]** WHEN two active chats of one repository change the same file THEN the system SHALL mark the overlap in both chats and repeat the warning before merge, without blocking.
7. **[REQ-041]** WHEN Git or file operations meet external changes THEN the system SHALL keep unrelated changes, fail safely on conflicts and ask for re-evaluation instead of resetting, deleting or including user work silently.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A chat bound to a non-Git folder cannot enter implement.
- Existing unowned branches are never reused.

## Architecture Decisions

- Worktrees live under the app data folder, outside the destination tree.

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
| REQ-024 | Feature or bug output | P1 | Approved 2026-11-01; not implemented |
| REQ-036 | Chat branch and worktree | P1 | Approved 2026-11-01; not implemented |
| REQ-037 | Confirmed repository gates | P1 | Approved 2026-11-01; not implemented |
| REQ-038 | Local file copies | P1 | Approved 2026-11-01; not implemented |
| REQ-039 | Gated commits | P1 | Approved 2026-11-01; not implemented |
| REQ-040 | Overlap warnings | P1 | Approved 2026-11-01; not implemented |
| REQ-041 | Safe Git with external changes | P1 | Approved 2026-11-01; not implemented |
