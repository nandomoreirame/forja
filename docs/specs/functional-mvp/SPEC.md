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
9. **[REQ-009]** WHEN a feature advances THEN the system SHALL follow Research, human-approved spec, Planner, human-approved plan, Implementer, machine-validated implementation (confirmed repository gates green on the committed fingerprint), Tester, Reviewer and one human final approval that also authorizes integration.
10. **[REQ-010]** WHEN an agent start is requested THEN the system SHALL check required approved artifacts and dependencies in the core before spawning a CLI; disabled UI or prompt text alone SHALL NOT implement the gate.
11. **[REQ-011]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals and evidence to exact content hashes and dependency revisions, invalidate affected approvals/results and preserve history; recheck at dispatch and approval time. RPI artifact paths SHALL be excluded from the code fingerprint and invalidate only through the artifact dependency graph.
12. **[REQ-012]** WHEN workflow state changes THEN the system SHALL persist versioned JSON and event history in SQLite and expose scoped state through Forja MCP without creating runtime STATE.md in the user project.
13. **[REQ-013]** WHEN an agent publishes a spec, plan or review THEN the system SHALL write only the scoped artifact type under the feature artifact root (the feature worktree when the target is a Git repository, otherwise the opened folder), honoring that root's optional .claude/rpi-paths.json and default docs/specs, docs/plans and docs/reviews paths.
14. **[REQ-014]** WHEN agent settings are opened THEN the system SHALL offer exactly six fixed agents, the general Ferreiro and the RPI roles Research, Planner, Implementer, Tester and Reviewer, each with an editable display name (REQ-110), without creating, deleting or changing roles.
15. **[REQ-015]** WHEN an agent is configured THEN the system SHALL target claude, codex, opencode, agy and grok with verified version/capability records, native authentication reuse and no credential copying or persistent user configuration edits; a stored CLI login MAY be read, read-only and in memory, only for opted-in plan usage (REQ-102).
16. **[REQ-016]** WHEN the user saves a profile THEN the system SHALL persist CLI, optional model, supported effort, additional instructions, selected skills and the default-off next-agent auto-invocation switch.
17. **[REQ-017]** WHEN the skills catalog is loaded or refreshed THEN the system SHALL read SKILL.md files from a configurable folder defaulting to ~/.skills, preserve source files, handle symlinks safely and report malformed or unreadable entries; skill files SHALL be created or changed only through a user-confirmed Ferreiro draft (REQ-109).
18. **[REQ-018]** WHEN a CLI produces output THEN the system SHALL normalize versioned structured events for session identity, text, tool activity, permissions, completion and errors while retaining bounded diagnostic context.
19. **[REQ-019]** WHEN a CLI enters controlled mode THEN the system SHALL verify Forja MCP attachment and effective native-shell restrictions; unsupported tools SHALL remain unavailable for controlled execution instead of silently bypassing permissions.
20. **[REQ-020]** WHEN an agent requests work from another role THEN the system SHALL record source and destination agent conversations, feature, artifact revision, reason and round, with bidirectional navigable links.
21. **[REQ-021]** WHEN automatic handoffs are enabled THEN the system SHALL run Tester/Reviewer to Implementer corrections and the following machine-validated re-test and re-review without human approval, stopping after three automatic correction attempts per feature shared across Tester and Reviewer until explicit human continuation; spec, plan and final approvals SHALL never be automated.
22. **[REQ-022]** WHEN a role performs work THEN the system SHALL let Research and Planner publish their artifacts, Implementer modify authorized feature code, Tester add or edit only files matching the confirmed test patterns and report coverage gaps, and Reviewer publish findings; corrections SHALL return to Implementer.
23. **[REQ-023]** WHEN an interrupted conversation resumes THEN the system SHALL use the matching feature/agent/CLI native session when supported; ask before reconstructing context in a new session when native resume is unavailable.
24. **[REQ-024]** WHEN a feature is bound to a Git target repository THEN the system SHALL create or reuse one owned branch and worktree for it from the explicitly selected base before any role publishes, and share it sequentially among all five roles.
25. **[REQ-025]** WHEN an Implementer or Tester turn ends with the confirmed repository gates passing THEN the system SHALL commit only the owned delta on the feature branch with an agent-proposed Conventional Commits message validated by core, preserving unrelated user changes and index entries; failed or skipped gates SHALL NOT be recorded as successful or advance the workflow. Approved spec/plan versions and published reviews are committed by core.
26. **[REQ-026]** WHEN the user grants final approval THEN the system SHALL bind it to the exact feature commit, destination branch and HEAD, perform a no-fast-forward merge in an owned integration worktree, run the confirmed gates on the merge result and update the destination only if they pass and its HEAD is unchanged since approval; otherwise pause with diagnostics. Push SHALL be a separate explicit approval.
27. **[REQ-027]** WHEN review findings are produced or revisited THEN the system SHALL preserve the RPI review format and round trail; only Reviewer resolves findings, implementation does not declare its own independent review approved, and open Critical/High findings without a human waiver block final approval.
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
45. **[REQ-045]** WHEN a tool or agent requests approval mutation THEN the system SHALL reject it; human-authorized core commands alone approve specs, plans, final approval/integration, finding waivers and push.
46. **[REQ-046]** WHEN settings are opened or refreshed THEN the system SHALL detect executable/version/capabilities with bounded local probes, distinguish installation from authentication and defer model-network calls to explicit smoke tests.
47. **[REQ-047]** WHEN the user views settings THEN the system SHALL keep the global composer available but separate from manual form saves; agents SHALL NOT read or alter settings merely because the screen is visible.
48. **[REQ-048]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project/feature ownership, canonical paths and tool grants; never rely on connector annotations or model-supplied IDs as authorization.
49. **[REQ-049]** WHEN the MVP is accepted THEN the system SHALL pass unit/integration/Electron E2E and authenticated five-CLI smoke checks in the Linux acceptance environment without shipping a falsely supported adapter.
50. **[REQ-050]** WHEN Git or file operations encounter external changes THEN the system SHALL preserve unrelated changes, fail safely on conflicts and require re-evaluation rather than force reset, auto-delete or silently including user work.
51. **[REQ-051]** WHEN native configuration, skills or documents enter context THEN the system SHALL treat their content as data subject to role/tool constraints and adapt RPI state instructions for the current invocation without editing user skill/config files.
52. **[REQ-052]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable non-secret error and a truthful stopped/failed state without fabricating completion or automatically weakening controls.
53. **[REQ-053]** WHEN agent configuration changes while work is active THEN the system SHALL apply it to future turns; preserve the current turn settings snapshot and explicit recipient context.
54. **[REQ-054]** WHEN an output view or feature tab is closed THEN the system SHALL distinguish hiding a tab from stopping an execution, preserve feature history and require explicit confirmation before abandoning active owned work.
55. **[REQ-055]** WHEN a Git target is bound THEN the system SHALL detect candidate validation commands and test-file patterns from repository manifests, require human confirmation, store them per target repository and run them itself through the managed executor as the only authoritative validation evidence.
56. **[REQ-056]** WHEN a role requests a handoff or a human rejects an approval THEN the system SHALL allow only Tester/Reviewer to Implementer (correction), Implementer to Planner (infeasible plan) and Planner to Research (ambiguous spec); returning to Planner or Research SHALL invalidate downstream approvals and evidence, and a human rejection SHALL return its reason to the owning role.
57. **[REQ-057]** WHEN the user waives a blocking review finding THEN the system SHALL require a reason, an extra confirmation for Critical, record actor, time and finding revision, and keep the finding visible as waived; agents SHALL NOT waive findings.
58. **[REQ-058]** WHEN a feature is integrated or abandoned THEN the system SHALL move it to a read-only terminal state preserving history; after integration it SHALL offer explicit worktree/branch removal, and abandoning SHALL require confirmation, stop owned processes and keep branch/worktree until explicit cleanup.
59. **[REQ-059]** WHEN an agent turn emits no events for the configurable inactivity window (default 10 minutes) THEN the system SHALL mark it unresponsive and let the user keep waiting or stop it; a forced stop SHALL always be available and release the feature lease only after the owned process group terminates.
60. **[REQ-060]** WHEN a CLI reports token or cost usage THEN the system SHALL record and display it per turn and per feature; when a CLI does not report usage the system SHALL show it as unavailable instead of estimating.
61. **[REQ-061]** WHEN the renderer starts THEN the system SHALL load projects, features, conversations and terminals through a `WorkbenchSource` interface, using a deterministic mock implementation until core IPC replaces it, without importing mock modules in screens.
62. **[REQ-062]** WHEN a project is open THEN the system SHALL render the workbench shell on the Terminal Noir `surface.base` background: a 40 px topbar with the brand, the sidebar toggle, the command bar trigger and the right panel toggle (no back/forward buttons; Alt+Left/Right keep the view history); the left sidebar, editor area, terminal panel and right panel as separate parts with an 8 px rounded border and a small gap; and a 32 px statusbar with the project button showing the `~`-relative path, the background terminals and the current branch.
63. **[REQ-063]** WHEN an open project has no feature tabs THEN the system SHALL show the project home with the Forja mark and the actions New conversation (Ctrl+N), Recent projects (Ctrl+R) and Show all commands (Ctrl+Shift+P), each clickable, focusable and triggered by its shortcut.
64. **[REQ-064]** WHEN the user activates the topbar search, presses Ctrl+Shift+P or activates the sidebar project header THEN the system SHALL open a centered shadcn Command dialog listing recent projects and commands with type-to-filter, arrow-key navigation, Enter to run, Escape to close and focus restored to the opener.
65. **[REQ-065]** WHEN the user presses Ctrl+R or chooses Recent projects THEN the system SHALL open the same command bar scoped to recent projects, each showing name, path and relative time with the current one marked, and selecting another project SHALL switch the window to that mock project; project history SHALL NOT open as a sidebar dropdown.
66. **[REQ-066]** WHEN the user chooses New conversation (home action, Ctrl+N or sidebar Add spec) or closes the last feature tab THEN the system SHALL show the centered composer without a tab bar label, with the Research agent preselected and the text field focused.
67. **[REQ-067]** WHEN the user sends a non-empty prompt from the centered composer THEN the system SHALL create a mock feature named from the prompt with a unique slug, open its tab and show the conversation screen with the Research mock reply streaming.
68. **[REQ-068]** WHEN a feature tab is selected THEN the system SHALL show a header with the feature name and the Summary and Flow actions (Flow opens a centered bar with the RPI cycle), its conversation and the docked composer; destination and branch SHALL appear in the right panel, and background features SHALL never steal the selected recipient.
69. **[REQ-069]** WHEN the user sends a prompt in a feature THEN the system SHALL append the message and stream a scripted mock reply from the selected recipient (running to completed, with Interrupt available), adding mock terminal output for Implementer and Tester replies, with no CLI, network or filesystem access.
70. **[REQ-070]** WHEN the user opens or collapses the terminal panel or switches terminal tabs THEN the system SHALL keep each mock terminal's output and state, collapse to the footer toolbar without stopping mocks, and reopen the exact tab from the toolbar.
71. **[REQ-071]** WHEN the user closes a tab THEN the system SHALL remove only that tab without confirmation, keep a running agent working in the background with its state visible in the Features section (REQ-054), select a neighbor tab, and show the initial empty state without tabs after the last tab closes.
72. **[REQ-072]** WHEN the user activates the topbar sidebar or right panel toggle, presses Ctrl+B, activates the statusbar terminal toggle or presses Alt+Left/Right THEN the system SHALL show or hide that part (the collapsed sidebar becomes an icon rail) or move through the window view history, keeping the choice for the session.
73. **[REQ-073]** WHEN the user activates "+ Add plan" or an agent row while no feature tab is open THEN the system SHALL show the centered composer with the Planner or that agent preselected; "+ Add spec" SHALL preselect Research.
74. **[REQ-074]** WHEN the user activates an agent row in the sidebar or types a valid @mention (token boundary, English or localized role alias, ignored inside code fences) THEN the system SHALL make that agent the composer recipient for the selected feature, with the latest explicit choice winning.
75. **[REQ-075]** WHEN the user activates "View request", the terminal "+" or "Stop process" THEN the system SHALL scroll to and highlight the source message, add a mock manual shell tab labeled with the shell name, or mark that mock execution stopped with its output preserved.
76. **[REQ-076]** WHEN the user opens Settings from the sidebar, the rail or Ctrl+, THEN the system SHALL open the Settings tab on General, with Agents second and Connectors third, keeping the other tabs open.
77. **[REQ-077]** WHEN Settings is shown THEN the system SHALL offer, in Agents, the fixed role selector, AI tool (claude, codex, opencode, agy, grok) with a mock detection indicator, optional model (empty means the tool default), reasoning level with an availability hint, additional instructions, a skills checklist with an active count and the auto-invoke switch; in General, the skills folder with refresh, interrupt policy, read-only guided mode with three rounds and the inactivity window; changes SHALL persist only through Save, which is enabled when the form is dirty, and leaving with unsaved changes SHALL ask for confirmation.
78. **[REQ-078]** WHEN the user activates a spec, plan or review in the sidebar THEN the system SHALL open (or focus) a closable document tab showing the document header with its state and, for a draft spec or plan, a mock approve action, followed by the rendered Markdown and Mermaid content from the mock source.
79. **[REQ-079]** WHEN the user selects text in a document and chooses "Review with agent" THEN the system SHALL prefill the global composer with the artifact name, the quoted excerpt and the artifact's author agent as recipient, without sending.
80. **[REQ-080]** WHEN a feature conversation shows agent replies or user messages THEN the system SHALL render them as sanitized Markdown with copyable code blocks, collapsible command runs (command, exit status and output), log excerpts and image attachments on user messages, and the mock data SHALL include examples of each in both locales.
81. **[REQ-081]** WHEN a project is open THEN the left sidebar SHALL end with the plan usage panel (REQ-082) above a menu holding Archived, Connectors and Settings; memories SHALL be a sidebar section and each menu entry SHALL open its page as a tab.
82. **[REQ-082]** WHEN a project is open THEN the left sidebar SHALL show an always-open plan usage panel above Archived with the time since the last update and, for each tool with usage data only, one row per window (5-hour and weekly) with a progress bar (success under 70%, warning from 70%, destructive from 90%), the used percentage and the time until reset; tools without data SHALL be omitted (REQ-060, REQ-102), the collapsed rail SHALL show it as an icon, and the mock data SHALL come from `WorkbenchSource`.
83. **[REQ-083]** WHEN a project is open THEN the sidebar SHALL start with a Features section listing every non-archived feature, open tab or not, each row showing the state dot and the feature name, and on hover or focus the current agent's AI tool icon, a state badge and the archive action; features needing the user come first, then running, then idle, each by most recent activity, with finished features last in the same list; activating a row SHALL open or focus that feature's tab with its history; new conversations start from the tab strip `+` (REQ-103), not from the sidebar.
84. **[REQ-084]** WHEN the project has specs or plans THEN the Specs and Plans sections SHALL list them with a state badge (draft, approved, stale), each spec showing its feature and each plan its spec as a subtitle; artifacts of the selected feature SHALL be highlighted and the others dimmed; activating a row SHALL open it in a document tab; "+ New spec" SHALL open the centered composer with Research; there SHALL be no "+ Add plan" action, because plans come from an approved spec inside a feature.
85. **[REQ-085]** WHEN the project is open THEN the Skills and Memories sections SHALL list project and global entries with a "project" or "global" label; activating an entry SHALL open its Markdown in a document tab with an "Edit with agent" action that starts an authoring conversation with the matching specialist (mock reply); "+ New skill" and "+ New memory" SHALL ask for the scope and then start that authoring conversation; the workspace menu SHALL no longer contain Memory and Settings SHALL drop its Memory tab.
86. **[REQ-086]** WHEN the user works with sidebar or right panel sections THEN each section SHALL collapse or expand from its header with an eased height transition, resize from the sash above it, show its item count, share the free height among open sections with collapsed headers at the bottom (all at the top when every section is collapsed), and remember its state per viewer across restarts.
87. **[REQ-087]** WHEN the user archives a feature, spec or plan from its row action THEN the system SHALL hide it from the sidebar, tabs and command bar without deleting any file; archiving a feature SHALL also archive its spec and plans and close its tab; a feature with a running agent SHALL NOT be archivable (the action is disabled with a tooltip saying to interrupt first); the workspace menu SHALL offer "Archived", listing archived items by kind with a Restore action that puts them back where they were.
88. **[REQ-088]** WHEN a feature tab is shown THEN each stage of the feature cycle SHALL show the icon of the AI tool configured for that agent before its name, with a tooltip "<role> · <tool>", and the feature tab icon SHALL show the tool of the agent of the current stage; both SHALL update after Settings are saved.
89. **[REQ-089]** WHEN an agent reply is shown THEN the system SHALL show that agent's mascot (one distinct 12×12 pixel-art sprite per role, decorative) with the configured tool as a corner badge, and the reply's accessible author SHALL read "<role> (<tool>)"; user messages and workflow events SHALL have no avatar.
90. **[REQ-090]** WHEN the conversation is shown THEN agent replies SHALL sit on a gray surface without a border, distinct from the page background and from the user messages, and code, command and log blocks inside a reply SHALL keep a darker background so they still stand out.
91. **[REQ-091]** WHEN a Reviewer publishes a round with zero open findings that closes a feature THEN the system SHALL accept lesson proposals through a scoped Forja MCP tool only when each cites a finding or failed proof of that feature (core-verified, never a model-supplied ID alone), deduplicate by normalized signal and text, count distinct features per project, promote a lesson to confirmed at two features and quarantine it after two penalties, persist lessons in SQLite and atomically publish a rendered `LESSONS.md` in the project's artifact root; confirmed lessons SHALL be injected into Research and Planner turn context as untrusted data (at most 20, filtered by the feature's area) and listed under Memories in the sidebar with their status, where the user can quarantine or restore one.
92. **[REQ-092]** WHEN a plan is published THEN it SHALL carry a Checks section with one check per P1 requirement and a proof per check (a named run group plus the words its passing line prints, or a lone command judged by exit code); WHEN the last Implementer task commits THEN the system SHALL run each run group and lone proof once, sequentially, through the managed executor on the committed fingerprint, store per-check PASS, FAIL or "no test ran" with the output tail, and block final approval unless every check passes at the reviewed commit.
93. **[REQ-093]** WHEN a Tester or Reviewer turn runs on a feature with checks THEN its instructions SHALL require, per check, a judgment of whether the selected test would fail if the claim were false, two throwaway examples outside the named cases, and a list of assertions looser than their criterion; the system SHALL reject a review publication missing a judgment for any check and SHALL record a "does not hold" judgment as a High finding linked to the check.
94. **[REQ-094]** WHEN a spec or plan is published THEN the core SHALL validate it (spec: EARS form, unique ascending IDs, traceability rows match requirements; plan: each task has requirement, files, test and expected result, every P1 requirement covered by a task and a check, every check has a proof, every run proof names an existing run group, every modified path exists) and, while validation fails, SHALL keep the human approve command unavailable, show each problem in the document viewer and return the problems to the publishing role as a correction.
95. **[REQ-095]** WHEN a CLI structured stream does not report waiting for approval or turn completion THEN the system SHALL derive those states from the secondary signal recorded in that CLI capability contract (per-invocation hook settings, notify command, OSC 7501 or window title), record only the event type and time, never prompt, command or output content, and SHALL NOT edit user configuration files.
96. **[REQ-096]** WHEN a feature that is not on screen starts waiting for the user or finishes a turn THEN the system SHALL raise a desktop notification and a distinct sound per kind (each switchable in Settings), show the waiting and finished counts in the window title and taskbar badge, and list unread events in a bell menu at the right of the topbar whose items open the feature and mark it read; the same feature SHALL NOT alert again for the same reason within 15 seconds.
97. **[REQ-097]** WHEN a Git target is bound THEN the system SHALL propose git-ignored local files to copy into new feature worktrees (defaulting to `.env*` at the repository root), require human confirmation stored per target repository, copy only confirmed files that are git-ignored and inside the repository when a worktree is created, and never include them in feature commits or the integration merge.
98. **[REQ-098]** WHEN two active features of the same target repository change the same file THEN the system SHALL mark the overlapping files in both features (Git panel and feature context) and repeat the warning before final approval, without blocking integration; merge conflicts stay governed by REQ-026 and REQ-050.
99. **[REQ-099]** WHEN the user quits while owned agent turns or managed commands are running THEN the system SHALL list them and require confirmation before the graceful stop of REQ-034; cancelling SHALL keep the application open and the work running.
100. **[REQ-100]** WHEN the Implementer delegates a subtask through the Forja MCP THEN the system SHALL run it with a configured agent CLI sequentially in the same feature worktree while the Implementer turn waits, allow at most three subtasks per Implementer turn and one level (a subtask SHALL NOT delegate), apply the Implementer restrictions without approvals or its own commit (the REQ-025 turn commit includes the subtask delta), and show each subtask with its CLI, state and result under the Implementer turn.
101. **[REQ-101]** WHEN the skills catalog is loaded or refreshed THEN the system SHALL also read, read-only, the native skill folders of the supported CLIs (`~/.claude/skills`, `~/.codex/skills`, `~/.agents/skills` and the project `.agents/skills`), mark each skill with its origin, keep the configured folder first on name collisions and let any role use any listed skill without copying or installing it.
102. **[REQ-102]** WHEN plan usage is enabled for a tool in Settings (off by default, showing the file read and the endpoint called before enabling) THEN the system SHALL read that CLI stored login read-only and only in memory to query its usage endpoint (agy through its own `/quota` command), never write, copy, cache, log or refresh credentials, and show an expired login as an action to sign in again; a disabled or failing tool SHALL show usage as unavailable (REQ-082).
103. **[REQ-103]** WHEN the user opens a feature, document, Settings, Archived, a New chat or skill authoring THEN the system SHALL show it as a tab in the single editor tab strip; every `+` SHALL open a new New chat tab with its own draft and agent; Ctrl+W SHALL close the active tab, do nothing without tabs and never close the application.
104. **[REQ-104]** WHEN the user saves another language in Settings › General (English by default, Português second) THEN the system SHALL apply it to the interface without restarting or losing open tabs and remember it for the next launch.
105. **[REQ-105]** WHEN a project is open THEN the right panel SHALL resize from its sash within 200 to 480 px (default 260 px, double click resets, size remembered) and stack Project and Branches sections (REQ-086), plus Explorer and Changes when their feature flags are on (REQ-106).
106. **[REQ-106]** WHEN a feature is not ready for the functional MVP THEN its interface SHALL be gated by a single typed feature flag registry that turns it off in production builds and on in development and mock builds; a disabled feature SHALL not render at all (not merely hidden), and its tests SHALL cover both states.
107. **[REQ-107]** WHEN the user opens a New chat THEN the conversation SHALL be with the Ferreiro, the general agent for discussion outside the RPI flow; the Ferreiro SHALL start a feature (handing the request to Research) only after the user confirms, and RPI agents SHALL NOT do work outside their role (REQ-022).
108. **[REQ-108]** WHEN the user requests a feature conversation summary THEN the Ferreiro SHALL produce it in a tool-less turn, the system SHALL store it with its date and author, and its usage SHALL be recorded per turn (REQ-060).
109. **[REQ-109]** WHEN the Ferreiro proposes a skill or memory THEN the system SHALL show the exact content (or diff for an existing file) as a draft and create or change the file in the configured folder only after the user confirms; nothing SHALL be written without that confirmation.
110. **[REQ-110]** WHEN agents are shown THEN the system SHALL use each agent's display name, editable in Settings › Agents, defaulting to Ferreiro, Minerador, Moldador, Bigorneiro, Temperador and Polidor in Portuguese and Smith, Miner, Moldmaker, Anvilsmith, Temperer and Polisher in English, with the fixed role in the tooltip and accessible name.
111. **[REQ-111]** WHEN the Explorer flag is on and a project is open THEN the core SHALL provide the project file tree with bounded depth and size, folders first, git-ignored entries dimmed and no file contents read, and the Explorer section SHALL show it with git status letters and folder change dots (REQ-112).
112. **[REQ-112]** WHEN the source control flag is on THEN the core SHALL report the working tree changes of the feature worktree (or the opened repository) with git short status (modified, untracked, added, deleted), and the Changes section SHALL list them with file name, folder and status letter.
113. **[REQ-113]** WHEN the source control flag is on THEN the statusbar SHALL show the commits behind and ahead of the branch upstream (or the feature base) with tooltips naming the base, refreshed after turns and Git operations, and show only the branch when no upstream exists.
114. **[REQ-114]** WHEN new agent avatars are evaluated THEN the system SHALL present minimal faces in a minimal style (a rounded square in the agent color with two eyes that move while it speaks, and a distinct anvil-and-hammer mark for the Ferreiro, keeping the tool corner badge) first as a Stitch layout and a styleguide preview beside the current mascots, and SHALL replace REQ-089 mascots in the app only after the user approves the preview.
115. **[REQ-115]** WHEN a feature appears in the Features section or as a tab THEN the system SHALL show its state as a distinct glyph in the state color instead of a dot: an animated spinner while working (static under reduced motion), `‖` waiting for the user, `✔` done, `●` idle, `↻` interrupted, `✗` failed and `×` ended, each with its state name in the accessible name and tooltip.
116. **[REQ-116]** WHEN the Explorer or Changes flag is on and the user activates a file THEN the system SHALL open it in an editor tab: an Explorer file as a read-only preview with line numbers and syntax coloring, and a changed file as a side-by-side diff of the base and working versions with added and removed lines highlighted (a deleted file shows only the base, an untracked file only the working version); content comes from `WorkbenchSource` and binary or oversized files show a notice instead of content.
117. **[REQ-117]** WHEN the `backlog-board` flag is on and the user opens Backlog from the sidebar (below the plan usage panel, above Archived) THEN the system SHALL open a Backlog tab listing demands not yet started with title, description and creation date, let the user add, edit and remove a demand, and start a demand by confirming its hand-off to Research, which turns it into a feature.
118. **[REQ-118]** WHEN the `backlog-board` flag is on and the user opens Board from the sidebar THEN the system SHALL open a Board tab with the columns Backlog, Research, Plan, Implement, Testing, Review and Done, placing each demand and non-archived feature by its stage (Done for integrated features) as a card with name, current agent tool icon and status glyph (REQ-115); cards SHALL open their feature or demand and SHALL NOT be dragged between stages, which only approvals and hand-offs change (REQ-009).
119. **[REQ-119]** WHEN a project is open THEN the first sidebar section SHALL be titled Chats (in both languages) instead of Features and list every non-archived conversation started with an agent, whether a feature, a bug or a Ferreiro chat; a Ferreiro chat SHALL appear after its first sent message, named from that prompt and marked with the Ferreiro avatar, and closing its tab SHALL NOT remove it; ordering, status glyphs (REQ-115) and row actions follow REQ-083.

