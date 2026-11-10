# Spec: Quick Interface Adjustments

## Problem Statement

The workbench mock grew features that the functional MVP cannot back yet, the agents still carry generic role names and pixel mascots the user did not like, and plan usage hides in a topbar popover. These are frontend-only changes the user wants to implement right away.

## Goals

- Unfinished features disappear from production builds while staying visible in development.
- Agents have their forge names, editable, and the Ferreiro answers New chats with mock replies.
- Plan usage is always visible in the sidebar, and new avatars are tried visually before replacing the mascots.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Frontend-only slice decided on 2026-11-01. The renderer mock layer (`WorkbenchSource`, `createMockSource`) keeps all data; no core, IPC or CLI change is part of this slice. The real Ferreiro sessions, summary turns and confirmed skill writes live in [ferreiro-orchestrator](../ferreiro-orchestrator/SPEC.md); Explorer and Changes become [project-files-source-control](../project-files-source-control/SPEC.md) and [project-files-source-control](../project-files-source-control/SPEC.md).

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The right panel renders Explorer and Changes sections | `src/renderer/src/widgets/git-context.tsx` | yes |
| The statusbar shows behind/ahead counts | `src/renderer/src/widgets/git-status.tsx` | yes |
| The topbar shows a usage popover | `src/renderer/src/pages/workbench/workbench-page.tsx` (`UsagePopover`) | yes |
| Agent mascots are 12×12 pixel sprites | `src/shared/ui/agent-mascot.tsx` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-106]** WHEN a feature is not ready for the functional MVP THEN its interface SHALL be gated by a single typed feature flag registry that turns it off in production builds and on in development and mock builds; a disabled feature SHALL not render at all (not merely hidden), and its tests SHALL cover both states.
2. **[REQ-110]** WHEN agents are shown THEN the system SHALL use each agent's display name, editable in Settings › Agents, defaulting to Ferreiro, Minerador, Moldador, Bigorneiro, Temperador and Polidor in Portuguese and Smith, Miner, Moldmaker, Anvilsmith, Temperer and Polisher in English, with the fixed role in the tooltip and accessible name.
3. **[REQ-107]** WHEN the user opens a New chat THEN the conversation SHALL be with the Ferreiro, the general agent for discussion outside the RPI flow; sending the first prompt SHALL open the chat with the Ferreiro directly as a conversation tab (no intermediate screen or proposal button), the Ferreiro SHALL NOT create a feature or backlog item without the user, picking an RPI agent in the recipient selector SHALL keep the direct feature creation, and RPI agents SHALL NOT do work outside their role (REQ-022).
4. **[REQ-108]** WHEN the user requests a feature conversation summary THEN the Ferreiro SHALL produce it in a tool-less turn, the system SHALL store it with its date and author, and its usage SHALL be recorded per turn (REQ-060).
5. **[REQ-082]** WHEN a project is open THEN the topbar SHALL show, on its right, a plan usage button (gauge icon with a tooltip) that opens a dropdown panel with the time since the last update and, laid out like the AIBar: refresh, settings and close actions, one tab per tool, the tool plan and account, and one card per window (session 5-hour and weekly) with the used percentage, an accent progress bar (destructive from 90%), a thin pace bar for the elapsed share and the time until reset with the points ahead of or behind pace; a tool without data SHALL show as unavailable (REQ-060, REQ-102), formatted in the renderer from structured values, the mock data SHALL come from `WorkbenchSource`.
6. **[REQ-114]** WHEN new agent avatars are evaluated THEN the system SHALL present minimal faces in a minimal style (a rounded square in the agent color with two eyes, no mouth while idle and a mouth that opens and closes while it speaks, and a distinct anvil-and-hammer mark for the Ferreiro, keeping the tool corner badge) first as a Stitch layout and a styleguide preview beside the current mascots, and SHALL replace REQ-089 mascots in the app only after the user approves the preview.
7. **[REQ-115]** WHEN a feature appears in the Features section or as a tab THEN the system SHALL show its state as a distinct glyph in the state color instead of a dot: an animated spinner while working (static under reduced motion), `‖` waiting for the user, `✔` done, `●` idle, `↻` interrupted, `✗` failed and `×` ended, each with its state name in the accessible name and tooltip.
8. **[REQ-116]** WHEN the Explorer or Changes flag is on and the user activates a file THEN the system SHALL open it in an editor tab: an Explorer file as a read-only preview with line numbers and syntax coloring, and a changed file as a side-by-side diff of the base and working versions with added and removed lines highlighted (a deleted file shows only the base, an untracked file only the working version); content comes from `WorkbenchSource` and binary or oversized files show a notice instead of content.
9. **[REQ-117]** WHEN the `backlog-board` flag is on and the user opens Backlog from the sidebar (below the plan usage panel, above Archived) THEN the system SHALL open a Backlog tab listing demands not yet started with title, description and creation date, let the user add, edit and remove a demand, and start a demand by confirming its hand-off to Research, which turns it into a feature.
10. **[REQ-118]** WHEN the `backlog-board` flag is on and the user opens Board from the sidebar THEN the system SHALL open a Board tab with the columns Backlog, Research, Plan, Implement, Testing, Review and Done, placing each demand and non-archived feature by its stage (Done for integrated features) as a card with name, current agent tool icon and status glyph (REQ-115); cards SHALL open their feature or demand and SHALL NOT be dragged between stages, which only approvals and hand-offs change (REQ-009).
11. **[REQ-119]** WHEN a project is open THEN the first sidebar section SHALL be titled Chats (in both languages) instead of Features and list every non-archived conversation started with an agent, whether a feature, a bug or a Ferreiro chat; a Ferreiro chat SHALL appear after its first sent message, named from that prompt and marked with the Ferreiro avatar, and closing its tab SHALL NOT remove it; ordering, status glyphs (REQ-115) and row actions follow REQ-083.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A flag read in tests can be forced on or off; production defaults never depend on localStorage.
- An empty or whitespace display name falls back to the default name for the active language.
- Switching language keeps a user-edited name and translates only default names.
- With no tool reporting usage the panel shows a one-line unavailable state instead of disappearing.
- The mascot trial never changes the app until the user approves the preview.
- A file over the preview size bound or with binary content shows a notice instead of content.
- A board card never moves by drag; its column changes only when the feature stage changes.
- Starting a demand without confirmation leaves it in the backlog.

