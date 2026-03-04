import Store from "electron-store";
import * as path from "path";
import * as os from "os";

const MAX_RECENT = 10;

interface RecentProject {
  path: string;
  name: string;
  last_opened: string;
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
}

interface ConfigSchema {
  recentProjects: RecentProject[];
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  uiPreferences: UiPreferences;
}

type TypedConfigStore = Store<ConfigSchema> & {
  get<Key extends keyof ConfigSchema>(key: Key): ConfigSchema[Key];
  set<Key extends keyof ConfigSchema>(key: Key, value: ConfigSchema[Key]): void;
};

// Force config location to ~/.config/forja for XDG compliance and
// compatibility with previous TOML-based config path.
const store = new Store<ConfigSchema>({
  name: "config",
  cwd: path.join(os.homedir(), ".config", "forja"),
  defaults: {
    recentProjects: [],
    workspaces: [],
    activeWorkspaceId: null,
    uiPreferences: { sidebarSize: 20, previewSize: 0 },
  },
}) as TypedConfigStore;

// ─── Recent Projects ─────────────────────────────────────────────────────────

export function getRecentProjects(): RecentProject[] {
  return store.get("recentProjects");
}

export function addRecentProject(projectPath: string): void {
  const existing = store.get("recentProjects");
  const name = path.basename(projectPath);
  const lastOpened = new Date().toISOString();

  const filtered = existing.filter((p) => p.path !== projectPath);
  const updated: RecentProject[] = [
    { path: projectPath, name, last_opened: lastOpened },
    ...filtered,
  ].slice(0, MAX_RECENT);

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
  return store.get("uiPreferences");
}

export function saveUiPreferences(prefs: Partial<UiPreferences>): void {
  const current = store.get("uiPreferences");
  store.set("uiPreferences", { ...current, ...prefs });
}
