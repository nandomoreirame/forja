# Stitch Fidelity Audit: Styleguide

Date: 2026-10-31. Route: `/styleguide` (dev server on port 5176), desktop 1280 px.
Reference: Stitch screen `5cae4de038e748b7a1a0f06f6f332da3` (Forja 2.0 - Styleguide e componentes - MVP), project `9281162402489678867`.
Captures are in `.stitch-diff/audit/` (gitignored): `ref-1280.png`, `ref.html`, `en/actual-full.png`, `sbs-*.png`.

The reference is a design board, so the page-level numbers are smoke tests only. Each block below was compared in side-by-side crops.

| Route | Screen | layout_diff | content_x (Stitch / build) | Result |
| --- | --- | --- | --- | --- |
| `/styleguide` | `5cae4de0` | 0.6009 | not meaningful on a board | 6 of 17 blocks match; 11 differ (5 of them minor) |

## Blocks

| # | Block | Status | Divergence | File |
| --- | --- | --- | --- | --- |
| 1 | Page header | Match | None. | `site/src/pages/styleguide.tsx` |
| 2 | Semantic colors | Match | None. | `site/src/pages/styleguide.tsx` |
| 3 | Typography card | Differs | Stitch shows real samples (heading "Login com OAuth", a body paragraph, a label, metadata with a path and branch) separated by dividers. The build prints the scale names as the samples, so the card does not show the type in use. | `site/src/pages/styleguide.tsx` |
| 4 | Spacing and radius cards | Match | The build adds file labels (`typography.css`, `spacing.css`, `radius.css`) that Stitch does not have. This is acceptable and consistent with the other cards. | none |
| 5 | Button variants and states | Differs | Stitch has a row of icon buttons in all 5 states (default, hover, focus, disabled, loading). The build shows only 2 icon buttons, with no state per column. | `site/src/components/primitives-showcase.tsx:132` |
| 6 | Input states | Differs (minor) | All 4 states exist. The build lacks the state label on the right of each field (default, focus, disabled, error), which makes the states hard to identify. | `site/src/components/primitives-showcase.tsx:157` |
| 7 | Textarea and Select | Differs | Stitch shows the Select open (popover with 5 roles and the selected item checked) and a "Detected" indicator next to the AI tool. The build shows only closed selects, so the open-menu state is never visible or captured. | `site/src/components/primitives-showcase.tsx` |
| 8 | Badges and status | Differs | Stitch uses one anatomy for all 8 states: a fixed-width bordered box with an icon or dot plus text. The build mixes plain text (Approved, Draft, Interrupted), bordered pills and filled pills, so the 8 states do not read as one component. | `site/src/components/primitives-showcase.tsx:273` |
| 9 | Checkbox, switch and kbd | Match | None. | `site/src/components/primitives-showcase.tsx` |
| 10 | Section 3, app structure | Differs | Stitch shows 5 isolated cards: Topbar, FeatureTabs (with hover and focus samples), FeatureContext (with the GUIDED badge and the cycle with checkmarks for completed stages), SidebarRow (states labeled on the right) and Statusbar (with a footnote). The build merges them into one composite mockup. This hides the per-component states, and it drops the GUIDED badge and the cycle progress. | `site/src/pages/styleguide.tsx:330` |
| 11 | Messages and HandoffLink | Differs (minor) | In Stitch the handoff notice sits between the user message and the agent reply; in the build it comes after the reply. The omitted timestamp is correct, because it is a recorded exception. | `site/src/pages/styleguide.tsx` |
| 12 | Composer | Differs (minor) | Stitch labels the path "Destino:"; the build shows the bare path. REQ-003 needs that label to tell the target repository apart from the opened folder. | `src/widgets/conversation/ui/composer.tsx` |
| 13 | Inline notices | Match | None. | none |
| 14 | DocumentHeader and ApprovalNotice | Match | None. | none |
| 15 | MarkdownPreview and MermaidPreview | Differs (minor) | The diagram renders after mermaid loads (about 1 s). While loading, the build shows only "…", with no skeleton or label. The card title "MermaidPreview (diagrama renderizado)" is hardcoded in Portuguese on the English route, which breaks REQ-041. | `site/src/pages/styleguide.tsx:453`, `src/widgets/documents/ui/mermaid-preview.tsx` |
| 16 | Terminals | Differs | Stitch shows one panel with output lines (`> forja@2.0.0 dev`, `> electron-vite dev`), a separate UserTerminal sample card, and the collapsed toolbar with its hover tooltip open. The build has 3 stacked panels, and one of them is a placeholder that only says "Hover and focus sample · static preview". The tooltip exists in code but is never shown statically. | `site/src/pages/styleguide.tsx`, `src/widgets/terminal/ui/terminal-preview.tsx` |
| 17 | Fidelity notes and footer | Differs (minor) | The section number is missing ("Section 7"), and the board footer ("Forja 2.0 · MVP styleguide / 1280px Desktop · Terminal Noir") is missing. | `site/src/pages/styleguide.tsx:553` |

