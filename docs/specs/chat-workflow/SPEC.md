# Spec: Forja 2.0 Chat Workflow

## Problem Statement

The Forja interface already works around chats: a New chat talks to the Ferreiro, an `@` mention hands one turn to another agent, the Chats section lists every conversation, and Backlog and Board pages exist behind a flag. The not-yet-implemented core specs and plans still describe a feature-centric model: a feature is the unit of work, the composer has a fixed recipient, backlog items are features in waiting, and integration happens on a single final approval. Building the core from those plans would contradict the interface and force a second rewrite. This spec replaces every core requirement that is not implemented yet with a chat-centric model, so the core can be built once against the interface that exists today.

## Goals

- Make the chat the unit of work in core, storage and IPC: one chat holds the whole history from the first idea to the merge of a reviewed worktree.
- Treat features, bugs, specs, plans, reviews, skills and memories as outputs of a chat, and backlog items as inputs from many sources.
- Let the Ferreiro orchestrate the flow: it talks to the user, proposes each step and hands turns to the RPI agents, while approvals advance phases automatically.
- Keep human control where it matters: spec and plan approval, manual acceptance before merge, and every Git operation that leaves the chat worktree.
- Replace the renderer mock `WorkbenchSource` with real core IPC without changing the screens.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

**Relationship to other specs.** `functional-mvp` stays as the history of the interface already delivered (REQ-061 to REQ-119 and the slices 01 to 01j). This spec supersedes every `functional-mvp` requirement that is not implemented. The former core slices with plans not started (02 to 17 of the old queue) were removed from the repository on 2026-11-01 and rewritten as the slices listed in Implementation Sequence; the delivered part of the former `terminal-panel-footer` is recorded in slice 13. Requirements carried over keep their intent and gain chat vocabulary; their origin is named in the traceability table.

**Vocabulary.**

| Term | Meaning |
| --- | --- |
| Chat | The unit of work: a conversation of one project with its phase, turns, links, outputs and, once implementation starts, its target repository, branch and worktree. |
| Phase | `talk` (Ferreiro only), `research`, `plan`, `implement`, `test`, `review`, `acceptance`, `done`, plus the terminal states `abandoned` and `archived`. |
| Agent of the phase | The agent that answers when a prompt has no `@` mention: Ferreiro in `talk`, Minerador in `research`, Moldador in `plan`, Bigorneiro in `implement`, Temperador in `test`, Polidor in `review`, Ferreiro in `acceptance`. |
| Turn | One prompt and the reply of one agent, with its tool, model, settings snapshot, usage and events. |
| Output | A durable result linked to the chat: feature or bug record, spec, plan, review, skill or memory draft, commit, merge. |
| Backlog item | An input with title, description, source (`manual`, `agent`, later connectors such as GitHub issues or Notion) and status (`open`, `linked`). |

### Design and technical sources

- Current interface: `src/renderer/src/pages/*`, `src/renderer/src/entities/feature/model/store.ts`, `src/renderer/src/shared/api/workbench-source.ts` (the contract the core must serve).
- Interface decisions: `docs/specs/functional-mvp/SPEC.md` Grilling Log rows 26 to 36 and `docs/specs/ui-quick-adjustments/SPEC.md` Grilling Log rows 1 to 7.
- Approved designs in the Stitch project `9281162402489678867` and `design/forja-2.0/component-fidelity.md`.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The renderer reads everything through `WorkbenchSource` | `src/renderer/src/shared/api/workbench-source.ts:1` | yes |
| A chat stage may be the Ferreiro (`smith`) or an RPI role | `src/renderer/src/shared/api/workbench-source.ts:5` | yes |
| Sending resolves the agent from the `@` mention, then a one-turn hand-off, then the chat stage | `src/renderer/src/entities/feature/model/store.ts` (`sendMessage`) | yes |
| Backlog items (title, description, creation date) live in the project snapshot | `src/renderer/src/shared/api/workbench-source.ts` (`Demand`) | yes |
| The core has a SQLite settings table and a health-only IPC schema | `src/core/database.ts:9`, `src/shared/contracts.ts:3` | yes |
| Five CLIs support controlled mode with a Forja MCP | n/a | assumption, verified by slice 02 |

