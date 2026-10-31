# Spec: Project Home Screen and Workbench Shell

## Problem Statement

The renderer only shows a static welcome scaffold with disabled controls. A just-added project needs the approved workbench shell and a home screen with its first actions, backed by mock data that later slices replace with core state.

## Updated entry behavior (user decision, 2026-10-31)

The renderer starts without an open project. It shows the welcome screen, Open project, Recent projects and Show all commands, with no sidebars. Open project opens the mock project selector; selecting a project loads its shell. No project is opened automatically. This decision supersedes the initial acme-api startup assumption in the saved plan.

## Goals

- Render the approved shell: topbar, project sidebar, right project/Git panel and statusbar.
- Show the project home for a project without open feature tabs, with keyboard shortcuts.
- Load all data through a swappable `WorkbenchSource` with a deterministic mock.
- Make the topbar terminal toggle, back/forward history and side panel collapse work.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

These screens are frontend-only and navigable with mock data. They run in the desktop renderer (`npm run dev` and `npm run dev:web`), replace the static welcome scaffold, and become the base that later slices wire to core: feature-workbench-composer (09) and terminal-panel-footer (11) modify these files instead of creating parallel pages. No CLI, Git, MCP, PTY, filesystem or network call happens in these slices. Requested by the user on 2026-10-31.

Shared decisions for the six screen slices (`project-home-screen`, `command-palette`, `new-conversation-composer`, `conversation-screen`, `settings-screen`, `document-viewer-screen`):

- Data comes through a `WorkbenchSource` interface with a deterministic mock implementation; screens never import mock modules directly.
- Two mock projects: `acme-api` (just added, no features) and `dev` (two open features, `Login with OAuth` running and `Catalog search` awaiting approval), switchable from the command bar.
- UI follows the system language with the existing `en`/`pt-br` dictionaries; commands, paths and identifiers are never translated.
- Visual source: Stitch project `9281162402489678867` plus `docs/design/forja-2.0/component-fidelity.md`. Recorded exceptions still apply: no avatars, initials or invented timestamps in messages; dark tooltips; single rotating select chevron; `StatusBadge` for states.
- Components come from `src/shared/ui` (shadcn) and `src/widgets`; the renderer gets the Tailwind plugin, the `@` alias and `src/shared/styles/theme.css`.

**References for this screen:** Stitch screens "Projeto aberto (Sem abas / Empty State)" (`ca8041d7befc4d069c830cc7fb77d890`) and "Início sem projeto" (`72fc281d25234baea9a06a74ab337a4e`); user reference image of the `acme-api` home.

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

1. **[REQ-061]** WHEN the renderer starts THEN the system SHALL load projects, features, conversations and terminals through a `WorkbenchSource` interface, using a deterministic mock implementation until core IPC replaces it, without importing mock modules in screens.
2. **[REQ-062]** WHEN a project is open THEN the system SHALL render the workbench shell (40 px topbar with back/forward, command bar trigger, terminal and settings icons; project sidebar with agents, specs, plans and skills; right project/Git/branches panel; 32 px statusbar with the project path and encoding) using shared shadcn/Tailwind components in the system language.
3. **[REQ-063]** WHEN an open project has no feature tabs THEN the system SHALL show the project home with the Forja mark and the actions New conversation (Ctrl+N), Recent projects (Ctrl+R) and Show all commands (Ctrl+Shift+P), each clickable, focusable and triggered by its shortcut.
4. **[REQ-072]** WHEN the user activates the topbar terminal icon, the back/forward arrows or a side panel chevron THEN the system SHALL toggle the terminal panel, move through the window's view history (home, new conversation, conversation, settings, document) or collapse and expand that side panel, keeping the choice for the session.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A project with zero specs, plans or skills shows the section header with count 0 and its add action.
- Ctrl+N cannot be intercepted by Chrome in `dev:web`; the action stays clickable and the shortcut works in Electron. Ctrl+R must call `preventDefault` so it never reloads the window.
- Window narrower than 1100 px keeps the center usable; side panels may collapse with their chevron buttons.
- "+ New spec" is not offered on the home screen (user decision); the sidebar "+ Add spec" opens the same new-conversation flow as "+ New conversation".
- Back/forward keep an in-memory history per window; Alt+Left/Alt+Right also navigate. The terminal icon is the same toggle as the panel chevron.

## Architecture Decisions

- Depends on: web-foundation-landing-styleguide.
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
| REQ-061 | Swappable mock source | P1 | Approved 2026-10-31; not implemented |
| REQ-062 | Workbench shell | P1 | Approved 2026-10-31; not implemented |
| REQ-063 | Project home | P1 | Approved 2026-10-31; not implemented |
| REQ-072 | Shell navigation and panels | P1 | Approved 2026-10-31; not implemented |
