# Contributing to Forja

Thank you for your interest in contributing to Forja! This guide will help you get started.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22+ | [nodejs.org](https://nodejs.org/) or via `mise` |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) |

### Platform-specific dependencies

**Linux (Ubuntu/Debian):**

```bash
sudo apt install build-essential python3
```

**Linux (Arch Linux):**

```bash
sudo pacman -S base-devel python
```

**macOS:**

```bash
xcode-select --install
```

**Windows:**

- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload
- Or install `windows-build-tools`: `npm install -g windows-build-tools`

## Cloning and Setup

```bash
# Clone the repository
git clone https://github.com/nandomoreirame/forja.git
cd forja

# Install all workspace dependencies
pnpm install
```

This installs dependencies for all workspace packages (`@forja/desktop`, `@forja/site`, `@forja/docs`, `@forja/mobile`, `@forja/tsconfig`, `@forja/shared`) and builds native addons like `node-pty`.

## Monorepo Structure

Forja uses pnpm workspaces. All commands can be run from the monorepo root:

```
forja/                          # @forja/monorepo (root)
  apps/
    desktop/                    # @forja/desktop  - Electron app (main product)
    site/                       # @forja/site     - Next.js marketing site
    docs/                       # @forja/docs     - Fumadocs documentation
    mobile/                     # @forja/mobile   - Expo remote control app
  packages/
    tsconfig/                   # @forja/tsconfig - Shared TS configurations
    shared/                     # @forja/shared   - Shared types and constants
  scripts/                      # CLI and automation scripts
  docs/                         # Specs, design docs, plans
```

Packages reference each other via `workspace:*` in `package.json`:

```json
"devDependencies": {
  "@forja/tsconfig": "workspace:*",
  "@forja/shared": "workspace:*"
}
```

## Development

### Desktop App (main)

```bash
# Run Electron + Vite with hot reload (from root)
pnpm dev

# Or run parts separately
pnpm --filter @forja/desktop dev:vite       # Vite dev server (port 1420)
pnpm --filter @forja/desktop dev:electron   # Electron (waits for Vite)
```

### Marketing Site

```bash
pnpm dev:site       # Next.js dev server on port 3030
pnpm build:site     # Static export
```

### Documentation Site

```bash
pnpm dev:docs       # Fumadocs dev server on port 3031
pnpm build:docs     # Build docs
```

### Mobile App

```bash
pnpm dev:mobile     # Expo start
```

### Working with a specific package

You can filter any pnpm command to a specific workspace:

```bash
pnpm --filter @forja/desktop <command>
pnpm --filter @forja/site <command>
pnpm --filter @forja/docs <command>
```

Or `cd` into the package directory and run scripts directly.

## Testing

Tests use Vitest with a multi-project setup for `@forja/desktop`:

- **frontend** project: happy-dom environment (React components, stores, hooks)
- **electron** project: node environment with forks pool (main process, IPC handlers)
- **scripts** project: node environment (CLI scripts)

```bash
# Run all tests across all workspaces
pnpm test

# Run desktop tests only
pnpm test:desktop

# Specific test file
pnpm test:desktop -- path/to/file.test.ts

# Run tests by project
pnpm test:desktop -- --project frontend     # Frontend tests only
pnpm test:desktop -- --project electron     # Electron tests only

# Watch mode
pnpm test:desktop -- --watch

# Coverage report
pnpm --filter @forja/desktop test:coverage

# Visual UI
pnpm --filter @forja/desktop test:ui
```

### Testing conventions

- **Frontend tests**: Mock `@/lib/ipc` for all component/store tests:

```typescript
vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));
```

- **Electron tests**: Mock `fs`, `chokidar`, `node-pty` as needed
- **Test location**: Colocated in `__tests__/` directories next to source files

## Building

```bash
# TypeScript compile + Vite build (desktop frontend + electron main)
pnpm build

# Full Electron build with packaging
pnpm build:electron
```

`pnpm build:electron` produces platform-specific packages in `apps/desktop/release/`:

| Platform | Output |
|----------|--------|
| macOS | `.dmg` (x64 + arm64) |
| Linux | `.AppImage` + `.deb` (x64) |
| Windows | `.exe` NSIS installer (x64) |

App ID: `dev.forja.terminal`.

### Rebuilding native addons

After updating Electron or `node-pty`, rebuild native addons:

```bash
cd apps/desktop && npx electron-rebuild
```

CI does this automatically in `.github/workflows/ci.yml`.

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
| `ci` | CI/CD changes |

Scopes: `frontend`, `electron`, `desktop`, `site`, `docs`, `mobile`, `shared`, `config`, `settings`, `terminal`, `telemetry`, `workflows`.

Examples:

```
feat(terminal): add split pane support
fix(frontend): lazy-load children on directory expand
refactor(electron): extract keyboard shortcuts hook
test(electron): add spawn error handling tests
chore(config): update electron-builder targets
ci(workflows): fix electron-rebuild working directory for monorepo
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
- **Electron imports**: Use `.js` extensions for relative imports in the main process

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
