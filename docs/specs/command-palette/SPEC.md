# Spec: Command Bar and Recent Projects

## Problem Statement

The topbar search is a disabled scaffold and the project history opens as a sidebar dropdown in the Stitch board. The user wants one centered command bar for commands and recent projects.

## Goals

- Open a centered shadcn Command dialog from the topbar search, Ctrl+Shift+P and the sidebar project header.
- Scope it to recent projects with Ctrl+R or the home action, and switch the mock project on selection.
- Keep it fully keyboard and screen-reader operable.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

These screens are frontend-only and navigable with mock data. They run in the desktop renderer (`npm run dev` and `npm run dev:web`), replace the static welcome scaffold, and become the base that later slices wire to core: feature-workbench-composer (09) and terminal-panel-footer (11) modify these files instead of creating parallel pages. No CLI, Git, MCP, PTY, filesystem or network call happens in these slices. Requested by the user on 2026-10-31.

Shared decisions for the six screen slices (`project-home-screen`, `command-palette`, `new-conversation-composer`, `conversation-screen`, `settings-screen`, `document-viewer-screen`):

- Data comes through a `WorkbenchSource` interface with a deterministic mock implementation; screens never import mock modules directly.
- Two mock projects: `acme-api` (just added, no features) and `dev` (two open features, `Login with OAuth` running and `Catalog search` awaiting approval), switchable from the command bar.
- UI follows the system language with the existing `en`/`pt-br` dictionaries; commands, paths and identifiers are never translated.
- Visual source: Stitch project `9281162402489678867` plus `docs/design/forja-2.0/component-fidelity.md`. Recorded exceptions still apply: no avatars, initials or invented timestamps in messages; dark tooltips; single rotating select chevron; `StatusBadge` for states.
- Components come from `src/shared/ui` (shadcn) and `src/widgets`; the renderer gets the Tailwind plugin, the `@` alias and `src/shared/styles/theme.css`.

**References for this screen:** shadcn Command (https://ui.shadcn.com/docs/components/base/command); Stitch "Menu de projetos aberto" (`92a017cb51cb48e6b78bb31af079d130`) for the recent-project row anatomy only, rendered inside the command bar instead of the sidebar.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| export function App() { | `src/renderer/src/app/App.tsx:12` | yes |
| export default defineConfig({ root: 'src/renderer', plugins: [react()] }) | `vite.web.config.ts:4` | yes |
| export function Composer({ | `src/widgets/conversation/ui/composer.tsx:35` | yes |
| export function AppTopbar({ brand, commandText, settingsLabel, onSettings }: AppTopbarProps) { | `src/widgets/workbench/ui/app-chrome.tsx:12` | yes |
| data-slot="command" | `src/shared/ui/command.tsx:12` | yes |

## Requirements

### P1 (MVP)

1. **[REQ-064]** WHEN the user activates the topbar search, presses Ctrl+Shift+P or activates the sidebar project header THEN the system SHALL open a centered shadcn Command dialog listing recent projects and commands with type-to-filter, arrow-key navigation, Enter to run, Escape to close and focus restored to the opener.
2. **[REQ-065]** WHEN the user presses Ctrl+R or chooses Recent projects THEN the system SHALL open the same command bar scoped to recent projects, each showing name, path and relative time with the current one marked, and selecting another project SHALL switch the window to that mock project; project history SHALL NOT open as a sidebar dropdown.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Escape, outside click and selection close the dialog and return focus to the element that opened it.
- An empty filter shows the localized empty state, never a blank list.
- "Open folder…" appears disabled with a hint, because the trusted folder picker belongs to project-feature-state; disabled represents real unavailability.
- Selecting the current project closes the bar without changes.

## Architecture Decisions

- Depends on: project-home-screen.
- Screens live in `src/renderer/src/pages/`, compositions in `src/renderer/src/widgets/`, interactions in `src/renderer/src/features/`, state in `src/renderer/src/entities/` (Zustand) and the data contract in `src/renderer/src/shared/api/`. Paths match the ones planned by slices 09 and 11 so those slices modify these files.
- Reuse `src/widgets` and `src/shared/ui`; add shadcn components through the CLI only when missing (Dialog for CommandDialog).
- Mock timers and scripts are injectable so tests run deterministically with fake timers.

## Out of Scope

| Item | Reason |
| --- | --- |
| Real CLI, Git, MCP, PTY, filesystem or network calls | Later slices wire core through `WorkbenchSource`. |
| Approvals, handoff execution and settings screens | Covered by their own slices. |
| Persisting mock state across reloads | Mock data resets on reload by design. |

## Test Strategy

Unit and RTL tests in `test/renderer/` with jsdom and fake timers for scripted replies; a Playwright smoke run against `npm run dev:web` for the navigation paths; visual comparison against the referenced Stitch screens per block with the stitch-fidelity skill.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-064 | Command bar | P1 | Implemented and validated; independently reviewed 2026-10-31 |
| REQ-065 | Recent projects in command bar | P1 | Implemented and validated; independently reviewed 2026-10-31 |

## Follow-up correction: directory picker and separate command/history scopes

User decision on 2026-10-31 supersedes the earlier mock selector behavior: Open project and Ctrl+O open the operating system directory picker through a restricted Electron preload bridge. Compatible browser previews use showDirectoryPicker in read-only mode. Ctrl+R opens recent project history. The command bar (Ctrl+Shift+P) contains commands only, including Open project, with no recent-project group. The Recent projects command (Ctrl+R) opens history separately. Cancellation preserves the current view. Selecting a new directory registers an empty project snapshot in the current in-memory source; file contents and Git state are not scanned by this correction.

## Follow-up refinement: keyboard commands and consistent branding

User correction on 2026-10-31: Settings uses Ctrl+, and the command row displays that shortcut. The command palette includes a Recent projects command with Ctrl+R, while individual projects remain confined to the separate history scope. The command input has no trailing search icon. Both empty and project-open home screens use the same horizontal shared Forja mark, FORJA wordmark and v2.0 label.
