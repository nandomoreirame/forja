import Store from "electron-store";
import * as path from "path";
import * as os from "os";
import type { PluginPermissionGrant } from "./plugins/types.js";
import { getForjaConfigDir, getForjaConfigName } from "./paths.js";
import {
  readProjectConfig,
  patchProjectUi,
  clearProjectUi,
  type ForjaProjectConfig,
} from "./project-config.js";

const MAX_RECENT = 10;

export type WorkspaceColor =
  | "green"   // #a6e3a1
  | "teal"    // #94e2d5
  | "blue"    // #89b4fa
  | "mauve"   // #cba6f7 (default)
  | "red"     // #f38ba8
  | "peach"   // #fab387
  | "yellow"; // #f9e2af

export type WorkspaceIcon =
  | "waves"
  | "mountain"
  | "star"
  | "heart"
  | "bolt"
  | "cloud"
  | "moon"
  | "layers"
  | "rocket"
  | "beaker"
  | "link"
  | "trending"
  | "graduation"
  | "coffee";

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
    id?: string;
    path?: string;
    sessionType: string;
    cliSessionId?: string;  // For CLI session resume
    exited?: boolean;       // True when session had ended before persistence
  }>;
  activeTabIndex?: number;
  layoutJson?: Record<string, unknown>;
}

export interface WorkspaceProject {
  path: string;
  name: string;
  last_opened: string;
  icon_path?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  color?: WorkspaceColor;  // defaults to "mauve" at read-time
  icon?: WorkspaceIcon;    // defaults to "layers" at read-time
  projects: WorkspaceProject[];
  uiPreferences: UiPreferences;
  createdAt: string;       // ISO date string
  lastUsedAt: string;      // ISO date string
  lastActiveProjectPath?: string;
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
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
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
  has?(key: string): boolean;
  delete?(key: string): void;
};

// Force config location to platform-appropriate directory.
// Linux/macOS: ~/.config/forja, Windows: %APPDATA%/forja
// In dev mode: config-dev.json; in production: config.json
const store = new Store<ConfigSchema>({
  name: getForjaConfigName(),
  cwd: getForjaConfigDir(),
  defaults: {
    workspaces: [],
    activeWorkspaceId: null,
    pluginPermissions: [],
    enabledPlugins: [],
    pluginOrder: [],
    pinnedPlugin: null,
  },
}) as TypedConfigStore;

// ─── Config Migration ─────────────────────────────────────────────────────

interface OldRecentProject {
  path: string;
  name: string;
  last_opened: string;
  icon_path?: string | null;
}

