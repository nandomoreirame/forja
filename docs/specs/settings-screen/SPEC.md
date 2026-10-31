# Spec: Settings Screen

## Problem Statement

The gear in the topbar and the "Configure agents" link have no destination. The approved Stitch settings screen defines the agent profile form, but it only exists as a design.

## Goals

- Open Settings in the center area from the gear, agent links and "+ Add skill".
- Edit the fixed agent profiles and general options with a manual, mock-persisted save.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

These screens are frontend-only and navigable with mock data. They run in the desktop renderer (`npm run dev` and `npm run dev:web`), replace the static welcome scaffold, and become the base that later slices wire to core: feature-workbench-composer (09) and terminal-panel-footer (11) modify these files instead of creating parallel pages. No CLI, Git, MCP, PTY, filesystem or network call happens in these slices. Requested by the user on 2026-10-31.

Shared decisions for the six screen slices (`project-home-screen`, `command-palette`, `new-conversation-composer`, `conversation-screen`, `settings-screen`, `document-viewer-screen`):

- Data comes through a `WorkbenchSource` interface with a deterministic mock implementation; screens never import mock modules directly.
- Two mock projects: `acme-api` (just added, no features) and `dev` (two open features, `Login with OAuth` running and `Catalog search` awaiting approval), switchable from the command bar.
- UI follows the system language with the existing `en`/`pt-br` dictionaries; commands, paths and identifiers are never translated.
- Visual source: Stitch project `9281162402489678867` plus `docs/design/forja-2.0/component-fidelity.md`. Recorded exceptions still apply: no avatars, initials or invented timestamps in messages; dark tooltips; single rotating select chevron; `StatusBadge` for states.
- Components come from `src/shared/ui` (shadcn) and `src/widgets`; the renderer gets the Tailwind plugin, the `@` alias and `src/shared/styles/theme.css`.

**References for this screen:** Stitch "Configurações básicas - MVP Guiado" (`a486490d997146329aa2b82c637c98ee`); recorded exceptions: empty model means the tool default, no invented skill counter beyond the real active count, no invented model list.

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

1. **[REQ-076]** WHEN the user activates the topbar gear, "Configure agents"/"Edit agents" or "+ Add skill" THEN the system SHALL open Settings in the center area with the Agents tab (and the clicked agent selected) or the General tab, keeping feature tabs, feature context and the global composer visible.
2. **[REQ-077]** WHEN Settings is shown THEN the system SHALL offer, in Agents, the fixed role selector, AI tool (claude, codex, opencode, agy, grok) with a mock detection indicator, optional model (empty means the tool default), reasoning level with an availability hint, additional instructions, a skills checklist with an active count and the auto-invoke switch; in General, the skills folder with refresh, interrupt policy, read-only guided mode with three rounds and the inactivity window; changes SHALL persist only through Save, which is enabled when the form is dirty, and leaving with unsaved changes SHALL ask for confirmation.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Switching the agent selector with unsaved changes asks to save or discard first.
- Reasoning level shows only "Tool default" when the mock capability for that tool does not support effort.
- The global composer stays usable; sending from it never saves or reads the form (REQ-047).
- Guided mode and the three rounds are read-only in the MVP.

## Architecture Decisions

- Depends on: project-home-screen.
- Paths match agent-settings-skills Task 4 (`src/renderer/src/pages/settings/`, `src/renderer/src/features/agent-settings/model.ts`), so that task wires these files to core instead of creating them.
- Reuse `src/widgets` and `src/shared/ui`; mock data comes only from `WorkbenchSource`.

## Out of Scope

| Item | Reason |
| --- | --- |
| Real persistence, CLI detection or artifact files | Later slices wire core through `WorkbenchSource`. |

## Test Strategy

RTL tests in `test/renderer/` with jsdom; Playwright smoke against `npm run dev:web`; per-block visual comparison with the referenced Stitch screen.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-076 | Settings entry points | P1 | Approved 2026-10-31; not implemented |
| REQ-077 | Settings form with manual save | P1 | Approved 2026-10-31; not implemented |