## AI Elements (shadcn) assessment

AI Elements patterns are copied into the repository, not installed as a package. Several of them depend on the Vercel AI SDK (`ai`, `@ai-sdk/react`): Terminal/Trace, Confirmation and Tool, among others. Forja's normalized EngineEvent stream (REQ-018) is not the AI SDK `UIMessage` model, so adopt the presentation structure and accessibility behavior, not the SDK wiring. Stitch anatomy and recorded exceptions still win over AI Elements defaults (no avatars, no timestamps, Terminal Noir tokens).

| AI Elements pattern | Forja component | Recommendation |
| --- | --- | --- |
| Message (+ Bubble) | `src/widgets/conversation/ui/messages.tsx` | Adopt the structure (`Message`, `MessageContent`, `MessageFooter`). It renders plain props, has no avatar or timestamp, and needs no AI SDK. Keep `react-markdown` instead of adding Streamdown unless streamed partial Markdown proves broken. |
| Chat / Message Scroller | conversation list (chat-turns Task 4) | Adopt. It covers "auto-scroll only near the end" and keeping the reading position while text streams. |
| Prompt Input (Input Group) | `src/widgets/conversation/ui/composer.tsx` | Adopt partially. Use `InputGroup` for the layout. Keep the Stitch recipient combobox, the context line and Ctrl+Enter (Prompt Input sends on Enter). No attachments in the MVP. |
| Tool / Trace / Terminal / Code Block | agent command executions (REQ-028) | Adopt Trace as the collapsible tool-call line inside the conversation. The terminal panel stays on the Stitch terminal anatomy. Replace `useChat` with core events. |
| Confirmation (Item) | CLI permission requests (chat-turns Task 7) | Adopt the Approve/Deny layout for the CLI's native permission prompts only. Artifact approvals keep the Stitch ApprovalNotice. |
| Test Results | Tester gates (REQ-055) | Adopt for the evidence card of the confirmed gates. |
| Queue | queued messages (REQ-006) | Adopt for the FIFO queue in queue mode. |
| Plan / Task | plan tasks in MarkdownPreview, Implementer progress | Optional. Only if a plan's progress is shown outside the document. |
| Model Selector | agent settings model/effort (REQ-016) | Do not adopt as is. Settings use form fields and the empty model means the CLI default; the composer must not switch models. |
| Context | usage (REQ-060) | Adopt for per-turn and per-feature usage, with an "unavailable" state. |
| Subagent | handoff links (REQ-020) | Optional reference for HandoffLink. Forja handoffs are separate conversations, not nested runs. |
| Reasoning, Chain of Thought, Stack Trace | CLI events | Defer until the probe matrix shows which CLIs emit reasoning or structured errors. |
| Sources, Inline Citation, Suggestion, Checkpoint, File Tree | none | Out of MVP scope. |

Each adoption is a new dependency surface: run the shadcn CLI with a pinned version, audit any added npm packages (Iron Law 11), re-skin with the Terminal Noir tokens, and add the result to the gallery before any desktop screen consumes it (REQ-040, REQ-043).

## Resolution (2026-10-31)

The user decided that the gallery demonstrates components and does not have to freeze every board state: the open Select stays closed and interactive (recorded in `docs/design/forja-2.0/component-fidelity.md`). Every other divergence above was fixed and rechecked in side-by-side crops of `/styleguide` and `/pt-br/styleguide`:

- Typography shows real samples with dividers.
- Icon buttons cover the 5 states; inputs show their state label; the error label uses the danger token.
- New shared `StatusBadge` gives the 8 states one anatomy; the shared `Badge` radius changed from a pill to `rounded-[2px]`.
- Section 3 is split into isolated cards; `FeatureContext` gained a mode badge and an accessible cycle list (`aria-current="step"`); `SidebarRow` follows the bordered row anatomy.
- `Messages` accepts an `event` item, so the handoff notice sits between the messages; the composer labels the target as Destination.
- The Mermaid card label is localized and the loading state is announced with a label.
- Terminals show output lines, a separate UserTerminal card, and the collapsed toolbar with a static hover-details sample; the placeholder panel was removed.
- Section 7 is numbered and the board footer was added.

Gates: typecheck, lint (0 errors; one pre-existing warning in generated `coverage/`), 46 tests and coverage thresholds pass. AI Elements adoption was not started.
