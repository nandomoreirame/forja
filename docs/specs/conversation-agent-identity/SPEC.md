# Spec: Conversation Agent Identity

## Problem Statement

Inside a feature tab the user cannot see which AI tool each agent runs on: the cycle (Research → Planner → Implementer → Tester → Reviewer) shows only role names, and the feature tab icon shows one tool for the whole feature even though each agent has its own tool in Settings › Agents. In the conversation, agent replies are told apart only by a colored name over a bordered box, so a long thread with five agents reads as one wall of text.

## Goals

- Show the configured AI tool of every agent in the feature cycle and keep the feature tab icon on the current agent's tool.
- Give each agent a recognizable pixel-art mascot with its tool as a small badge on every reply.
- Put agent replies on a gray surface, as OpenCode does, so turns stand apart.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Frontend-only mock slice (01h), decided with the user on 2026-10-31. The tool per agent comes from the agent profiles served by `WorkbenchSource.loadSettings()`; an empty model keeps the tool default. Mascots are drawn in code as 12×12 pixel-art SVG sprites with Terminal Noir tokens, no external asset or tool.

This reverses the recorded Stitch exception "no avatars in messages" for agent replies only: user messages still have no avatar, and timestamps stay out. `docs/design/forja-2.0/component-fidelity.md` records the change.

## Requirements

### P1 (MVP)

1. **[REQ-088]** WHEN a feature tab is shown THEN each stage of the feature cycle SHALL show the icon of the AI tool configured for that agent before its name, with a tooltip "<role> · <tool>", and the feature tab icon SHALL show the tool of the agent of the current stage; both SHALL update after Settings are saved.
2. **[REQ-089]** WHEN an agent reply is shown THEN the system SHALL show that agent's mascot (one distinct 12×12 pixel-art sprite per role, decorative) with the configured tool as a corner badge, and the reply's accessible author SHALL read "<role> (<tool>)"; user messages and workflow events SHALL have no avatar.
3. **[REQ-090]** WHEN the conversation is shown THEN agent replies SHALL sit on a gray surface without a border, distinct from the page background and from the user messages, and code, command and log blocks inside a reply SHALL keep a darker background so they still stand out.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A tool without a brand mark (Codex, Grok) uses its neutral glyph from `ToolIcon`.
- Two agents on the same tool show the same badge but different mascots.
- Reduced motion: mascots are static; there is no idle animation.
- Settings saved while a reply streams update the badge of later replies only; past replies keep the tool that answered them (stored on the message).

## Architecture Decisions

- Sprites live in `src/shared/ui/agent-mascot.tsx` as row strings mapped to token colors and render as SVG `rect`s with `shape-rendering="crispEdges"`, so they stay sharp at any size and are reviewed in the styleguide before use.
- Agent messages store the tool that answered (`tool` on `ChatMessage`); the cycle and tab read the current mapping from the store (`agentTools`), loaded with the project and refreshed after a settings save.

## Out of Scope

| Item | Reason |
| --- | --- |
| User avatars | The user is always "You"; not requested. |
| Mascot animation | Kept static; can come later. |

## Test Strategy

RTL tests for the cycle icons, the tab icon following the stage, the reply author label and the surface classes; a styleguide card for the five mascots reviewed by the user; a Playwright visual check of a reply.

## Grilling Log

| # | Question | Decision |
| --- | --- | --- |
| 1 | Mascot per agent or tool logo? | Mascot per agent with the tool logo as a corner badge. |
| 2 | Where is the tool icon in the cycle? | Before every stage name, with a tooltip. |
| 3 | Created here or with an external tool? | Here, as code-defined pixel-art SVG, reviewed in the styleguide. |
| 4 | Reply background? | Gray surface like OpenCode, no border; inner code blocks darker. |

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-088 | Tool icons in the feature cycle and tab | P1 | Approved 2026-10-31; not implemented |
| REQ-089 | Agent mascots with tool badge | P1 | Approved 2026-10-31; not implemented |
| REQ-090 | Gray surface for agent replies | P1 | Approved 2026-10-31; not implemented |
