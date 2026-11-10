# Spec: CLI Capability Adapters

## Problem Statement

The engine interface lists placeholder CLIs and has no adapters, detection or control checks.

## Goals

- Detect, verify and normalize the five supported CLIs behind one engine interface.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Slice 04 of the chat workflow (parent spec `docs/specs/chat-workflow/SPEC.md`, approved 2026-11-01). Requirement IDs and text come from the parent; the parent's Grilling Log, constraints and test strategy apply.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The parent spec defines these requirements | `docs/specs/chat-workflow/SPEC.md` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-012]** WHEN a CLI produces output THEN the system SHALL normalize versioned structured events (session identity, text, tool activity, permissions, completion, errors, usage) and keep bounded diagnostic context.
2. **[REQ-057]** WHEN an agent CLI is configured THEN the system SHALL support claude, codex, opencode, agy and grok with verified version and capability records, reuse native authentication and never copy credentials or edit persistent user configuration.
3. **[REQ-058]** WHEN settings are opened or refreshed THEN the system SHALL detect executable, version and capabilities with bounded local probes, telling installation from authentication apart, and defer network calls to explicit smoke tests.
4. **[REQ-062]** WHEN a CLI stream does not report waiting or completion THEN the system SHALL derive them from the secondary signal recorded in that CLI's capability contract and record only the derived state.
5. **[REQ-066]** WHEN a CLI enters controlled mode THEN the system SHALL verify the Forja MCP attachment and effective native shell restrictions; tools without control SHALL stay unavailable instead of bypassing permissions.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A CLI updated past its contract is flagged unverified.
- Fixtures never contain account data.

## Architecture Decisions

- Adapters are pure parsers plus a spawn description; process ownership lives in slice 24.

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
| REQ-012 | Normalized CLI events | P1 | Approved 2026-11-01; not implemented |
| REQ-057 | Supported CLIs | P1 | Approved 2026-11-01; not implemented |
| REQ-058 | CLI detection | P1 | Approved 2026-11-01; not implemented |
| REQ-062 | Derived waiting and completion | P1 | Approved 2026-11-01; not implemented |
| REQ-066 | Controlled mode | P1 | Approved 2026-11-01; not implemented |
