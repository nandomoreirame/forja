# Forja

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

![Forja welcome screen with a command bar, project shortcuts, and workspace status](docs/images/welcome.png)

**Frontend preview:** the workbench (projects, feature tabs, conversations, documents, settings, terminals and the side panels) runs on local mock data, with real user shells in the terminal. AI agent integrations are not implemented yet.

## Why

Working with AI agents involves decisions, specifications, plans, code changes, tests and reviews that need to stay connected.
Forja is opinionated about the RPI workflow: Research clarifies the problem, Planner turns the approved spec into a plan, and Implementer builds from that plan before testing and review.
You remain in control of each stage through explicit approvals and visible execution.
Installed coding CLIs are execution tools within that workflow. The interface is implemented on mock data; the guided MVP backend is approved and planned.

## Progress

Progress includes specification and planning as well as implementation: **SPEC 10% + PLAN 10% + validated implementation tasks 80%** per feature.

**Overall MVP:** `█████████░░░░░░░░░░░` **46%**. All 28 specs are approved and all 28 plans are ready. Implementation has **50/151 tasks** done: the landing/styleguide and the mock screens 01a to 01h are implemented and validated, and the 2026-11-01 interface refresh (01i) is implemented; 6 slices are also independently reviewed. Explorer (16) and source control (17) are future features hidden behind feature flags in production builds.