## Requirements

### P1 (MVP)

**Projects and chats**

1. **[REQ-001]** WHEN a folder is opened THEN the system SHALL open or focus its own project window by canonical path, including non-Git folders such as `~/dev`.
2. **[REQ-002]** WHEN the user sends the first prompt of a New chat THEN the system SHALL create a chat with an immutable identity, a unique slug and a visible name derived from the prompt, in phase `talk` unless the prompt mentions an RPI agent, and persist the prompt as its first turn.
3. **[REQ-003]** WHEN chats are listed THEN the system SHALL return every non-archived chat of the project ordered by attention (waiting, running, then by last activity), with phase, state, agent of the phase, tool and outputs, whether or not its tab is open.
4. **[REQ-004]** WHEN a chat is renamed THEN the system SHALL change only its visible name, keeping its identity, slug, outputs and branch.
5. **[REQ-005]** WHEN the user archives a chat THEN the system SHALL hide it from Chats, tabs and the command bar without deleting files, archive its unlinked drafts, keep its outputs readable from Archived, and refuse while a turn of the chat is running.
6. **[REQ-006]** WHEN the user abandons a chat THEN the system SHALL require confirmation, stop its owned processes, move it to the read-only `abandoned` state and keep its branch and worktree until an explicit cleanup.

**Turns and agents**

