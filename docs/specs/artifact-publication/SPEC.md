# Spec: Artifact Publication

## Problem Statement

Specs, plans and reviews are mock documents; nothing validates or binds approvals to content.

## Goals

- Publish, validate and approve chat outputs with hash-bound approvals.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 07 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-025]** WHEN an agent publishes a spec, plan or review THEN the system SHALL write only that artifact type under the chat artifact root (the chat worktree when the target is a Git repository, otherwise the opened folder), honoring the root's optional `.claude/rpi-paths.json`, and link it to the chat as an output.
2. **[REQ-026]** WHEN a spec or plan is published THEN core SHALL validate it (spec: EARS form, unique ascending IDs, traceability rows match requirements; plan: each task has requirement, files, test and expected result; every P1 requirement covered by a task and a check with a well-formed proof) and reject an invalid artifact with the problems listed.
3. **[REQ-027]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals and evidence to exact content hashes and dependency revisions, invalidate affected approvals and results, keep history and recheck at dispatch and approval time; RPI artifact paths SHALL be excluded from the code fingerprint.
4. **[REQ-029]** WHEN an artifact is written or changed outside Forja THEN the system SHALL publish atomically, keep unknown fields and history, reconcile filesystem changes and never approve imported, missing, stale or malformed artifacts silently.
5. **[REQ-030]** WHEN outputs are listed THEN the sidebar sections (Specs, Plans, Reviews, Skills, Memories) SHALL show each output with its chat as subtitle and highlight the outputs of the selected chat.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- External edits stale approvals and show reconciliation.
- Identical republish is a no-op.

## Architecture Decisions

- Files remain the content source; SQLite keeps revisions, hashes and approvals.

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
| REQ-025 | Artifact publication | P1 | Approved 2026-11-01; not implemented |
| REQ-026 | Artifact validation | P1 | Approved 2026-11-01; not implemented |
| REQ-027 | Hash-bound approvals | P1 | Approved 2026-11-01; not implemented |
| REQ-029 | Atomic publication and reconciliation | P1 | Approved 2026-11-01; not implemented |
| REQ-030 | Outputs in the sidebar | P1 | Approved 2026-11-01; not implemented |