| Order | Feature                             | SPEC (10%)                                                       | PLAN (10%)                                                          | Implementation (80%) | Progress                        |
| ----- | ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------- | ------------------------------- |
| 01    | `web-foundation-landing-styleguide` | [Approved](docs/specs/web-foundation-landing-styleguide/SPEC.md) | [Ready](docs/plans/2026-10-30-web-foundation-landing-styleguide.md) | 8/8                  | `████████████████████` **100%** |
| 01a   | `project-home-screen`               | [Approved](docs/specs/project-home-screen/SPEC.md)               | [Ready](docs/plans/2026-10-31-project-home-screen.md)               | 6/6                  | `████████████████████` **100%** |
| 01b   | `command-palette`                   | [Approved](docs/specs/command-palette/SPEC.md)                   | [Ready](docs/plans/2026-10-31-command-palette.md)                   | 4/4                  | `████████████████████` **100%** |
| 01c   | `new-conversation-composer`         | [Approved](docs/specs/new-conversation-composer/SPEC.md)         | [Ready](docs/plans/2026-10-31-new-conversation-composer.md)         | 4/4                  | `████████████████████` **100%** |
| 01d   | `conversation-screen`               | [Approved](docs/specs/conversation-screen/SPEC.md)               | [Ready](docs/plans/2026-10-31-conversation-screen.md)               | 7/7                  | `████████████████████` **100%** |
| 01e   | `settings-screen`                   | [Approved](docs/specs/settings-screen/SPEC.md)                   | [Ready](docs/plans/2026-10-31-settings-screen.md)                   | 6/6                  | `████████████████████` **100%** |
| 01f   | `document-viewer-screen`            | [Approved](docs/specs/document-viewer-screen/SPEC.md)            | [Ready](docs/plans/2026-10-31-document-viewer-screen.md)            | 4/4                  | `████████████████████` **100%** |
| 01g   | `project-sidebar-navigator`         | [Approved](docs/specs/project-sidebar-navigator/SPEC.md)         | [Ready](docs/plans/2026-10-31-project-sidebar-navigator.md)         | 6/6                  | `████████████████████` **100%** |
| 01h   | `conversation-agent-identity`       | [Approved](docs/specs/conversation-agent-identity/SPEC.md)       | [Ready](docs/plans/2026-10-31-conversation-agent-identity.md)       | 5/5                  | `████████████████████` **100%** |
| 01i   | `workbench-ui-refresh`              | [Approved](docs/specs/workbench-ui-refresh/SPEC.md)              | [Ready](docs/plans/2026-11-01-workbench-ui-refresh.md)              | 0/5                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 01j   | `ui-quick-adjustments`              | [Approved](docs/specs/ui-quick-adjustments/SPEC.md)              | [Ready](docs/plans/2026-11-01-ui-quick-adjustments.md)              | 0/8                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 02    | `cli-capability-contracts`          | [Approved](docs/specs/cli-capability-contracts/SPEC.md)          | [Ready](docs/plans/2026-10-30-cli-capability-contracts.md)          | 0/4                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 03    | `project-feature-state`             | [Approved](docs/specs/project-feature-state/SPEC.md)             | [Ready](docs/plans/2026-10-30-project-feature-state.md)             | 0/4                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 04    | `agent-settings-skills`             | [Approved](docs/specs/agent-settings-skills/SPEC.md)             | [Ready](docs/plans/2026-10-30-agent-settings-skills.md)             | 0/6                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 05    | `artifact-approval-gates`           | [Approved](docs/specs/artifact-approval-gates/SPEC.md)           | [Ready](docs/plans/2026-10-30-artifact-approval-gates.md)           | 0/5                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 06    | `feature-git-worktrees`             | [Approved](docs/specs/feature-git-worktrees/SPEC.md)             | [Ready](docs/plans/2026-10-30-feature-git-worktrees.md)             | 0/8                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 07    | `managed-command-runtime`           | [Approved](docs/specs/managed-command-runtime/SPEC.md)           | [Ready](docs/plans/2026-10-30-managed-command-runtime.md)           | 0/4                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 08    | `cli-agent-sessions`                | [Approved](docs/specs/cli-agent-sessions/SPEC.md)                | [Ready](docs/plans/2026-10-30-cli-agent-sessions.md)                | 0/10                 | `████░░░░░░░░░░░░░░░░` **20%**  |
| 09    | `feature-workbench-composer`        | [Approved](docs/specs/feature-workbench-composer/SPEC.md)        | [Ready](docs/plans/2026-10-30-feature-workbench-composer.md)        | 0/5                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 10    | `document-review-reader`            | [Approved](docs/specs/document-review-reader/SPEC.md)            | [Ready](docs/plans/2026-10-30-document-review-reader.md)            | 0/4                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 11    | `terminal-panel-footer`             | [Approved](docs/specs/terminal-panel-footer/SPEC.md)             | [Ready](docs/plans/2026-10-30-terminal-panel-footer.md)             | 0/5                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 12    | `guided-rpi-orchestration`          | [Approved](docs/specs/guided-rpi-orchestration/SPEC.md)          | [Ready](docs/plans/2026-10-30-guided-rpi-orchestration.md)          | 0/6                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 12a   | `loop-harness`                      | [Approved](docs/specs/loop-harness/SPEC.md)                      | [Ready](docs/plans/2026-10-31-loop-harness.md)                      | 0/8                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 13    | `recovery-mvp-acceptance`           | [Approved](docs/specs/recovery-mvp-acceptance/SPEC.md)           | [Ready](docs/plans/2026-10-30-recovery-mvp-acceptance.md)           | 0/5                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 14    | `attention-notifications`           | [Approved](docs/specs/attention-notifications/SPEC.md)           | [Ready](docs/plans/2026-11-01-attention-notifications.md)           | 0/5                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 15    | `ferreiro-agent`                    | [Approved](docs/specs/ferreiro-agent/SPEC.md)                    | [Ready](docs/plans/2026-11-01-ferreiro-agent.md)                    | 0/4                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 16    | `project-explorer`                  | [Approved](docs/specs/project-explorer/SPEC.md)                  | [Ready](docs/plans/2026-11-01-project-explorer.md)                  | 0/2                  | `████░░░░░░░░░░░░░░░░` **20%**  |
| 17    | `source-control-changes`            | [Approved](docs/specs/source-control-changes/SPEC.md)            | [Ready](docs/plans/2026-11-01-source-control-changes.md)            | 0/3                  | `████░░░░░░░░░░░░░░░░` **20%**  |

Each bar ranges from 0 to 100%. Implementation progress is proportional to validated tasks within the feature: `10 × approved spec + 10 × ready plan + 80 × (completed tasks / total tasks)`. Overall progress weights feature percentages by their implementation task counts, preserving each delivery's relative size. Independent review and final acceptance remain separate gates; progress does not mean approved delivery.

The Electron scaffold and static welcome screen are already implemented and are outside this new queue. The first planned delivery combines the bilingual landing and shared shadcn/Tailwind styleguide in `site/`, including localized product mocks.

### Landing page status

- **Deployed:** https://forjav2.web.app with `/`, `/pt-br`, `/styleguide` and `/pt-br/styleguide`. Publish with `npm run deploy:site` (Firebase project `ascode-e08f8`, hosting site `forjav2`).
- **Implemented:** bilingual landing with the seven approved sections, same-page locale switch, approved Stitch crops for the hero and the planned capabilities, mobile header and footer, favicon; bilingual styleguide with the shared components.
- **Tests:** 40 unit tests and 6 Playwright E2E tests pass. The styleguide visual baseline still needs human review.
- **Pending:** block-by-block Stitch fidelity review of the styleguide (sections 2, 3, 5 and 6) and the landing; the English crops and hero still show Portuguese interface text; independent review. All 8 plan tasks are implemented and validated; the slice counts as delivered only after that review closes.

