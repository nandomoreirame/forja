import { describe, it, expect, beforeEach, vi } from "vitest";
import * as path from "path";

// Mock electron-store before importing config
vi.mock("electron-store", () => {
  class MockStore<T extends Record<string, unknown>> {
    private store: Record<string, unknown>;
    constructor(opts?: { defaults?: T }) {
      this.store = { ...(opts?.defaults ?? {}) };
    }
    get<K extends keyof T>(key: K): T[K] {
      return (this.store[key as string] ?? undefined) as T[K];
    }
    set<K extends keyof T>(key: K, value: T[K]): void {
      this.store[key as string] = value;
    }
  }

  return { default: MockStore };
});

// Mock crypto.randomUUID for deterministic tests
vi.stubGlobal("crypto", {
  randomUUID: vi.fn().mockReturnValue("test-uuid-1"),
});

describe("config module", () => {
  beforeEach(async () => {
    vi.resetModules();
    // Reset UUID mock to default value
    vi.mocked(crypto.randomUUID).mockReturnValue("test-uuid-1");
  });

  // ─── Existing recentProjects tests ───────────────────────────────────────

  it("returns empty recent projects by default", async () => {
    const { getRecentProjects } = await import("../config");
    expect(getRecentProjects()).toEqual([]);
  });

  it("adds a recent project", async () => {
    const { addRecentProject, getRecentProjects } = await import("../config");
    addRecentProject("/home/user/my-project");
    const projects = getRecentProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].path).toBe("/home/user/my-project");
    expect(projects[0].name).toBe("my-project");
  });

  it("places most recent project first", async () => {
    const { addRecentProject, getRecentProjects } = await import("../config");
    addRecentProject("/home/user/project-a");
    addRecentProject("/home/user/project-b");
    const projects = getRecentProjects();
    expect(projects[0].path).toBe("/home/user/project-b");
    expect(projects[1].path).toBe("/home/user/project-a");
  });

  it("deduplicates projects on re-add", async () => {
    const { addRecentProject, getRecentProjects } = await import("../config");
    addRecentProject("/home/user/project-a");
    addRecentProject("/home/user/project-b");
    addRecentProject("/home/user/project-a"); // re-add A
    const projects = getRecentProjects();
    expect(projects).toHaveLength(2);
    expect(projects[0].path).toBe("/home/user/project-a"); // A moved to front
  });

  it("limits to 10 recent projects", async () => {
    const { addRecentProject, getRecentProjects } = await import("../config");
    for (let i = 0; i < 12; i++) {
      addRecentProject(`/home/user/project-${i}`);
    }
    const projects = getRecentProjects();
    expect(projects).toHaveLength(10);
  });

  it("stores project name as basename", async () => {
    const { addRecentProject, getRecentProjects } = await import("../config");
    addRecentProject("/some/deep/path/my-app");
    const projects = getRecentProjects();
    expect(projects[0].name).toBe("my-app");
  });

  it("stores last_opened as ISO string", async () => {
    const { addRecentProject, getRecentProjects } = await import("../config");
    addRecentProject("/home/user/proj");
    const projects = getRecentProjects();
    expect(() => new Date(projects[0].last_opened)).not.toThrow();
  });

  it("removes a recent project", async () => {
    const { addRecentProject, removeRecentProject, getRecentProjects } = await import("../config");
    addRecentProject("/home/user/project-a");
    addRecentProject("/home/user/project-b");

    removeRecentProject("/home/user/project-a");

    const projects = getRecentProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].path).toBe("/home/user/project-b");
  });

  it("removeRecentProject is a no-op for unknown path", async () => {
    const { addRecentProject, removeRecentProject, getRecentProjects } = await import("../config");
    addRecentProject("/home/user/project-a");

    removeRecentProject("/home/user/non-existent");

    expect(getRecentProjects()).toHaveLength(1);
  });

  // ─── Workspace CRUD tests ─────────────────────────────────────────────────

  describe("workspaces", () => {
    it("returns empty workspaces by default", async () => {
      const { getWorkspaces } = await import("../config");
      expect(getWorkspaces()).toEqual([]);
    });

    it("creates a workspace with correct fields", async () => {
      const { createWorkspace } = await import("../config");
      const before = new Date();
      const ws = createWorkspace("My Workspace");
      const after = new Date();

      expect(ws.id).toBe("test-uuid-1");
      expect(ws.name).toBe("My Workspace");
      expect(ws.projects).toEqual([]);
      expect(new Date(ws.createdAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(ws.createdAt).getTime()).toBeLessThanOrEqual(after.getTime());
      expect(new Date(ws.lastUsedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(ws.lastUsedAt).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("creates a workspace with an initial project", async () => {
      const { createWorkspace } = await import("../config");
      const ws = createWorkspace("Dev Workspace", "/home/user/project-a");

      expect(ws.projects).toEqual(["/home/user/project-a"]);
    });

    it("persists created workspace in getWorkspaces", async () => {
      const { createWorkspace, getWorkspaces } = await import("../config");
      createWorkspace("Workspace A");
      const workspaces = getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].name).toBe("Workspace A");
    });

    it("updateWorkspace changes workspace name", async () => {
      const { createWorkspace, updateWorkspace } = await import("../config");
      createWorkspace("Original Name");
      const updated = updateWorkspace("test-uuid-1", { name: "New Name" });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("New Name");
      expect(updated!.id).toBe("test-uuid-1");
    });

    it("updateWorkspace returns null if workspace not found", async () => {
      const { updateWorkspace } = await import("../config");
      const result = updateWorkspace("non-existent-id", { name: "New Name" });
      expect(result).toBeNull();
    });

    it("deleteWorkspace removes the workspace", async () => {
      const { createWorkspace, deleteWorkspace, getWorkspaces } = await import("../config");
      createWorkspace("To Delete");
      expect(getWorkspaces()).toHaveLength(1);

      const deleted = deleteWorkspace("test-uuid-1");
      expect(deleted).toBe(true);
      expect(getWorkspaces()).toHaveLength(0);
    });

    it("deleteWorkspace returns false if workspace not found", async () => {
      const { deleteWorkspace } = await import("../config");
      const result = deleteWorkspace("non-existent-id");
      expect(result).toBe(false);
    });

    it("deleteWorkspace clears activeWorkspaceId if it was the active workspace", async () => {
      const { createWorkspace, deleteWorkspace, setActiveWorkspace, getActiveWorkspace } =
        await import("../config");
      createWorkspace("Active One");
      setActiveWorkspace("test-uuid-1");
      expect(getActiveWorkspace()).not.toBeNull();

      deleteWorkspace("test-uuid-1");
      expect(getActiveWorkspace()).toBeNull();
    });

    it("addProjectToWorkspace adds a project path", async () => {
      const { createWorkspace, addProjectToWorkspace } = await import("../config");
      createWorkspace("Workspace");
      const updated = addProjectToWorkspace("test-uuid-1", "/home/user/project-x");

      expect(updated).not.toBeNull();
      expect(updated!.projects).toContain("/home/user/project-x");
    });

    it("addProjectToWorkspace does not duplicate project paths", async () => {
      const { createWorkspace, addProjectToWorkspace } = await import("../config");
      createWorkspace("Workspace");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-x");
      const updated = addProjectToWorkspace("test-uuid-1", "/home/user/project-x");

      expect(updated!.projects).toHaveLength(1);
    });

    it("addProjectToWorkspace returns null if workspace not found", async () => {
      const { addProjectToWorkspace } = await import("../config");
      const result = addProjectToWorkspace("non-existent-id", "/some/path");
      expect(result).toBeNull();
    });

    it("addProjectToWorkspace updates lastUsedAt", async () => {
      const { createWorkspace, addProjectToWorkspace } = await import("../config");
      const ws = createWorkspace("Workspace");
      const originalLastUsed = ws.lastUsedAt;

      // Ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 5));

      const updated = addProjectToWorkspace("test-uuid-1", "/home/user/project-y");
      expect(new Date(updated!.lastUsedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalLastUsed).getTime()
      );
    });

    it("removeProjectFromWorkspace removes a project path", async () => {
      const { createWorkspace, addProjectToWorkspace, removeProjectFromWorkspace } =
        await import("../config");
      createWorkspace("Workspace");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-a");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-b");

      const updated = removeProjectFromWorkspace("test-uuid-1", "/home/user/project-a");
      expect(updated).not.toBeNull();
      expect(updated!.projects).not.toContain("/home/user/project-a");
      expect(updated!.projects).toContain("/home/user/project-b");
    });

    it("removeProjectFromWorkspace returns null if workspace not found", async () => {
      const { removeProjectFromWorkspace } = await import("../config");
      const result = removeProjectFromWorkspace("non-existent-id", "/some/path");
      expect(result).toBeNull();
    });

    it("removeProjectFromWorkspace updates lastUsedAt", async () => {
      const { createWorkspace, addProjectToWorkspace, removeProjectFromWorkspace } =
        await import("../config");
      const ws = createWorkspace("Workspace");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-a");
      const originalLastUsed = ws.lastUsedAt;

      await new Promise((resolve) => setTimeout(resolve, 5));

      const updated = removeProjectFromWorkspace("test-uuid-1", "/home/user/project-a");
      expect(new Date(updated!.lastUsedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalLastUsed).getTime()
      );
    });

    it("setActiveWorkspace sets the active workspace ID", async () => {
      const { createWorkspace, setActiveWorkspace, getActiveWorkspace } =
        await import("../config");
      createWorkspace("Workspace");
      setActiveWorkspace("test-uuid-1");
      const active = getActiveWorkspace();

      expect(active).not.toBeNull();
      expect(active!.id).toBe("test-uuid-1");
    });

    it("setActiveWorkspace accepts null to clear active workspace", async () => {
      const { createWorkspace, setActiveWorkspace, getActiveWorkspace } =
        await import("../config");
      createWorkspace("Workspace");
      setActiveWorkspace("test-uuid-1");
      setActiveWorkspace(null);

      expect(getActiveWorkspace()).toBeNull();
    });

    it("getActiveWorkspace returns null when no workspace is active", async () => {
      const { getActiveWorkspace } = await import("../config");
      expect(getActiveWorkspace()).toBeNull();
    });

    it("getActiveWorkspace returns null if activeWorkspaceId does not match any workspace", async () => {
      const { setActiveWorkspace, getActiveWorkspace } = await import("../config");
      // Set an ID without creating a workspace
      setActiveWorkspace("ghost-id");
      expect(getActiveWorkspace()).toBeNull();
    });
  });

  // ─── Reorder Recent Projects tests ─────────────────────────────────────────

  describe("reorderRecentProjects", () => {
    it("reorders projects by path array", async () => {
      const { addRecentProject, reorderRecentProjects, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/project-a");
      addRecentProject("/home/user/project-b");
      addRecentProject("/home/user/project-c");

      reorderRecentProjects([
        "/home/user/project-a",
        "/home/user/project-c",
        "/home/user/project-b",
      ]);

      const projects = getRecentProjects();
      expect(projects.map((p) => p.path)).toEqual([
        "/home/user/project-a",
        "/home/user/project-c",
        "/home/user/project-b",
      ]);
    });

    it("appends projects not in the order array at the end", async () => {
      const { addRecentProject, reorderRecentProjects, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/project-a");
      addRecentProject("/home/user/project-b");
      addRecentProject("/home/user/project-c");

      // Only specify order for two projects; project-b should be appended
      reorderRecentProjects(["/home/user/project-a", "/home/user/project-c"]);

      const projects = getRecentProjects();
      expect(projects.map((p) => p.path)).toEqual([
        "/home/user/project-a",
        "/home/user/project-c",
        "/home/user/project-b",
      ]);
    });

    it("ignores unknown paths in the order array", async () => {
      const { addRecentProject, reorderRecentProjects, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/project-a");
      addRecentProject("/home/user/project-b");

      reorderRecentProjects([
        "/home/user/non-existent",
        "/home/user/project-b",
        "/home/user/project-a",
      ]);

      const projects = getRecentProjects();
      expect(projects.map((p) => p.path)).toEqual([
        "/home/user/project-b",
        "/home/user/project-a",
      ]);
    });

    it("preserves all fields (name, last_opened) after reorder", async () => {
      const { addRecentProject, reorderRecentProjects, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/project-a");
      addRecentProject("/home/user/project-b");

      reorderRecentProjects(["/home/user/project-a", "/home/user/project-b"]);

      const projects = getRecentProjects();
      expect(projects[0].name).toBe("project-a");
      expect(projects[0].last_opened).toBeDefined();
      expect(projects[1].name).toBe("project-b");
    });
  });

  // ─── updateRecentProject tests ─────────────────────────────────────────────

  describe("updateRecentProject", () => {
    it("updates name for an existing project", async () => {
      const { addRecentProject, updateRecentProject, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/my-app");

      updateRecentProject("/home/user/my-app", { name: "renamed-app" });

      const projects = getRecentProjects();
      expect(projects[0].name).toBe("renamed-app");
    });

    it("sets icon_path for an existing project", async () => {
      const { addRecentProject, updateRecentProject, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/my-app");

      updateRecentProject("/home/user/my-app", { icon_path: "/icons/custom.svg" });

      const projects = getRecentProjects();
      expect(projects[0].icon_path).toBe("/icons/custom.svg");
    });

    it("clears icon_path with null", async () => {
      const { addRecentProject, updateRecentProject, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/my-app");
      updateRecentProject("/home/user/my-app", { icon_path: "/icons/custom.svg" });

      updateRecentProject("/home/user/my-app", { icon_path: null });

      const projects = getRecentProjects();
      expect(projects[0].icon_path).toBeNull();
    });

    it("is a no-op for unknown path", async () => {
      const { addRecentProject, updateRecentProject, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/my-app");

      updateRecentProject("/home/user/non-existent", { name: "nope" });

      const projects = getRecentProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("my-app");
    });

    it("updates both name and icon_path at once", async () => {
      const { addRecentProject, updateRecentProject, getRecentProjects } =
        await import("../config");
      addRecentProject("/home/user/my-app");

      updateRecentProject("/home/user/my-app", {
        name: "new-name",
        icon_path: "/icons/new.png",
      });

      const projects = getRecentProjects();
      expect(projects[0].name).toBe("new-name");
      expect(projects[0].icon_path).toBe("/icons/new.png");
    });
  });

  // ─── addRecentProject preserves icon_path ─────────────────────────────────

  it("addRecentProject preserves existing icon_path on re-add", async () => {
    const { addRecentProject, updateRecentProject, getRecentProjects } =
      await import("../config");
    addRecentProject("/home/user/my-app");
    updateRecentProject("/home/user/my-app", { icon_path: "/icons/custom.svg" });

    // Re-add the same project (e.g., user opens it again)
    addRecentProject("/home/user/my-app");

    const projects = getRecentProjects();
    expect(projects[0].icon_path).toBe("/icons/custom.svg");
  });

  // ─── Project UI State tests ──────────────────────────────────────────────────

  describe("projectUiState", () => {
    it("returns null for a project with no UI state", async () => {
      const { addRecentProject, getProjectUiState } = await import("../config");
      addRecentProject("/home/user/my-app");
      expect(getProjectUiState("/home/user/my-app")).toBeNull();
    });

    it("returns null for an unknown project path", async () => {
      const { getProjectUiState } = await import("../config");
      expect(getProjectUiState("/home/user/non-existent")).toBeNull();
    });

    it("saves and retrieves UI state for a project", async () => {
      const { addRecentProject, saveProjectUiState, getProjectUiState } =
        await import("../config");
      addRecentProject("/home/user/my-app");

      saveProjectUiState("/home/user/my-app", {
        sidebarOpen: false,
        rightPanelOpen: true,
        terminalFullscreen: true,
      });

      const state = getProjectUiState("/home/user/my-app");
      expect(state).not.toBeNull();
      expect(state!.sidebarOpen).toBe(false);
      expect(state!.rightPanelOpen).toBe(true);
      expect(state!.terminalFullscreen).toBe(true);
    });

    it("merges partial updates into existing UI state", async () => {
      const { addRecentProject, saveProjectUiState, getProjectUiState } =
        await import("../config");
      addRecentProject("/home/user/my-app");

      saveProjectUiState("/home/user/my-app", { sidebarOpen: false });
      saveProjectUiState("/home/user/my-app", { rightPanelOpen: true });

      const state = getProjectUiState("/home/user/my-app");
      expect(state!.sidebarOpen).toBe(false);
      expect(state!.rightPanelOpen).toBe(true);
    });

    it("is a no-op for an unknown project path", async () => {
      const { saveProjectUiState, getProjectUiState } = await import("../config");
      saveProjectUiState("/home/user/non-existent", { sidebarOpen: false });
      expect(getProjectUiState("/home/user/non-existent")).toBeNull();
    });

    it("preserves UI state when project is re-added", async () => {
      const { addRecentProject, saveProjectUiState, getProjectUiState } =
        await import("../config");
      addRecentProject("/home/user/my-app");
      saveProjectUiState("/home/user/my-app", { sidebarOpen: false });

      // Re-add same project (simulates user opening it again)
      addRecentProject("/home/user/my-app");

      const state = getProjectUiState("/home/user/my-app");
      expect(state).not.toBeNull();
      expect(state!.sidebarOpen).toBe(false);
    });

    it("stores all ProjectUiState fields", async () => {
      const { addRecentProject, saveProjectUiState, getProjectUiState } =
        await import("../config");
      addRecentProject("/home/user/my-app");

      saveProjectUiState("/home/user/my-app", {
        sidebarOpen: true,
        rightPanelOpen: false,
        terminalFullscreen: true,
        previewFile: "/src/main.ts",
        browserOpen: true,
        browserUrl: "http://localhost:3000",
        sidebarSize: 25,
        previewSize: 40,
      });

      const state = getProjectUiState("/home/user/my-app");
      expect(state).toEqual({
        sidebarOpen: true,
        rightPanelOpen: false,
        terminalFullscreen: true,
        previewFile: "/src/main.ts",
        browserOpen: true,
        browserUrl: "http://localhost:3000",
        sidebarSize: 25,
        previewSize: 40,
      });
    });

    it("clears previewFile with null", async () => {
      const { addRecentProject, saveProjectUiState, getProjectUiState } =
        await import("../config");
      addRecentProject("/home/user/my-app");
      saveProjectUiState("/home/user/my-app", { previewFile: "/src/main.ts" });
      saveProjectUiState("/home/user/my-app", { previewFile: null });

      const state = getProjectUiState("/home/user/my-app");
      expect(state!.previewFile).toBeNull();
    });
  });

  // ─── UI Preferences tests ──────────────────────────────────────────────────

  describe("uiPreferences", () => {
    it("returns default ui preferences when none are saved", async () => {
      const { getUiPreferences } = await import("../config");
      const prefs = getUiPreferences();

      expect(prefs).toEqual({
        sidebarSize: 20,
        previewSize: 0,
        sidebarOpen: true,
        terminalSplitEnabled: false,
        terminalSplitOrientation: "vertical",
        terminalSplitRatio: 50,
      });
    });

    it("saves and retrieves ui preferences", async () => {
      const { saveUiPreferences, getUiPreferences } = await import("../config");
      saveUiPreferences({
        sidebarSize: 30,
        previewSize: 40,
        terminalSplitEnabled: true,
        terminalSplitOrientation: "horizontal",
        terminalSplitRatio: 65,
      });
      const prefs = getUiPreferences();

      expect(prefs).toEqual({
        sidebarSize: 30,
        previewSize: 40,
        sidebarOpen: true,
        terminalSplitEnabled: true,
        terminalSplitOrientation: "horizontal",
        terminalSplitRatio: 65,
      });
    });

    it("supports partial updates preserving existing values", async () => {
      const { saveUiPreferences, getUiPreferences } = await import("../config");
      saveUiPreferences({ sidebarSize: 25 });
      const prefs = getUiPreferences();

      expect(prefs.sidebarSize).toBe(25);
      expect(prefs.previewSize).toBe(0); // default preserved
    });

    it("supports updating only previewSize", async () => {
      const { saveUiPreferences, getUiPreferences } = await import("../config");
      saveUiPreferences({ previewSize: 35 });
      const prefs = getUiPreferences();

      expect(prefs.sidebarSize).toBe(20); // default preserved
      expect(prefs.previewSize).toBe(35);
    });

    it("returns sidebarOpen true by default", async () => {
      const { getUiPreferences } = await import("../config");
      const prefs = getUiPreferences();

      expect(prefs.sidebarOpen).toBe(true);
    });

    it("returns default terminal split preferences", async () => {
      const { getUiPreferences } = await import("../config");
      const prefs = getUiPreferences();

      expect(prefs.terminalSplitEnabled).toBe(false);
      expect(prefs.terminalSplitOrientation).toBe("vertical");
      expect(prefs.terminalSplitRatio).toBe(50);
    });

    it("saves and retrieves sidebarOpen", async () => {
      const { saveUiPreferences, getUiPreferences } = await import("../config");
      saveUiPreferences({ sidebarOpen: false });
      const prefs = getUiPreferences();

      expect(prefs.sidebarOpen).toBe(false);
      expect(prefs.sidebarSize).toBe(20); // other defaults preserved
    });
  });

  // ─── Plugin Config tests ───────────────────────────────────────────────────

  describe("plugin config", () => {
    it("returns empty array for plugin permissions by default", async () => {
      vi.resetModules();
      const { getPluginPermissions } = await import("../config.js");
      expect(getPluginPermissions()).toEqual([]);
    });

    it("saves and retrieves plugin permission grants", async () => {
      vi.resetModules();
      const { getPluginPermissions, setPluginPermission } = await import("../config.js");
      const grant = {
        pluginName: "test-plugin",
        grantedPermissions: ["project.active"] as const,
        deniedPermissions: [] as const,
        grantedAt: new Date().toISOString(),
      };
      setPluginPermission(grant);
      const perms = getPluginPermissions();
      expect(perms).toContainEqual(grant);
    });

    it("updates existing plugin permission grant", async () => {
      vi.resetModules();
      const { getPluginPermissions, setPluginPermission } = await import("../config.js");
      const grant1 = {
        pluginName: "test-plugin",
        grantedPermissions: ["project.active"] as const,
        deniedPermissions: [] as const,
        grantedAt: new Date().toISOString(),
      };
      setPluginPermission(grant1);
      const grant2 = {
        pluginName: "test-plugin",
        grantedPermissions: ["project.active", "git.status"] as const,
        deniedPermissions: [] as const,
        grantedAt: new Date().toISOString(),
      };
      setPluginPermission(grant2);
      const perms = getPluginPermissions();
      expect(perms.filter((p) => p.pluginName === "test-plugin")).toHaveLength(1);
      expect(perms.find((p) => p.pluginName === "test-plugin")?.grantedPermissions).toContain("git.status");
    });

    it("removes plugin permission", async () => {
      vi.resetModules();
      const { getPluginPermissions, setPluginPermission, removePluginPermission } = await import("../config.js");
      setPluginPermission({
        pluginName: "test-plugin",
        grantedPermissions: ["project.active"] as const,
        deniedPermissions: [] as const,
        grantedAt: new Date().toISOString(),
      });
      removePluginPermission("test-plugin");
      expect(getPluginPermissions()).toEqual([]);
    });

    it("returns empty array for enabled plugins by default", async () => {
      vi.resetModules();
      const { getEnabledPlugins } = await import("../config.js");
      expect(getEnabledPlugins()).toEqual([]);
    });

    it("enables and disables plugins", async () => {
      vi.resetModules();
      const { getEnabledPlugins, setPluginEnabled } = await import("../config.js");
      setPluginEnabled("test-plugin", true);
      expect(getEnabledPlugins()).toContain("test-plugin");
      setPluginEnabled("test-plugin", false);
      expect(getEnabledPlugins()).not.toContain("test-plugin");
    });

    it("does not duplicate enabled plugin names", async () => {
      vi.resetModules();
      const { getEnabledPlugins, setPluginEnabled } = await import("../config.js");
      setPluginEnabled("test-plugin", true);
      setPluginEnabled("test-plugin", true);
      expect(getEnabledPlugins().filter((n) => n === "test-plugin")).toHaveLength(1);
    });
  });
});
