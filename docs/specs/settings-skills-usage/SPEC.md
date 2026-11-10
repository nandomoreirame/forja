# Spec: Settings, Skills and Usage

## Problem Statement

Settings, skills and usage are mock data in the renderer.

## Goals

- Persist agent profiles, read the skills catalog safely and serve opt-in plan usage as structured values.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 15 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-056]** WHEN agent settings are opened THEN the system SHALL offer exactly six fixed agents (Ferreiro and the five RPI agents), each with an editable display name, CLI, optional model, supported effort, additional instructions, selected skills and the default-off automatic hand-off switch, persisted in SQLite.
2. **[REQ-059]** WHEN the skills catalog loads THEN the system SHALL read `SKILL.md` files from the configured folder (default `~/.skills`) and the native CLI skill folders, read-only, marking each origin, handling symlinks safely and reporting malformed entries.
3. **[REQ-060]** WHEN plan usage is enabled for a tool (off by default, showing the file read and the endpoint called) THEN the system SHALL read that CLI's stored login read-only and in memory to query its usage, and return per window the used percentage, the reset time and the fetch time as structured values, never preformatted text.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A skill root that is a symlink loop is handled.
- Usage readers fail closed.

## Architecture Decisions

- Credentials are read only when the user opted in, never stored.

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
| REQ-056 | Agent profiles | P1 | Approved 2026-11-01; not implemented |
| REQ-059 | Skills catalog | P1 | Approved 2026-11-01; not implemented |
| REQ-060 | Structured plan usage | P1 | Approved 2026-11-01; not implemented |
