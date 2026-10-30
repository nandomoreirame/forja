# Forja

A desktop workspace for developers who use AI coding CLIs.

![Forja welcome screen with a command bar, project shortcuts, and workspace status](docs/images/welcome.png)

**Early scaffold:** the welcome screen is a static preview. AI integrations are not implemented yet.

## Why

Working across AI coding CLIs means keeping track of projects and sessions in separate terminals.
The terminal remains useful for running each tool, but does not provide a shared visual workspace across them.
Forja is being built to bring those projects and sessions into one desktop interface.
This repository currently provides the application shell and the foundations for that work.

## Quick start

Requires Node.js 24 or newer, npm, and a graphical desktop environment supported by Electron.
Run these commands from the repository root:

```sh
npm install
npm run dev
```

The Electron window opens on the welcome screen. No provider account or API key is required for this preview.

## Usage

The welcome screen displays project actions, a command bar, settings, and workspace status.
Controls have hover feedback and pointer cursors, but clicks and keyboard shortcuts do not perform actions yet.

To preview only the interface in a browser:

```sh
npm run dev:web
```

Open the local URL printed by Vite. This preview does not start the core process or create a database.

## Architecture

| Area | Implementation |
| --- | --- |
| Desktop shell | Electron, electron-vite, electron-builder |
| Interface | React, TypeScript, CSS Modules, semantic design tokens |
| Icons and typography | Lucide, locally bundled JetBrains Mono |
| Core | Separate Electron utility process |
| Persistence | SQLite through `node:sqlite`, WAL, versioned SQL migrations |
| Contracts | Zod validation at the core message boundary |
| Tests | Vitest and Testing Library |

Radix and Zustand are installed for future screens; the static welcome screen does not use them.
AI adapters currently define TypeScript interfaces only. Session execution, MCP connections, approvals, credential storage, backups, and automatic updates remain unimplemented.
The renderer does not yet communicate with the core health endpoint.

The repository contains one desktop application. Its interface, core, and shared contracts stay together because they are built and released as one application, without separate services or workspace packages.

```text
src/
  main/          Window and application lifecycle
  preload/       Reserved for a restricted desktop API
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
The preload exposes no desktop APIs. New windows and external navigation are blocked.
The current interface does not call AI providers, execute coding CLIs, or store credentials.

The core writes `forja.db` inside Electron's application data directory. Development uses a separate `Forja Dev` directory.
The database is not encrypted. Do not store secrets in this scaffold.

The browser preview binds to the loopback interface on the port reported by Vite, without authentication.
Development servers are for local development only. The packaged application does not start an HTTP server.
Report security concerns privately to the repository maintainer, without including credentials or sensitive files.

## License

A project license has not been selected yet. No license grant is provided for the project code at this stage; dependencies retain their respective licenses.
