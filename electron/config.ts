import Store from "electron-store";
import * as path from "path";
import * as os from "os";
import type { PluginPermissionGrant } from "./plugins/types.js";
import { getForjaConfigDir } from "./paths.js";

const MAX_RECENT = 10;

export interface ProjectUiState {
  sidebarOpen?: boolean;
  rightPanelOpen?: boolean;
  terminalFullscreen?: boolean;
  previewFile?: string | null;
  browserOpen?: boolean;
  browserUrl?: string;
  sidebarSize?: number;
  previewSize?: number;
  tabs?: Array<{
    sessionType: string;
    customName?: string;
  }>;
  layoutJson?: Record<string, unknown>;
}

interface RecentProject {
  path: string;
  name: string;
  last_opened: string;
  icon_path?: string | null;
  ui_state?: ProjectUiState | null;
}

export interface Workspace {
  id: string;
  name: string;
  projects: string[];  // array of absolute paths
  createdAt: string;   // ISO date string
  lastUsedAt: string;  // ISO date string
}

export interface UiPreferences {
  sidebarSize: number;  // percentage (0-100)
  previewSize: number;  // percentage (0-100)
  sidebarOpen: boolean; // whether file tree sidebar is visible
  terminalSplitEnabled: boolean;
  terminalSplitOrientation: "horizontal" | "vertical";
  terminalSplitRatio: number;
  rightPanelWidth: number; // pixel width of the right panel (e.g. 400)
  layoutJson?: Record<string, unknown>;
}

interface ConfigSchema {
  recentProjects: RecentProject[];
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  uiPreferences: UiPreferences;
  pluginPermissions: PluginPermissionGrant[];
  enabledPlugins: string[];
  pluginOrder: string[];
  pinnedPlugin: string | null;
}

const DEFAULT_UI_PREFERENCES: UiPreferences = {
  sidebarSize: 20,
  previewSize: 0,
  sidebarOpen: true,
  terminalSplitEnabled: false,
  terminalSplitOrientation: "vertical",
  terminalSplitRatio: 50,
  rightPanelWidth: 400,
};

type TypedConfigStore = Store<ConfigSchema> & {
  get<Key extends keyof ConfigSchema>(key: Key): ConfigSchema[Key];
  set<Key extends keyof ConfigSchema>(key: Key, value: ConfigSchema[Key]): void;
};

// Force config location to platform-appropriate directory.
// Linux/macOS: ~/.config/forja, Windows: %APPDATA%/forja
const store = new Store<ConfigSchema>({
  name: "config",
  cwd: getForjaConfigDir(),
  defaults: {
    recentProjects: [],
    workspaces: [],
    activeWorkspaceId: null,
    uiPreferences: DEFAULT_UI_PREFERENCES,
    pluginPermissions: [],
    enabledPlugins: [],
    pluginOrder: [],
    pinnedPlugin: null,
  },
}) as TypedConfigStore;

// ─── Recent Projects ─────────────────────────────────────────────────────────

export function getRecentProjects(): RecentProject[] {
  return store.get("recentProjects");
}

export function addRecentProject(projectPath: string): void {
  const existing = store.get("recentProjects");
  const prev = existing.find((p) => p.path === projectPath);
  const name = path.basename(projectPath);
  const lastOpened = new Date().toISOString();

  if (prev) {
    // Existing project: update last_opened but keep its current position
    const updated = existing.map((p) =>
      p.path === projectPath
        ? { ...p, name, last_opened: lastOpened }
        : p
    );
    store.set("recentProjects", updated);
  } else {
    // New project: add to the top
    const updated: RecentProject[] = [
      { path: projectPath, name, last_opened: lastOpened },
      ...existing,
    ].slice(0, MAX_RECENT);
    store.set("recentProjects", updated);
  }
}

export function removeRecentProject(projectPath: string): void {
  const existing = store.get("recentProjects");
  const filtered = existing.filter((p) => p.path !== projectPath);
  store.set("recentProjects", filtered);
}

export function updateRecentProject(
  projectPath: string,
  updates: { name?: string; icon_path?: string | null }
): void {
  const existing = store.get("recentProjects");
  const updated = existing.map((p) =>
    p.path === projectPath ? { ...p, ...updates } : p
  );
  store.set("recentProjects", updated);
}

export function reorderRecentProjects(orderedPaths: string[]): void {
  const existing = store.get("recentProjects");
  const byPath = new Map(existing.map((p) => [p.path, p]));

  const ordered: RecentProject[] = [];
  for (const path of orderedPaths) {
    const project = byPath.get(path);
    if (project) {
      ordered.push(project);
      byPath.delete(path);
    }
  }

  // Append remaining projects not in orderedPaths
  for (const project of byPath.values()) {
    ordered.push(project);
  }

  store.set("recentProjects", ordered);
}

// ─── Project UI State ────────────────────────────────────────────────────────

export function getProjectUiState(projectPath: string): ProjectUiState | null {
  const projects = store.get("recentProjects");
  const project = projects.find((p) => p.path === projectPath);
  if (!project || !project.ui_state) return null;
  return project.ui_state;
}

export function saveProjectUiState(
  projectPath: string,
  state: Partial<ProjectUiState>
): void {
  const existing = store.get("recentProjects");
  const index = existing.findIndex((p) => p.path === projectPath);
  if (index === -1) return;

  const current = existing[index].ui_state ?? {};
  const merged: ProjectUiState = { ...current, ...state };
  const updated = [...existing];
  updated[index] = { ...existing[index], ui_state: merged };
  store.set("recentProjects", updated);
}

