---
feature: web-foundation-landing-styleguide
phase: implement
started_at: 2026-10-30
approved_at: 2026-10-30
spec_path: docs/specs/web-foundation-landing-styleguide/SPEC.md
plan_path: docs/plans/2026-10-30-web-foundation-landing-styleguide.md
implementation_status: in-progress
validation_status: not-run
review_status: not-started
---

# Planning State

Derived from the user-approved functional MVP. Specification and implementation plan are saved. No production implementation, paid CLI calls, dependency installation or Git writes were performed by the planning run. Prerequisites: existing scaffold.

## Implementation Run

Implementer: Codex. Review base: 610130a2e92a832c293cf20fa4df90b366900bf0. Eight dependent tasks executed sequentially with task commits. Existing bilingual documentation and planning changes remain outside implementation commits unless explicitly task-owned. No branch changes or push.

### Foundation correction

- User clarified that every primitive must originate from the shadcn CLI before customization.
- Replaced the handwritten Button and CSS scaffold using shadcn 4.23.0 init and add.
- Preset: radix-nova; library: Radix; theme: neutral, with Terminal Noir variable overrides.
- CLI-generated components retain their Tailwind variants, slots and accessible Radix behavior.
- Adaptations: shared-module aliases, local clsx/tailwind-merge utility, Button loading state and project theme variables.
- Removed the generated external cn and Geist dependencies in favor of the existing local helper and JetBrains Mono.
- Components for subsequent tasks are installed; installation does not mark those tasks complete.

## Current run (Claude, 2026-10-30)

Reconciled against commits and tests instead of the earlier completion claim.

| Task | Status | Commits |
| --- | --- | --- |
| 1. Aliases, tokens, shadcn config | done, boundary guard added | `02031d0` |
| 2. Locales and dictionaries | done, parity tests added | `761755c` |
| 3. Form and overlay primitives | done, status tones added | `8e4eda2` |
| 4. Browser-only widgets | done (code written before tests, no RED step observed) | `dbb598d` |
| 5. Bilingual landing | done | `7e57939`, `b82ccae` |
| 6. Bilingual styleguide | done, fidelity fixes applied against the Stitch board | `a0f1b65`, `c2768d9` |
| 7. Prerendered static routes | done, verified with `vite preview` for all four routes | `58d627a` |
| 8. Playwright, inventory, token map | done, 6 E2E tests pass, visual baseline generated | `876dd5a` |

Validation: typecheck, lint, format check and 30 unit tests pass. Playwright passes 6 tests; the visual baseline is machine-generated and needs human review against the Stitch board.

Adaptations: the Stitch exports were cached under `docs/design/forja-2.0/stitch-cache/` (ignored). `vite preview` needed a directory-index middleware so `/pt-br` serves the pt-BR page. Button `asChild` now renders only its child.

Known gaps: app structure and conversation sections still differ from the board in small details. Independent review is pending.

Incident: a formatting run reformatted 38 approved planning documents under `docs/specs` and `docs/plans`. They were restored byte-for-byte from an OpenCode snapshot (`~/.local/share/opencode/snapshot`). The backup of the pre-restore state is in `/tmp/opencode/docs-before-restore-*`.
