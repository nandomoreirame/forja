# Spec: Project Explorer

## Problem Statement

The Explorer section shows a mock tree; the functional MVP has no core service to read the project tree, so the section stays hidden in production until this slice lands.

## Goals

- Explorer shows the real project tree safely and quickly.
- The section turns on by enabling its feature flag.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Future feature behind the `explorer` flag (REQ-106). The renderer section already exists (`src/renderer/src/features/source-control/explorer-section.tsx`).

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| Explorer renders a mock tree | `src/renderer/src/features/source-control/explorer-section.tsx` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-111]** WHEN the Explorer flag is on and a project is open THEN the core SHALL provide the project file tree with bounded depth and size, folders first, git-ignored entries dimmed and no file contents read, and the Explorer section SHALL show it with git status letters and folder change dots (REQ-112).

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Symlinks outside the project are listed but not followed.
- Very large folders are truncated with a visible notice.
- Unreadable folders show an error row instead of failing the tree.

## Architecture Decisions

- A core service lists directories lazily per expanded folder through validated IPC; no file content is read.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Visibility | Hidden in production through the `explorer` flag until delivered | User decision on 2026-11-01. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization.

## Out of Scope

- Opening or editing files from the tree.

## Test Strategy

Real temporary directories for the core service and RTL tests for the section. See the [plan](../../plans/2026-11-01-project-explorer.md).

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-111 | Project Explorer | P1 | Approved 2026-11-01; not implemented |