function migrateConfigIfNeeded(): void {
  // Detect old format: top-level recentProjects key
  const rawStore = store as unknown as { get(key: string): unknown; set(key: string, value: unknown): void; delete?(key: string): void };
  const oldProjects = rawStore.get("recentProjects") as OldRecentProject[] | undefined;

  if (!oldProjects || !Array.isArray(oldProjects)) return;

  // Old format detected — migrate
  const oldUiPrefs = (rawStore.get("uiPreferences") as UiPreferences | undefined) ?? { ...DEFAULT_UI_PREFERENCES };
  const mergedUiPrefs: UiPreferences = { ...DEFAULT_UI_PREFERENCES, ...oldUiPrefs };

  // Build a lookup map from old projects
  const projectMap = new Map<string, WorkspaceProject>();
  for (const p of oldProjects) {
    projectMap.set(p.path, {
      path: p.path,
      name: p.name,
      last_opened: p.last_opened,
      icon_path: p.icon_path ?? null,
    });
  }

  // Migrate existing workspaces (which may have string[] projects)
  const existingWorkspaces = store.get("workspaces") as unknown[];
  const migratedWorkspaces: Workspace[] = [];
  const assignedPaths = new Set<string>();

  if (Array.isArray(existingWorkspaces)) {
    for (const raw of existingWorkspaces) {
      const ws = raw as Record<string, unknown>;
      const oldWsProjects = (ws.projects ?? []) as (string | WorkspaceProject)[];
      const migratedProjects: WorkspaceProject[] = [];

      for (const item of oldWsProjects) {
        if (typeof item === "string") {
          // Old string path — resolve to full project object
          const found = projectMap.get(item);
          if (found) {
            migratedProjects.push(found);
          } else {
            migratedProjects.push({
              path: item,
              name: path.basename(item),
              last_opened: new Date().toISOString(),
            });
          }
          assignedPaths.add(item);
        } else if (item && typeof item === "object" && "path" in item) {
          // Already a WorkspaceProject object
          migratedProjects.push(item as WorkspaceProject);
          assignedPaths.add((item as WorkspaceProject).path);
        }
      }

      migratedWorkspaces.push({
        id: ws.id as string,
        name: ws.name as string,
        color: ws.color as WorkspaceColor | undefined,
        icon: ws.icon as WorkspaceIcon | undefined,
        projects: migratedProjects,
        uiPreferences: (ws.uiPreferences as UiPreferences | undefined) ?? { ...mergedUiPrefs },
        createdAt: ws.createdAt as string,
        lastUsedAt: ws.lastUsedAt as string,
      });
    }
  }

  // Collect unassigned projects for a "Default Workspace"
  const unassignedProjects: WorkspaceProject[] = [];
  for (const p of oldProjects) {
    if (!assignedPaths.has(p.path)) {
      unassignedProjects.push({
        path: p.path,
        name: p.name,
        last_opened: p.last_opened,
        icon_path: p.icon_path ?? null,
      });
    }
  }

  // Create "Default Workspace" if there are unassigned projects or no workspaces exist
  if (unassignedProjects.length > 0 || migratedWorkspaces.length === 0) {
    const now = new Date().toISOString();
    const defaultWs: Workspace = {
      id: crypto.randomUUID(),
      name: "Default Workspace",
      projects: unassignedProjects.length > 0 ? unassignedProjects : oldProjects.map((p) => ({
        path: p.path,
        name: p.name,
        last_opened: p.last_opened,
        icon_path: p.icon_path ?? null,
      })),
      uiPreferences: { ...mergedUiPrefs },
      createdAt: now,
      lastUsedAt: now,
    };
    migratedWorkspaces.unshift(defaultWs);
  }

  // Write migrated data
  store.set("workspaces", migratedWorkspaces);

  // Set activeWorkspaceId to first workspace if not set
  const activeId = store.get("activeWorkspaceId");
  if (!activeId && migratedWorkspaces.length > 0) {
    store.set("activeWorkspaceId", migratedWorkspaces[0].id);
  }

  // Remove old keys
  if (rawStore.delete) {
    rawStore.delete("recentProjects");
    rawStore.delete("uiPreferences");
  } else {
    // Fallback: set to undefined (for mocks without delete)
    rawStore.set("recentProjects", undefined);
    rawStore.set("uiPreferences", undefined);
  }
}

// Run migration on module load
migrateConfigIfNeeded();

// ─── Workspace CRUD ──────────────────────────────────────────────────────────

export function getWorkspaces(): Workspace[] {
  return store.get("workspaces");
}

export function createWorkspace(name: string, initialProject?: string): Workspace {
  const now = new Date().toISOString();
  const projects: WorkspaceProject[] = initialProject
    ? [{
        path: initialProject,
        name: path.basename(initialProject),
        last_opened: now,
      }]
    : [];

  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    projects,
    uiPreferences: { ...DEFAULT_UI_PREFERENCES },
    createdAt: now,
    lastUsedAt: now,
  };

  const workspaces = store.get("workspaces");
  store.set("workspaces", [...workspaces, workspace]);

  return workspace;
}

