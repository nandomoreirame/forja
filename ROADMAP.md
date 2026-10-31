# Forja 2.0 MVP Roadmap

[English](ROADMAP.md) | [Português (Brasil)](ROADMAP.pt-BR.md)

An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

Updated: 2026-10-30.

## Current Status

The [functional MVP spec](docs/specs/functional-mvp/SPEC.md) is approved. The implementation queue contains **13 approved specs and plans, 62 tasks, and 54 requirements**. Implementation of this queue has started: **0/13 slices delivered; the first slice is fully implemented (8/8 tasks, 8/62 overall) and validated, with independent review pending**.

The existing Electron welcome-screen scaffold is already implemented. It is the starting point, not evidence that the planned RPI workflow, shared shadcn components or CLI integrations are complete.

Combined documentation and implementation progress is **30%**: an approved SPEC contributes 10%, a ready PLAN contributes 10%, and validated implementation tasks contribute the remaining 80% per feature. The task counts below track implementation only; no slice is delivered yet.

## Execution Order

The order below is the recommended sequential queue. Dependencies are explicit in every plan; a missing external CLI capability blocks dependent work, not independent web delivery. Status is stated separately from spec approval.

| Order | Spec                                                                                      | Plan                                                                              | Tasks completed      | Spec / plan      | Implementation | Validation / independent review |
| ----- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------- | ---------------- | -------------- | ------------------------------- |
| 01    | [web-foundation-landing-styleguide](docs/specs/web-foundation-landing-styleguide/SPEC.md) | [Implementation plan](docs/plans/2026-10-30-web-foundation-landing-styleguide.md) | 8/8 (review pending) | Approved / ready | Implemented    | Passed / pending                |
| 02    | [cli-capability-contracts](docs/specs/cli-capability-contracts/SPEC.md)                   | [Implementation plan](docs/plans/2026-10-30-cli-capability-contracts.md)          | 0/3                  | Approved / ready | Planned        | Not run / not started           |
| 03    | [project-feature-state](docs/specs/project-feature-state/SPEC.md)                         | [Implementation plan](docs/plans/2026-10-30-project-feature-state.md)             | 0/4                  | Approved / ready | Planned        | Not run / not started           |
| 04    | [agent-settings-skills](docs/specs/agent-settings-skills/SPEC.md)                         | [Implementation plan](docs/plans/2026-10-30-agent-settings-skills.md)             | 0/4                  | Approved / ready | Planned        | Not run / not started           |
| 05    | [artifact-approval-gates](docs/specs/artifact-approval-gates/SPEC.md)                     | [Implementation plan](docs/plans/2026-10-30-artifact-approval-gates.md)           | 0/5                  | Approved / ready | Planned        | Not run / not started           |
| 06    | [feature-git-worktrees](docs/specs/feature-git-worktrees/SPEC.md)                         | [Implementation plan](docs/plans/2026-10-30-feature-git-worktrees.md)             | 0/4                  | Approved / ready | Planned        | Not run / not started           |
| 07    | [managed-command-runtime](docs/specs/managed-command-runtime/SPEC.md)                     | [Implementation plan](docs/plans/2026-10-30-managed-command-runtime.md)           | 0/4                  | Approved / ready | Planned        | Not run / not started           |
| 08    | [cli-agent-sessions](docs/specs/cli-agent-sessions/SPEC.md)                               | [Implementation plan](docs/plans/2026-10-30-cli-agent-sessions.md)                | 0/7                  | Approved / ready | Planned        | Not run / not started           |
| 09    | [feature-workbench-composer](docs/specs/feature-workbench-composer/SPEC.md)               | [Implementation plan](docs/plans/2026-10-30-feature-workbench-composer.md)        | 0/5                  | Approved / ready | Planned        | Not run / not started           |
| 10    | [document-review-reader](docs/specs/document-review-reader/SPEC.md)                       | [Implementation plan](docs/plans/2026-10-30-document-review-reader.md)            | 0/4                  | Approved / ready | Planned        | Not run / not started           |
| 11    | [terminal-panel-footer](docs/specs/terminal-panel-footer/SPEC.md)                         | [Implementation plan](docs/plans/2026-10-30-terminal-panel-footer.md)             | 0/5                  | Approved / ready | Planned        | Not run / not started           |
| 12    | [guided-rpi-orchestration](docs/specs/guided-rpi-orchestration/SPEC.md)                   | [Implementation plan](docs/plans/2026-10-30-guided-rpi-orchestration.md)          | 0/5                  | Approved / ready | Planned        | Not run / not started           |
| 13    | [recovery-mvp-acceptance](docs/specs/recovery-mvp-acceptance/SPEC.md)                     | [Implementation plan](docs/plans/2026-10-30-recovery-mvp-acceptance.md)           | 0/4                  | Approved / ready | Planned        | Not run / not started           |

