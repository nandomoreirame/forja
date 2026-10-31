# Spec: Forja 2.0 Functional MVP

## Problem Statement

The developer needs an opinionated RPI workflow that connects Research, Plan, Implement, Test and Review while preserving human control, artifact approvals, execution visibility and Git ownership. Installed coding CLIs are execution tools for that workflow. The current Forja is a static Electron scaffold. The MVP must provide an observable guided workflow, preceded by a bilingual web landing and a real shared-component gallery.

## Goals

- Deliver site/ with English and pt-BR landing/styleguide using the same UI components desktop screens consume.
- Open ~/dev as one folder project and run two features against distinct selected repositories without mixing agents, artifacts, terminals or worktrees.
- Enforce every required approval in core, including invalidation after document/code changes.
- Execute agent commands through Forja MCP with live observable output and separate user PTYs.
- Restore durable state and complete the guided correction/integration cycle using the five targeted CLI adapters on Linux.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

The approved scope was developed through the interactive research/grilling conversation and explicitly authorized for planning on 2026-10-30. No implementation is authorized by this document-generation request. The planning repository may contain RPI STATE.md for these engineering plans; the PRODUCT must not create STATE.md inside a user's project at runtime.

### Design and technical sources

- [Approved execution design](https://stitch.withgoogle.com/projects/9281162402489678867/screens/b1e7dc73f23d4af5b81d37d978ef4b68).
- [Approved settings design](https://stitch.withgoogle.com/projects/9281162402489678867/screens/a486490d997146329aa2b82c637c98ee).
- [Terminal design](https://stitch.withgoogle.com/projects/9281162402489678867/screens/2551431dbc994626a9fd20cd8290a8d7) plus the user's local refinement image.
- [Styleguide](https://stitch.withgoogle.com/projects/9281162402489678867/screens/5cae4de038e748b7a1a0f06f6f332da3).
- [English landing](https://stitch.withgoogle.com/projects/9281162402489678867/screens/bf8dfb657a774e26b6205771525461a8).
- [Portuguese landing](https://stitch.withgoogle.com/projects/9281162402489678867/screens/5db10cc61f464f96ba751fdac5feaa20).
- [Local fidelity exceptions](../../design/forja-2.0/component-fidelity.md).
- [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite), [Tailwind theme variables](https://tailwindcss.com/docs/theme), [Mermaid strict mode](https://mermaid.js.org/config/schema-docs/config), [xterm security](https://xtermjs.org/docs/guides/security/).

## Verified Claims

The scaffold defines SQLite settings, a health-only IPC schema, an engine interface and a single window entry point. These are existing facts; all new paths/APIs in plans are future implementation targets. Installed CLI help was inspected but no paid model calls were made during research.

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| export function createDatabase(file: string): DatabaseSync { | `src/core/database.ts:3` | yes |
| CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); | `src/core/database.ts:9` | yes |
| export const coreRequestSchema = z.object( | `src/shared/contracts.ts:3` | yes |
| export interface EngineAdapter { | `src/core/engines/types.ts:23` | yes |
| function createWindow(): void { | `src/main/index.ts:6` | yes |
| Five CLI controlled-mode capabilities are supported by the installed versions | n/a | assumption |

## Requirements

### P1 (MVP)

1. **[REQ-001]** WHEN a folder is opened THEN the system SHALL open or focus its own project window using its canonical path, including non-Git folders such as ~/dev.
2. **[REQ-002]** WHEN a feature is created or renamed THEN the system SHALL keep an immutable identity and unique artifact slug while allowing its visible tab name to change.
3. **[REQ-003]** WHEN a feature selects a target repository THEN the system SHALL bind execution, branch and worktree to that repository and display its directory without moving the opened folder or its artifacts.
4. **[REQ-004]** WHEN the selected feature changes THEN the system SHALL switch conversation, composer and terminal context together; background events SHALL NOT steal the selected recipient.
5. **[REQ-005]** WHEN a recipient is selected by combobox or a valid @ mention THEN the system SHALL address one fixed agent; the latest explicit agent mention wins, otherwise follow the active agent in the selected feature.
6. **[REQ-006]** WHEN a message targets a busy feature agent THEN the system SHALL interrupt and await foreground termination by default, or enqueue in order when interruption is disabled, without concurrent duplicate turns.
7. **[REQ-007]** WHEN multiple features run THEN the system SHALL allow execution across features while enforcing one agent turn per feature and separate session, process and Git ownership.
8. **[REQ-008]** WHEN the application restarts THEN the system SHALL restore windows, tabs, conversations, artifact links and valid approvals, and mark prior active executions interrupted without automatic restart.
9. **[REQ-009]** WHEN a feature advances THEN the system SHALL follow Research, approved spec, Planner, approved plan, Implementer, approved implementation, Tester, Reviewer and final human approval.
10. **[REQ-010]** WHEN an agent start is requested THEN the system SHALL check required approved artifacts and dependencies in the core before spawning a CLI; disabled UI or prompt text alone SHALL NOT implement the gate.
11. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time.
12. **[REQ-012]** WHEN workflow state changes THEN the system SHALL persist versioned JSON and event history in SQLite and expose scoped state through Forja MCP without creating runtime STATE.md in the user project.
13. **[REQ-013]** WHEN an agent publishes a spec, plan or review THEN the system SHALL write only the scoped approved artifact type under the opened folder layout, honoring optional .claude/rpi-paths.json and default docs/specs, docs/plans and docs/reviews paths.
14. **[REQ-014]** WHEN agent settings are opened THEN the system SHALL offer exactly Research, Planner, Implementer, Tester and Reviewer, without creating, renaming or deleting roles.
15. **[REQ-015]** WHEN an agent is configured THEN the system SHALL target claude, codex, opencode, agy and grok with verified version/capability records, native authentication reuse and no credential copying or persistent user configuration edits.
16. **[REQ-016]** WHEN the user saves a profile THEN the system SHALL persist CLI, optional model, supported effort, additional instructions, selected skills and the default-off next-agent auto-invocation switch.
17. **[REQ-017]** WHEN the skills catalog is loaded or refreshed THEN the system SHALL read SKILL.md files from a configurable folder defaulting to ~/.skills, preserve source files, handle symlinks safely and report malformed or unreadable entries.
18. **[REQ-018]** WHEN a CLI produces output THEN the system SHALL normalize versioned structured events for session identity, text, tool activity, permissions, completion and errors while retaining bounded diagnostic context.
19. **[REQ-019]** WHEN a CLI enters controlled mode THEN the system SHALL verify Forja MCP attachment and effective native-shell restrictions; unsupported tools SHALL remain unavailable for controlled execution instead of silently bypassing permissions.
20. **[REQ-020]** WHEN an agent requests work from another role THEN the system SHALL record source and destination agent conversations, feature, artifact revision, reason and round, with bidirectional navigable links.
21. **[REQ-021]** WHEN automatic handoffs are enabled THEN the system SHALL preserve human approval gates and stop after three automatic correction attempts per feature shared across Tester and Reviewer until explicit human continuation.
22. **[REQ-022]** WHEN a role performs work THEN the system SHALL let Research and Planner publish their artifacts, Implementer modify authorized feature code, Tester validate and Reviewer publish findings; corrections SHALL return to Implementer.
23. **[REQ-023]** WHEN an interrupted conversation resumes THEN the system SHALL use the matching feature/agent/CLI native session when supported; ask before reconstructing context in a new session when native resume is unavailable.
24. **[REQ-024]** WHEN approved implementation starts THEN the system SHALL create or reuse one owned branch and worktree per feature in the selected Git repository and share it sequentially among Implementer, Tester and Reviewer.
25. **[REQ-025]** WHEN an implementation batch passes validation THEN the system SHALL commit only its owned delta on the feature branch, preserving unrelated user changes and index entries; failed checks SHALL NOT be recorded as successful.
26. **[REQ-026]** WHEN the user approves Git integration THEN the system SHALL bind authorization to the exact feature commit and destination HEAD, require valid tests/review, pause on divergence/conflicts and treat push as a separate explicit approval.
27. **[REQ-027]** WHEN review findings are produced or revisited THEN the system SHALL preserve the RPI review format and round trail; only Reviewer updates findings, and implementation does not declare its own independent review approved.
28. **[REQ-028]** WHEN an agent invokes development commands THEN the system SHALL run them exclusively through the scoped Forja MCP executor and expose command, authorized cwd, live stdout/stderr, state and eventual exit code.
29. **[REQ-029]** WHEN command output grows THEN the system SHALL stream and persist ordered bounded chunks with backpressure, configurable internal limits and explicit truncation notices rather than growing renderer memory without bounds.
30. **[REQ-030]** WHEN a server is explicitly launched in background mode THEN the system SHALL return an owned execution identifier and allow scoped log reads and stop requests independently from the agent turn.
31. **[REQ-031]** WHEN the user opens a terminal with + THEN the system SHALL start an independent PTY using the system account default shell and the feature worktree, target repository or opened folder in that priority order.
32. **[REQ-032]** WHEN terminal sessions are displayed THEN the system SHALL show a terminal-window icon on every tab, the actual shell basename for manual tabs, agent and command labels for read-only executions, and + on the right.
33. **[REQ-033]** WHEN the downward chevron is clicked THEN the system SHALL collapse without terminating into a feature-scoped footer toolbar with state/loading, hover details and click-to-expand the exact tab.
34. **[REQ-034]** WHEN a turn is interrupted or the app exits THEN the system SHALL stop owned foreground process trees before redirecting, keep explicitly persistent servers independent during turns, and gracefully stop owned CLI/PTY/command processes on full application exit.
35. **[REQ-035]** WHEN a document is opened from the sidebar THEN the system SHALL render CommonMark/GFM, highlighted fenced code, tables, tasks, authorized local images and strict Mermaid with no arbitrary HTML or script execution.
36. **[REQ-036]** WHEN the user selects document text and chooses Review with agent THEN the system SHALL prepare its author, feature, artifact identity/hash and selected excerpt in the global composer without sending automatically.
37. **[REQ-037]** WHEN an artifact is written or externally changed THEN the system SHALL use atomic publication, preserve content/history and unknown fields, reconcile filesystem changes, and never silently approve imported, missing, stale or malformed artifacts.
38. **[REQ-038]** WHEN the web site opens / or /pt-br THEN the system SHALL render the approved English-default or Brazilian Portuguese landing with localized metadata, navigation and truthful in-development messaging and GitHub development CTA.
39. **[REQ-039]** WHEN the first UI delivery is built THEN the system SHALL deliver the landing and styleguide together under site/, with /styleguide and /pt-br/styleguide using local deterministic mocks, independently of Electron.
40. **[REQ-040]** WHEN site or desktop UI is implemented THEN the system SHALL consume the same customized shadcn/ui primitives, shared browser-only compositions and Tailwind semantic tokens instead of duplicated controls or imports from site internals.
41. **[REQ-041]** WHEN a landing or gallery locale changes THEN the system SHALL localize agent names, states, messages, tabs, composer labels and previews while preserving commands, paths, tool names and identifiers.
42. **[REQ-042]** WHEN a locale link is followed or a route is refreshed THEN the system SHALL preserve the corresponding landing/styleguide page, default to English without automatic browser-language redirects and provide correct lang/title/description per route.
43. **[REQ-043]** WHEN a functional screen is implemented THEN the system SHALL reuse approved component anatomy and recorded user exceptions, compare deterministic captures at matching viewports and fix drift before accepting the screen.
44. **[REQ-044]** WHEN site/gallery components render THEN the system SHALL use no Electron, native filesystem, PTY, Git, MCP or AI side effects and expose meaningful default, hover, keyboard focus, disabled, loading, empty and error states.
45. **[REQ-045]** WHEN a tool or agent requests approval mutation THEN the system SHALL reject it; human-authorized core commands alone approve artifacts, implementation, final completion and Git integration.
46. **[REQ-046]** WHEN settings are opened or refreshed THEN the system SHALL detect executable/version/capabilities with bounded local probes, distinguish installation from authentication and defer model-network calls to explicit smoke tests.
47. **[REQ-047]** WHEN the user views settings THEN the system SHALL keep the global composer available but separate from manual form saves; agents SHALL NOT read or alter settings merely because the screen is visible.
48. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
49. **[REQ-049]** WHEN the MVP is accepted THEN the system SHALL pass unit/integration/Electron E2E and authenticated five-CLI smoke checks in the Linux acceptance environment without shipping a falsely supported adapter.
50. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.
51. **[REQ-051]** WHEN native configuration, skills or documents enter context THEN the system SHALL treat their content as data subject to role/tool constraints and adapt RPI state instructions for the current invocation without editing user skill/config files.
52. **[REQ-052]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable non-secret error and a truthful stopped/failed state without fabricating completion or automatically weakening controls.
53. **[REQ-053]** WHEN agent configuration changes while work is active THEN the system SHALL apply it to future turns; preserve the current turn settings snapshot and explicit recipient context.
54. **[REQ-054]** WHEN an output view or feature tab is closed THEN the system SHALL distinguish hiding a tab from stopping an execution, preserve feature history and require explicit confirmation before abandoning active owned work.

### P2 (Should Have)

None. Do not add unapproved scope to make a task appear complete.

### P3 (Nice to Have)

None in this delivery; deferred items are explicit below.

## Edge Cases

- Missing Git: Research/Planner and artifacts work in any opened folder. Implementation waits for an explicit valid target and base branch. A feature targets one repository in this MVP.
- External edits: missing, malformed, moved or modified documents invalidate dependent work and produce actionable reconciliation, never silent approval/import. Unknown sections and comments survive updates. Repeating a publish with identical bytes is idempotent.
- Races: stale approval, second window, concurrent click, manual shell edit or changed destination HEAD must be detected before spawning or integrating. Use feature leases and transactional compare-and-swap state revisions.
- CLI uncertainty: availability, auth, resume and shell/MCP control are external assumptions until the capability spike and live tests. No accepted CLI may silently downgrade to uncontrolled execution. A failed adapter does not prevent independent web/core work, but the five-adapter MVP is incomplete until resolved.
- Skill symlinks: allow explicit roots and symlinked skill directories, resolve canonical paths, avoid cycles and unbounded recursive scans, never read arbitrary sibling secrets. Distinguish catalog availability from native CLI skill expansion.
- Output: bound line/chunk size and retained memory, preserve ordering and stderr identity, show truncation, clean invalid UTF-8/ANSI safely; never interpret terminal output as HTML or permit clipboard escape writes silently.
- Foreground stop: wait for the process group; escalate after a timeout; do not start a replacement while termination is unconfirmed. Background servers are explicitly independent, not accidental orphaned foreground commands.
- Exit/restart: stop owned children on normal app exit. On crash/restart do not signal a saved PID without validating identity; show interrupted records and investigate stale ownership safely. Live shell contents/processes cannot be reconstructed from a database record.
- Approval vs handoff: three automatic rounds share one feature budget; toggles do not authorize spec/plan/implementation/final approval or integration. Manual continuation is recorded and does not erase history.
- Settings are global agent defaults for the MVP, with each turn storing a snapshot. Changing target repo/base after implementation begins is blocked until the feature is explicitly stopped and rebound; never silently repoint a live worktree.
- Reopening a folder uses canonical identity. Closing a terminal view is not stopping it; closing a project with live work asks before ending owned work. Session restoration has no automatic paid CLI calls.
- Document rendering: block active HTML, unsafe URL schemes and remote/local resource leakage. Mermaid uses strict mode, no callbacks and bounded complexity. A malformed diagram is a visible fallback, not a page crash.
- Site: preview/Git/PTY behavior is mock-only; both locales preserve meaning without translating commands, paths or tool names. Refreshing all four routes must work from built files, not only SPA navigation.

## Architecture Decisions

1. Keep one npm package and root lockfile. Use `site/` for a browser-only Vite build; do not introduce workspaces or a second React installation. Site commands execute from the repository root.
2. Put generic shadcn components in `src/shared/ui/`, tokens in `src/shared/styles/`, locale contracts in `src/shared/i18n/`, and browser-only domain compositions in `src/widgets/<slice>/`. Public `index.ts` exports are the only cross-slice entry points. Use `@forja/ui`, `@forja/widgets` and `@forja/i18n` aliases consistently in TS, Vite, electron-vite and Vitest. Neither site nor shared UI imports Electron/core/preload/Node modules.
3. Keep desktop orchestration in `src/core/<feature>/`; use SQLite as a single core-owned writer, versioned JSON for workflow state, and relational identities/events for efficient ownership and pagination. Files are the artifact content source; SQLite stores versions, provenance, approval hashes and histories.
4. A window project is the canonical opened folder; a feature has separate artifact-root and target-repository identities. Canonicalize symlinks and never treat `~/dev` as an inferred multi-project workspace. User configuration may explicitly authorize artifact roots outside the folder through existing RPI paths; show that boundary and require permission rather than following arbitrary model paths.
5. Forja MCP is a scoped local gateway with random per-run credentials, loopback binding, revocation and bounded requests. Tools read workflow state, publish permitted artifacts, request handoffs and run allowed commands. Agents cannot approve state. Ordinary existing MCP connectors remain subject to capability/role policy, never blindly inherited as an escape hatch.
6. Execute arbitrary development commands only through a core supervisor bound to a feature capability and authorized cwd. This is an audited local development tool, not a complete hostile-code OS sandbox. A denylist of command strings is not proof of filesystem/Git isolation. Controlled mode must actually restrict native shell routes; privileged Git integration is a separate human operation. Discover any remaining native-tool bypass before claiming an adapter is controlled.
7. Use owned process groups for managed commands, node-pty for user shells, xterm for terminal presentation, bounded chunk logs and explicit background-server ownership. A durable process record is not a restored live process.
8. Preserve native CLI auth and compatible user configuration. Apply role/tool restrictions and RPI state adaptation per invocation, without globally editing configs/skills or disabling all permissions. Different CLI transports are allowed behind one normalized engine interface.
9. File watchers improve responsiveness; hash/revision validation in core dispatch and approval transactions is authoritative. Bind implementation/test/review to an exact commit plus tracked and relevant untracked worktree content, not a weak `git status` string. Manual mutations during review invalidate its result.
10. Git branches/worktrees are created only in a user-selected repository. Default to a collision-safe `feature/<slug>` branch and a managed worktree outside the destination working tree; inspect existing worktree conventions before selecting the actual location. Record the selected base branch/commit explicitly. Never assume main from its spelling. Integration preserves the destination worktree and stops on dirty state or conflicts.
11. Use a prepared integration request bound to source commit, target branch and HEAD. Integration is a two-parent merge in an owned integration worktree after approval; recheck destination identity and cleanliness before updating it. Push and worktree removal are separate explicit operations. No auto-rebase, reset, stash or conflict resolution.
12. Reuse approved design anatomy with shadcn behavior and Tailwind tokens; remove temporary disabled scaffold controls as functional handlers are implemented. Keep the global composer above the terminal; selecting a background feature never changes the foreground recipient. Route web locales explicitly; localize preview data too.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Window model | One folder equals one project window | Matches the requested VS Code-like behavior. |
| 2 | Feature context | One renameable feature tab with one target repository; features can execute in parallel | Prevents chat and Git ownership mixing. |
| 3 | Approval source | Versioned JSON in SQLite, no runtime STATE.md | User explicitly replaced file state with database state. |
| 4 | Guided mode | Human approvals with default-off bounded auto-handoff | Enables limited correction experiments without autonomous approval. |
| 5 | Git isolation | One feature branch/worktree shared by implementation, testing and review | Preserves a coherent correction history. |
| 6 | Skills | Configurable read-only root, initially ~/.skills | User edits existing sources externally. |
| 7 | Messaging | One recipient; follow active feature/agent; interrupt by default or queue | Keeps redirection responsive and scoped. |
| 8 | Documents | Formatted Markdown/Mermaid with excerpt feedback | Makes artifacts readable and actionable. |
| 9 | Terminals | User default-shell PTYs separate from agent MCP command tabs | Combines observability with manual control. |
| 10 | Collapsed terminal | Footer toolbar retains each execution and restores exact tab | Collapse does not terminate work. |
| 11 | Web foundation | First plan combines landing and gallery under site/ | Validates actual shared UI before desktop screens. |
| 12 | Locales | English /, Portuguese /pt-br, including all product mocks | User requested both locales with localized previews. |
| 13 | UI stack | Customized shadcn/ui and Tailwind; no duplicated site components | Prevents implementation visual surprises. |
| 14 | Closure | Operational defaults approved with final request to generate plans | Plans now derive from the consolidated approved scope. |

## Constraints

- Planning artifacts are English; chat is pt-BR. Product web content is localized as specified.
- Existing user changes and index must be preserved. This planning run performs no Git writes, dependency installation or production edits.
- Linux is the acceptance target. Installed CLIs and user authentication are external dependencies; verify before reporting compatibility.
- No production site deployment, paid calls or credentials in tests by default. Live authenticated checks are explicit acceptance steps.
- TDD, meaningful integration checks and independent review remain separate from implementer validation.

## Out of Scope

| Item | Reason |
| --- | --- |
| Onboarding wizard | Configure the same needed values directly in settings. |
| Custom agents | Five fixed roles cover the approved RPI flow. |
| Fully autonomous approval mode | Human approval remains authoritative in this MVP. |
| Knowledge base and AI-controlled settings | Explicit future scope. |
| Skill editing/installing or marketplace | Catalog is read only. |
| Team accounts, cloud sync and SaaS billing | Local personal developer tool. |
| Full editor, SSH and split terminals | Basic manual PTY and observable execution tabs only. |
| Windows/macOS release certification and auto-updates | Linux is the initial acceptance environment. |
| Automatic integration/push/deploy | Explicit approval boundary; deployment is not requested. |
| Rewriting external RPI skills/helpers | Adapt instructions/tools per invocation, preserving files. |

## Test Strategy

- **Unit:** Vitest for schemas, state/gates, dependency hashes, routing, correction counters, parsers, process ownership and mock-local UI behavior. RTL for real shared primitives/compositions.
- **Integration:** Real temporary SQLite databases, folders, Git repositories/worktrees, local MCP clients, subprocesses and PTYs. Verify idempotence and tolerant round trips for every file writer.
- **E2E:** Playwright browser checks for all four bilingual site routes, localization of mock previews and keyboard/focus; Electron checks for two feature Git targets, approvals/staleness, interrupt/queue, terminal tabs/footer, document selection and restart.
- **Visual:** Download the approved Stitch HTML/PNG, preserve anatomy and remove recorded inventions, capture each component/state with deterministic mocks, inspect side-by-side output rather than trusting background-dominated pixel percentages.
- **Live CLI acceptance:** Capture version, tool restriction proof, MCP calls, text streaming, native session behavior and termination for each of claude/codex/opencode/agy/grok. A fixture test is not a successful authenticated integration claim.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-001 | Folder projects | P1 | Approved; not implemented |
| REQ-002 | Feature tabs | P1 | Approved; not implemented |
| REQ-003 | Per-feature repository | P1 | Approved; not implemented |
| REQ-004 | Composer context | P1 | Approved; not implemented |
| REQ-005 | Single recipient | P1 | Approved; not implemented |
| REQ-006 | Interrupt or queue | P1 | Approved; not implemented |
| REQ-007 | Feature concurrency | P1 | Approved; not implemented |
| REQ-008 | Session restoration | P1 | Approved; not implemented |
| REQ-009 | Guided RPI | P1 | Approved; not implemented |
| REQ-010 | Authoritative gates | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-012 | JSON workflow state | P1 | Approved; not implemented |
| REQ-013 | Artifact placement | P1 | Approved; not implemented |
| REQ-014 | Fixed agents | P1 | Approved; not implemented |
| REQ-015 | Five CLI adapters | P1 | Approved; not implemented |
| REQ-016 | Agent settings | P1 | Approved; not implemented |
| REQ-017 | Read-only skills | P1 | Approved; not implemented |
| REQ-018 | Normalized CLI events | P1 | Approved; not implemented |
| REQ-019 | Controlled execution compatibility | P1 | Approved; not implemented |
| REQ-020 | Linked handoffs | P1 | Approved; not implemented |
| REQ-021 | Bounded correction loop | P1 | Approved; not implemented |
| REQ-022 | Role boundaries | P1 | Approved; not implemented |
| REQ-023 | Resume capability | P1 | Approved; not implemented |
| REQ-024 | Feature worktrees | P1 | Approved; not implemented |
| REQ-025 | Feature commits | P1 | Approved; not implemented |
| REQ-026 | Approved integration | P1 | Approved; not implemented |
| REQ-027 | Review ownership | P1 | Approved; not implemented |
| REQ-028 | MCP command runner | P1 | Approved; not implemented |
| REQ-029 | Bounded output | P1 | Approved; not implemented |
| REQ-030 | Persistent processes | P1 | Approved; not implemented |
| REQ-031 | Manual shells | P1 | Approved; not implemented |
| REQ-032 | Terminal tabs | P1 | Approved; not implemented |
| REQ-033 | Collapsed footer | P1 | Approved; not implemented |
| REQ-034 | Process lifecycle | P1 | Approved; not implemented |
| REQ-035 | Document reader | P1 | Approved; not implemented |
| REQ-036 | Excerpt feedback | P1 | Approved; not implemented |
| REQ-037 | Artifact publishing | P1 | Approved; not implemented |
| REQ-038 | Bilingual landing | P1 | Approved; not implemented |
| REQ-039 | Standalone gallery | P1 | Approved; not implemented |
| REQ-040 | Shared shadcn components | P1 | Approved; not implemented |
| REQ-041 | Localized product mocks | P1 | Approved; not implemented |
| REQ-042 | Web locale routing | P1 | Approved; not implemented |
| REQ-043 | Visual fidelity | P1 | Approved; not implemented |
| REQ-044 | Mock isolation | P1 | Approved; not implemented |
| REQ-045 | Human approval ownership | P1 | Approved; not implemented |
| REQ-046 | CLI discovery | P1 | Approved; not implemented |
| REQ-047 | Manual app configuration | P1 | Approved; not implemented |
| REQ-048 | Scoped boundaries | P1 | Approved; not implemented |
| REQ-049 | Linux MVP acceptance | P1 | Approved; not implemented |
| REQ-050 | User work preservation | P1 | Approved; not implemented |
| REQ-051 | Untrusted context | P1 | Approved; not implemented |
| REQ-052 | Operational errors | P1 | Approved; not implemented |
| REQ-053 | Settings snapshots | P1 | Approved; not implemented |
| REQ-054 | Feature archive and sessions | P1 | Approved; not implemented |

## Implementation Sequence

See [the ordered plan index](../../plans/README.md). Each child spec is an approved derived slice of this scope, not a new independent product decision. The website and component plan is first; the CLI capability probe is second and must precede controlled runtime integration.
