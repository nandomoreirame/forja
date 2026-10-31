# Spec: Bilingual Web Foundation, Landing and Component Styleguide

## Problem Statement

Deliver site/ with the bilingual landing and visible component gallery, sharing real customized shadcn/Tailwind components with the future desktop UI.

## Goals

- Four localized routes build and refresh correctly.
- The landing and gallery reuse real shared customized shadcn/Tailwind components.
- Product mock text, metadata and focus/keyboard behavior match each locale.
- Visual comparisons respect approved anatomy and recorded Stitch exceptions. No deployment or Electron/native calls.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

This slice derives from the [approved functional MVP](../functional-mvp/SPEC.md). Read that full spec, especially ownership, approval and lifecycle rules, before implementing. The user approved generation of these plans on 2026-10-30. Do not treat this planning approval as permission to start production implementation.

## Verified Claims

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

1. **[REQ-038]** WHEN the web site opens / or /pt-br THEN the system SHALL render the approved English-default or Brazilian Portuguese landing with localized metadata, navigation and truthful in-development messaging and GitHub development CTA.
2. **[REQ-039]** WHEN the first UI delivery is built THEN the system SHALL deliver the landing and styleguide together under site/, with /styleguide and /pt-br/styleguide using local deterministic mocks, independently of Electron.
3. **[REQ-040]** WHEN site or desktop UI is implemented THEN the system SHALL consume the same customized shadcn/ui primitives, shared browser-only compositions and Tailwind semantic tokens instead of duplicated controls or imports from site internals.
4. **[REQ-041]** WHEN a landing or gallery locale changes THEN the system SHALL localize agent names, states, messages, tabs, composer labels and previews while preserving commands, paths, tool names and identifiers.
5. **[REQ-042]** WHEN a locale link is followed or a route is refreshed THEN the system SHALL preserve the corresponding landing/styleguide page, default to English without automatic browser-language redirects and provide correct lang/title/description per route.
6. **[REQ-043]** WHEN a functional screen is implemented THEN the system SHALL reuse approved component anatomy and recorded user exceptions, compare deterministic captures at matching viewports and fix drift before accepting the screen.
7. **[REQ-044]** WHEN site/gallery components render THEN the system SHALL use no Electron, native filesystem, PTY, Git, MCP or AI side effects and expose meaningful default, hover, keyboard focus, disabled, loading, empty and error states.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

Inherit the parent spec's complete edge-case list. The plan additionally enumerates focused negative checks for every task; success-path mocks alone do not satisfy this spec.

## Architecture Decisions

- Depends on: existing scaffold only.
- Follow the parent spec's exact boundaries and shared-module layout. Every UI task reuses the shared shadcn/Tailwind layer; every runtime task validates ownership in core.
- Follow [fidelity rules](../../design/forja-2.0/component-fidelity.md); site screenshots and example copy are not authority to add behavior.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Slice scope | Derived from the approved parent spec and user decisions | Avoid repeating resolved questions. |
| 2 | Delivery order | Use the ordered plan index and explicit dependencies | Do not implement dependent features against missing APIs. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization; calling rpi-implement is a separate action.

## Out of Scope

All parent-spec exclusions apply. Unlisted integrations, visual redesign and shortcuts that bypass approvals are excluded.

## Test Strategy

Unit, integration, E2E and visual validation are specified in the [plan](../../plans/2026-10-30-web-foundation-landing-styleguide.md). Use real temporary resources for persistence/process/Git tests and deterministic mocks only for isolated web UI. Record live-CLI capabilities separately from fixture results.

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-038 | Bilingual landing | P1 | Approved; not implemented |
| REQ-039 | Standalone gallery | P1 | Approved; not implemented |
| REQ-040 | Shared shadcn components | P1 | Approved; not implemented |
| REQ-041 | Localized product mocks | P1 | Approved; not implemented |
| REQ-042 | Web locale routing | P1 | Approved; not implemented |
| REQ-043 | Visual fidelity | P1 | Approved; not implemented |
| REQ-044 | Mock isolation | P1 | Approved; not implemented |
