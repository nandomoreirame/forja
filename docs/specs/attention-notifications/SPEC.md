# Spec: Attention Notifications

## Problem Statement

Several features run in parallel, but the user only learns that one is waiting for an approval or an answer, or has finished, by looking at its tab. Work stalls unnoticed while the user is in another feature or another application.

## Goals

- The user knows, without watching every tab, which features need them and which have finished.
- Alerts reach the user in the background (desktop notification, sound, window title and badge) and can be reviewed later from a bell menu.
- Alerts are rate-limited and switchable, so they never become noise.

## Context

**Product objective:** An opinionated AI agent development environment built around the RPI workflow, from specification to review, with you in control of every stage.

This slice derives from the [approved functional MVP](../functional-mvp/SPEC.md) and from the user decisions of 2026-11-01. Read the parent spec before implementing. The waiting and finished states come from the normalized agent events (REQ-018) and their fallback signals (REQ-095); this slice consumes them and owns no CLI integration.

## Verified Claims

| Claim | Source (file:line) | Verified |
| --- | --- | --- |
| The topbar accepts controls at its far right through an `end` slot | `src/widgets/workbench/ui/app-chrome.tsx` (`AppTopbarProps.end`) | yes |
| Feature tabs already distinguish hidden from stopped work | `src/renderer/src/entities/feature/model/store.ts` (`closeFeature`) | yes |
| Electron exposes desktop notifications and a taskbar badge from the main process | Electron `Notification`, `app.setBadgeCount` | assumption |

## Requirements

### P1 (MVP)

1. **[REQ-096]** WHEN a feature that is not on screen starts waiting for the user or finishes a turn THEN the system SHALL raise a desktop notification and a distinct sound per kind (each switchable in Settings), show the waiting and finished counts in the window title and taskbar badge, and list unread events in a bell menu at the right of the topbar whose items open the feature and mark it read; the same feature SHALL NOT alert again for the same reason within 15 seconds.
2. **[REQ-052]** WHEN a dependency, permission, port, process or file operation fails THEN the system SHALL show an actionable non-secret error and a truthful stopped/failed state without fabricating completion or automatically weakening controls.

### P2 (Should Have)

None.

### P3 (Nice to Have)

None.

## Edge Cases

- The feature on screen produces no alert; switching to it marks its unread events read.
- A feature that waits, resumes and waits again within 15 seconds alerts once; a different reason (waiting, then finished) alerts again.
- Notifications denied by the operating system or no audio device: the bell, title and badge still work and Settings shows the notification channel as unavailable instead of failing silently (REQ-052).
- Archived or abandoned features never alert; their unread events leave the bell.
- Notification text carries the feature name and the kind only, never prompt, command or output content.

## Architecture Decisions

- Depends on: cli-agent-sessions (normalized events and REQ-095 fallback signals), settings-screen (Settings layout).
- A pure attention model in the renderer derives events from feature state transitions (dedupe window, unread set, counts); the main process only renders the desktop notification, badge and window title through a validated IPC channel.
- Sounds are two short bundled tones (falling for waiting, rising for finished) played by the renderer; no external player.
- The bell reuses the shared Popover, Tooltip and status components and the Terminal Noir tokens.

## Grilling Log

| # | Decision | Resolution | Rationale |
| --- | --- | --- | --- |
| 1 | Channels | Desktop notification, sound, window title and badge counts, and a topbar bell listing unread events | User choice on 2026-11-01; the bell keeps a reviewable history the transient channels lack. |
| 2 | Jump shortcut | No Alt+N shortcut in this slice | Not selected by the user. |
| 3 | Rate limit | One alert per feature and reason every 15 seconds | Avoids noise during quick turns. |

## Constraints

No scope beyond the listed requirements. No implementation, commits, deployment or paid API calls during planning. During later implementation follow TDD and the repository's current Git authorization.

## Out of Scope

Phone or remote push, custom sound files, per-feature notification rules and a notification history beyond the unread list.

## Test Strategy

Unit tests for the attention model (dedupe, unread, counts), RTL tests for the bell and Settings switches, an IPC contract test for the main-process channel and a Playwright check that a background feature raises the bell count. See the [plan](../../plans/2026-11-01-attention-notifications.md).

## Requirement Traceability

| ID | Description | Priority | Status |
| --- | --- | --- | --- |
| REQ-096 | Attention notifications and bell | P1 | Approved 2026-11-01; not implemented |
| REQ-052 | Actionable failures | P1 | Approved; not implemented |
