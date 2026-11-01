# Spec: Loop Harness (lessons, proofs, verifier and validators)

## Problem Statement

Guided RPI (REQ-009, REQ-021) closes a feature on green repository gates and a review without open Critical/High findings. That leaves three gaps: what one feature learned never reaches the next one's Research and Planner; a green gate does not prove that a test for each requirement ran and asserted it; and spec/plan structure (EARS, requirement coverage, proofs) is checked only by the model that wrote it. This slice adds the "sensors" and the cross-feature memory that the Loop Engineering approach requires before any longer autonomous loop is considered.

## Goals

- Lessons grounded in real findings, promoted only across features, injected into Research and Planner.
- One check per P1 requirement, each with a proof the core runs on the committed fingerprint.
- Tester/Reviewer judge whether each check's test would fail if its claim were false.
- Core validators make the approve command unavailable for a malformed spec or plan.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

This slice derives from the [approved functional MVP](../functional-mvp/SPEC.md) and mirrors the personal framework's `rpi-loop-harness` (`~/.claude/docs/specs/rpi-loop-harness/SPEC.md`), which is piloted first on Forja's own features. Its pilot report gates the start of this slice's implementation. Ideas come from Waldemar Neto's "Loop Engineering" talk and the `tlc-spec-driven` skill (CC-BY-4.0; reimplemented, no code copied).

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| export function createDatabase(file: string): DatabaseSync { | `src/core/database.ts:3` | yes |
| CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); | `src/core/database.ts:9` | yes |
| Repository gates and Forja MCP lessons tools exist when this slice starts | n/a | assumption |

## Requirements

### P1 (MVP)

1. **[REQ-091]** WHEN a Reviewer publishes a round with zero open findings that closes a feature THEN the system SHALL accept lesson proposals through a scoped Forja MCP tool only when each cites a finding or failed proof of that feature (core-verified, never a model-supplied ID alone), deduplicate by normalized signal and text, count distinct features per project, promote a lesson to confirmed at two features and quarantine it after two penalties, persist lessons in SQLite and atomically publish a rendered `LESSONS.md` in the project's artifact root; confirmed lessons SHALL be injected into Research and Planner turn context as untrusted data (at most 20, filtered by the feature's area) and listed under Memories in the sidebar with their status, where the user can quarantine or restore one.
2. **[REQ-092]** WHEN a plan is published THEN it SHALL carry a Checks section with one check per P1 requirement and a proof per check (a named run group plus the words its passing line prints, or a lone command judged by exit code); WHEN the last Implementer task commits THEN the system SHALL run each run group and lone proof once, sequentially, through the managed executor on the committed fingerprint, store per-check PASS, FAIL or "no test ran" with the output tail, and block final approval unless every check passes at the reviewed commit.
3. **[REQ-093]** WHEN a Tester or Reviewer turn runs on a feature with checks THEN its instructions SHALL require, per check, a judgment of whether the selected test would fail if the claim were false, two throwaway examples outside the named cases, and a list of assertions looser than their criterion; the system SHALL reject a review publication missing a judgment for any check and SHALL record a "does not hold" judgment as a High finding linked to the check.
4. **[REQ-094]** WHEN a spec or plan is published THEN the core SHALL validate it (spec: EARS form, unique ascending IDs, traceability rows match requirements; plan: each task has requirement, files, test and expected result, every P1 requirement covered by a task and a check, every check has a proof, every run proof names an existing run group, every modified path exists) and, while validation fails, SHALL keep the human approve command unavailable, show each problem in the document viewer and return the problems to the publishing role as a correction.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- A plan published before this slice has no Checks: REQ-092 treats it as legacy (proofs skipped, shown as "no checks" in the reader) until the plan is republished.
- A proof that hangs keeps the managed executor's existing stop semantics (REQ-034); no new timeout.
- A lesson citing a finding from another feature or project is rejected (REQ-048).
- Two features closing at once count as two distinct features; promotion is computed in one SQLite transaction.
- Lesson text is model output: rendered as plain text, never as Markdown HTML or instructions.

## Architecture Decisions

- Depends on: guided-rpi-orchestration, artifact-approval-gates, document-review-reader, project-sidebar-navigator, and the framework pilot report (`rpi-loop-harness` REQ-013).
- `src/core/lessons/`, `src/core/proofs/` and `src/core/validators/` are core services with SQLite stores; the renderer only displays results.
- Lessons canonical in SQLite (REQ-012); `LESSONS.md` is a published RPI artifact, like specs and plans (user decision 2026-10-31).
- Validators are pure functions over Markdown text so the same code checks a published artifact and a fixture.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Lesson storage | SQLite canonical + rendered LESSONS.md artifact | User choice 2026-10-31 |
| 2 | Validator behavior | Block approval, return problems to the role | User choice 2026-10-31 (same as framework) |
| 3 | Order | After the framework pilot on Forja features | User asked to test in the personal framework first |
| 4 | Autonomous roadmap loop | Out of scope | Conflicts with decision 4 (guided mode); revisit after the pilot |

## Constraints

No scope beyond the listed requirements. No implementation, commits or paid API calls during planning. Implementation follows TDD and the repository's Git authorization.

## Out of Scope

Roadmap loop, scheduled no-side-effect loops, loop readiness check, ephemeral E2E per phase, usage budget as stop condition. All parent-spec exclusions apply.

## Test Strategy

Unit tests for lesson dedup/promotion/quarantine, proof line matching, and each validator rule; integration tests with real temporary SQLite and a temp Git repo for proof execution at a commit; renderer tests for the Memories lesson list and the disabled approve command with problems shown.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-091 | Grounded cross-feature lessons | P1 | Approved 2026-10-31; not implemented |
| REQ-092 | Checks with proofs at the committed fingerprint | P1 | Approved 2026-10-31; not implemented |
| REQ-093 | Verifier judgment per check | P1 | Approved 2026-10-31; not implemented |
| REQ-094 | Spec and plan validators block approval | P1 | Approved 2026-10-31; not implemented |
