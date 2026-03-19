# Contributing to Forja

Thank you for your interest in contributing to Forja! This guide will help you get started.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22+ | [nodejs.org](https://nodejs.org/) or via `mise` |
| **pnpm** | 9+ | `npm install -g pnpm` |

### Linux additional dependencies

```bash
# Ubuntu/Debian (for native modules like node-pty)
sudo apt install build-essential python3

# Arch Linux
sudo pacman -S base-devel python
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

# Run Electron main process only (requires Vite running on port 1420)
pnpm dev:electron
```

## Testing

Tests use Vitest with a multi-project setup: `frontend` (happy-dom) and `electron` (node).

```bash
# Run all tests
pnpm test

# Run a specific test file
pnpm test path/to/file.test.ts

# Run tests by project
pnpm test --project frontend    # Frontend tests only
pnpm test --project electron    # Electron tests only

# Watch mode
pnpm test --watch

# Coverage report
pnpm test:coverage

# Visual UI
pnpm test:ui
```

### Testing conventions

- **Frontend tests**: Use happy-dom environment. Mock `@/lib/ipc` for all component/store tests.
- **Electron tests**: Use node environment with `forks` pool. Mock `fs`, `chokidar`, `node-pty` as needed.
- **Test location**: Colocated in `__tests__/` directories next to source files.
- **IPC mock pattern**:

```typescript
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));
```

## Building

```bash
# TypeScript compile + Vite build
pnpm build

# Full Electron build (DMG for macOS, AppImage/DEB for Linux)
pnpm build:electron
```

Build output goes to `release/`. App ID: `dev.forja.terminal`.

## Branching Strategy (Trunk-Based Development)

| Branch | Purpose |
|--------|---------|
| `main` | Trunk (all development, PRs target here) |
| `feature/*` | New features (branch from `main`) |
| `fix/*` | Bug fixes (branch from `main`) |
| `release/X.Y` | Release preparation (cut from `main`) |

### Workflow

1. Fork the repository
2. Create a branch from `main`:
   - `feature/your-feature-name` for new features
   - `fix/your-fix-name` for bug fixes
3. Make your changes following the code style below
4. Write tests (TDD: Red-Green-Refactor)
5. Ensure all tests pass (`pnpm test`)
6. Submit a pull request to `main`

### Releases

Release branches (`release/X.Y`) are cut from `main` when ready to ship. Fixes go to `main` first, then cherry-pick to the release branch if needed.

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, config, tooling changes |
| `perf` | Performance improvements |
| `style` | Formatting, whitespace (no code change) |

Examples:

```
feat(terminal): add split pane support
fix(file-tree): lazy-load children on directory expand
refactor(stores): extract keyboard shortcuts hook
test(pty): add spawn error handling tests
chore(config): update electron-builder targets
```

## Code Style

- All code, variables, comments, and commits in **English**
- **TypeScript** strict mode enabled
- **Files**: kebab-case (`file-tree.ts`, `use-pty.ts`)
- **Components**: PascalCase (`TerminalPane.tsx`)
- **Hooks**: `use` prefix (`usePty.ts`)
- **Stores**: kebab-case Zustand stores (`terminal-tabs.ts`)
- **Types**: PascalCase (`TerminalTab`, `TerminalTabsState`)
- **Imports**: External, then `@/` internal, then relative, then `import type`
- **State**: Zustand only (no React Context for state management)
- **Styling**: Tailwind CSS 4 with `cn()` utility for conditional classes
- **Icons**: Lucide React with `strokeWidth={1.5}`

## Project Structure

```
forja/
  electron/               # Electron main process
    main.ts               # Entry point, IPC handlers
    preload.ts            # contextBridge (window.electronAPI)
    pty.ts                # PTY management (node-pty)
    config.ts             # electron-store config
    user-settings.ts      # User settings manager
    git-info.ts           # Git status reader
    context/              # Context synchronization system
    __tests__/            # Electron tests (node env)
  frontend/               # React + TypeScript frontend
    components/           # React components (43)
    stores/               # Zustand stores (18)
    hooks/                # Custom hooks (7)
    lib/                  # Utility modules (21)
    themes/               # Theme definitions (14+)
    styles/               # CSS (Tailwind + globals)
  docs/                   # Documentation
  site/                   # Landing page (static HTML)
  public/                 # Static assets (icons, images)
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
