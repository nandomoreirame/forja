---
feature: terminal-panel-footer
phase: plan-complete
started_at: 2026-10-30
approved_at: 2026-10-30
spec_path: docs/specs/terminal-panel-footer/SPEC.md
plan_path: docs/plans/2026-10-30-terminal-panel-footer.md
implementation_status: partial
validation_status: not-run
review_status: not-started
---

# Planning State

Derived from the user-approved functional MVP. Specification and implementation plan are saved. No production implementation, paid CLI calls, dependency installation or Git writes were performed by the planning run. Prerequisites: web-foundation-landing-styleguide, managed-command-runtime, feature-workbench-composer.

## Pulled forward (2026-10-31, user request during the mock screen batch)

Real user shells for the "+" terminal landed before this slice, in commits 32a2371, 0ce2c76 and 0f1a037:

- Task 1 (largely done): `src/core/terminals/pty-service.ts` resolves the account shell (`os.userInfo().shell`, then `$SHELL`, then `/bin/sh`, each checked executable), canonicalizes and validates the cwd (`~` expanded), strips `ELECTRON_*` and `NODE_OPTIONS` from the env, bounds sizes and input, and closes the process group. `src/main/terminals.ts` registers owner-checked IPC (main frame of an app window only; sessions closed when their window is destroyed and on app quit). node-pty is rebuilt for the Electron ABI by `postinstall` (`electron-rebuild -f -w node-pty`). Adaptation: the service runs in the Electron main process, not the core utility process, because output is routed to the owning `WebContents`; move it behind core when managed-command-runtime lands.
- Task 3 (manual shells only): `src/renderer/src/features/terminal/xterm-view.tsx` and `pty-sessions.ts` render live shells with xterm (fit addon, bounded transcript replayed on tab switch). App shortcuts are ignored while typing inside `.xterm`. Agent command tabs are still mock text, and the browser `dev:web` build keeps the mock shell because it has no desktop API.
- Evidence: `npm run test:desktop:pty` (real Electron, real shell: runs `echo forja-pty-$((6*7)) && pwd` in the project directory, Ctrl+R stays in the shell, the close icon ends the session), plus unit tests in `test/core/pty-service.test.ts`, `test/main/terminals.test.ts`, `test/renderer/pty-sessions.test.ts` and `test/renderer/pty-panel.test.tsx`.
- Still open in this slice: agent command tabs on xterm with input disabled, transcript persistence across restarts (Task 5), the shared process lifecycle for shutdown, and binding shells to feature worktrees once feature-git-worktrees exists (today the cwd is the feature destination).
