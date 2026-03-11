# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.5.0] - 2026-03-11

### Added
- Add theme and lineHeight to settings dialog.
- Add theme switcher to command palette.
- Integrate theme system into app.
- Add Zustand theme store.
- Add theme and lineHeight to UserSettings.
- Add theme applicator with CSS variable mapping.
- Add theme registry with resolve logic.
- Add 10 popular editor theme definitions.
- Add 4 core theme definitions.
- Add theme schema types and validation.

### Changed
- Tighten browser pane lifecycle.
- Remove sync icon IO from main process.
- Make app metrics sampling demand-driven.
- Coalesce git refresh by project with TTL caching.
- Make file refresh selective by project and path.
- Add performance guardrails, lazy-load monaco editors.

### Fixed
- Handle Ctrl+Shift+C/V for terminal copy/paste.

---

## [1.4.13] - 2026-03-10

### Added
- Add context menu and inline rename to terminal tabs.

---

## [1.4.12] - 2026-03-10

### Added
- Add keyboard shortcuts for fullscreen and browser toggle.
- Add tooltips to tab bar action buttons.
- Add terminal fullscreen toggle.
- Add edit button to markdown preview pane.
- Add browser screenshot to clipboard.
- Autofocus terminal on session open and tab switch.

### Fixed
- Show spinner only when project is actively thinking.

---

## [1.4.11] - 2026-03-10

### Added
- Replace file preview empty state with Forja branding and shortcuts.
- Add session picker via command palette.
- Add sessions mode to command palette store.
- Add isLocalhostUrl helper with URL parsing.

### Fixed
- Notify only active project on session state change.
- Scope git diff selection per project on switch.
- Exclude git-ignored files from quick open.
- Show dot directories in file tree.

---

## [1.4.10] - 2026-03-10

### Added
- Error page overlay for browser pane load failures.
- Hide custom window controls on macOS.

### Fixed
- Scope browser pane state per project (was global, staying visible across all projects when switching).

---

## [1.4.9] - 2026-03-10

### Added
- Embedded browser pane inside the preview panel with Electron `<webview>` tag.
- Browser navigation toolbar with back, forward, reload, and address bar.
- Globe toggle button in titlebar to open/close the browser pane.
- Ctrl+Shift+B keyboard shortcut to toggle the browser pane.
- URL validation blocking dangerous schemes (javascript, file, data, vbscript, blob).
- Auto-open browser pane when localhost/127.0.0.1 URLs are detected in terminal output.
- Localhost URL detector with ANSI escape code stripping for PTY output.
- Browser IPC bridge namespace in Electron preload.
- Zustand store for browser pane state management.

---

## [1.4.7] - 2026-03-10

### Added
- Watch for file content changes (`change` event) in file-watcher, not just add/unlink.
- Add `invalidateProjectCache` to file-cache for clearing stale entries by project path.
- Auto-reload file preview when external file changes are detected via `files:changed` IPC.
- Support `skipCache` option in `read_file_command` IPC handler.

### Changed
- Standardize hover buttons with `rounded-md` and `bg-ctp-surface0`.

---

## [1.4.6] - 2026-03-10

### Fixed
- Prevent terminal resize when tab is hidden to avoid PTY corruption from 0x0 dimensions.

### Changed
- Adjust sidebar icon spacing and reorder bottom buttons for better visual hierarchy.

---

## [1.4.5] - 2026-03-10

### Added
- Add filesystem watcher for project directory with chokidar (depth: 3, 1000ms debounce).
- Add file tree refresh button (RefreshCw) in sidebar header.
- Add `refreshTree` action to file-tree store for manual and automatic tree refresh.
- Listen for `files:changed` IPC events to auto-refresh file tree on disk changes.
- Start/stop file watcher on project activate/remove.

### Changed
- Move chat panel inside sidebar resizable panel for better layout integration.

---

## [1.4.4] - 2026-03-10

### Added
- Keep preview pane always open with empty state when no file is selected.

### Fixed
- Replace deprecated Vitest poolOptions with maxWorkers for proper CPU limiting.

---

## [1.4.3] - 2026-03-10

### Added
- Refactor keyboard shortcuts with Shift modifier for tab management (Ctrl+Shift+T/W).
- Add Ctrl+1-9 to switch tabs by position.
- Add thinking/notified indicators for sidebar projects.

### Fixed
- Improve terminal context menu split pane handling and icon alignment.
- Correct copy/paste shortcuts to Ctrl+Shift+C/V in context menu.

---

## [1.4.2] - 2026-03-10

### Added
- Add terminal context menu and split pane close headers.
- Trigger session-ready notification on thinking-to-ready transition.
- Add session-ready notifications via IPC.

### Changed
- Switch frontend tests to happy-dom and limit pool sizes.
- Clean old AppImages on build and show version in desktop entry.

---

## [1.4.1] - 2026-03-10

### Fixed
- Lazy-load file tree children on directory expand.

---

## [1.4.0] - 2026-03-10

### Added
- Add terminal split preferences to config and PTY.

---

## [1.3.0] - 2026-03-08

### Added
- Add per-project file preview save/restore.
- Add get_settings_path IPC handler.
- Add Context section to settings and switch UI labels to English.
- Make projectPath optional with fallback to ~/.config/forja.
- Add Import dropdown to context hub settings UI.
- Add importItem to context hub with IPC handler.
- Persist project name and icon edits to config.json.
- Add icon_path to RecentProject and updateRecentProject.
- Add 10 commands to command palette with grouped layout.
- Add drag-and-drop project reorder in sidebar.
- Persist sidebar open/close state across sessions.
- Add sidebar persistence and project reorder to config.
- Update App layout with chat panel and project sidebar.
- Add project sidebar, settings dialog, and context sync status.
- Add chat panel with slash command menu.
- Add agent chat hook and update CLI/PTY hooks.
- Add agent chat, context hub, and projects stores.
- Add slash commands, chat context, and PTY dispatcher libs.
- Update config, settings, and register new IPC handlers.
- Add agent chat backend with IPC handlers.
- Add context synchronization system.
- Add project icon resolver.
- Add ring buffer, PTY notifications, and CLI detector.
- Add CLI icons and app favicon.

### Changed
- Wire cache and focus callback into main process.
- Add LRU file content cache.
- Add conditional metrics polling and CLI detection cache.
- Add shallow tree loading with on-demand subdirectory fetch.
- Add IPC call deduplication and git status TTL cache.

### Fixed
- Open settings.json via file preview instead of custom editor.

---

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
- Use relative paths for CLI icons and fix UI details.

---

## [1.0.1] - 2026-03-04

### Fixed
- Allow WASM execution in CSP for syntax highlighting.
- Set vite base to relative path for production build.

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
- Prevent new session modal when no project is open.
