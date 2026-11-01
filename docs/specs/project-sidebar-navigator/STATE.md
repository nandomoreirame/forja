---
feature: project-sidebar-navigator
phase: none
started_at: 2026-10-31
approved_at: 2026-10-31
spec_path: docs/specs/project-sidebar-navigator/SPEC.md
plan_path: docs/plans/2026-10-31-project-sidebar-navigator.md
implementation_status: complete
validation_status: passed
review_status: passed-claude-only
---

# Planning State

Frontend mock slice 01g decided with the user on 2026-10-31: replace the sidebar Agents menu with Features, Specs, Plans, Skills and Memories, plus archive and restore. Depends on document-viewer-screen (01f).

## Implementation Run

Tasks 1 to 6 committed (2cdb54e, 83d2252, 2f68f98, 8aa01e2, abb9da5, d9b541b). Implemented by Codex (Grok out of credit); Task 6 (Playwright spec) by Claude because the Codex sandbox cannot run Playwright. Every task reviewed by agy; findings fixed with regression tests.

User-requested inserts during the run (2026-10-31/11-01): compact `StatusBadge size="sm"` and slug-titled document tabs (d27d3da); real repository specs and plans plus the Settings skills folder (default `~/.skills`) through a dev-only Vite virtual module and a loopback, same-origin dev middleware (793c42e, 7ea1e6d replaces the sample artifacts when the library loads); per-section sidebar scroll up to eight rows (f14c956); single-line unlinked document rows (2fa0fe8); scrollable tab strip that reveals the selected tab (258ee58). Adaptations: skills and memories open as document tabs with the YAML frontmatter rendered as a key/value table; archive cascade lives in `shared/lib/archive.ts` and is re-exported by `model.ts` so the store does not import a feature.

Validation 2026-11-01: typecheck, lint, format:check, Vitest 280/280, coverage 92.74%, build, Playwright test:e2e:app 20/20, desktop pty and picker smokes.

Review: zero open findings (Claude lead). The external whole-feature pass was unavailable (agy timeout then quota, Grok HTTP 402).