See [ROADMAP.md](ROADMAP.md) for execution order and validation/review status, and the [plan index](docs/plans/README.md) for dependencies and implementation entry points.

## Quick start

Requires Node.js 24 or newer, npm, and a graphical desktop environment supported by Electron.
Run these commands from the repository root:

```sh
npm install
npm run dev
```

The Electron window opens on the welcome screen. No provider account or API key is required for this preview.

## Usage

The app starts without an open project. Choose Open project (Ctrl+O) or the footer project button to select a directory; Ctrl+R opens recent projects, including the preview fixtures.
Every page opens as a tab: features, documents, Settings, Archived and New chat. The `+` beside the tabs (or Ctrl+N) opens a New chat; sending a prompt creates a mock feature tab with scripted agent replies. Ctrl+W closes the active tab, Ctrl+B shows or hides the sidebar, Ctrl+Shift+P opens the command palette and Ctrl+, opens Settings, where the interface language can be switched.

To preview only the interface in a browser:

```sh
npm run dev:web
```

Open the local URL printed by Vite. This preview does not start the core process or create a database.

## Architecture

| Area                 | Implementation                                                       |
| -------------------- | -------------------------------------------------------------------- |
| Desktop shell        | Electron, electron-vite, electron-builder                            |
| Interface            | React, TypeScript, Tailwind, shadcn/ui (Radix), Terminal Noir tokens |
| Icons and typography | Lucide, @lobehub/icons for AI tools, Inter and JetBrains Mono        |
| Core                 | Separate Electron utility process                                    |
| Persistence          | SQLite through `node:sqlite`, WAL, versioned SQL migrations          |
| Contracts            | Zod validation at the core message boundary                          |
| Terminals            | xterm.js and node-pty for real user shells                           |
| Tests                | Vitest, Testing Library and Playwright                               |

The renderer uses Radix for accessible controls and Zustand for in-memory project navigation, features and panels.
AI adapters currently define TypeScript interfaces only. Session execution, MCP connections, approvals, credential storage, backups, and automatic updates remain unimplemented.
The renderer does not yet communicate with the core health endpoint.

The repository holds the desktop application and `site/`, the landing and component gallery. The site stays here so it and Electron reuse the same UI components and design tokens; it adds no backend service or npm workspace.

```text
src/
  main/          Window and application lifecycle
  preload/       Restricted directory-selection bridge
  core/          SQLite, core messages, and AI adapter interfaces
  shared/        Validated communication contracts
  renderer/src/
    app/         Application shell and screen composition
    shared/      Visual tokens and reusable UI
test/           Component, input validation, and database tests
```

## Development

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The build writes to `out/`. Installer targets are configured for Linux AppImage, Windows NSIS, and macOS DMG, but packaging and distribution have not been validated yet.

## Security

The renderer runs with sandboxing and context isolation enabled, with Node.js integration disabled.
The preload exposes directory selection and the terminal channels only. For directory selection the main process verifies the requesting window and frame, opens a directory-only system dialog and validates the selected path; the renderer cannot send arbitrary paths or dialog options. New windows and external navigation are blocked.
The terminal panel runs your own default shell through node-pty: the main process checks that each request comes from the owning window, canonicalizes the working directory, strips `ELECTRON_*` and `NODE_OPTIONS` from the environment and bounds input and sizes. Anything you type there runs with your user's permissions, like any terminal.
The current interface does not call AI providers, run coding CLIs as agents or store credentials. Folder selection checks directory metadata and does not read file contents. Selected projects remain in memory in this preview. In compatible browsers, the web preview uses a read-only directory picker and receives only the folder name, not its absolute path.

The core writes `forja.db` inside Electron's application data directory. Development uses a separate `Forja Dev` directory.
The database is not encrypted. Do not store secrets in this scaffold.

The browser preview binds to the loopback interface on the port reported by Vite, without authentication. In development it also serves `GET /__forja/skills`, which answers only loopback, same-origin requests and reads only `SKILL.md` files under the configured skills folder.
Development servers are for local development only. The packaged application does not start an HTTP server.
Report security concerns privately to the repository maintainer, without including credentials or sensitive files.

## License

A project license has not been selected yet. No license grant is provided for the project code at this stage; dependencies retain their respective licenses.
