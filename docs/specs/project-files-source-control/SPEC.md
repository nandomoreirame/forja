# Spec: Project Files and Source Control

## Problem Statement

Explorer, Changes, previews and diffs run on mock data and stay hidden in production.

## Goals

- Serve the real file tree, safe previews and diffs, and working tree status to the flagged panels.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 14 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-053]** WHEN the Explorer flag is on THEN core SHALL provide the project file tree with bounded depth and size, folders first and git-ignored entries marked, without reading file contents.
2. **[REQ-054]** WHEN the user opens a file preview or a diff THEN core SHALL read the file (or the base and working versions) only inside the project or chat worktree after canonical path checks, refuse git-ignored secret files such as `.env*`, report binary and oversized files instead of their content, and return text otherwise.
3. **[REQ-055]** WHEN the source control flag is on THEN core SHALL report the working tree changes of the chat worktree (or the opened repository) with git short status and the commits behind and ahead of the upstream or chat base.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Secret files are never read.
- Huge folders truncate with a notice.

## Architecture Decisions

- No file content is read for the tree; previews read on demand only.

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
| REQ-053 | File tree | P1 | Approved 2026-11-01; not implemented |
| REQ-054 | File preview and diff reads | P1 | Approved 2026-11-01; not implemented |
| REQ-055 | Working tree status | P1 | Approved 2026-11-01; not implemented |
