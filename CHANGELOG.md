# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.7.0] - 2026-03-19

### Added
- Persist and restore tiling layout JSON per project.
- Persist browser URL in layout via debounced config sync.
- Add tabset context menu with close option.
- Add isSwitchingProject guard to projects store.
- Add updateBlockConfig and closeTabset to tiling store.
- Wire ui-save-gate and webview bridge into main.
- Add webview keyboard bridge for app shortcuts.
- Add UI save gate to suspend saves during cache clear.
- Add keyboard navigation to file tree.
- Replace tab cycling with global cross-pane Ctrl+Tab.
- Register pane focus callbacks in all block components.
- Add global tab cycling to tiling layout store.
- Add pane focus registry for cross-pane tab cycling.
- Add clearUiCache and safer ensureGitignore handling.
- Add Sessions and Plugins groups to command palette.
- Hide Collapse All Folders when file tree is closed.
- Add developer commands and hide context-less items.
- Add focus mode to hide UI chrome with Ctrl+Shift+M.
- Persist and restore terminal tabs across project switches.
- Add serializeTabsForSave and remove unused tabLastActiveAt.
- Replace tab switching shortcut with project switching via Ctrl+Shift+number.
- Integrate workspace system into App and main entry points.
- Enhance terminal session with auto-close and block components.
- Enhance tiling layout and tab management with rename support.
- Add tab inline edit and name overlay components.
- Add workspace switcher, empty state and titlebar integration.
- Add workspace color and icon utilities, enhance CLI registry.
- Enhance workspace, tiling-layout, projects and terminal-tabs stores.
- Add workspace system with project config and buffer persistence.
- Open file-tree panel at compact minimum size.
- Scope-aware plugin filtering in right sidebar.
- Add WIP alert to chat panel and remove redundant close button.
- Add plugin scope type and validation.
- Add clear cache button to resource usage popover.
- Add cache clear and config reset functionality.
- Add tiling layout block components.
- Add tiling layout core components.
- Add tiling layout core library and store.

### Changed
- Coalesce PTY writes with RAF to prevent viewport jumping.
- Fix memory leaks and reduce unnecessary re-renders.

### Fixed
- Disable titlebar drag region in focus mode.
- Prevent stale layout and zombie tabs on project switch.
- Prevent orphan panes and stale layout on project switch.
- Guard PTY resize against invalid dimensions.
- Update focus mode shortcut to Ctrl+Alt+F.
- Preserve cliSessionId on workspace restore.
- Keep backend PTY alive when frontend cache evicts terminal.
- Make chat and settings work without active project.
---

## [1.7.0] - 2026-03-19

### Added
- Add tiling layout system with core library, store, block components, and tab management.
- Add workspace system with project config, buffer persistence, switcher, empty state, and titlebar integration.
- Add focus mode to hide UI chrome (Ctrl+Alt+F).
- Add keyboard navigation to file tree (arrow keys, Enter, Home/End).
- Add global cross-pane tab cycling with Ctrl+Tab.
- Add tabset context menu with close option.
- Add tab inline edit and name overlay components.
- Add Sessions and Plugins groups to command palette.
- Add developer commands and hide context-less items in command palette.
- Add clear cache button to resource usage popover.
- Add cache clear and config reset functionality in backend.
- Add UI save gate to suspend saves during cache clear.
- Add webview keyboard bridge for app shortcuts.
- Add plugin scope type and validation.
- Add scope-aware plugin filtering in right sidebar.
- Add WIP alert to chat panel.
- Persist and restore tiling layout JSON per project.
- Persist and restore terminal tabs across project switches.
- Persist browser URL in layout via debounced config sync.
- Replace tab switching shortcut with project switching via Ctrl+Shift+number.
- Open file-tree panel at compact minimum size.
- Hide Collapse All Folders button when file tree is closed.

### Changed
- Replace old terminal pane and split layout system with tiling layout.
- Integrate tiling layout into App shell and panel components.
- Migrate font sizes to dynamic scale across all UI components.
- Rename agent-chat label from "Chat" to "AI Assistant".
- Unify Ctrl+W to always close active tab.
- Remove Alt key shortcut numbers from project icons.
- Remove tab hibernation from lite mode config.
- Remove opencode from CLI registry, detector, settings, and assets.
- Use copilot standalone binary instead of gh extension.

### Fixed
- Guard PTY resize against invalid dimensions.
- Keep backend PTY alive when frontend cache evicts terminal.
- Prevent orphan panes and stale layout on project switch.
- Prevent stale layout and zombie tabs on project switch.
- Preserve cliSessionId on workspace restore.
- Make chat and settings work without active project.
- Disable titlebar drag region in focus mode.

### Performance
- Coalesce PTY writes with requestAnimationFrame to prevent viewport jumping.
- Fix memory leaks and reduce unnecessary re-renders.
- Add performance guardrails and lazy-load Monaco editors.
- Coalesce git refresh by project with TTL caching.
- Make app metrics sampling demand-driven.
- Make file refresh selective by project and path.
- Remove sync icon IO from main process.

---

## [1.6.3] - 2026-03-14

