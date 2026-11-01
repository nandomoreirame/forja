# Spec: Source Control Changes

## Problem Statement

The Changes section and the statusbar sync counts show mock data; the functional MVP has no core service for working tree status or upstream counts, so they stay hidden in production until this slice lands.

## Goals

- Changes and sync counts reflect the real repository.
- They turn on by enabling the `source-control` flag.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Future feature behind the `source-control` flag (REQ-106). Reuses the Git execution layer of [feature-git-worktrees](../feature-git-worktrees/SPEC.md).

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| Changes renders mock statuses | `src/renderer/src/features/source-control/changes-section.tsx` | yes |
| The statusbar renders mock behind/ahead counts | `src/renderer/src/widgets/git-status.tsx` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-112]** WHEN the source control flag is on THEN the core SHALL report the working tree changes of the feature worktree (or the opened repository) with git short status (modified, untracked, added, deleted), and the Changes section SHALL list them with file name, folder and status letter.
2. **[REQ-113]** WHEN the source control flag is on THEN the statusbar SHALL show the commits behind and ahead of the branch upstream (or the feature base) with tooltips naming the base, refreshed after turns and Git operations, and show only the branch when no upstream exists.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Renamed files report as deleted plus added.
- A detached HEAD shows the short commit instead of a branch.
- No upstream shows the branch only.

## Architecture Decisions

- `git status --porcelain=v2 -z` and `git rev-list --left-right --count` run through the owned Git executor, parsed in core and pushed to the renderer.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Visibility | Hidden in production through the `source-control` flag until delivered | User decision on 2026-11-01. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization.

## Out of Scope

- Staging, committing or diff views from the panel.

## Test Strategy

Real temporary repositories for parsing and counts; RTL tests for the section and statusbar. See the [plan](../../plans/2026-11-01-source-control-changes.md).

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-112 | Source control changes | P1 | Approved 2026-11-01; not implemented |
| REQ-113 | Branch sync status | P1 | Approved 2026-11-01; not implemented |
