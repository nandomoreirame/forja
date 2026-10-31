# Token map: Terminal Noir to shadcn

Values come from the approved board. Semantic names come from `src/shared/styles/theme.css`, which overrides the CLI-generated shadcn theme.

| Board token | Hex | shadcn / Tailwind variable | Used for |
| --- | --- | --- | --- |
| canvas | `#0E0E0E` | `--background` | app and page background |
| chrome | `#1C1C1C` | `--secondary` | topbar, statusbar, terminal tab bar |
| surface | `#121214` | `--card`, `--sidebar` | cards, sidebar |
| overlay | `#18181B` | `--popover` | select list, tooltips |
| border | `#2A2A2A` | `--border`, `--input` | dividers, field borders |
| foreground | `#E6E6E6` | `--foreground` | primary text |
| muted | `#979797` | `--muted-foreground` | metadata, labels |
| accent | `#F5A623` | `--primary`, `--ring` | primary actions, focus rings, running state |

Radii follow the board, not a generic scale: buttons and fields use 3–4px, the global composer uses 4px, status badges use 2px. Do not replace them with zero-radius or pill shapes.

Spacing follows the Tailwind scale used in the board: 4, 8, 12, 16, 24 and 32px (`gap-1` to `gap-8`).
