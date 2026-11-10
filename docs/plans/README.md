# Forja 2.0 Implementation Plans

The approved core scope is [chat-workflow](../specs/chat-workflow/SPEC.md) (2026-11-01); [functional-mvp](../specs/functional-mvp/SPEC.md) records the delivered interface. These plans are derived implementation slices, with their own specs and engineering STATE.md files. Superseded plans stay in this folder marked `Superseded` and must not be implemented. The application does not create STATE.md in users' projects.

## Product Objective

An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

The CLIs are the execution layer; the opinionated RPI workflow and human control define the product.

## Ordered Queue

| Order | Plan | Tasks | Dependencies |
| --- | --- | --- | --- |
| 01 | [web-foundation-landing-styleguide](2026-10-30-web-foundation-landing-styleguide.md) | 8 | scaffold |
| 01a | [project-home-screen](2026-10-31-project-home-screen.md) | 6 | 01 |
| 01b | [command-palette](2026-10-31-command-palette.md) | 4 | 01a |
| 01c | [new-conversation-composer](2026-10-31-new-conversation-composer.md) | 4 | 01a, 01b |
| 01d | [conversation-screen](2026-10-31-conversation-screen.md) | 7 | 01b, 01c |
| 01e | [settings-screen](2026-10-31-settings-screen.md) | 6 | 01a, 01d |
| 01f | [document-viewer-screen](2026-10-31-document-viewer-screen.md) | 4 | 01d |
| 01g | [project-sidebar-navigator](2026-10-31-project-sidebar-navigator.md) | 6 | 01e, 01f |
| 01h | [conversation-agent-identity](2026-10-31-conversation-agent-identity.md) | 5 | 01d, 01e |
| 01i | [workbench-ui-refresh](2026-11-01-workbench-ui-refresh.md) | 5 | 01g |
| 01j | [ui-quick-adjustments](2026-11-01-ui-quick-adjustments.md) | 14 | 01i |
| 02 | [chat-core-store](2026-11-01-chat-core-store.md) | 7 | none |
| 03 | [ipc-workbench-source](2026-11-01-ipc-workbench-source.md) | 5 | 02 |
| 04 | [cli-capability-adapters](2026-11-01-cli-capability-adapters.md) | 10 | none |
| 05 | [forja-mcp-gateway](2026-11-01-forja-mcp-gateway.md) | 5 | 02 |
| 06 | [chat-turns](2026-11-01-chat-turns.md) | 7 | 03, 04, 05 |
| 07 | [artifact-publication](2026-11-01-artifact-publication.md) | 5 | 02, 05 |
| 08 | [ferreiro-orchestrator](2026-11-01-ferreiro-orchestrator.md) | 8 | 06, 07 |
| 09 | [chat-worktrees](2026-11-01-chat-worktrees.md) | 7 | 02, 05 |
| 10 | [test-review-loop](2026-11-01-test-review-loop.md) | 3 | 08, 09 |
| 11 | [acceptance-merge](2026-11-01-acceptance-merge.md) | 6 | 09, 10 |
| 12 | [backlog-board-core](2026-11-01-backlog-board-core.md) | 5 | 02, 08 |
| 13 | [terminals-runtime](2026-11-01-terminals-runtime.md) | 4 | 05 |
| 14 | [project-files-source-control](2026-11-01-project-files-source-control.md) | 4 | 02, 03, 09 |
| 15 | [settings-skills-usage](2026-11-01-settings-skills-usage.md) | 3 | 02, 04 |
| 16 | [attention-notifications](2026-11-01-attention-notifications.md) | 3 | 06 |
| 17 | [recovery-acceptance](2026-11-01-recovery-acceptance.md) | 4 | 02 to 16 |

## Mock Screens (2026-10-31)

Slices 01a to 01f build frontend-only navigable screens in the desktop renderer on a swappable mock `WorkbenchSource`. The chat-workflow slices (02 to 17) later wire the same screens to core, starting with the IPC source of slice 03. Implement them in two sequential batches:

```text
/rpi-implement project-home-screen command-palette new-conversation-composer --sequential
/rpi-implement conversation-screen settings-screen document-viewer-screen --sequential
```

In Codex use `$rpi-implement` with the same arguments.

## First Delivery

Start with the standalone `site/`: bilingual landing and styleguide, real customized shadcn components, shared Tailwind tokens and localized product mocks. It runs independently of Electron and all external AI tools. The approved English and Portuguese Stitch landing references are in the parent spec. No website deployment is included.

Slice 04 verifies the five CLI capabilities before dependent runtime work. A capability failure blocks only dependent adapters; it does not cancel independent web/core plans or authorize bypassing MCP/approval requirements.

## Implementation Commands

This document generation does not start implementation. When explicitly requested, use one slug at a time or the remaining ordered core queue:

```text
/rpi-implement web-foundation-landing-styleguide
```

```text
/rpi-implement chat-core-store ipc-workbench-source cli-capability-adapters forja-mcp-gateway chat-turns artifact-publication ferreiro-orchestrator chat-worktrees test-review-loop acceptance-merge backlog-board-core terminals-runtime project-files-source-control settings-skills-usage attention-notifications recovery-acceptance --agentic --sequential
```

The ordered queue is the supported entry point, not an implementation call against the umbrella chat-workflow slug. Actual implementation uses the current commit authorization, TDD and independent review contracts. No push is implicit.

## Shared Paths and Ownership

- `src/shared/ui/`, `src/shared/styles/`, `src/shared/i18n/`: browser-only shared primitives, tokens and locale data.
- `src/widgets/<slice>/`: reusable browser-only compositions with public APIs, consumed by site mocks and desktop containers.
- `site/`: static Vite website, landing and gallery; no native imports or second npm workspace.
- `src/core/<slice>/`: core services, SQLite stores, scoped tools and owned process supervisors.
- `src/main/` and `src/preload/`: trusted platform/window boundary and narrowly validated bridge.
- `test/`: colocated-by-domain tests and fixture resources. Native tests declare Node environment.
- `docs/design/forja-2.0/`: approved references and user corrections. Generated diffs stay ignored.

The parent spec defines exact approval, Git, role and lifecycle rules. The plans refer to future services with explicit test APIs; if implementation requires a contract adjustment, update dependent tests and document the reason, without changing product behavior silently.
