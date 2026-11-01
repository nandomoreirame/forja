# Spec: Workbench Interface Refresh

## Problem Statement

The interface changed substantially on 2026-11-01 (framed parts, tabs for every page, VS Code panes, sidebar rail, language switch, resizable right panel) and the approved requirements no longer described it.

## Goals

- The approved requirements describe the interface that exists.
- Every refreshed behavior is backed by an automated test.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Records the interface implemented on 2026-11-01 (commits from `5682288` to `bc90587`) as approved behavior. The renderer mock layer (`WorkbenchSource`, `createMockSource`) keeps all data; no core, IPC or CLI change is part of this slice.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| Every page opens as a tab | `src/renderer/src/widgets/workbench-tabs.tsx` | yes |
| Ctrl+W closes the active tab | `src/renderer/src/entities/feature/model/store.ts` (`closeActiveTab`) | yes |
| Sidebar sections stack and animate | `src/renderer/src/features/project-navigator/pane-stack.tsx` | yes |
| Language switches live | `src/renderer/src/entities/feature/model/store.ts` (`setLocale`) | yes |

## Requirements

### P1 (MVP)

1. **[REQ-062]** WHEN a project is open THEN the system SHALL render the workbench shell on the Terminal Noir `surface.base` background: a 40 px topbar with the brand, the sidebar toggle, the command bar trigger and the right panel toggle (no back/forward buttons; Alt+Left/Right keep the view history); the left sidebar, editor area, terminal panel and right panel as separate parts with an 8 px rounded border and a small gap; and a 32 px statusbar with the project button showing the `~`-relative path, the background terminals and the current branch.
2. **[REQ-068]** WHEN a feature tab is selected THEN the system SHALL show a header with the feature name and the Summary and Flow actions (Flow opens a centered bar with the RPI cycle), its conversation and the docked composer; destination and branch SHALL appear in the right panel, and background features SHALL never steal the selected recipient.
3. **[REQ-071]** WHEN the user closes a tab THEN the system SHALL remove only that tab without confirmation, keep a running agent working in the background with its state visible in the Features section (REQ-054), select a neighbor tab, and show the initial empty state without tabs after the last tab closes.
4. **[REQ-072]** WHEN the user activates the topbar sidebar or right panel toggle, presses Ctrl+B, activates the statusbar terminal toggle or presses Alt+Left/Right THEN the system SHALL show or hide that part (the collapsed sidebar becomes an icon rail) or move through the window view history, keeping the choice for the session.
5. **[REQ-076]** WHEN the user opens Settings from the sidebar, the rail or Ctrl+, THEN the system SHALL open the Settings tab on General, with Agents second and Connectors third, keeping the other tabs open.
6. **[REQ-081]** WHEN a project is open THEN the left sidebar SHALL end with the plan usage panel (REQ-082) above a menu holding Archived, Connectors and Settings; memories SHALL be a sidebar section and each menu entry SHALL open its page as a tab.
7. **[REQ-083]** WHEN a project is open THEN the sidebar SHALL start with a Features section listing every non-archived feature, open tab or not, each row showing the state dot and the feature name, and on hover or focus the current agent's AI tool icon, a state badge and the archive action; features needing the user come first, then running, then idle, each by most recent activity, with finished features last in the same list; activating a row SHALL open or focus that feature's tab with its history; new conversations start from the tab strip `+` (REQ-103), not from the sidebar.
8. **[REQ-086]** WHEN the user works with sidebar or right panel sections THEN each section SHALL collapse or expand from its header with an eased height transition, resize from the sash above it, show its item count, share the free height among open sections with collapsed headers at the bottom (all at the top when every section is collapsed), and remember its state per viewer across restarts.
9. **[REQ-103]** WHEN the user opens a feature, document, Settings, Archived, a New chat or skill authoring THEN the system SHALL show it as a tab in the single editor tab strip; every `+` SHALL open a new New chat tab with its own draft and agent; Ctrl+W SHALL close the active tab, do nothing without tabs and never close the application.
10. **[REQ-104]** WHEN the user saves another language in Settings › General (English by default, Português second) THEN the system SHALL apply it to the interface without restarting or losing open tabs and remember it for the next launch.
11. **[REQ-105]** WHEN a project is open THEN the right panel SHALL resize from its sash within 200 to 480 px (default 260 px, double click resets, size remembered) and stack Project and Branches sections (REQ-086), plus Explorer and Changes when their feature flags are on (REQ-106).

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Closing the last tab shows the empty state, never an implicit New chat.
- Ctrl+W inside the terminal stays with the shell.
- The Electron menu has no Close Window accelerator.

## Architecture Decisions

- Implemented in the renderer with shared shadcn/Tailwind components; tests already live under `test/renderer`, `test/web` and `test/app-e2e`.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Source of truth | The current interface wins over the earlier requirement text | User decision on 2026-11-01. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization.

## Out of Scope

- Explorer and source control (flagged future features).

## Test Strategy

Existing unit, RTL and Playwright tests are the evidence; the plan maps each requirement to them. See the [plan](../../plans/2026-11-01-workbench-ui-refresh.md).

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-062 | Framed workbench shell | P1 | Revised 2026-11-01; implemented |
| REQ-068 | Feature conversation layout | P1 | Revised 2026-11-01; implemented |
| REQ-071 | Closable tabs keep agents running | P1 | Revised 2026-11-01; implemented |
| REQ-072 | Shell toggles and history | P1 | Revised 2026-11-01; implemented |
| REQ-076 | Settings entry points | P1 | Revised 2026-11-01; implemented |
| REQ-081 | Sidebar footer menu | P1 | Revised 2026-11-01; implemented |
| REQ-083 | Features section | P1 | Revised 2026-11-01; implemented |
| REQ-086 | VS Code style panes | P1 | Revised 2026-11-01; implemented |
| REQ-103 | Every page opens as a tab | P1 | Revised 2026-11-01; implemented |
| REQ-104 | Live language switch | P1 | Revised 2026-11-01; implemented |
| REQ-105 | Resizable right panel | P1 | Revised 2026-11-01; implemented |