## First Delivery: Web Foundation

The first plan delivers a separate Vite website under `site/`, with the landing and styleguide in the same implementation batch:

| Page       | English default | Brazilian Portuguese |
| ---------- | --------------- | -------------------- |
| Landing    | `/`             | `/pt-br`             |
| Styleguide | `/styleguide`   | `/pt-br/styleguide`  |

These routes are implemented and deployed; see the landing status below. The site and Electron will consume the same customized shadcn/ui components and Tailwind tokens. Product previews use deterministic mocks localized with the page, including agents, messages, states and buttons. Commands, paths and tool names remain literal. The gallery runs without Electron, AI, Git or native terminal side effects.

The implementation must follow the [approved visual references and exceptions](docs/design/forja-2.0/component-fidelity.md). Deployment is available with `npm run deploy:site`.

### Landing page status

- **Deployed:** https://forjav2.web.app with `/`, `/pt-br`, `/styleguide` and `/pt-br/styleguide`. Publish with `npm run deploy:site` (Firebase project `ascode-e08f8`, hosting site `forjav2`).
- **Implemented:** bilingual landing with the seven approved sections, same-page locale switch, approved Stitch crops for the hero and the planned capabilities, mobile header and footer, favicon; bilingual styleguide with the shared components.
- **Tests:** 40 unit tests and 6 Playwright E2E tests pass. The styleguide visual baseline still needs human review.
- **Pending:** block-by-block Stitch fidelity review of the styleguide (sections 2, 3, 5 and 6) and the landing; the English crops and hero still show Portuguese interface text; independent review. All 8 plan tasks are implemented and validated; the slice counts as delivered only after that review closes.

## Following Deliveries

1. Verify all five installed CLI contracts, especially MCP attachment and effective native-shell restrictions.
2. Add durable folder projects, feature state, fixed-agent settings and read-only skills.
3. Add artifact approvals, feature worktrees and observable managed execution.
4. Connect the five CLI adapters and the feature-based workbench with its global composer.
5. Add document feedback, user terminals, agent execution tabs and footer previews.
6. Complete guided orchestration, bounded correction rounds, recovery and Linux acceptance.

## Status Rules

- **Planned:** approved spec and ready plan; no implementation completed yet.
- **In progress:** implementation has started; remaining tasks and failures stay visible.
- **Blocked:** an identified external dependency prevents the relevant work; state the exact blocker and continue independent work when authorized.
- **Implemented:** planned code exists; this alone does not mean validated or independently reviewed.
- **Delivered:** all tasks and declared checks pass, required independent review is recorded, and acceptance evidence is current.

For each slice, keep its `docs/specs/<slug>/STATE.md`, this roadmap and the README progress summary consistent. Update task counts only after actual completion. Do not mark a missing/skipped live CLI check as passed, or an implementer's own validation as independent review.

These STATE.md files manage development of Forja itself. The product will store its users' workflow state in SQLite JSON and will not create runtime STATE.md files in their projects.

## Acceptance Gates

- TDD and task-scoped tests; project lint, authoritative typecheck and relevant builds.
- Real temporary SQLite/Git/process/PTY integration checks for native behavior.
- Browser checks for all four localized site routes and localized product mocks.
- Visual comparison against approved components/screens, plus keyboard and focus behavior.
- Electron end-to-end checks for parallel features targeting different repositories, approval invalidation, linked corrections, interrupt/queue behavior, terminals and restart.
- Authenticated controlled-execution evidence for Claude Code, Codex, OpenCode, agy and Grok before claiming complete five-CLI support.

## References

- [English README](README.md).
- [Approved umbrella spec](docs/specs/functional-mvp/SPEC.md).
- [Ordered plan index and implementation commands](docs/plans/README.md).
- [Requirement-to-task map](docs/plans/requirement-map.md).
- [Planning validation](docs/plans/VALIDATION.md).

Onboarding, custom agents, autonomous artifact approvals, a project knowledge base, cross-platform release certification and automatic deployment remain outside this MVP.
