# Spec: Feature Conversation Screen

## Problem Statement

The core screen of Forja (a feature conversation with its context, Git panel, composer and terminals) only exists as isolated gallery samples. The user needs it navigable with mock agent replies, terminals and closable feature tabs.

## Goals

- Compose the feature conversation screen from the shared widgets.
- Answer prompts with scripted, streamed mock replies and mock terminal output.
- Open, collapse and switch mock terminals; close feature tabs down to the centered composer.
- Switch recipients from the sidebar or @mentions, follow handoff links, and add or stop mock terminals.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

These screens are frontend-only and navigable with mock data. They run in the desktop renderer (`npm run dev` and `npm run dev:web`), replace the static welcome scaffold, and become the base that later slices wire to core: feature-workbench-composer (09) and terminal-panel-footer (11) modify these files instead of creating parallel pages. No CLI, Git, MCP, PTY, filesystem or network call happens in these slices. Requested by the user on 2026-10-31.

Shared decisions for the six screen slices (`project-home-screen`, `command-palette`, `new-conversation-composer`, `conversation-screen`, `settings-screen`, `document-viewer-screen`):

- Data comes through a `WorkbenchSource` interface with a deterministic mock implementation; screens never import mock modules directly.
- Two mock projects: `acme-api` (just added, no features) and `dev` (two open features, `Login with OAuth` running and `Catalog search` awaiting approval), switchable from the command bar.
- UI follows the system language with the existing `en`/`pt-br` dictionaries; commands, paths and identifiers are never translated.
- Visual source: Stitch project `9281162402489678867` plus `docs/design/forja-2.0/component-fidelity.md`. Recorded exceptions still apply: no avatars, initials or invented timestamps in messages; dark tooltips; single rotating select chevron; `StatusBadge` for states.
- Components come from `src/shared/ui` (shadcn) and `src/widgets`; the renderer gets the Tailwind plugin, the `@` alias and `src/shared/styles/theme.css`.

**References for this screen:** Stitch "Feature em execução - MVP Guiado" (`b1e7dc73f23d4af5b81d37d978ef4b68`) and "Feature em execução com terminais" (`2551431dbc994626a9fd20cd8290a8d7`) with the user terminal refinement; user reference image of the `dev` project conversation.

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

1. **[REQ-068]** WHEN a feature tab is selected THEN the system SHALL show its feature context (mode badge, destination, branch and RPI cycle), its conversation, the docked composer and the Git panel for that feature, with background features never stealing the selected recipient.
2. **[REQ-069]** WHEN the user sends a prompt in a feature THEN the system SHALL append the message and stream a scripted mock reply from the selected recipient (running to completed, with Interrupt available), adding mock terminal output for Implementer and Tester replies, with no CLI, network or filesystem access.
3. **[REQ-070]** WHEN the user opens or collapses the terminal panel or switches terminal tabs THEN the system SHALL keep each mock terminal's output and state, collapse to the footer toolbar without stopping mocks, and reopen the exact tab from the toolbar.
4. **[REQ-071]** WHEN the user closes a feature tab THEN the system SHALL remove only that tab (confirming first when its mock agent is running), select a neighbor tab, and show the centered composer after the last tab closes.
5. **[REQ-074]** WHEN the user activates an agent row in the sidebar or types a valid @mention (token boundary, English or localized role alias, ignored inside code fences) THEN the system SHALL make that agent the composer recipient for the selected feature, with the latest explicit choice winning.
6. **[REQ-075]** WHEN the user activates "View request", the terminal "+" or "Stop process" THEN the system SHALL scroll to and highlight the source message, add a mock manual shell tab labeled with the shell name, or mark that mock execution stopped with its output preserved.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Messages show no avatars, initials or timestamps (recorded exception), even though the reference image has them.
- A send while the recipient is replying interrupts the scripted reply first (interrupt is the default policy), then starts the new one.
- Reduced motion renders each mock reply at once instead of streaming.
- Closing a tab whose mock agent is running asks for confirmation; closing never deletes the feature history in the mock source.
- Collapsing the terminal panel keeps mock output and running state; the footer toolbar reopens the exact tab.
- Mentions such as `@research`, `@pesquisador` or `@tester` switch the recipient; e-mail addresses, unknown handles and text in code fences do not.
- "View request" highlights the linked message for about two seconds without moving focus away from the composer.

## Architecture Decisions

- Depends on: new-conversation-composer, command-palette.
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
| REQ-068 | Feature conversation layout | P1 | Approved 2026-10-31; not implemented |
| REQ-069 | Scripted mock replies | P1 | Approved 2026-10-31; not implemented |
| REQ-070 | Mock terminals | P1 | Approved 2026-10-31; not implemented |
| REQ-071 | Closable feature tabs | P1 | Approved 2026-10-31; not implemented |
| REQ-074 | Recipient by sidebar or mention | P1 | Approved 2026-10-31; not implemented |
| REQ-075 | Conversation and terminal extras | P1 | Approved 2026-10-31; not implemented |