## Architecture Decisions

- A pure `feature-flags` module in `src/renderer/src/shared/lib` exposes `isEnabled(flag)` from `import.meta.env` (on in development and mock, off in production); flagged components return null when off.
- Agent identity (id, role, default names per locale, display name) lives in one module used by the store, conversation, cycle, tabs and Settings.
- The Ferreiro is a seventh recipient id `smith` outside `roleIds`, so RPI cycle logic stays unchanged.
- The usage panel reuses the REQ-082 data shape from `WorkbenchSource` and the Terminal Noir tokens.
- Status glyphs live in one shared component used by the Features rows, feature tabs and board cards.
- Previews and diffs open as editor tabs; the line diff is a small pure function in `src/renderer/src/shared/lib`, without a new dependency.
- Backlog and Board are page tabs (REQ-103) gated by the `backlog-board` flag; demands live in the mock source until chat-core-store persists them.
- Mascot faces are drafted in Stitch first, then built as a styleguide-only component; the app keeps `AgentMascot` until approval.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Scope | Feature flags, agent names, Ferreiro mock chat, usage panel and a mascot trial, frontend only | User decision on 2026-11-01. |
| 2 | Mascots | Minimal faces as a visual trial, Stitch layout before code | The user wants to see them before deciding. |
| 3 | Usage panel | Always open above Archived, tools with data only, rail icon when collapsed | A compact, always visible usage summary. |
| 4 | Status, previews and board | Clear animated status glyphs; file preview and side-by-side diff behind the Explorer and source control flags; Backlog and Board pages as tabs behind a new `backlog-board` flag, opened from the sidebar below the usage panel (REQ-115 to REQ-118) | User request on 2026-11-01; backlog persistence does not exist in core yet, so both pages stay flagged until it does. |
| 5 | Section name | Rename Features to Chats (same word in English and Portuguese) and list Ferreiro chats after their first message (REQ-119) | Matches the New chat button, avoids the CLI session meaning of sessions, and covers features, bugs and backlog conversations. |
| 6 | Face direction | Minimal faces approved from the Stitch board; idle faces have no mouth, speaking faces move a mouth (reduced motion keeps it still) | User decision on 2026-11-01 after the Stitch trial; the app swap stays a follow-up after the styleguide preview is approved. |
| 7 | Chat is the unit | A chat holds the whole history from the first idea (a backlog item) to the merge of the reviewed worktree; features, bugs, skills, specs and plans are outputs of a chat. The composer has no agent selector: an `@` mention hands that one turn to an agent, otherwise the agent of the chat phase answers, and a New chat starts with the Ferreiro | User decision on 2026-11-01; renaming the Feature entity to Chat across core, storage and specs is a separate planned change. |
| 8 | Usage placement | Plan usage moves from the sidebar to a topbar dropdown opened by a button on the right, laid out like the user's AIBar (tool tabs, window cards with pace bars, amber until 90%); the sidebar and rail no longer show it; the source returns structured values and the renderer formats labels | User decision 2026-11-01. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization.

## Out of Scope

- Real CLI sessions for the Ferreiro, real summaries and file writes (ferreiro-orchestrator).
- Real usage numbers (REQ-102 in chat-turns).
- Backlog demands and custom agents.

## Test Strategy

RTL tests per requirement with the mock source, a flag test in both states, and Playwright checks in dev:web. See the [plan](../../plans/2026-11-01-ui-quick-adjustments.md).

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-106 | Feature flags for unfinished features | P1 | Approved 2026-11-01; not implemented |
| REQ-110 | Agent display names | P1 | Approved 2026-11-01; not implemented |
| REQ-107 | Ferreiro general chat | P1 | Approved 2026-11-01; not implemented |
| REQ-108 | Conversation summary by the Ferreiro | P1 | Approved 2026-11-01; not implemented |
| REQ-082 | Plan usage panel in the sidebar | P1 | Approved 2026-11-01; not implemented |
| REQ-114 | Minimal agent faces trial | P1 | Approved 2026-11-01; not implemented |
| REQ-115 | Clear animated feature status glyphs | P1 | Approved 2026-11-01; not implemented |
| REQ-116 | File preview and change diff | P1 | Approved 2026-11-01; not implemented |
| REQ-117 | Backlog page | P1 | Approved 2026-11-01; not implemented |
| REQ-118 | RPI board page | P1 | Approved 2026-11-01; not implemented |
| REQ-119 | Chats section for every agent conversation | P1 | Approved 2026-11-01; not implemented |
