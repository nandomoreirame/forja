# Contributing to Forja

Thank you for your interest in contributing to Forja! This guide will help you get started.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Rust** | stable | [rustup.rs](https://rustup.rs/) |
| **Tauri CLI** | 2.x | `pnpm add -g @tauri-apps/cli` |

### Linux additional dependencies

```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
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

# Install frontend dependencies
pnpm install

# Verify Rust toolchain
rustup update stable
```

## Development

```bash
# Run the app in development mode (frontend + backend hot reload)
pnpm tauri dev

# Run frontend only (useful for UI work without Tauri)
pnpm dev
```

## Testing

```bash
# Run frontend tests
pnpm test

# Run frontend tests in watch mode
pnpm test:watch

# Run backend tests
cd backend && cargo test

# Run a specific test file
pnpm vitest run frontend/lib/__tests__/strip-ansi.test.ts
```

## Code Style

- All code, variables, comments, and commits in **English**
- Frontend: TypeScript, React 19, Tailwind CSS, shadcn/ui components
- Backend: Rust, Tauri 2 commands and events
- State management: Zustand stores
- Testing: Vitest + React Testing Library (frontend), cargo test (backend)
- Icons: Lucide React (`strokeWidth={1.5}`)

## Project Structure

```
forja/
  backend/          # Rust (Tauri 2) backend
    src/
      lib.rs        # Tauri commands and app setup
      pty.rs        # PTY management (portable-pty)
      config.rs     # TOML config manager
      watcher.rs    # File watcher (notify)
      git_info.rs   # Git status reader
      file_tree.rs  # Directory tree reader
      file_reader.rs# File content reader
      metrics.rs    # System metrics collector
  frontend/         # React + TypeScript frontend
    components/     # React components
    stores/         # Zustand state stores
    hooks/          # Custom React hooks
    lib/            # Utility functions
  docs/             # Documentation
```

## Pull Request Process

1. Fork the repository and create a feature branch from `develop`
2. Write tests for new functionality
3. Ensure all tests pass (`pnpm test` and `cargo test`)
4. Submit a pull request to `develop`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
