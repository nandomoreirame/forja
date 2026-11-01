# Spec: Ferreiro General Agent

## Problem Statement

The RPI agents are specialists, but the user also needs a general assistant to discuss topics outside the flow, summarize conversations and author skills and memories.

## Goals

- New chats talk to a general agent that never acts without confirmation.
- Summaries and skill or memory drafts come from that agent through real CLI sessions.
- Six fixed agents are configurable, with editable names.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Builds on [cli-agent-sessions](../cli-agent-sessions/SPEC.md) adapters and [agent-settings-skills](../agent-settings-skills/SPEC.md) profiles. The frontend mock comes first in [ui-quick-adjustments](../ui-quick-adjustments/SPEC.md). The Ferreiro only drafts; the user confirms every change.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| Agent profiles are fixed to five roles today | `docs/specs/agent-settings-skills/SPEC.md` (REQ-014) | yes |
| Skill authoring streams a mock conversation | `src/renderer/src/entities/feature/model/store.ts` (`startAuthoring`) | yes |
| The CLIs can run a tool-less turn | n/a | assumption |

## Requirements

### P1 (MVP)

1. **[REQ-014]** WHEN agent settings are opened THEN the system SHALL offer exactly six fixed agents, the general Ferreiro and the RPI roles Research, Planner, Implementer, Tester and Reviewer, each with an editable display name (REQ-110), without creating, deleting or changing roles.
2. **[REQ-017]** WHEN the skills catalog is loaded or refreshed THEN the system SHALL read SKILL.md files from a configurable folder defaulting to ~/.skills, preserve source files, handle symlinks safely and report malformed or unreadable entries; skill files SHALL be created or changed only through a user-confirmed Ferreiro draft (REQ-109).
3. **[REQ-107]** WHEN the user opens a New chat THEN the conversation SHALL be with the Ferreiro, the general agent for discussion outside the RPI flow; the Ferreiro SHALL start a feature (handing the request to Research) only after the user confirms, and RPI agents SHALL NOT do work outside their role (REQ-022).
4. **[REQ-108]** WHEN the user requests a feature conversation summary THEN the Ferreiro SHALL produce it in a tool-less turn, the system SHALL store it with its date and author, and its usage SHALL be recorded per turn (REQ-060).
5. **[REQ-109]** WHEN the Ferreiro proposes a skill or memory THEN the system SHALL show the exact content (or diff for an existing file) as a draft and create or change the file in the configured folder only after the user confirms; nothing SHALL be written without that confirmation.
6. **[REQ-110]** WHEN agents are shown THEN the system SHALL use each agent's display name, editable in Settings › Agents, defaulting to Ferreiro, Minerador, Moldador, Bigorneiro, Temperador and Polidor in Portuguese and Smith, Miner, Moldmaker, Anvilsmith, Temperer and Polisher in English, with the fixed role in the tooltip and accessible name.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A Ferreiro turn never receives RPI artifact write tools or the managed executor.
- Declining a draft writes nothing and keeps the conversation.
- A draft for an existing skill shows a diff and refuses to write if the file changed since the draft.
- Renaming an agent never changes its role, permissions or history.

## Architecture Decisions

- The Ferreiro is a sixth fixed agent with its own profile; its turns use the configured CLI adapter with a general system context and no workflow tools.
- Draft confirmation is a core command; agents cannot confirm their own drafts (REQ-045).
- Display names persist with the profile; defaults come from i18n.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Scope | Lean MVP: free chat, summaries, confirmed skill and memory drafts | User choice on 2026-11-01. |
| 2 | Autonomy | Nothing is created without the user | Every write stays under the user's control. |
| 3 | Future | Backlog demands (with rpi-board) and creating agents | Kept out of the MVP. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization.

## Out of Scope

- Backlog demands before Research (planned with rpi-board).
- Creating custom agents.
- Ferreiro access to RPI artifacts or code execution.

## Test Strategy

Unit tests with fake adapters, real temporary skill folders for confirmed writes, and an Electron E2E with the fake CLI. See the [plan](../../plans/2026-11-01-ferreiro-agent.md).

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-014 | Six agent profiles with editable names | P1 | Approved 2026-11-01; not implemented |
| REQ-017 | Skills catalog with confirmed writes | P1 | Approved 2026-11-01; not implemented |
| REQ-107 | Ferreiro general chat | P1 | Approved 2026-11-01; not implemented |
| REQ-108 | Conversation summary by the Ferreiro | P1 | Approved 2026-11-01; not implemented |
| REQ-109 | Skill and memory drafts by the Ferreiro | P1 | Approved 2026-11-01; not implemented |
| REQ-110 | Agent display names | P1 | Approved 2026-11-01; not implemented |
