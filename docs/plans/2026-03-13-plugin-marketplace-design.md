# Plugin Marketplace — Implementation Plan

## Overview

Add a VS Code-style plugin marketplace to Forja with:
- GitHub-based static registry (JSON)
- Marketplace pane in right sidebar with search
- Plugin install/uninstall/update from registry
- "+" button in right sidebar to open marketplace

## Steps

### Step 1: Registry Types
- Add `RegistryPlugin`, `RegistryData`, `InstallProgress` types to `electron/plugins/types.ts`
- Mirror types in `frontend/lib/plugin-types.ts`
- Tests: type validation

### Step 2: Plugin Registry Module (Electron)
- Create `electron/plugins/plugin-registry.ts`
- `fetchRegistry(url)` with in-memory cache (TTL 1h)
- Offline fallback to last cached data
- Tests: fetch, cache hit, cache miss, network error

### Step 3: Plugin Installer Module (Electron)
- Create `electron/plugins/plugin-installer.ts`
- `installPlugin(registryPlugin)` — download .tar.gz, verify SHA256, extract
- `uninstallPlugin(name)` — remove dir + cleanup config
- `getInstalledVersions()` — read manifests, return Map<name, version>
- Progress events via BrowserWindow.webContents.send()
- Tests: install flow, uninstall, version check, checksum failure

### Step 4: New IPC Handlers
- Add to `plugin-ipc.ts`: `plugin:fetch-registry`, `plugin:install`, `plugin:uninstall`, `plugin:check-updates`
- Tests: handler registration, argument validation

### Step 5: Right Panel Store Update
- Add `"marketplace"` to `ActiveView` type in `frontend/stores/right-panel.ts`
- Tests: setActiveView("marketplace")

### Step 6: Marketplace Store (Frontend)
- Create `frontend/stores/marketplace.ts`
- State: registry, loading, error, searchQuery, activeTag, installProgress
- Actions: fetchRegistry, setSearchQuery, setActiveTag, installPlugin, uninstallPlugin
- Local search filtering (name, description, tags)
- Tests: fetch, search filtering, install progress tracking

### Step 7: Marketplace Plugin Card Component
- Create `frontend/components/marketplace-plugin-card.tsx`
- Displays: icon, name, version, description, author, downloads
- Buttons: Install / Uninstall / Update (based on state)
- Progress bar during installation
- Tests: render states (available, installed, installing, update available)

### Step 8: Marketplace Pane Component
- Create `frontend/components/marketplace-pane.tsx`
- Header with title + refresh button
- Search input
- Tag filter chips
- Plugin list with sections (Installed, Available)
- Tests: render, search interaction, empty state

### Step 9: Right Sidebar "+" Button
- Add Plus icon button to `right-sidebar.tsx` before Settings/Help
- Opens marketplace pane on click
- Tests: button renders, click opens marketplace

### Step 10: App.tsx Integration
- Render `MarketplacePane` in right panel when `activeView === "marketplace"`
- Lazy load the component
- Tests: conditional rendering

### Step 11: Forja Plugins Monorepo
- Create `/home/nandomoreira/dev/projects/forja-plugins/` directory
- Move `plugins/forja-plugin-pomodoro` and `plugins/forja-plugin-tasks` into it
- Create `registry.json` with the 2 plugins
- Create basic `package.json` and `README.md`
- Initialize git repo
