# Component inventory: styleguide

Source of truth for the styleguide routes `/styleguide` and `/pt-br/styleguide`. Anatomy follows the approved Stitch board `5cae4de038e748b7a1a0f06f6f332da3`. Behavior follows the MVP requirements.

| Section | Components | Code reference | Public API |
| --- | --- | --- | --- |
| 1. Tokens | semantic swatches, typography, spacing scale, border radius | `base.tokens.json` | CSS variables in `src/shared/styles/theme.css` |
| 2. Primitives | Button (default, hover, focus-visible, disabled, loading), Input, Textarea, Select, Checkbox, Switch, Badge (status), Kbd | `src/shared/ui/*` | shadcn exports re-exported by `src/shared/ui/index.ts` |
| 3. App structure | AppTopbar, FeatureTabs, SidebarRow, FeatureContext, AppStatusbar | `src/widgets/workbench` | controlled props (`selectedId`, `items`, `onSelect`) |
| 4. Conversation | Messages, Composer, handoff link, inline notices | `src/widgets/conversation` | controlled props (`value`, `onChange`, `onSend`) |
| 5. Documents | DocumentPreview (header and ApprovalNotice), MarkdownPreview, MermaidPreview | `src/widgets/documents` | `source`, `name`, `notice`, `actionLabel` |
| 6. Terminals | TerminalPreview (tabs, agent header, output), user terminal, collapsed toolbar | `src/widgets/terminal` | `tabs` with `state`, `activeId`, `header`, `output` |

## Interaction states

- Button: default, hover (static sample), focus-visible, disabled, loading. Ghost shows an underline on hover.
- Terminal tabs: hover and focus have a static sample, plus real CSS hover on inactive tabs.
- Select: the real control stays closed and opens only on click. The open list is a labelled demonstration, never a live overlay.
- MermaidPreview: `securityLevel: 'strict'`, lazy import, bounded source size, readable fallback for invalid source.
- MarkdownPreview: GFM only, `skipHtml` enabled.

## Known gaps

- App structure and conversation are closer to the board, but still differ in small details (tab chrome, composer context row, handoff spacing). Compare against the board before shipping.
- Visual baselines are generated from our own rendering. A human must compare them with the Stitch board before the baseline is treated as approved.
