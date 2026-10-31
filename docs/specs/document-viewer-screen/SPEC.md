# Spec: Document Viewer Tabs

## Problem Statement

Specs, plans and reviews listed in the sidebar cannot be opened. The document reader with excerpt review is an approved MVP behavior with gallery components, but no screen uses them yet.

## Goals

- Open sidebar documents as closable tabs rendered with the shared Markdown and Mermaid widgets.
- Send a selected excerpt to the composer through "Review with agent" without sending automatically.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

These screens are frontend-only and navigable with mock data. They run in the desktop renderer (`npm run dev` and `npm run dev:web`), replace the static welcome scaffold, and become the base that later slices wire to core: feature-workbench-composer (09) and terminal-panel-footer (11) modify these files instead of creating parallel pages. No CLI, Git, MCP, PTY, filesystem or network call happens in these slices. Requested by the user on 2026-10-31.

Shared decisions for the six screen slices (`project-home-screen`, `command-palette`, `new-conversation-composer`, `conversation-screen`, `settings-screen`, `document-viewer-screen`):

- Data comes through a `WorkbenchSource` interface with a deterministic mock implementation; screens never import mock modules directly.
- Two mock projects: `acme-api` (just added, no features) and `dev` (two open features, `Login with OAuth` running and `Catalog search` awaiting approval), switchable from the command bar.
- UI follows the system language with the existing `en`/`pt-br` dictionaries; commands, paths and identifiers are never translated.
- Visual source: Stitch project `9281162402489678867` plus `docs/design/forja-2.0/component-fidelity.md`. Recorded exceptions still apply: no avatars, initials or invented timestamps in messages; dark tooltips; single rotating select chevron; `StatusBadge` for states.
- Components come from `src/shared/ui` (shadcn) and `src/widgets`; the renderer gets the Tailwind plugin, the `@` alias and `src/shared/styles/theme.css`.

**References for this screen:** Gallery section "Documents and approval" (DocumentHeader, MarkdownPreview, MermaidPreview, SelectionPopover, ApprovalNotice) and Stitch "Nova spec ativa" (`019d50093d7141598e511db597552894`) for the tab anatomy.

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

1. **[REQ-078]** WHEN the user activates a spec, plan or review in the sidebar THEN the system SHALL open (or focus) a closable document tab showing the document header with its state and, for a draft spec or plan, a mock approve action, followed by the rendered Markdown and Mermaid content from the mock source.
2. **[REQ-079]** WHEN the user selects text in a document and chooses "Review with agent" THEN the system SHALL prefill the global composer with the artifact name, the quoted excerpt and the artifact's author agent as recipient, without sending.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- Opening an already open document focuses its tab instead of duplicating it.
- The mock approve action only changes mock state; it is a stand-in for the human-only core command of artifact-approval-gates.
- A selection shorter than 3 characters or outside the document body does not show the popover.
- Mock Markdown never contains raw HTML; the shared renderer stays the sanitizing boundary.

## Architecture Decisions

- Depends on: conversation-screen.
- Paths match document-review-reader Tasks 3 and 4 (`src/renderer/src/pages/document/`, `src/renderer/src/features/document-reader/selection-popover.tsx`), so those tasks wire these files to the artifact reader instead of creating them.
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
| REQ-078 | Document tabs | P1 | Approved 2026-10-31; not implemented |
| REQ-079 | Excerpt review | P1 | Approved 2026-10-31; not implemented |
