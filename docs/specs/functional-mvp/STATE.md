---
feature: functional-mvp
phase: plan-complete
depth: deep
started_at: 2026-10-30
approved_at: 2026-10-30
spec_path: docs/specs/functional-mvp/SPEC.md
plan_index: docs/plans/README.md
implementation_status: not-started
validation_status: planning-validated
review_status: not-started
plan_paths:
  - docs/plans/2026-10-30-web-foundation-landing-styleguide.md
  - docs/plans/2026-10-30-cli-capability-contracts.md
  - docs/plans/2026-10-30-project-feature-state.md
  - docs/plans/2026-10-30-agent-settings-skills.md
  - docs/plans/2026-10-30-artifact-approval-gates.md
  - docs/plans/2026-10-30-feature-git-worktrees.md
  - docs/plans/2026-10-30-managed-command-runtime.md
  - docs/plans/2026-10-30-cli-agent-sessions.md
  - docs/plans/2026-10-30-feature-workbench-composer.md
  - docs/plans/2026-10-30-document-review-reader.md
  - docs/plans/2026-10-30-terminal-panel-footer.md
  - docs/plans/2026-10-30-guided-rpi-orchestration.md
  - docs/plans/2026-10-30-recovery-mvp-acceptance.md
---

# Planning Complete

The user approved the consolidated scope and requested generation of implementation plans after approving the pt-BR landing. The approved spec is authoritative; this state records engineering progress only. The product stores user-project runtime state as versioned JSON in SQLite, never STATE.md.

## Delivery

- 60 approved MVP requirements (REQ-055 to REQ-060 added in the 2026-10-31 business-rule review).
- 13 ordered child specs and implementation plans, totaling 65 tasks.
- First delivery: site/ landing and styleguide, English default and /pt-br, using the same customized shadcn components and Tailwind tokens as Electron.
- Use the plan index queue or the individual child slug for later rpi-implement, not this umbrella slug.
- Dependencies, public source paths, tests, role/tool boundaries and design exceptions are recorded in each plan.

## Validation

See docs/plans/VALIDATION.md. This is planning validation, not executed implementation tests or independent code review. Five-CLI live controlled-mode compatibility is explicitly pending the capability plan.

## Authorization Boundary

No production code, tests, dependency installation, CLI model calls, Git writes or deployment were performed in the planning run. Implementation requires a separate user request.

## Bilingual Project Documentation

The user requested ROADMAP.md and README Progress, followed by pt-BR counterparts with language-matched navigation. README.md/ROADMAP.md remain English; README.pt-BR.md/ROADMAP.pt-BR.md are Portuguese. Both roadmaps track the same 13 slices and 62 unstarted tasks. Technical specs/plans remain English and Portuguese links label that explicitly. Documentation structure, accents and relative links were validated; no production implementation or Git writes occurred.

## Official Product Positioning

The user explicitly approved the objective now used in README.md, README.pt-BR.md, both roadmaps, package metadata, all derived spec contexts, the web plan and localized landing copy. Forja is an opinionated RPI AI-agent development environment with the human in control from specification to review. Installed coding CLIs are the execution mechanism, not the primary product definition. No new functional scope or implementation authorization is implied.

## Progress Accounting

The user requested including SPEC and PLAN documentation in each feature progress bar. Both README locales now use an explicit 10% approved-spec, 10% ready-plan, 80% validated-implementation-task model. All slices and the task-weighted overall MVP currently show 20%, while implementation remains 0/62 tasks and deliveries remain 0/13. Both roadmap locales distinguish this combined progress from implementation task completion and independent review.

## 2026-10-31 Business-rule review

The user reviewed the approved specs and plans before production implementation of the desktop slices. Decisions are recorded as Grilling Log rows 15 to 25 in SPEC.md. Summary: the human implementation approval was removed in favor of confirmed repository gates; artifacts live in the feature worktree created at Git binding; core runs human-confirmed gates as the only validation evidence and also on the merge result; final approval and integration are one action; the Tester edits test files only; blocking findings can be waived with a reason; a handoff matrix, feature end states, stalled-turn handling and usage visibility were added (REQ-055 to REQ-060). feature-git-worktrees gained Tasks 5 and 6 and cli-agent-sessions gained Task 8, for 65 tasks in total. The delivered web slice is unaffected.