// ─── Workspaces ──────────────────────────────────────────────────────────────

export function getWorkspaces(): Workspace[] {
  return store.get("workspaces");
}

export function createWorkspace(name: string, initialProject?: string): Workspace {
  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    projects: initialProject ? [initialProject] : [],
    createdAt: now,
    lastUsedAt: now,
  };

  const workspaces = store.get("workspaces");
  store.set("workspaces", [...workspaces, workspace]);

  return workspace;
}

export function updateWorkspace(
  id: string,
  updates: Partial<Pick<Workspace, "name">>
): Workspace | null {
  const workspaces = store.get("workspaces");
  const index = workspaces.findIndex((ws) => ws.id === id);

  if (index === -1) return null;

  const updated: Workspace = { ...workspaces[index], ...updates };
  const newWorkspaces = [...workspaces];
  newWorkspaces[index] = updated;
  store.set("workspaces", newWorkspaces);

  return updated;
}

export function deleteWorkspace(id: string): boolean {
  const workspaces = store.get("workspaces");
  const index = workspaces.findIndex((ws) => ws.id === id);

  if (index === -1) return false;

  const newWorkspaces = workspaces.filter((ws) => ws.id !== id);
  store.set("workspaces", newWorkspaces);

  // Clear activeWorkspaceId if it was pointing to the deleted workspace
  const activeId = store.get("activeWorkspaceId");
  if (activeId === id) {
    store.set("activeWorkspaceId", null);
  }

  return true;
}

export function addProjectToWorkspace(
  workspaceId: string,
  projectPath: string
): Workspace | null {
  const workspaces = store.get("workspaces");
  const index = workspaces.findIndex((ws) => ws.id === workspaceId);

  if (index === -1) return null;

  const workspace = workspaces[index];

  // Do not duplicate project paths
  if (workspace.projects.includes(projectPath)) {
    return workspace;
  }

  const updated: Workspace = {
    ...workspace,
    projects: [...workspace.projects, projectPath],
    lastUsedAt: new Date().toISOString(),
  };

  const newWorkspaces = [...workspaces];
  newWorkspaces[index] = updated;
  store.set("workspaces", newWorkspaces);

  return updated;
}

export function removeProjectFromWorkspace(
  workspaceId: string,
  projectPath: string
): Workspace | null {
  const workspaces = store.get("workspaces");
  const index = workspaces.findIndex((ws) => ws.id === workspaceId);

  if (index === -1) return null;

  const workspace = workspaces[index];
  const updated: Workspace = {
    ...workspace,
    projects: workspace.projects.filter((p) => p !== projectPath),
    lastUsedAt: new Date().toISOString(),
  };

  const newWorkspaces = [...workspaces];
  newWorkspaces[index] = updated;
  store.set("workspaces", newWorkspaces);

  return updated;
}

export function setActiveWorkspace(id: string | null): void {
  store.set("activeWorkspaceId", id);
}

export function getActiveWorkspace(): Workspace | null {
  const activeId = store.get("activeWorkspaceId");
  if (!activeId) return null;

  const workspaces = store.get("workspaces");
  return workspaces.find((ws) => ws.id === activeId) ?? null;
}

// ─── UI Preferences ─────────────────────────────────────────────────────────

export function getUiPreferences(): UiPreferences {
  const current = store.get("uiPreferences");
  return { ...DEFAULT_UI_PREFERENCES, ...current };
}

export function saveUiPreferences(prefs: Partial<UiPreferences>): void {
  const current = getUiPreferences();
  store.set("uiPreferences", { ...current, ...prefs });
}

// ─── Plugin Config ──────────────────────────────────────────────────────────

export function getPluginPermissions(): PluginPermissionGrant[] {
  return store.get("pluginPermissions");
}

export function setPluginPermission(grant: PluginPermissionGrant): void {
  const existing = store.get("pluginPermissions");
  const filtered = existing.filter((p) => p.pluginName !== grant.pluginName);
  store.set("pluginPermissions", [...filtered, grant]);
}

export function removePluginPermission(pluginName: string): void {
  const existing = store.get("pluginPermissions");
  store.set("pluginPermissions", existing.filter((p) => p.pluginName !== pluginName));
}

export function getEnabledPlugins(): string[] {
  return store.get("enabledPlugins");
}

export function setPluginEnabled(name: string, enabled: boolean): void {
  const existing = store.get("enabledPlugins");
  if (enabled && !existing.includes(name)) {
    store.set("enabledPlugins", [...existing, name]);
  } else if (!enabled) {
    store.set("enabledPlugins", existing.filter((n) => n !== name));
  }
}

// ─── Plugin Order ────────────────────────────────────────────────────────────

export function getPluginOrder(): string[] {
  return store.get("pluginOrder");
}

export function setPluginOrder(names: string[]): void {
  store.set("pluginOrder", names);
}

// ─── Pinned Plugin ───────────────────────────────────────────────────────────

export function getPinnedPlugin(): string | null {
  return store.get("pinnedPlugin");
}

export function setPinnedPlugin(name: string | null): void {
  store.set("pinnedPlugin", name);
}

// ─── Reset ──────────────────────────────────────────────────────────────────

export function resetConfig(): void {
  store.clear();
}
