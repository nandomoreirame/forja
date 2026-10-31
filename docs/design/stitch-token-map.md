# Stitch token map (landing and styleguide)

Built from the `tailwind.config` in the Stitch exports `bf8dfb657a774e26b6205771525461a8` (landing EN) and `5db10cc61f464f96ba751fdac5feaa20` (landing PT-BR). Stitch classes are ported with the project tokens below; spacing, sizes and layout classes stay as exported.

| Stitch class | Stitch value | Project class |
| --- | --- | --- |
| `bg-surface`, `bg-surface-lowest`, `bg-surface-dim` | `#131314` / `#0e0e0f` | `bg-background` |
| `bg-surface-container` | `#1c1b1c` | `bg-card` |
| `bg-surface-high` | `#232223` | `bg-secondary` |
| `bg-chrome` | `#1c1c1c` | `bg-secondary` |
| `border-border` | `#2a2a2a` | `border-border` |
| `border-borderDim` | `#202021` | `border-border/60` |
| `text-foreground` | `#e6e6e6` | `text-foreground` |
| `text-muted` | `#979797` | `text-muted-foreground` |
| `text-mutedDark` | `#666666` | `text-muted-foreground/70` |
| `bg-accent`, `text-accent`, `border-accent` | `#f5a623` | `bg-primary`, `text-primary`, `border-primary` |
| `bg-accent-hover` | `#d99018` | `hover:bg-primary/80` |
| `bg-accent-muted` | `rgba(245,166,35,.15)` | `bg-primary/15` |
| `font-mono` (JetBrains Mono) | body font | `font-sans` (project theme maps sans to JetBrains Mono) |
| `rounded-sm` | `3px` | `rounded-sm` |

Green status colors (`text-green-400`, `bg-green-950/40`) are mapped to `text-emerald-400` and `bg-emerald-950/40`, the same mapping used by the terminal states.

Icons (`references/icon-map.md` style): emoji agent markers become lucide icons: Pesquisador `Search`, Planejador `ClipboardList`, Implementador `Code2`, Testador `FlaskConical`, Revisor `ShieldCheck`.

Not ported on purpose: the Google Fonts links, the CDN Tailwind config and invented copy (hero subtitle, workflow card footers, "Spec RFC"/"TDD Plan" badges, git-inspector values). The project copy from `src/shared/i18n` and the official positioning wins.
