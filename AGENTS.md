# AGENTS.md

Forja is an Electron + React desktop app (plus a standalone `site/` Vite app) for the RPI workflow. Most AI integrations are still interfaces only. Scope of work is defined by `docs/plans/` and `docs/specs/`.

## Commands

- Requires Node 24+ (`node -v`). Use `npm`, the lockfile is `package-lock.json`.
- Gate order before reporting done: `npm run typecheck` -> `npm run lint` -> `npm test`. Add `npm run build` for Electron changes.
- Single test file: `npx vitest run test/core.test.ts`. Filter by name: `npx vitest run -t "name"`.
- Coverage: `npm run test:coverage` enforces 80% thresholds, but only on `src/shared/ui`, `src/shared/i18n`, `src/widgets`, and `site/src` (see `vitest.config.ts`).
- Dev: `npm run dev` (Electron), `npm run dev:web` (renderer in browser, no core), `npm run dev:site` (landing/gallery).
- `npm run format:check` covers only specific globs; run `npx prettier --write <file>` for other files. It currently reports 3 unformatted files in `src/shared/i18n/` (uncommitted work in progress; do not reformat them unless the task covers them).
- `npm run test:e2e:site` is broken: `site/playwright.config.ts` and `test/e2e/` do not exist yet. Do not treat it as a gate until they are added.

## Tests

- Default environment is jsdom with `test/setup.ts` (jest-dom, RTL cleanup).
- Node-only tests must declare `// @vitest-environment node` at the top (see `test/core.test.ts`, which uses SQLite).
- Tests live under `test/` (not colocated), with web tests in `test/web/`.
- Repo workflow is TDD (see `AGENTS.md` at the workspace root): write the failing test first, confirm it fails for the expected reason, then implement.

## Architecture

- `src/main/`: Electron window/app lifecycle. `src/preload/`: reserved; currently exposes no desktop APIs.
- `src/core/`: SQLite via `node:sqlite` (WAL, versioned SQL migrations) and AI adapter interfaces. Runs in a separate Electron utility process.
- `src/shared/`: Zod contracts shared by core and renderer (`contracts.ts`), and browser-only UI primitives (`ui/`), tokens (`styles/`), and locales (`i18n/`). Shared code must stay browser-only and free of side effects.
- `src/renderer/`: desktop renderer (`app/`, `shared/`). Its Vite root is `src/renderer` (see `vite.web.config.ts`).
- `site/`: separate static Vite app that reuses `src/shared` components. Root `vite.config.ts` only re-exports `site/vite.config.ts`.
- Path alias `@/` maps to `src/`. shadcn aliases in `components.json` point to `@/shared/ui`.

## Conventions

- UI primitives come from the shadcn CLI (`components.json`, style `radix-nova`), then get customized. Do not handwrite primitives that shadcn already provides.
- Prettier: no semicolons, single quotes, trailing commas, width 100 (`.prettierrc.json`). ESLint is flat config with typescript-eslint recommended.
- Security: renderer runs sandboxed with context isolation and no Node integration. Keep the preload minimal and validate messages with Zod at the core boundary. The SQLite DB is unencrypted; never store secrets.
- Docs: `README.md`/`ROADMAP.md` have `.pt-BR.md` counterparts; keep them in sync when editing. README progress table is hand-maintained.
- Plans in `docs/plans/` define implementation order (13 slices, starting with `web-foundation-landing-styleguide`). Follow the ordered queue and each plan's STATE.md; do not implement out of dependency order.

## Git

- Do not commit, push, or change branches unless the user explicitly asks. Leave changes in the working tree.
- Recent history mixes emoji and plain Conventional Commits; follow the style of the most recent commits (`git log -5 --oneline`).
- Uncommitted docs (`docs/specs/`, `docs/plans/`, `ROADMAP*.md`, `src/shared/i18n/`, `test/web/locales.test.ts`) are in-progress work; do not discard or overwrite them.
