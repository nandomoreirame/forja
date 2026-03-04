# Contributing to Forja

Thank you for your interest in contributing to Forja! This guide will help you get started.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |

### Linux additional dependencies

```bash
# Ubuntu/Debian (for native modules like node-pty)
sudo apt install build-essential python3
```

### macOS additional dependencies

```bash
xcode-select --install
```

## Setup

```bash
# Clone the repository
git clone https://github.com/nandomoreirame/forja.git
cd forja

# Install dependencies
pnpm install
```

## Development

```bash
# Run the app in development mode (Vite + Electron with hot reload)
pnpm dev

# Run frontend only (useful for UI work without Electron)
pnpm dev:vite
```

## Testing

```bash
# Run all tests (frontend + electron)
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run a specific test file
pnpm vitest run frontend/lib/__tests__/strip-ansi.test.ts

# Run tests with coverage
pnpm test:coverage
```

## Code Style

- All code, variables, comments, and commits in **English**
- Frontend: TypeScript, React 19, Tailwind CSS 4, shadcn/ui components
- Backend: TypeScript (Electron main process)
- State management: Zustand stores
- Testing: Vitest + React Testing Library (frontend), Vitest with node environment (electron)
- Icons: Lucide React (`strokeWidth={1.5}`)

## Project Structure

```
forja/
  electron/           # Electron main process (TypeScript)
    main.ts           # Entry point, IPC handlers
    preload.ts        # contextBridge for window.electronAPI
    pty.ts            # PTY management (node-pty)
    config.ts         # electron-store config manager
    watcher.ts        # File watcher (chokidar)
    git-info.ts       # Git status reader
    metrics.ts        # System metrics collector
    user-settings.ts  # User settings manager
  frontend/           # React + TypeScript frontend
    components/       # React components
    stores/           # Zustand state stores
    hooks/            # Custom React hooks
    lib/              # Utility functions
    styles/           # CSS (Tailwind + globals)
  docs/               # Documentation
  public/             # Static assets (icons, images)
```

## Pull Request Process

1. Fork the repository and create a feature branch from `develop`
2. Write tests for new functionality (TDD: Red-Green-Refactor)
3. Ensure all tests pass (`pnpm test`)
4. Submit a pull request to `develop`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