7. **[REQ-007]** WHEN the user sends a prompt THEN the system SHALL hand the turn to the last agent mentioned with `@` outside code (by id, role, forge name in either language or the user's display name); without a mention, to a pending one-turn hand-off (such as Review with agent); otherwise to the agent of the phase. A mention SHALL apply to that turn only.
8. **[REQ-008]** WHEN a prompt targets a chat with a running turn THEN the system SHALL interrupt it and wait for the foreground process to end by default, or enqueue the prompt in order when interruption is disabled, never running two turns of one chat at once.
9. **[REQ-009]** WHEN several chats run THEN the system SHALL allow turns across chats concurrently while enforcing one turn per chat and separate session, process and Git ownership.
10. **[REQ-010]** WHEN an agent of an RPI phase receives a turn THEN the system SHALL restrict it to its role: Minerador publishes specs, Moldador publishes plans, Bigorneiro changes authorized code, Temperador adds or edits files matching the confirmed test patterns and reports gaps, Polidor publishes review findings; work outside the role SHALL be refused by core tools, not only by prompt text.
11. **[REQ-011]** WHEN the Ferreiro receives a turn THEN it SHALL run with read-only tools plus the Forja MCP tools for proposals (phase moves, backlog items, skill and memory drafts, summaries) and SHALL NOT write project files, run development commands or approve anything.
12. **[REQ-012]** WHEN a CLI produces output THEN the system SHALL normalize versioned structured events (session identity, text, tool activity, permissions, completion, errors, usage) and keep bounded diagnostic context.
13. **[REQ-013]** WHEN a turn emits no events for the configurable inactivity window (default 10 minutes) THEN the system SHALL mark it unresponsive, let the user wait or stop it, and release the chat lease only after the owned process group ends.
14. **[REQ-014]** WHEN an interrupted chat resumes THEN the system SHALL reuse the native CLI session of the same chat and agent when supported, and ask before rebuilding context in a new session otherwise.
15. **[REQ-015]** WHEN a CLI reports token or cost usage THEN the system SHALL record it per turn and per chat and show it; without a report it SHALL show usage as unavailable instead of estimating.
16. **[REQ-016]** WHEN agent settings change while a turn runs THEN the system SHALL apply them to later turns and keep the running turn's snapshot.

**Ferreiro orchestration and phases**

17. **[REQ-017]** WHEN a chat is in `talk` and the Ferreiro judges the scope clear THEN it SHALL publish a start proposal (problem, goal, linked backlog items) through the Forja MCP; the user approving the proposal SHALL move the chat to `research` and hand the next turn to the Minerador with the proposal as context.
18. **[REQ-018]** WHEN an artifact that closes a phase is approved (spec closes `research`, plan closes `plan`) or the core validates a phase result (gates green on the committed fingerprint closes `implement`; tests green with no open coverage gap closes `test`; a review round with no open blocking finding closes `review`) THEN the system SHALL advance the chat to the next phase automatically, record the transition in the chat history and start the next agent only when automatic hand-offs are enabled, otherwise show a Continue action.
19. **[REQ-019]** WHEN an agent asks to move work backwards THEN the system SHALL allow only Temperador or Polidor to Bigorneiro (correction), Bigorneiro to Moldador (infeasible plan) and Moldador to Minerador (ambiguous spec); moving back to `plan` or `research` SHALL invalidate later approvals and evidence.
20. **[REQ-020]** WHEN automatic hand-offs are enabled THEN the system SHALL run correction rounds from test or review back to implement and the following re-test and re-review without asking, stopping after three automatic corrections per chat until the user continues.
21. **[REQ-021]** WHEN the Ferreiro orchestrates THEN it SHALL announce each phase change, each automatic hand-off and each stop in the chat history as workflow events, with links to the artifact or result that caused it.
22. **[REQ-022]** WHEN the user asks for a chat summary THEN the Ferreiro SHALL produce it in a tool-less turn, and the system SHALL store it with date, author and usage.
23. **[REQ-023]** WHEN the Ferreiro proposes a skill or memory THEN the system SHALL show the exact content, or a diff for an existing file, and write it in the configured folder only after the user confirms.

**Outputs**

24. **[REQ-024]** WHEN a chat reaches `implement` THEN the system SHALL create its feature or bug output (kind chosen in the start proposal, editable before implementation), linked to the chat with the target repository, base, branch and commits.
25. **[REQ-025]** WHEN an agent publishes a spec, plan or review THEN the system SHALL write only that artifact type under the chat artifact root (the chat worktree when the target is a Git repository, otherwise the opened folder), honoring the root's optional `.claude/rpi-paths.json`, and link it to the chat as an output.
26. **[REQ-026]** WHEN a spec or plan is published THEN core SHALL validate it (spec: EARS form, unique ascending IDs, traceability rows match requirements; plan: each task has requirement, files, test and expected result; every P1 requirement covered by a task and a check with a well-formed proof) and reject an invalid artifact with the problems listed.
27. **[REQ-027]** WHEN an artifact or reviewed code changes THEN the system SHALL bind approvals and evidence to exact content hashes and dependency revisions, invalidate affected approvals and results, keep history and recheck at dispatch and approval time; RPI artifact paths SHALL be excluded from the code fingerprint.
28. **[REQ-028]** WHEN a tool or agent tries to mutate an approval THEN core SHALL reject it; only human-authorized core commands approve start proposals, specs, plans, merges, finding waivers and pushes.
29. **[REQ-029]** WHEN an artifact is written or changed outside Forja THEN the system SHALL publish atomically, keep unknown fields and history, reconcile filesystem changes and never approve imported, missing, stale or malformed artifacts silently.
30. **[REQ-030]** WHEN outputs are listed THEN the sidebar sections (Specs, Plans, Reviews, Skills, Memories) SHALL show each output with its chat as subtitle and highlight the outputs of the selected chat.

**Backlog**

31. **[REQ-031]** WHEN the user adds, edits or removes a backlog item on the Backlog page THEN the system SHALL persist it per project with title, description, source `manual`, creation date and status `open`.
32. **[REQ-032]** WHEN the Ferreiro proposes a backlog item during a chat THEN the system SHALL show it as a draft in the chat and create it with source `agent` and a link to the originating chat only after the user confirms.
33. **[REQ-033]** WHEN backlog items are attached to a New chat or inserted into an existing chat THEN the system SHALL add them to the chat context (title, description, source) for the next turn, link each item to the chat and move it to status `linked`, removing it from the active backlog while keeping it readable as history.
34. **[REQ-034]** WHEN backlog sources are read THEN the system SHALL accept items through one source interface so later connectors (GitHub issues, Notion) can add items with their origin URL, without connector code in this MVP.
35. **[REQ-035]** WHEN the Board opens THEN the system SHALL show open backlog items in the first column and every non-archived chat in the column of its phase (Research, Plan, Implement, Testing, Review, Acceptance, Done), leaving `talk` chats out; cards SHALL open the chat or the Backlog and SHALL NOT be draggable.

**Git and worktrees**

36. **[REQ-036]** WHEN a chat enters `implement` THEN the system SHALL require an explicit target repository and base branch, create or reuse one owned branch (default `feature/<slug>` or `fix/<slug>`) and a managed worktree outside the destination tree, and share it sequentially among the RPI agents.
37. **[REQ-037]** WHEN a Git target is bound THEN the system SHALL detect candidate validation commands and test-file patterns from the repository manifests, require the user to confirm them, store them per target repository and run them itself as the only authoritative validation evidence.
38. **[REQ-038]** WHEN a Git target is bound THEN the system SHALL propose git-ignored local files to copy into new worktrees (default `.env*` at the root), copy only confirmed git-ignored files inside the repository and never read or log their content.
39. **[REQ-039]** WHEN a Bigorneiro or Temperador turn ends with the confirmed gates passing THEN the system SHALL commit only the owned delta on the chat branch with an agent-proposed Conventional Commits message validated by core, preserving unrelated changes and index entries; failed or skipped gates SHALL NOT commit.
40. **[REQ-040]** WHEN two active chats of one repository change the same file THEN the system SHALL mark the overlap in both chats and repeat the warning before merge, without blocking.
41. **[REQ-041]** WHEN Git or file operations meet external changes THEN the system SHALL keep unrelated changes, fail safely on conflicts and ask for re-evaluation instead of resetting, deleting or including user work silently.

**Acceptance and merge**

42. **[REQ-042]** WHEN a chat leaves `review` THEN the system SHALL enter `acceptance`, start the confirmed preview command of the target repository as an owned background server (or open the configured preview artifact) from the chat worktree, show its address in the chat and keep it running until the user accepts, rejects or stops it.
43. **[REQ-043]** WHEN the user accepts after manual testing THEN the system SHALL bind the acceptance to the exact chat commit, destination branch and HEAD, merge with `--no-ff` in an owned integration worktree, run the confirmed gates on the merge result and move the destination only if they pass and its HEAD did not move since acceptance; the chat SHALL then move to `done`.
44. **[REQ-044]** WHEN the user rejects in acceptance THEN the system SHALL record the reason and return the chat to `implement` with the reason as context for the Bigorneiro.
45. **[REQ-045]** WHEN the merge policy setting is changed from its default (manual test and confirmation) to automatic THEN the system SHALL merge right after review closes, still running the gates on the merge result; the setting SHALL be per project and default to manual.
46. **[REQ-046]** WHEN a chat is done THEN the system SHALL offer explicit removal of its worktree and branch, removing only resources it owns and never a branch with commits missing from the destination without confirming that exact loss.
47. **[REQ-047]** WHEN review findings are produced THEN the system SHALL keep the RPI review format and round trail; only Polidor resolves findings, and open Critical or High findings without a human waiver (reason required, extra confirmation for Critical) SHALL block leaving `review`.

**Commands and terminals**

48. **[REQ-048]** WHEN an agent runs a development command THEN the system SHALL run it only through the scoped Forja MCP executor bound to the chat and its authorized directory, showing command, directory, live stdout and stderr, state and exit code.
49. **[REQ-049]** WHEN command output grows THEN the system SHALL stream and persist ordered bounded chunks with backpressure, configurable limits and explicit truncation notices.
50. **[REQ-050]** WHEN a server is launched in background mode THEN the system SHALL return an owned execution id and allow scoped log reads and stops independent of the turn.
51. **[REQ-051]** WHEN the user opens a terminal with `+` THEN the system SHALL start an independent PTY with the account's default shell in the chat worktree, target repository or opened folder, in that order.
52. **[REQ-052]** WHEN a turn is interrupted or the app exits THEN the system SHALL stop owned foreground process trees first, keep explicit background servers during turns, ask before quitting with running work, and stop every owned process on full exit.

**Project files and source control**

53. **[REQ-053]** WHEN the Explorer flag is on THEN core SHALL provide the project file tree with bounded depth and size, folders first and git-ignored entries marked, without reading file contents.
54. **[REQ-054]** WHEN the user opens a file preview or a diff THEN core SHALL read the file (or the base and working versions) only inside the project or chat worktree after canonical path checks, refuse git-ignored secret files such as `.env*`, report binary and oversized files instead of their content, and return text otherwise.
55. **[REQ-055]** WHEN the source control flag is on THEN core SHALL report the working tree changes of the chat worktree (or the opened repository) with git short status and the commits behind and ahead of the upstream or chat base.

**Settings, skills and usage**

56. **[REQ-056]** WHEN agent settings are opened THEN the system SHALL offer exactly six fixed agents (Ferreiro and the five RPI agents), each with an editable display name, CLI, optional model, supported effort, additional instructions, selected skills and the default-off automatic hand-off switch, persisted in SQLite.
57. **[REQ-057]** WHEN an agent CLI is configured THEN the system SHALL support claude, codex, opencode, agy and grok with verified version and capability records, reuse native authentication and never copy credentials or edit persistent user configuration.
58. **[REQ-058]** WHEN settings are opened or refreshed THEN the system SHALL detect executable, version and capabilities with bounded local probes, telling installation from authentication apart, and defer network calls to explicit smoke tests.
59. **[REQ-059]** WHEN the skills catalog loads THEN the system SHALL read `SKILL.md` files from the configured folder (default `~/.skills`) and the native CLI skill folders, read-only, marking each origin, handling symlinks safely and reporting malformed entries.
60. **[REQ-060]** WHEN plan usage is enabled for a tool (off by default, showing the file read and the endpoint called) THEN the system SHALL read that CLI's stored login read-only and in memory to query its usage, and return per window the used percentage, the reset time and the fetch time as structured values, never preformatted text.

**Attention and recovery**

61. **[REQ-061]** WHEN a chat that is not on screen starts waiting for the user or finishes a turn THEN the system SHALL raise a desktop notification and a distinct sound per kind (each switchable), show the counts in the window title and taskbar badge and list unread items in the topbar bell.
62. **[REQ-062]** WHEN a CLI stream does not report waiting or completion THEN the system SHALL derive them from the secondary signal recorded in that CLI's capability contract and record only the derived state.
63. **[REQ-063]** WHEN the application restarts THEN the system SHALL restore windows, tabs, chats, turns, outputs, backlog and valid approvals, and mark previously running turns and commands interrupted without restarting them.
64. **[REQ-064]** WHEN workflow state changes THEN the system SHALL persist versioned JSON and an event history in SQLite and expose scoped state through the Forja MCP, without creating runtime `STATE.md` files in the user project.

**Security and contracts**

65. **[REQ-065]** WHEN IPC or MCP receives input THEN the system SHALL validate schemas, project and chat ownership, canonical paths and tool grants, and never treat model-supplied ids or connector annotations as authorization.
66. **[REQ-066]** WHEN a CLI enters controlled mode THEN the system SHALL verify the Forja MCP attachment and effective native shell restrictions; tools without control SHALL stay unavailable instead of bypassing permissions.
67. **[REQ-067]** WHEN native configuration, skills, documents or backlog items enter context THEN the system SHALL treat their content as data under role and tool constraints, without editing user files.
68. **[REQ-068]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable message without secrets and a truthful failed state, never faking completion or weakening controls.
69. **[REQ-069]** WHEN the renderer starts in the desktop app THEN it SHALL read and write through an IPC-backed `WorkbenchSource` with the same contract as the mock, and a flagged screen SHALL turn on in production only when its core requirements pass their checks.
70. **[REQ-070]** WHEN the MVP is accepted THEN the system SHALL pass unit, integration and Electron end-to-end checks plus authenticated smoke checks for the five CLIs on Linux, without shipping an adapter falsely marked supported.

### P2 (Should Have)

None. Do not add unapproved scope to make a task appear complete.

### P3 (Nice to Have)

- Backlog connectors for GitHub issues and Notion through the REQ-034 source interface.
- Custom agents beyond the six fixed ones.

## Edge Cases

- A New chat whose first prompt mentions an RPI agent starts in that agent's phase only if the phase needs no prior approval (`research`); a mention of a later agent answers that turn but keeps the chat in `talk`.
- A backlog item linked to a chat that is later abandoned stays linked and readable; the user may reopen it as a new `open` item, which keeps the old link as history.
- Two chats linking the same backlog item: the second attach is refused while the first link is active.
- A start proposal edited by the user before approval is approved as edited; the hash of the approved version is the one bound to `research`.
- Automatic advance never skips a human gate: spec and plan need approval, acceptance needs the user (unless the merge policy is automatic), and a disabled automatic hand-off only stops at Continue.
- The preview server fails to start: the chat stays in `acceptance` with the failure and a retry; acceptance can still proceed if the user tests another way, recorded as such.
- Destination HEAD moved after acceptance: the merge pauses and asks to re-accept; moving before acceptance is normal.
- Missing Git target: `talk`, `research` and `plan` work in any folder with artifacts in the opened folder; `implement` waits for an explicit target.
- Mentions inside code blocks or inline code never change the agent; unknown `@names` are plain text.
- Restarted app with a chat in `acceptance`: the preview server is not restarted automatically; the chat shows a Start preview action.

## Architecture Decisions

1. Keep one npm package; core lives in `src/core/<slice>/`, IPC contracts in `src/shared/contracts/`, the renderer reads only through `WorkbenchSource`.
2. SQLite is the single core-owned writer: relational tables for projects, chats, turns, events, outputs, backlog items, approvals and executions; versioned JSON for workflow state; files remain the artifact content source.
3. The chat state machine is a pure module (`src/core/chats/phases.ts`) driven by events (approval, validation result, hand-off request, user command); every transition is a compare-and-swap on the chat revision.
4. The Ferreiro is an agent profile with its own CLI turn, a read-only tool grant and the proposal tools of the Forja MCP; orchestration logic (who answers, when to advance) is core code, not prompt text.
5. Forja MCP is a scoped loopback gateway with per-run credentials; tools are granted per agent role and chat.
6. Git operations run only in the chat worktree or the integration worktree; the destination working tree is never touched.
7. The preview for acceptance reuses the managed executor's background server ownership.
8. Backlog sources implement one interface (`listItems`, `importItem`) so connectors can be added without changing the backlog store.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Unit of work | The chat; features, bugs, specs, plans, reviews, skills and memories are its outputs | User decision 2026-11-01: everything about a demand stays in one chat history. |
| 2 | Agent of the turn | `@` mention for one turn, else the agent of the phase; no recipient selector | User decision 2026-11-01. |
| 3 | Rewrite scope | Replace the core specs and plans not yet implemented; keep the delivered interface specs | User decision 2026-11-01. |
| 4 | Entity | Chat is the core entity (tables, IPC, MCP) | User decision 2026-11-01. |
| 5 | Backlog | A separate input with title, description and source (manual, agent, future connectors); listed on the Backlog page and the first Board column; attachable to a New chat or an existing chat | User decision 2026-11-01. |
| 6 | Linked backlog item | Linked to the chat and removed from the active backlog, kept as history | User decision 2026-11-01. |
| 7 | Phase changes | Automatic after the approval or validation that closes a phase | User decision 2026-11-01. |
| 8 | Leaving talk | The Ferreiro proposes the start; the user approves the proposal; the Ferreiro orchestrates the whole flow | User decision 2026-11-01. |
| 9 | Merge | Default: manual test with a running preview and user confirmation; configurable to automatic per project | User decision 2026-11-01. |

## Constraints

- Planning artifacts in English; chat in pt-BR. Identifiers and slugs in English.
- No paid model calls or credentials in automated tests; live CLI checks are explicit acceptance steps.
- Preserve user changes and index; Git writes only in owned worktrees.
- Linux is the acceptance target.

## Out of Scope

| Item | Reason |
| --- | --- |
| Backlog connectors (GitHub, Notion) | Interface only in this MVP (REQ-034). |
| Custom agents | Six fixed agents cover the flow. |
| Push and deploy | Explicit future step after merge. |
| Team accounts, sync, billing | Local personal tool. |
| Windows and macOS certification | Linux first. |

## Test Strategy

- **Unit:** Vitest for the phase machine, turn agent resolution, backlog store, schemas, gates, hashes, process ownership.
- **Integration:** temporary SQLite databases, folders, Git repositories and worktrees, local MCP clients, subprocesses and PTYs; idempotence and tolerant round trips for every file writer.
- **E2E:** Electron checks for a chat from idea to merge with mocked CLIs, approvals and staleness, interrupt and queue, acceptance preview, restart.
- **Live CLI acceptance:** version, tool restriction proof, MCP calls, streaming, session resume and termination for claude, codex, opencode, agy and grok.

## Requirement Traceability

| ID | Name | Priority | Origin |
| --- | --- | --- | --- |
| REQ-001 | Project window per folder | P1 | functional-mvp REQ-001 |
| REQ-002 | Chat creation from the first prompt | P1 | functional-mvp REQ-002, REQ-067, REQ-107 |
| REQ-003 | Chat list | P1 | functional-mvp REQ-083, REQ-119 |
| REQ-004 | Chat rename | P1 | functional-mvp REQ-002 |
| REQ-005 | Chat archive | P1 | functional-mvp REQ-087 |
| REQ-006 | Chat abandon | P1 | functional-mvp REQ-058 |
| REQ-007 | Agent of the turn | P1 | functional-mvp REQ-005, REQ-074, REQ-079 |
| REQ-008 | Busy chat: interrupt or queue | P1 | functional-mvp REQ-006 |
| REQ-009 | Concurrent chats | P1 | functional-mvp REQ-007 |
| REQ-010 | Role restrictions | P1 | functional-mvp REQ-022 |
| REQ-011 | Ferreiro tool grant | P1 | functional-mvp REQ-107 |
| REQ-012 | Normalized CLI events | P1 | functional-mvp REQ-018 |
| REQ-013 | Unresponsive turns | P1 | functional-mvp REQ-059 |
| REQ-014 | Session resume | P1 | functional-mvp REQ-023 |
| REQ-015 | Usage per turn and chat | P1 | functional-mvp REQ-060 |
| REQ-016 | Settings snapshot per turn | P1 | functional-mvp REQ-053 |
| REQ-017 | Start proposal | P1 | new |
| REQ-018 | Automatic phase advance | P1 | functional-mvp REQ-009 (rewritten) |
| REQ-019 | Backward moves | P1 | functional-mvp REQ-056 |
| REQ-020 | Automatic corrections | P1 | functional-mvp REQ-021 |
| REQ-021 | Orchestration events | P1 | new |
| REQ-022 | Chat summary | P1 | functional-mvp REQ-108 |
| REQ-023 | Skill and memory drafts | P1 | functional-mvp REQ-109 |
| REQ-024 | Feature or bug output | P1 | new |
| REQ-025 | Artifact publication | P1 | functional-mvp REQ-013 |
| REQ-026 | Artifact validation | P1 | functional-mvp REQ-094 |
| REQ-027 | Hash-bound approvals | P1 | functional-mvp REQ-011 |
| REQ-028 | Human-only approvals | P1 | functional-mvp REQ-045 |
| REQ-029 | Atomic publication and reconciliation | P1 | functional-mvp REQ-037 |
| REQ-030 | Outputs in the sidebar | P1 | functional-mvp REQ-084 |
| REQ-031 | Manual backlog items | P1 | functional-mvp REQ-117 (rewritten) |
| REQ-032 | Backlog items from the Ferreiro | P1 | new |
| REQ-033 | Attaching backlog items | P1 | new |
| REQ-034 | Backlog source interface | P1 | new |
| REQ-035 | Board by phase | P1 | functional-mvp REQ-118 (rewritten) |
| REQ-036 | Chat branch and worktree | P1 | functional-mvp REQ-024 |
| REQ-037 | Confirmed repository gates | P1 | functional-mvp REQ-055 |
| REQ-038 | Local file copies | P1 | functional-mvp REQ-097 |
| REQ-039 | Gated commits | P1 | functional-mvp REQ-025 |
| REQ-040 | Overlap warnings | P1 | functional-mvp REQ-098 |
| REQ-041 | Safe Git with external changes | P1 | functional-mvp REQ-050 |
| REQ-042 | Acceptance preview | P1 | new |
| REQ-043 | Accepted merge | P1 | functional-mvp REQ-026 (rewritten) |
| REQ-044 | Acceptance rejection | P1 | new |
| REQ-045 | Merge policy | P1 | new |
| REQ-046 | Worktree cleanup | P1 | functional-mvp REQ-058 |
| REQ-047 | Review findings and waivers | P1 | functional-mvp REQ-027, REQ-057 |
| REQ-048 | Managed commands | P1 | functional-mvp REQ-028 |
| REQ-049 | Bounded output | P1 | functional-mvp REQ-029 |
| REQ-050 | Background servers | P1 | functional-mvp REQ-030 |
| REQ-051 | User terminals | P1 | functional-mvp REQ-031 |
| REQ-052 | Stop and quit | P1 | functional-mvp REQ-034, REQ-099 |
| REQ-053 | File tree | P1 | functional-mvp REQ-111 |
| REQ-054 | File preview and diff reads | P1 | functional-mvp REQ-116 (core side) |
| REQ-055 | Working tree status | P1 | functional-mvp REQ-112, REQ-113 |
| REQ-056 | Agent profiles | P1 | functional-mvp REQ-014, REQ-016, REQ-110 |
| REQ-057 | Supported CLIs | P1 | functional-mvp REQ-015 |
| REQ-058 | CLI detection | P1 | functional-mvp REQ-046 |
| REQ-059 | Skills catalog | P1 | functional-mvp REQ-017, REQ-101 |
| REQ-060 | Structured plan usage | P1 | functional-mvp REQ-102 |
| REQ-061 | Attention notifications | P1 | functional-mvp REQ-096 |
| REQ-062 | Derived waiting and completion | P1 | functional-mvp REQ-095 |
| REQ-063 | Restore after restart | P1 | functional-mvp REQ-008 |
| REQ-064 | Workflow state in SQLite | P1 | functional-mvp REQ-012 |
| REQ-065 | Input validation and ownership | P1 | functional-mvp REQ-048 |
| REQ-066 | Controlled mode | P1 | functional-mvp REQ-019 |
| REQ-067 | Context as data | P1 | functional-mvp REQ-051 |
| REQ-068 | Truthful failures | P1 | functional-mvp REQ-052 |
| REQ-069 | IPC-backed WorkbenchSource and flag release | P1 | functional-mvp REQ-061, REQ-106 |
| REQ-070 | MVP acceptance | P1 | functional-mvp REQ-049 |

## Implementation Sequence

| Slice | Covers | Depends on |
| --- | --- | --- |
| 02 `chat-core-store` | REQ-001 to REQ-006, REQ-031, REQ-033 (store side), REQ-063, REQ-064 | none |
| 03 `ipc-workbench-source` | REQ-065, REQ-069 | 02 |
| 04 `cli-capability-adapters` | REQ-012, REQ-057, REQ-058, REQ-062, REQ-066 | none |
| 05 `forja-mcp-gateway` | REQ-011 (grants), REQ-028, REQ-048 to REQ-050 | 02 |
| 06 `chat-turns` | REQ-007 to REQ-010, REQ-013 to REQ-016 | 03, 04, 05 |
| 07 `artifact-publication` | REQ-025 to REQ-027, REQ-029, REQ-030 | 02, 05 |
| 08 `ferreiro-orchestrator` | REQ-011, REQ-017, REQ-018, REQ-021 to REQ-023, REQ-032 | 06, 07 |
| 09 `chat-worktrees` | REQ-024, REQ-036 to REQ-041 | 02, 05 |
| 10 `test-review-loop` | REQ-019, REQ-020, REQ-047 | 08, 09 |
| 11 `acceptance-merge` | REQ-042 to REQ-046 | 09, 10 |
| 12 `backlog-board-core` | REQ-031 to REQ-035 | 02, 08 |
| 13 `terminals-runtime` | REQ-048 (command tabs), REQ-051, REQ-052, REQ-063 (transcripts) | 05 |
| 14 `project-files-source-control` | REQ-053 to REQ-055 | 02, 09 |
| 15 `settings-skills-usage` | REQ-056, REQ-059, REQ-060 | 02, 04 |
| 16 `attention-notifications` | REQ-061 | 06 |
| 17 `recovery-acceptance` | REQ-063, REQ-067, REQ-068, REQ-070 | all |
