# Spec: Project Sidebar Navigator

## Problem Statement

The left sidebar still opens with an "Agents" menu (Research, Planner, Implementer, Tester, Reviewer, each with a global "Ready" badge). The workbench moved to one tab per feature, where the agent is picked in the composer, by @mention, and shown in the feature cycle. The menu duplicates those controls, its global state badges are misleading because an agent can be busy in one feature and idle in another, and it hides what the tabs cannot show: every feature of the project, which ones need the user, and the documents each one produced. Specs and plans are flat lists with no link to their feature, "+ Add plan" bypasses the RPI order, and memories live in Settings instead of next to skills.

## Goals

- Replace the Agents menu with a Features section that lists every feature of the project, grouped by what needs the user.
- Show specs and plans linked to their feature or spec, with state badges and the selected feature highlighted.
- Show skills and memories as editable Markdown entries labeled project or global.
- Let the user archive features, specs and plans out of the interface and restore them later, without deleting files.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Frontend-only mock slice, like 01a to 01f: data comes through `WorkbenchSource` with deterministic mock data; no CLI, Git, MCP, PTY or filesystem call. Decided with the user on 2026-10-31 after the conversation, settings and terminal work showed the Agents menu had become redundant.

Sidebar order, top to bottom: **Features**, **Specs**, **Plans**, **Skills**, **Memories**; the bottom workspace menu keeps **Archived**, **Connectors** and **Settings** (Memory leaves it). Usage and limits stays in the topbar. Agent profiles stay in Settings › Agents.

**Depends on:** document-viewer-screen (01f), which provides the document tab used to open specs, plans, skills and memories.

## Requirements

### P1 (MVP)

1. **[REQ-083]** WHEN a project is open THEN the sidebar SHALL start with a Features section listing every non-archived feature, open tab or not, each row showing the state dot and the feature name, and on hover or focus the current agent's AI tool icon, a state badge and the archive action; features needing the user come first, then running, then idle, each by most recent activity, with finished features last in the same list; activating a row SHALL open or focus that feature's tab with its history; new conversations start from the tab strip `+` (REQ-103), not from the sidebar.
2. **[REQ-084]** WHEN the project has specs or plans THEN the Specs and Plans sections SHALL list them with a state badge (draft, approved, stale), each spec showing its feature and each plan its spec as a subtitle; artifacts of the selected feature SHALL be highlighted and the others dimmed; activating a row SHALL open it in a document tab; "+ New spec" SHALL open the centered composer with Research; there SHALL be no "+ Add plan" action, because plans come from an approved spec inside a feature.
3. **[REQ-085]** WHEN the project is open THEN the Skills and Memories sections SHALL list project and global entries with a "project" or "global" label; activating an entry SHALL open its Markdown in a document tab with an "Edit with agent" action that starts an authoring conversation with the matching specialist (mock reply); "+ New skill" and "+ New memory" SHALL ask for the scope and then start that authoring conversation; the workspace menu SHALL no longer contain Memory and Settings SHALL drop its Memory tab.
4. **[REQ-086]** WHEN the user works with sidebar or right panel sections THEN each section SHALL collapse or expand from its header with an eased height transition, resize from the sash above it, show its item count, share the free height among open sections with collapsed headers at the bottom (all at the top when every section is collapsed), and remember its state per viewer across restarts.
5. **[REQ-087]** WHEN the user archives a feature, spec or plan from its row action THEN the system SHALL hide it from the sidebar, tabs and command bar without deleting any file; archiving a feature SHALL also archive its spec and plans and close its tab; a feature with a running agent SHALL NOT be archivable (the action is disabled with a tooltip saying to interrupt first); the workspace menu SHALL offer "Archived", listing archived items by kind with a Restore action that puts them back where they were.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A project without features shows the Features section with only "+ New conversation"; Specs and Plans hide their lists but keep their headers and counts at 0.
- Restoring a plan whose spec is still archived restores the spec too, so a plan is never listed without its spec.
- Archiving the feature of the selected tab selects the neighbor tab, or the centered composer when none is left.
- A stalled feature (REQ-059) counts as needing the user even while its agent process exists.
- Long names truncate with the full name in a tooltip; the stage label never wraps.
- Keyboard: sections are disclosure buttons; rows are buttons reachable with Tab; the row archive action is reachable with Tab and has an accessible name.

## Architecture Decisions

- Feature grouping, ordering and archive cascade are pure functions in the renderer (`features/project-navigator/model.ts`) so core can reuse the rules when slice 05 (project-feature-state) persists them.
- Archive state lives in the mock source and store (`archived` flags on features and artifacts); the real slice stores it in SQLite without touching project files.
- Section collapse uses the same per-viewer storage as the resizable layout.

## Out of Scope

| Item | Reason |
| --- | --- |
| Real skill and memory files, scopes on disk and the specialist agents | agent-settings-skills and later slices wire them; this slice is mock. |
| Deleting files | Archive only hides items from the interface by decision. |
| Drag and drop reordering | Not requested. |

## Test Strategy

RTL tests in `test/renderer/` for grouping, ordering, highlight and archive rules; a Playwright spec in `test/app-e2e/` for opening features from the sidebar, archiving and restoring, and remembered collapse.

## Grilling Log

| # | Question | Decision |
| --- | --- | --- |
| 1 | What replaces the Agents menu? | A Features section listing every feature with stage and attention badges. |
| 2 | Section order? | Features, Specs, Plans, Skills, Memories (user decision). |
| 3 | Memory twice (section and workspace menu)? | Section only; Memory leaves the workspace menu and Settings. |
| 4 | "+ Add plan"? | Removed: plans come from an approved spec inside a feature. |
| 5 | Skills and memories scope? | Both project and global, labeled per row. |
| 6 | Finished features? | Collapsed "Finished" subgroup at the end of Features. |
| 7 | Archive? | Features, specs and plans can be archived and restored from "Archived"; nothing is deleted. |

## User Decisions After Approval (2026-11-01)

- REQ-083 change: there is no "Finished" subgroup; finished features (integrated or abandoned) are listed in the same Features list, after the attention, running and idle groups.
- The sidebar follows VS Code panes: resizable and collapsible sections with 22 px headers and rows, a 120 px minimum body, hover-only row badges and actions, header counts always visible with actions to their left, and Skills and Memories collapsed by default.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-083 | Features section replaces the Agents menu | P1 | Approved 2026-10-31; not implemented |
| REQ-084 | Linked specs and plans | P1 | Approved 2026-10-31; not implemented |
| REQ-085 | Skills and memories with scope | P1 | Approved 2026-10-31; not implemented |
| REQ-086 | Collapsible remembered sections | P1 | Approved 2026-10-31; not implemented |
| REQ-087 | Archive and restore | P1 | Approved 2026-10-31; not implemented |
