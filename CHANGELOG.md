# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-03-04
### Added
- Improve session restoration with workspace fallback.
- Integrate DevMetrics in statusbar for dev mode.
- Add DevMetrics component and useAppMetrics hook.
- Add app-metrics module with dev-mode IPC.
- Add session persistence and update CLI icons.
- Add git diff viewer and image preview.
- Add settings editor, inline edit, and update dialogs.
- Add and update Zustand stores.
- Add utility libs and hooks.
- Add user settings and enhance backend modules.
- Integrate multi-CLI and workspace lifecycle in app shell.
- Add multi-CLI components and workspace UI.
- Add workspace store and multi-CLI session support.
- Add CLI registry, IPC layer, and detection hook.
- Add backend with IPC, PTY, config, and file watcher.
- Integrate multi-window, error boundaries, and session state.
- Add session state store, strip-ansi utility, and new components.
- Add multi-window support, CLI check, and new IPC commands.
- Add config manager and file watcher modules.
- Add plaintext fallback when Shiki fails to load.
- Integrate session type and zoom features.
- Support session type in PTY spawn command.
- Add new session dialog with session type selection.
- Add terminal zoom store with keyboard shortcuts.
- Add command palette with file search and commands.
- Add flatten file tree utility.
- Add command palette and app dialogs stores.
- Add Command UI primitive component.
- Update app shell with dialogs, shortcuts, and layout.
- Add file preview pane with syntax highlighting.
- Add terminal integration with PTY and tab management.
- Add UI primitives (button, dialog, hover-card, resizable).
- Add PTY management, file reader, and git info commands.
- Add UI components.
- Add app shell with Catppuccin Mocha theme.
- Add app entry, file tree and system metrics.

### Changed
- Lazy load FilePreviewPane, memo CodeViewer, extract keyboard hook.
- Optimize store selectors, metrics interval, and git status.
- Optimize rendering in statusbar, terminal and titlebar.
- Add lazy loading, virtualization and memo.
- Optimize Shiki lazy loading, ring buffer and platform utils.
- Add virtual list dep and configure chunk splitting.
- Optimize metrics init, PTY buffer and git info.

### Fixed
- Add unique instance ID to prevent tab ID collisions.
- Add ARIA attributes, tabpanel roles, and focus-visible styles.
- Enable sandbox, validate sessions, and filter PTY env.
- Improve keyboard navigation and ARIA attributes.
- Add DOMPurify sanitization for HTML rendering.
- Prevent command injection and path traversal.
- Open workspace in current window from EmptyState.
- Prevent new session modal when no project is open.---

## [1.0.1] - 2026-03-04
### Fixed
- Allow WASM execution in CSP for syntax highlighting.
- Set vite base to relative path for production build.---

## [1.2.0] - 2026-03-05
### Added
- Add removeProjectTree action to file tree store.
- Add context menu to file tree nodes.
- Add resource usage popover in titlebar.
- Add file operations module (rename and delete).
- Add MonacoEditor and MonacoDiffEditor wrappers.
- Add Monaco workers, Catppuccin theme, and language detection.
- Add Monaco CSP, file writer, and git content at HEAD.

### Fixed
- Use relative paths for CLI icons and fix UI details.---

## [Unreleased]