export function updateWorkspace(
  id: string,
  updates: Partial<Pick<Workspace, "name" | "color" | "icon">>
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

// ─── Workspace Project Operations ────────────────────────────────────────────

export function getWorkspaceProjects(workspaceId: string): WorkspaceProject[] {
  const workspaces = store.get("workspaces");
  const workspace = workspaces.find((ws) => ws.id === workspaceId);
  if (!workspace) return [];
  return workspace.projects;
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
  if (workspace.projects.some((p) => p.path === projectPath)) {
    return workspace;
  }

  const newProject: WorkspaceProject = {
    path: projectPath,
    name: path.basename(projectPath),
    last_opened: new Date().toISOString(),
  };

  const updated: Workspace = {
    ...workspace,
    projects: [...workspace.projects, newProject],
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
    projects: workspace.projects.filter((p) => p.path !== projectPath),
    lastUsedAt: new Date().toISOString(),
  };

  const newWorkspaces = [...workspaces];
  newWorkspaces[index] = updated;
  store.set("workspaces", newWorkspaces);

  return updated;
}

export function updateWorkspaceProject(
  workspaceId: string,
  projectPath: string,
  updates: { name?: string; icon_path?: string | null }
): void {
  const workspaces = store.get("workspaces");
  const wsIndex = workspaces.findIndex((ws) => ws.id === workspaceId);
  if (wsIndex === -1) return;

  const workspace = workspaces[wsIndex];
  const projIndex = workspace.projects.findIndex((p) => p.path === projectPath);
  if (projIndex === -1) return;

  const updatedProjects = [...workspace.projects];
  updatedProjects[projIndex] = { ...updatedProjects[projIndex], ...updates };

  const newWorkspaces = [...workspaces];
  newWorkspaces[wsIndex] = { ...workspace, projects: updatedProjects };
  store.set("workspaces", newWorkspaces);
}

export function reorderWorkspaceProjects(
  workspaceId: string,
  orderedPaths: string[]
): void {
  const workspaces = store.get("workspaces");
  const wsIndex = workspaces.findIndex((ws) => ws.id === workspaceId);
  if (wsIndex === -1) return;

  const workspace = workspaces[wsIndex];
  const byPath = new Map(workspace.projects.map((p) => [p.path, p]));

  const ordered: WorkspaceProject[] = [];
  for (const p of orderedPaths) {
    const project = byPath.get(p);
    if (project) {
      ordered.push(project);
      byPath.delete(p);
    }
  }

  // Append remaining projects not in orderedPaths
  for (const project of byPath.values()) {
    ordered.push(project);
  }

  const newWorkspaces = [...workspaces];
  newWorkspaces[wsIndex] = { ...workspace, projects: ordered };
  store.set("workspaces", newWorkspaces);
}

// ─── Local .forja/config.json helpers ──────────────────────────────────────────

/** Map local config ui fields to UiPreferences. */
function _localUiToPreferences(ui: NonNullable<ForjaProjectConfig["ui"]>): UiPreferences {
  return {
    ...DEFAULT_UI_PREFERENCES,
    sidebarSize: ui.sidebarSize ?? DEFAULT_UI_PREFERENCES.sidebarSize,
    previewSize: ui.previewSize ?? DEFAULT_UI_PREFERENCES.previewSize,
    sidebarOpen: ui.sidebarOpen ?? DEFAULT_UI_PREFERENCES.sidebarOpen,
    terminalSplitEnabled: ui.terminalSplitEnabled ?? DEFAULT_UI_PREFERENCES.terminalSplitEnabled,
    terminalSplitOrientation: ui.terminalSplitOrientation ?? DEFAULT_UI_PREFERENCES.terminalSplitOrientation,
    terminalSplitRatio: ui.terminalSplitRatio ?? DEFAULT_UI_PREFERENCES.terminalSplitRatio,
    rightPanelWidth: ui.rightPanelWidth ?? DEFAULT_UI_PREFERENCES.rightPanelWidth,
    layoutJson: ui.layoutJson,
  };
}

// ─── Project UI State (workspace-scoped) ─────────────────────────────────────

export function getProjectUiState(
  _workspaceId: string,
  projectPath: string
): ProjectUiState | null {
  const localConfig = readProjectConfig(projectPath);
  if (localConfig?.ui) {
    return localConfig.ui as ProjectUiState;
  }
  return null;
}

export function saveProjectUiState(
  _workspaceId: string,
  projectPath: string,
  state: Partial<ProjectUiState>
): void {
  try {
    patchProjectUi(projectPath, state as NonNullable<ForjaProjectConfig["ui"]>);
  } catch {
    // Local write failed — silently ignore (project dir may not exist)
  }
}

// ─── Last Active Project Path ─────────────────────────────────────────────────

export function setLastActiveProjectPath(workspaceId: string, projectPath: string): void {
  const workspaces = store.get("workspaces");
  const idx = workspaces.findIndex((ws) => ws.id === workspaceId);
  if (idx === -1) return;
  const newWorkspaces = [...workspaces];
  newWorkspaces[idx] = { ...newWorkspaces[idx], lastActiveProjectPath: projectPath };
  store.set("workspaces", newWorkspaces);
}

// ─── Active Workspace ────────────────────────────────────────────────────────

export function setActiveWorkspace(id: string | null): void {
  store.set("activeWorkspaceId", id);
}

export function getActiveWorkspace(): Workspace | null {
  const activeId = store.get("activeWorkspaceId");
  if (!activeId) return null;

  const workspaces = store.get("workspaces");
  return workspaces.find((ws) => ws.id === activeId) ?? null;
}

// ─── UI Preferences (workspace-scoped) ───────────────────────────────────────

export function getUiPreferences(workspaceId?: string, projectPath?: string): UiPreferences {
  if (projectPath) {
    const localConfig = readProjectConfig(projectPath);
    if (localConfig?.ui) {
      return _localUiToPreferences(localConfig.ui);
    }
  }

  // Fallback: workspace-level defaults
  const resolvedId = workspaceId ?? store.get("activeWorkspaceId");
  if (resolvedId) {
    const workspaces = store.get("workspaces");
    const workspace = workspaces.find((ws) => ws.id === resolvedId);
    if (workspace) {
      return { ...DEFAULT_UI_PREFERENCES, ...workspace.uiPreferences };
    }
  }
  return { ...DEFAULT_UI_PREFERENCES };
}

export function saveUiPreferences(
  prefs: Partial<UiPreferences>,
  workspaceId?: string,
  projectPath?: string,
): void {
  // Write to local .forja/config.json when projectPath is provided
  if (projectPath) {
    try {
      patchProjectUi(projectPath, prefs as NonNullable<ForjaProjectConfig["ui"]>);
      return;
    } catch {
      // Fall through to global save
    }
  }

  const resolvedId = workspaceId ?? store.get("activeWorkspaceId");
  if (!resolvedId) return;

  const workspaces = store.get("workspaces");
  const wsIndex = workspaces.findIndex((ws) => ws.id === resolvedId);
  if (wsIndex === -1) return;

  const workspace = workspaces[wsIndex];
  const current = workspace.uiPreferences ?? { ...DEFAULT_UI_PREFERENCES };
  const merged: UiPreferences = { ...DEFAULT_UI_PREFERENCES, ...current, ...prefs };

  const newWorkspaces = [...workspaces];
  newWorkspaces[wsIndex] = { ...workspace, uiPreferences: merged };
  store.set("workspaces", newWorkspaces);
}

// ─── Deprecated Wrappers (backward compatibility) ────────────────────────────
// These delegate to the active workspace. Will be removed in a future version.

/** @deprecated Use getWorkspaceProjects(workspaceId) instead */
export function getRecentProjects(): WorkspaceProject[] {
  const active = getActiveWorkspace();
  if (!active) return [];
  return active.projects;
}

/** @deprecated Use addProjectToWorkspace(workspaceId, path) instead */
export function addRecentProject(projectPath: string): void {
  const activeId = store.get("activeWorkspaceId");
  if (!activeId) return;
  addProjectToWorkspace(activeId, projectPath);
}

/** @deprecated Use removeProjectFromWorkspace(workspaceId, path) instead */
export function removeRecentProject(projectPath: string): void {
  const activeId = store.get("activeWorkspaceId");
  if (!activeId) return;
  removeProjectFromWorkspace(activeId, projectPath);
}

/** @deprecated Use updateWorkspaceProject(workspaceId, path, updates) instead */
export function updateRecentProject(
  projectPath: string,
  updates: { name?: string; icon_path?: string | null }
): void {
  const activeId = store.get("activeWorkspaceId");
  if (!activeId) return;
  updateWorkspaceProject(activeId, projectPath, updates);
}

/** @deprecated Use reorderWorkspaceProjects(workspaceId, orderedPaths) instead */
export function reorderRecentProjects(orderedPaths: string[]): void {
  const activeId = store.get("activeWorkspaceId");
  if (!activeId) return;
  reorderWorkspaceProjects(activeId, orderedPaths);
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

/**
 * Clears only UI-related cached state (layouts, panes, tabs, panel sizes)
 * while preserving workspaces, projects, and plugin configuration.
 */
export function clearUiCache(): void {
  const workspaces = store.get("workspaces");
  const cleaned = workspaces.map((ws) => ({
    ...ws,
    uiPreferences: { ...DEFAULT_UI_PREFERENCES },
    projects: ws.projects.map((p) => {
      clearProjectUi(p.path);
      return p;
    }),
  }));
  store.set("workspaces", cleaned);
}

// ─── Test Helpers (only for use in tests) ────────────────────────────────────

export const _testHelpers = {
  setStoreValue: (key: string, value: unknown) => {
    (store as unknown as { set(key: string, value: unknown): void }).set(key, value);
  },
  getStoreValue: (key: string) => {
    return (store as unknown as { get(key: string): unknown }).get(key);
  },
  runMigration: () => migrateConfigIfNeeded(),
};
