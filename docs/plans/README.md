# Forja 2.0 Implementation Plans

The approved scope is [functional-mvp](../specs/functional-mvp/SPEC.md). These plans are derived implementation slices, with their own specs and engineering STATE.md files. The application does not create STATE.md in users' projects.

## Product Objective

An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

The CLIs are the execution layer; the opinionated RPI workflow and human control define the product.

## Ordered Queue

| Order | Plan | Tasks | Dependencies |
| --- | --- | --- | --- |
| 01 | [web-foundation-landing-styleguide](2026-10-30-web-foundation-landing-styleguide.md) | 8 | scaffold |
| 01a | [project-home-screen](2026-10-31-project-home-screen.md) | 6 | web-foundation-landing-styleguide |
| 01b | [command-palette](2026-10-31-command-palette.md) | 4 | project-home-screen |
| 01c | [new-conversation-composer](2026-10-31-new-conversation-composer.md) | 4 | project-home-screen, command-palette |
| 01d | [conversation-screen](2026-10-31-conversation-screen.md) | 6 | new-conversation-composer, command-palette |
| 01e | [settings-screen](2026-10-31-settings-screen.md) | 4 | project-home-screen, conversation-screen |
| 01f | [document-viewer-screen](2026-10-31-document-viewer-screen.md) | 4 | conversation-screen |
| 01g | [project-sidebar-navigator](2026-10-31-project-sidebar-navigator.md) | 6 | document-viewer-screen, settings-screen |
| 01h | [conversation-agent-identity](2026-10-31-conversation-agent-identity.md) | 5 | settings-screen, conversation-screen |
| 02 | [cli-capability-contracts](2026-10-30-cli-capability-contracts.md) | 3 | scaffold |
| 03 | [project-feature-state](2026-10-30-project-feature-state.md) | 4 | cli-capability-contracts |
| 04 | [agent-settings-skills](2026-10-30-agent-settings-skills.md) | 4 | web-foundation-landing-styleguide, project-feature-state |
| 05 | [artifact-approval-gates](2026-10-30-artifact-approval-gates.md) | 5 | project-feature-state, agent-settings-skills |
| 06 | [feature-git-worktrees](2026-10-30-feature-git-worktrees.md) | 6 | project-feature-state, artifact-approval-gates |
| 07 | [managed-command-runtime](2026-10-30-managed-command-runtime.md) | 4 | cli-capability-contracts, artifact-approval-gates, feature-git-worktrees |
| 08 | [cli-agent-sessions](2026-10-30-cli-agent-sessions.md) | 8 | cli-capability-contracts, agent-settings-skills, artifact-approval-gates, managed-command-runtime |
| 09 | [feature-workbench-composer](2026-10-30-feature-workbench-composer.md) | 5 | web-foundation-landing-styleguide, project-feature-state, agent-settings-skills, artifact-approval-gates, cli-agent-sessions |
| 10 | [document-review-reader](2026-10-30-document-review-reader.md) | 4 | artifact-approval-gates, feature-workbench-composer |
| 11 | [terminal-panel-footer](2026-10-30-terminal-panel-footer.md) | 5 | web-foundation-landing-styleguide, managed-command-runtime, feature-workbench-composer |
| 12 | [guided-rpi-orchestration](2026-10-30-guided-rpi-orchestration.md) | 5 | artifact-approval-gates, feature-git-worktrees, cli-agent-sessions, feature-workbench-composer, document-review-reader, terminal-panel-footer |
| 12a | [loop-harness](2026-10-31-loop-harness.md) | 7 | guided-rpi-orchestration, artifact-approval-gates, agent-settings-skills, managed-command-runtime, document-review-reader, project-sidebar-navigator; framework pilot (rpi-loop-harness) |
| 13 | [recovery-mvp-acceptance](2026-10-30-recovery-mvp-acceptance.md) | 4 | guided-rpi-orchestration, terminal-panel-footer, document-review-reader, web-foundation-landing-styleguide |

## Mock Screens (2026-10-31)

Slices 01a to 01f build frontend-only navigable screens in the desktop renderer on a swappable mock `WorkbenchSource`. Slices 04, 09, 10 and 11 later wire the same files to core. Implement them in two sequential batches:

```text
/rpi-implement project-home-screen command-palette new-conversation-composer --sequential
/rpi-implement conversation-screen settings-screen document-viewer-screen --sequential
```

In Codex use `$rpi-implement` with the same arguments.

## First Delivery

Start with the standalone `site/`: bilingual landing and styleguide, real customized shadcn components, shared Tailwind tokens and localized product mocks. It runs independently of Electron and all external AI tools. The approved English and Portuguese Stitch landing references are in the parent spec. No website deployment is included.

The second plan verifies the five CLI capabilities before dependent runtime work. A capability failure blocks only dependent adapters; it does not cancel independent web/core plans or authorize bypassing MCP/approval requirements.

## Implementation Commands

This document generation does not start implementation. When explicitly requested, use the first slug alone for the web delivery or the entire ordered queue:

```text
/rpi-implement web-foundation-landing-styleguide
```

```text
/rpi-implement web-foundation-landing-styleguide project-home-screen command-palette new-conversation-composer conversation-screen settings-screen document-viewer-screen cli-capability-contracts project-feature-state agent-settings-skills artifact-approval-gates feature-git-worktrees managed-command-runtime cli-agent-sessions feature-workbench-composer document-review-reader terminal-panel-footer guided-rpi-orchestration recovery-mvp-acceptance --agentic --sequential
```

The ordered queue is the supported entry point, not an implementation call against the umbrella functional-mvp slug. Actual implementation uses the current commit authorization, TDD and independent review contracts. No push is implicit.

## Shared Paths and Ownership

- `src/shared/ui/`, `src/shared/styles/`, `src/shared/i18n/`: browser-only shared primitives, tokens and locale data.
- `src/widgets/<slice>/`: reusable browser-only compositions with public APIs, consumed by site mocks and desktop containers.
- `site/`: static Vite website, landing and gallery; no native imports or second npm workspace.
- `src/core/<slice>/`: core services, SQLite stores, scoped tools and owned process supervisors.
- `src/main/` and `src/preload/`: trusted platform/window boundary and narrowly validated bridge.
- `test/`: colocated-by-domain tests and fixture resources. Native tests declare Node environment.
- `docs/design/forja-2.0/`: approved references and user corrections. Generated diffs stay ignored.

The parent spec defines exact approval, Git, role and lifecycle rules. The plans refer to future services with explicit test APIs; if implementation requires a contract adjustment, update dependent tests and document the reason, without changing product behavior silently.