### Fixed
- Fix black screen on Wayland-based Linux systems (Pop!_OS 24.04 / COSMIC) ([#11](https://github.com/nandomoreirame/forja/issues/11)). Use `ELECTRON_OZONE_PLATFORM_HINT=auto` instead of `appendSwitch("ozone-platform")` which is processed too late in Electron 32.
- Add programmatic Ozone platform hint fallback in `electron/main.ts` to ensure AppImage builds also get Wayland auto-detection (not just `.deb`).
- Fix false "Claude Code CLI not found" dialog when reopening app from desktop entry. Detect Node version manager paths (nvm, fnm, volta, asdf, mise) in `resolveShellPath()` so CLI binaries installed via `npm install -g` are found even without shell profile initialization.
---

## [1.6.2] - 2026-03-13

### Added
- Add Go to Project command palette and keyboard shortcuts.
- Add terminal background opacity reactivity.
---

## [1.6.1] - 2026-03-13

### Added
- Add uninstall plugin option to right sidebar context menu.
---

## [1.6.0] - 2026-03-13

### Added
- Integrate marketplace view in right sidebar and panel.
- Add plugin marketplace UI with store and components.
- Add plugin installer and marketplace IPC handlers.
- Add plugin registry client.
- Add registry and marketplace plugin types.
- Add window opacity IPC handler.
- Integrate background opacity and fix terminal icon.
- Inject opacity CSS in plugin webview and fix settings input.
- Add plugin webview opacity CSS builder.
- Add background opacity via CSS variables.
- Add Windows forbidden paths and fix watcher path join.
- Centralize config paths for cross-platform support.
- Add cross-platform binary detection and PTY support.

### Fixed
- Open external links in system browser from markdown preview.
---

## [1.5.10] - 2026-03-13

### Added
- Add plugin pin with context menu and panel persistence.
- Add IPC handlers for plugin pin persistence.

### Fixed
- Preserve project icon and order on session restore.

---

## [1.5.9] - 2026-03-12

### Fixed
- Preserve expanded subdirectories on file tree refresh.
---

## [1.5.8] - 2026-03-12

### Added
- Add open in files and open in editor context menu items.
- Add open in files and open in editor IPC handlers.
- Add pluginOrder config and IPC handlers.
- Add interactive features to tasks plugin.
- Add sidebar badge API and plugin reorder support.
- Redesign pomodoro timer with persistence and collapsible settings.

### Fixed
- Keep plugin webview alive when panel is closed.
- Add missing sidebar API to CTS plugin preload.
- Prevent right panel opening empty without active plugin.
---

## [1.5.7] - 2026-03-12

### Added
- Add forja-plugin-tasks example plugin.
- Add project events, permissions check, and bridge improvements to PluginHost.
- Add tab drag-and-drop reorder with dnd-kit.
- Add pomodoro timer as example plugin and scaffolding template.
- Add PluginHost webview, permission dialog, and UI integration.
- Add frontend plugin store, types, and theme utility.
- Add IPC handlers, webview preload, and config schema.
- Add permission system and secure bridge API.
- Add plugin types, manifest validation, and directory loader.

### Fixed
- Make plugin-preload self-contained and fix preload path.
- Prevent PTY kill on tab reorder.
---

## [1.5.6] - 2026-03-12

### Added
- Limit file tree sidebar max width to 500px.
- Add per-project UI state save/restore.
- Add per-project UI state persistence.

### Fixed
- Only open localhost links from terminal clicks.
---

## [1.5.5] - 2026-03-12

### Added
- Add XCompose cedilla fallback for pt_BR locale.
- Add collapsible right panel to main layout.
- Add right panel store and remove terminal collapse state.
- Add XCompose cedilla support for pt_BR locale.
- Add right sidebar component.
- Strip HTML comments from markdown renderer.

### Fixed
- Remap c-acute to c-cedilla in terminal input.
- Handle Ctrl+Shift+R in reload shortcut block.
---

## [1.5.4] - 2026-03-11

### Fixed
- Delegate Ctrl+Shift+V paste to native browser event instead of manual handler.
- Prevent dead key character duplication on Linux.

### Security
- Block reload shortcuts (Ctrl+R, Cmd+R, F5) in production builds.

---

## [1.5.3] - 2026-03-11

### Added
- Add dev-only lite mode toggle in titlebar.
- Remap sidebar/project/browser shortcuts to avoid terminal conflicts.
- Initialize performance store on app mount.
- Add Performance section to settings dialog.
- Add tab hibernation for lite mode (unmount inactive xterm).
- Add performance Zustand store for lite mode state.
- Expose performance mode via IPC for frontend.
- Add performance settings to UserSettings type.
- Make file watcher depth configurable for lite mode.
- Make metrics polling interval configurable for lite mode.
- Add lite-mode detection with hardware-aware startup.

### Changed
- Reduce PTY ring buffer from 2MB to 512KB.

### Fixed
- Remove enable-wayland-ime to prevent duplicate dead-key input.
---

## [1.5.2] - 2026-03-11

### Fixed
- Prevent duplicate characters during dead-key composition.
- Fix broken CHANGELOG formatting from release script.
---

## [1.5.1] - 2026-03-11

### Fixed
- Add IME dead-key support for cedilla on Linux.

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