### P2 (Should Have)

None. Do not add unapproved scope to make a task appear complete.

### P3 (Nice to Have)

None in this delivery; deferred items are explicit below.

## Edge Cases

- Missing Git: Research/Planner and artifacts work in any opened folder when the feature has no Git target; artifacts then live in the opened folder. Implementation waits for an explicit valid target, base branch and confirmed repository gates. A feature targets one repository in this MVP. Binding a Git target to a feature that already has artifacts moves them into the new worktree as its first owned commit, verifies identical bytes and keeps only approvals whose hashes still match.
- External edits: missing, malformed, moved or modified documents invalidate dependent work and produce actionable reconciliation, never silent approval/import. Unknown sections and comments survive updates. Repeating a publish with identical bytes is idempotent.
- Races: stale approval, second window, concurrent click, manual shell edit or changed destination HEAD must be detected before spawning or integrating. Use feature leases and transactional compare-and-swap state revisions.
- CLI uncertainty: availability, auth, resume and shell/MCP control are external assumptions until the capability spike and live tests. No accepted CLI may silently downgrade to uncontrolled execution. A failed adapter does not prevent independent web/core work, but the five-adapter MVP is incomplete until resolved.
- Skill symlinks: allow explicit roots and symlinked skill directories, resolve canonical paths, avoid cycles and unbounded recursive scans, never read arbitrary sibling secrets. Distinguish catalog availability from native CLI skill expansion.
- Output: bound line/chunk size and retained memory, preserve ordering and stderr identity, show truncation, clean invalid UTF-8/ANSI safely; never interpret terminal output as HTML or permit clipboard escape writes silently.
- Foreground stop: wait for the process group; escalate after a timeout; do not start a replacement while termination is unconfirmed. Background servers are explicitly independent, not accidental orphaned foreground commands.
- Exit/restart: stop owned children on normal app exit. On crash/restart do not signal a saved PID without validating identity; show interrupted records and investigate stale ownership safely. Live shell contents/processes cannot be reconstructed from a database record.
- Approval vs handoff: three automatic rounds share one feature budget; toggles do not authorize spec/plan/final approval, integration or push. Manual continuation is recorded and does not erase history. A Tester-added failing test is not committed on its own; it stays in the worktree and is committed with the Implementer's validated correction.
- Agent-chosen commands are diagnostics, never validation evidence. Only the confirmed repository gates, executed by core on the current fingerprint, count as pass/fail. Missing or skipped gates are failures, not passes.
- Review artifacts are written after testing; excluding RPI artifact paths from the code fingerprint keeps that write from staling the evidence it describes.
- Integration: a moved destination since the feature base is normal for a merge; only a destination HEAD that moved after final approval pauses. The merge result must pass the confirmed gates before the destination ref changes.
- Settings are global agent defaults for the MVP, with each turn storing a snapshot. Changing target repo/base after the feature worktree exists is blocked until the feature is explicitly stopped and rebound; never silently repoint a live worktree.
- Stalled CLI: an unresponsive turn keeps its lease until the user stops it and termination is confirmed; the inactivity window never kills a process by itself.
- Terminal states: integrated and abandoned features are read-only. Cleanup removes only resources recorded as owned by that feature, never a branch with commits that are not contained in the destination unless the user confirms that exact loss.
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
9. File watchers improve responsiveness; hash/revision validation in core dispatch and approval transactions is authoritative. Bind implementation/test/review to an exact commit plus tracked and relevant untracked worktree content, not a weak `git status` string, excluding the RPI artifact paths. Manual mutations during review invalidate its result. The implementation stage has no human approval: its gate is the confirmed repository gates passing on a committed fingerprint.
10. Git branches/worktrees are created only in a user-selected repository, when the feature is bound to it, so every artifact and code change lands on the feature branch. Default to a collision-safe `feature/<slug>` branch and a managed worktree outside the destination working tree; inspect existing worktree conventions before selecting the actual location. Record the selected base branch/commit explicitly. Never assume main from its spelling. Integration preserves the destination worktree and stops on dirty state or conflicts.
11. Use a prepared integration request bound to source commit, target branch and HEAD. Final approval and integration are one human action. Integration is a two-parent merge in an owned integration worktree after approval; run the confirmed gates on the merge result, then recheck destination identity and cleanliness before updating it. The merge strategy is fixed to `--no-ff` in the MVP. Push and worktree removal are separate explicit operations. No auto-rebase, reset, stash or conflict resolution.
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
| 15 | Implementation gate (2026-10-31) | Remove the human implementation approval; the gate is confirmed repository gates green on a committed fingerprint | A human gate before testing made every correction stale it, so the REQ-021 loop could never run unattended. |
| 16 | Artifact location (2026-10-31) | Feature worktree when the target is Git, created at binding; opened folder otherwise | Artifacts in the destination tree made it dirty and blocked integration, and specs never reached repository history. |
| 17 | Validation authority (2026-10-31) | Core detects gates and test patterns, the human confirms them per repository, core runs them | Agent-chosen commands could report success without testing anything. |
| 18 | Integration validation (2026-10-31) | Merge in the integration worktree, run gates on the result, pause only if destination HEAD moved after approval | Feature-branch tests do not cover the merged code when the destination advanced. |
| 19 | Human gates (2026-10-31) | Spec, plan, final approval with integration, push | Final completion and integration were redundant clicks. |
| 20 | Tester role (2026-10-31) | Adds or edits test files only and reports gaps; core runs the gates | Keeps production code with Implementer while giving the Tester a role a script cannot do. |
| 21 | Findings (2026-10-31) | Human may waive a blocking finding with a reason; Critical needs extra confirmation | A wrong Reviewer finding would otherwise block a feature forever. |
| 22 | Handoffs (2026-10-31) | Tester/Reviewer to Implementer, Implementer to Planner, Planner to Research | Backward moves are explicit and invalidate downstream approvals. |
| 23 | Feature end (2026-10-31) | Integrated and abandoned read-only states; cleanup offered, never implicit | Avoids orphaned features and accidental branch loss. |
| 24 | Stalled turns and usage (2026-10-31) | 10-minute inactivity flag with forced stop; show CLI-reported usage without caps | A hung CLI held the feature lease forever; paid CLIs had no visibility. |
| 25 | Defaults (2026-10-31) | Interrupt stays the busy-agent default; agent proposes Conventional Commits messages validated by core; `--no-ff` merge fixed | Confirmed during the business-rule review. |
| 26 | Mock screens first (2026-10-31) | Six frontend-only navigable screens (01a to 01f) run in the renderer on a swappable `WorkbenchSource` mock and become the base of slices 04, 09, 10 and 11 | Validates the real UI flow before core wiring without throwaway prototypes. |
| 27 | Mock behavior (2026-10-31) | Scripted streamed replies with interrupt; two mock projects (`acme-api` fresh, `dev` with two features); system language | Exercises states that static samples cannot show. |
| 28 | Navigation (2026-10-31) | Project history opens in the centered command bar (topbar search, Ctrl+Shift+P, Ctrl+R, sidebar header), never as a sidebar dropdown; the home offers only New conversation, not New spec | User decision on the Stitch project menu and home actions. |
| 29 | Extra mock actions (2026-10-31) | Settings screen, document tabs with excerpt review, shell shortcuts (terminal toggle, back/forward, panel collapse), recipient by sidebar or @mention, View request highlight, terminal add/stop | Selected by the user from the actions available in the approved screens. |
| 30 | Workbench improvements of 2026-11-01 | Adopt fallback status signals, attention notifications with a topbar bell, confirmed `.env*` copies into worktrees, overlap warnings, quit confirmation, sequential Implementer subtasks (max 3, one level), native CLI skill folders and opt-in plan usage on the AIBar model (REQ-095 to REQ-102; REQ-015 amended) | User decisions on 2026-11-01; agents keep stopping on quit (REQ-034) instead of a resident holder. |
| 31 | UI changes of 2026-10-31/11-01 | The current interface wins: REQ-062, 068, 071, 072, 076, 081, 082, 083 and 086 rewritten; REQ-103 to REQ-106 added; Explorer and source control become flagged future features (REQ-111 to REQ-113) | User decision 2026-11-01; the functional MVP ships without the flagged features. |
| 32 | General agent | Add the Ferreiro (New chat, summaries, confirmed skill and memory drafts); RPI agents stay specialists; backlog demands and custom agents are future work | Nothing is created without the user. |
| 33 | Agent names | Ferreiro, Minerador, Moldador, Bigorneiro, Temperador, Polidor (en: Smith, Miner, Moldmaker, Anvilsmith, Temperer, Polisher), user-editable, role in tooltip | User choice 2026-11-01. |
| 34 | Mascots | Trial minimal faces through Stitch and the styleguide before replacing REQ-089 | The user wants to see them before deciding. |
| 35 | Status, previews and board | Clear animated status glyphs; file preview and side-by-side diff behind the Explorer and source control flags; Backlog and Board pages as tabs behind a new `backlog-board` flag, opened from the sidebar below the usage panel (REQ-115 to REQ-118) | User request on 2026-11-01; backlog persistence does not exist in core yet, so both pages stay flagged until it does. |
| 36 | Section name | Rename Features to Chats (same word in English and Portuguese) and list Ferreiro chats after their first message (REQ-119) | Matches the New chat button, avoids the CLI session meaning of sessions, and covers features, bugs and backlog conversations. |

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
| REQ-009 | Guided RPI with machine-validated implementation | P1 | Approved; not implemented |
| REQ-010 | Authoritative gates | P1 | Approved; not implemented |
| REQ-011 | Approval invalidation | P1 | Approved; not implemented |
| REQ-012 | JSON workflow state | P1 | Approved; not implemented |
| REQ-013 | Artifact placement | P1 | Approved; not implemented |
| REQ-014 | Six agent profiles with editable names | P1 | Revised 2026-11-01; see the UI specs |
| REQ-015 | Five CLI adapters | P1 | Approved; not implemented |
| REQ-016 | Agent settings | P1 | Approved; not implemented |
| REQ-017 | Skills catalog with confirmed writes | P1 | Revised 2026-11-01; see the UI specs |
| REQ-018 | Normalized CLI events | P1 | Approved; not implemented |
| REQ-019 | Controlled execution compatibility | P1 | Approved; not implemented |
| REQ-020 | Linked handoffs | P1 | Approved; not implemented |
| REQ-021 | Bounded automatic correction loop | P1 | Approved; not implemented |
| REQ-022 | Role boundaries | P1 | Approved; not implemented |
| REQ-023 | Resume capability | P1 | Approved; not implemented |
| REQ-024 | Feature worktrees from binding | P1 | Approved; not implemented |
| REQ-025 | Feature commits | P1 | Approved; not implemented |
| REQ-026 | Final approval with tested merge | P1 | Approved; not implemented |
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
| REQ-055 | Repository gates | P1 | Approved 2026-10-31; not implemented |
| REQ-056 | Handoff matrix | P1 | Approved 2026-10-31; not implemented |
| REQ-057 | Finding waivers | P1 | Approved 2026-10-31; not implemented |
| REQ-058 | Feature end states | P1 | Approved 2026-10-31; not implemented |
| REQ-059 | Stalled turns | P1 | Approved 2026-10-31; not implemented |
| REQ-060 | Usage visibility | P1 | Approved 2026-10-31; not implemented |
| REQ-061 | Swappable mock source | P1 | Approved 2026-10-31; not implemented |
| REQ-062 | Framed workbench shell | P1 | Revised 2026-11-01; see the UI specs |
| REQ-063 | Project home | P1 | Approved 2026-10-31; not implemented |
| REQ-064 | Command bar | P1 | Approved 2026-10-31; not implemented |
| REQ-065 | Recent projects in command bar | P1 | Approved 2026-10-31; not implemented |
| REQ-066 | Centered composer | P1 | Approved 2026-10-31; not implemented |
| REQ-067 | First prompt creates feature | P1 | Approved 2026-10-31; not implemented |
| REQ-068 | Feature conversation layout | P1 | Revised 2026-11-01; see the UI specs |
| REQ-069 | Scripted mock replies | P1 | Approved 2026-10-31; not implemented |
| REQ-070 | Mock terminals | P1 | Approved 2026-10-31; not implemented |
| REQ-071 | Closable tabs keep agents running | P1 | Revised 2026-11-01; see the UI specs |
| REQ-072 | Shell toggles and history | P1 | Revised 2026-11-01; see the UI specs |
| REQ-073 | Sidebar entry points | P1 | Approved 2026-10-31; not implemented |
| REQ-074 | Recipient by sidebar or mention | P1 | Approved 2026-10-31; not implemented |
| REQ-075 | Conversation and terminal extras | P1 | Approved 2026-10-31; not implemented |
| REQ-076 | Settings entry points | P1 | Revised 2026-11-01; see the UI specs |
| REQ-077 | Settings form with manual save | P1 | Approved 2026-10-31; not implemented |
| REQ-078 | Document tabs | P1 | Approved 2026-10-31; not implemented |
| REQ-079 | Excerpt review | P1 | Approved 2026-10-31; not implemented |
| REQ-080 | Rich mock conversation content | P1 | Approved 2026-10-31; not implemented |
| REQ-081 | Sidebar footer menu | P1 | Revised 2026-11-01; see the UI specs |
| REQ-082 | Plan usage panel in the sidebar | P1 | Revised 2026-11-01; see the UI specs |
| REQ-083 | Features section | P1 | Revised 2026-11-01; see the UI specs |
| REQ-084 | Linked specs and plans | P1 | Approved 2026-10-31; not implemented |
| REQ-085 | Skills and memories with scope | P1 | Approved 2026-10-31; not implemented |
| REQ-086 | VS Code style panes | P1 | Revised 2026-11-01; see the UI specs |
| REQ-087 | Archive and restore | P1 | Approved 2026-10-31; not implemented |
| REQ-088 | Tool icons in the feature cycle and tab | P1 | Approved 2026-10-31; not implemented |
| REQ-089 | Agent mascots with tool badge | P1 | Approved 2026-10-31; not implemented |
| REQ-090 | Gray surface for agent replies | P1 | Approved 2026-10-31; not implemented |
| REQ-091 | Grounded cross-feature lessons | P1 | Approved 2026-10-31; not implemented |
| REQ-092 | Checks with proofs at the committed fingerprint | P1 | Approved 2026-10-31; not implemented |
| REQ-093 | Verifier judgment per check | P1 | Approved 2026-10-31; not implemented |
| REQ-094 | Spec and plan validators block approval | P1 | Approved 2026-10-31; not implemented |
| REQ-095 | Fallback agent status signals | P1 | Approved 2026-11-01; not implemented |
| REQ-096 | Attention notifications and bell | P1 | Approved 2026-11-01; not implemented |
| REQ-097 | Ignored local files copied into worktrees | P1 | Approved 2026-11-01; not implemented |
| REQ-098 | Cross-feature file overlap warning | P1 | Approved 2026-11-01; not implemented |
| REQ-099 | Quit confirmation with running work | P1 | Approved 2026-11-01; not implemented |
| REQ-100 | Sequential Implementer subtasks | P1 | Approved 2026-11-01; not implemented |
| REQ-101 | Native CLI skill folders in the catalog | P1 | Approved 2026-11-01; not implemented |
| REQ-102 | Opt-in plan usage from stored CLI logins | P1 | Approved 2026-11-01; not implemented |
| REQ-103 | Every page opens as a tab | P1 | Approved 2026-11-01; not implemented |
| REQ-104 | Live language switch | P1 | Approved 2026-11-01; not implemented |
| REQ-105 | Resizable right panel | P1 | Approved 2026-11-01; not implemented |
| REQ-106 | Feature flags for unfinished features | P1 | Approved 2026-11-01; not implemented |
| REQ-107 | Ferreiro general chat | P1 | Approved 2026-11-01; not implemented |
| REQ-108 | Conversation summary by the Ferreiro | P1 | Approved 2026-11-01; not implemented |
| REQ-109 | Skill and memory drafts by the Ferreiro | P1 | Approved 2026-11-01; not implemented |
| REQ-110 | Agent display names | P1 | Approved 2026-11-01; not implemented |
| REQ-111 | Project Explorer | P1 | Approved 2026-11-01; not implemented |
| REQ-112 | Source control changes | P1 | Approved 2026-11-01; not implemented |
| REQ-113 | Branch sync status | P1 | Approved 2026-11-01; not implemented |
| REQ-114 | Minimal agent faces trial | P1 | Approved 2026-11-01; not implemented |
| REQ-115 | Clear animated feature status glyphs | P1 | Approved 2026-11-01; not implemented |
| REQ-116 | File preview and change diff | P1 | Approved 2026-11-01; not implemented |
| REQ-117 | Backlog page | P1 | Approved 2026-11-01; not implemented |
| REQ-118 | RPI board page | P1 | Approved 2026-11-01; not implemented |
| REQ-119 | Chats section for every agent conversation | P1 | Approved 2026-11-01; not implemented |

## Implementation Sequence

See [the ordered plan index](../../plans/README.md). Each child spec is an approved derived slice of this scope, not a new independent product decision. The website and component plan is first; the CLI capability probe is second and must precede controlled runtime integration.
