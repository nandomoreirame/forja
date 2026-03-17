import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Mock electron-store before importing config
vi.mock("electron-store", () => {
  class MockStore<T extends Record<string, unknown>> {
    private store: Record<string, unknown>;
    private defaults: Record<string, unknown>;
    constructor(opts?: { defaults?: T }) {
      this.defaults = { ...(opts?.defaults ?? {}) };
      this.store = { ...this.defaults };
    }
    get<K extends keyof T>(key: K): T[K] {
      return (this.store[key as string] ?? undefined) as T[K];
    }
    set<K extends keyof T>(key: K, value: T[K]): void {
      this.store[key as string] = value;
    }
    has(key: string): boolean {
      return key in this.store;
    }
    delete(key: string): void {
      delete this.store[key];
    }
    clear(): void {
      this.store = { ...this.defaults };
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

  // ─── Workspace CRUD tests ─────────────────────────────────────────────────

  describe("workspaces", () => {
    it("returns empty workspaces by default", async () => {
      const { getWorkspaces } = await import("../config");
      expect(getWorkspaces()).toEqual([]);
    });

    it("creates a workspace with correct fields and default uiPreferences", async () => {
      const { createWorkspace } = await import("../config");
      const before = new Date();
      const ws = createWorkspace("My Workspace");
      const after = new Date();

      expect(ws.id).toBe("test-uuid-1");
      expect(ws.name).toBe("My Workspace");
      expect(ws.projects).toEqual([]);
      expect(ws.uiPreferences).toEqual({
        sidebarSize: 20,
        previewSize: 0,
        sidebarOpen: true,
        terminalSplitEnabled: false,
        terminalSplitOrientation: "vertical",
        terminalSplitRatio: 50,
        rightPanelWidth: 400,
      });
      expect(new Date(ws.createdAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(ws.createdAt).getTime()).toBeLessThanOrEqual(after.getTime());
      expect(new Date(ws.lastUsedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(ws.lastUsedAt).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("creates a workspace with an initial project as WorkspaceProject object", async () => {
      const { createWorkspace } = await import("../config");
      const ws = createWorkspace("Dev Workspace", "/home/user/project-a");

      expect(ws.projects).toHaveLength(1);
      expect(ws.projects[0]).toMatchObject({
        path: "/home/user/project-a",
        name: "project-a",
      });
      expect(ws.projects[0].last_opened).toBeDefined();
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

    it("updateWorkspace with color persists the color", async () => {
      const { createWorkspace, updateWorkspace, getWorkspaces } = await import("../config");
      createWorkspace("Colored Workspace");
      const updated = updateWorkspace("test-uuid-1", { color: "teal" });
      expect(updated).not.toBeNull();
      expect(updated!.color).toBe("teal");
      const workspaces = getWorkspaces();
      expect(workspaces[0].color).toBe("teal");
    });

    it("updateWorkspace with icon persists the icon", async () => {
      const { createWorkspace, updateWorkspace, getWorkspaces } = await import("../config");
      createWorkspace("Iconic Workspace");
      const updated = updateWorkspace("test-uuid-1", { icon: "rocket" });
      expect(updated).not.toBeNull();
      expect(updated!.icon).toBe("rocket");
      const workspaces = getWorkspaces();
      expect(workspaces[0].icon).toBe("rocket");
    });

    it("updateWorkspace with color and icon persists both", async () => {
      const { createWorkspace, updateWorkspace } = await import("../config");
      createWorkspace("Full Workspace");
      const updated = updateWorkspace("test-uuid-1", { color: "blue", icon: "star" });
      expect(updated!.color).toBe("blue");
      expect(updated!.icon).toBe("star");
    });

    it("existing workspace without color/icon reads back without those fields", async () => {
      const { createWorkspace, getWorkspaces } = await import("../config");
      createWorkspace("Plain Workspace");
      const workspaces = getWorkspaces();
      expect(workspaces[0].color).toBeUndefined();
      expect(workspaces[0].icon).toBeUndefined();
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

  // ─── Workspace-scoped project operations ──────────────────────────────────

  describe("workspace projects (nested WorkspaceProject objects)", () => {
    it("addProjectToWorkspace creates full WorkspaceProject object", async () => {
      const { createWorkspace, addProjectToWorkspace } = await import("../config");
      createWorkspace("Workspace");
      const updated = addProjectToWorkspace("test-uuid-1", "/home/user/project-x");

      expect(updated).not.toBeNull();
      expect(updated!.projects).toHaveLength(1);
      expect(updated!.projects[0]).toMatchObject({
        path: "/home/user/project-x",
        name: "project-x",
      });
      expect(updated!.projects[0].last_opened).toBeDefined();
      expect(() => new Date(updated!.projects[0].last_opened)).not.toThrow();
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

    it("removeProjectFromWorkspace removes a project by path", async () => {
      const { createWorkspace, addProjectToWorkspace, removeProjectFromWorkspace } =
        await import("../config");
      createWorkspace("Workspace");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-a");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-b");

      const updated = removeProjectFromWorkspace("test-uuid-1", "/home/user/project-a");
      expect(updated).not.toBeNull();
      expect(updated!.projects.map((p) => p.path)).not.toContain("/home/user/project-a");
      expect(updated!.projects.map((p) => p.path)).toContain("/home/user/project-b");
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

    it("getWorkspaceProjects returns projects for a workspace", async () => {
      const { createWorkspace, addProjectToWorkspace, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-a");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-b");

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects).toHaveLength(2);
      expect(projects[0].path).toBe("/home/user/project-a");
      expect(projects[0].name).toBe("project-a");
      expect(projects[1].path).toBe("/home/user/project-b");
    });

    it("getWorkspaceProjects returns empty array for nonexistent workspace", async () => {
      const { getWorkspaceProjects } = await import("../config");
      expect(getWorkspaceProjects("nonexistent")).toEqual([]);
    });

    it("updateWorkspaceProject changes project name", async () => {
      const { createWorkspace, addProjectToWorkspace, updateWorkspaceProject, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      updateWorkspaceProject("test-uuid-1", "/home/user/my-app", { name: "renamed-app" });

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects[0].name).toBe("renamed-app");
    });

    it("updateWorkspaceProject sets icon_path", async () => {
      const { createWorkspace, addProjectToWorkspace, updateWorkspaceProject, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      updateWorkspaceProject("test-uuid-1", "/home/user/my-app", { icon_path: "/icons/custom.svg" });

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects[0].icon_path).toBe("/icons/custom.svg");
    });

    it("updateWorkspaceProject is a no-op for unknown path", async () => {
      const { createWorkspace, addProjectToWorkspace, updateWorkspaceProject, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      updateWorkspaceProject("test-uuid-1", "/home/user/non-existent", { name: "nope" });

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects[0].name).toBe("my-app");
    });

    it("reorderWorkspaceProjects reorders projects by path", async () => {
      const { createWorkspace, addProjectToWorkspace, reorderWorkspaceProjects, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/a");
      addProjectToWorkspace("test-uuid-1", "/b");
      addProjectToWorkspace("test-uuid-1", "/c");

      reorderWorkspaceProjects("test-uuid-1", ["/c", "/a", "/b"]);

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects.map((p) => p.path)).toEqual(["/c", "/a", "/b"]);
    });

    it("reorderWorkspaceProjects appends unlisted projects at end", async () => {
      const { createWorkspace, addProjectToWorkspace, reorderWorkspaceProjects, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/a");
      addProjectToWorkspace("test-uuid-1", "/b");
      addProjectToWorkspace("test-uuid-1", "/c");

      reorderWorkspaceProjects("test-uuid-1", ["/c", "/a"]);

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects.map((p) => p.path)).toEqual(["/c", "/a", "/b"]);
    });
  });

  // ─── Workspace-scoped Project UI State ─────────────────────────────────────

  describe("workspace-scoped projectUiState", () => {
    it("returns null for a project with no UI state", async () => {
      const { createWorkspace, addProjectToWorkspace, getProjectUiState } = await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");
      expect(getProjectUiState("test-uuid-1", "/home/user/my-app")).toBeNull();
    });

    it("returns null for an unknown project path", async () => {
      const { createWorkspace, getProjectUiState } = await import("../config");
      createWorkspace("WS");
      expect(getProjectUiState("test-uuid-1", "/home/user/non-existent")).toBeNull();
    });

    it("returns null for an unknown workspace", async () => {
      const { getProjectUiState } = await import("../config");
      expect(getProjectUiState("nonexistent", "/home/user/my-app")).toBeNull();
    });

    it("saves and retrieves UI state for a project", async () => {
      const { createWorkspace, addProjectToWorkspace, saveProjectUiState, getProjectUiState } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      saveProjectUiState("test-uuid-1", "/home/user/my-app", {
        sidebarOpen: false,
        rightPanelOpen: true,
        terminalFullscreen: true,
      });

      const state = getProjectUiState("test-uuid-1", "/home/user/my-app");
      expect(state).not.toBeNull();
      expect(state!.sidebarOpen).toBe(false);
      expect(state!.rightPanelOpen).toBe(true);
      expect(state!.terminalFullscreen).toBe(true);
    });

    it("merges partial updates into existing UI state", async () => {
      const { createWorkspace, addProjectToWorkspace, saveProjectUiState, getProjectUiState } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      saveProjectUiState("test-uuid-1", "/home/user/my-app", { sidebarOpen: false });
      saveProjectUiState("test-uuid-1", "/home/user/my-app", { rightPanelOpen: true });

      const state = getProjectUiState("test-uuid-1", "/home/user/my-app");
      expect(state!.sidebarOpen).toBe(false);
      expect(state!.rightPanelOpen).toBe(true);
    });

    it("is a no-op for an unknown project path", async () => {
      const { createWorkspace, saveProjectUiState, getProjectUiState } = await import("../config");
      createWorkspace("WS");
      saveProjectUiState("test-uuid-1", "/home/user/non-existent", { sidebarOpen: false });
      expect(getProjectUiState("test-uuid-1", "/home/user/non-existent")).toBeNull();
    });

    it("stores all ProjectUiState fields", async () => {
      const { createWorkspace, addProjectToWorkspace, saveProjectUiState, getProjectUiState } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      saveProjectUiState("test-uuid-1", "/home/user/my-app", {
        sidebarOpen: true,
        rightPanelOpen: false,
        terminalFullscreen: true,
        previewFile: "/src/main.ts",
        browserOpen: true,
        browserUrl: "http://localhost:3000",
        sidebarSize: 25,
        previewSize: 40,
      });

      const state = getProjectUiState("test-uuid-1", "/home/user/my-app");
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

    it("saves tabs with id, path, and activeTabIndex", async () => {
      const { createWorkspace, addProjectToWorkspace, saveProjectUiState, getProjectUiState } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      saveProjectUiState("test-uuid-1", "/home/user/my-app", {
        tabs: [
          { id: "tab-1", path: "/home/user/my-app", sessionType: "claude" },
          { id: "tab-2", path: "/home/user/my-app", sessionType: "terminal" },
        ],
        activeTabIndex: 1,
      });

      const state = getProjectUiState("test-uuid-1", "/home/user/my-app");
      expect(state).not.toBeNull();
      expect(state!.tabs).toHaveLength(2);
      expect(state!.tabs![0]).toEqual({ id: "tab-1", path: "/home/user/my-app", sessionType: "claude" });
      expect(state!.tabs![1]).toEqual({ id: "tab-2", path: "/home/user/my-app", sessionType: "terminal" });
      expect(state!.activeTabIndex).toBe(1);
    });

    it("merges activeTabIndex into existing UI state without losing other fields", async () => {
      const { createWorkspace, addProjectToWorkspace, saveProjectUiState, getProjectUiState } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      saveProjectUiState("test-uuid-1", "/home/user/my-app", { sidebarOpen: false });
      saveProjectUiState("test-uuid-1", "/home/user/my-app", {
        tabs: [{ id: "tab-1", path: "/home/user/my-app", sessionType: "claude" }],
        activeTabIndex: 0,
      });

      const state = getProjectUiState("test-uuid-1", "/home/user/my-app");
      expect(state!.sidebarOpen).toBe(false);
      expect(state!.activeTabIndex).toBe(0);
      expect(state!.tabs).toHaveLength(1);
    });

    it("saveProjectUiState preserves cliSessionId in tabs", async () => {
      const { createWorkspace, addProjectToWorkspace, saveProjectUiState, getProjectUiState } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/my-app");

      saveProjectUiState("test-uuid-1", "/home/user/my-app", {
        tabs: [
          { id: "tab-1", path: "/home/user/my-app", sessionType: "claude", cliSessionId: "session-abc-123" },
          { id: "tab-2", path: "/home/user/my-app", sessionType: "terminal" },
        ],
        activeTabIndex: 0,
      });

      const state = getProjectUiState("test-uuid-1", "/home/user/my-app");
      expect(state).not.toBeNull();
      expect(state!.tabs).toHaveLength(2);
      expect(state!.tabs![0].cliSessionId).toBe("session-abc-123");
      expect(state!.tabs![1].cliSessionId).toBeUndefined();
    });
  });

  // ─── Workspace lastActiveProjectPath ────────────────────────────────────

  describe("workspace lastActiveProjectPath", () => {
    it("setLastActiveProjectPath sets the field on correct workspace", async () => {
      const { createWorkspace, setLastActiveProjectPath, getWorkspaces } =
        await import("../config");
      createWorkspace("WS");

      setLastActiveProjectPath("test-uuid-1", "/home/user/my-app");

      const workspaces = getWorkspaces();
      expect(workspaces[0].lastActiveProjectPath).toBe("/home/user/my-app");
    });

    it("setLastActiveProjectPath is a no-op for unknown workspace", async () => {
      const { setLastActiveProjectPath, getWorkspaces } = await import("../config");

      setLastActiveProjectPath("nonexistent", "/home/user/my-app");

      const workspaces = getWorkspaces();
      expect(workspaces).toHaveLength(0);
    });

    it("setLastActiveProjectPath updates existing value", async () => {
      const { createWorkspace, setLastActiveProjectPath, getWorkspaces } =
        await import("../config");
      createWorkspace("WS");

      setLastActiveProjectPath("test-uuid-1", "/home/user/project-a");
      setLastActiveProjectPath("test-uuid-1", "/home/user/project-b");

      const workspaces = getWorkspaces();
      expect(workspaces[0].lastActiveProjectPath).toBe("/home/user/project-b");
    });

    it("different workspaces have independent lastActiveProjectPath", async () => {
      const { createWorkspace, setLastActiveProjectPath, getWorkspaces } =
        await import("../config");
      createWorkspace("WS1");
      vi.mocked(crypto.randomUUID).mockReturnValueOnce("test-uuid-2");
      createWorkspace("WS2");

      setLastActiveProjectPath("test-uuid-1", "/project-a");
      setLastActiveProjectPath("test-uuid-2", "/project-b");

      const workspaces = getWorkspaces();
      expect(workspaces[0].lastActiveProjectPath).toBe("/project-a");
      expect(workspaces[1].lastActiveProjectPath).toBe("/project-b");
    });
  });

  // ─── Workspace-scoped UI Preferences ───────────────────────────────────────

  describe("workspace-scoped uiPreferences", () => {
    it("returns default ui preferences for a new workspace", async () => {
      const { createWorkspace, getUiPreferences } = await import("../config");
      createWorkspace("WS");
      const prefs = getUiPreferences("test-uuid-1");

      expect(prefs).toEqual({
        sidebarSize: 20,
        previewSize: 0,
        sidebarOpen: true,
        terminalSplitEnabled: false,
        terminalSplitOrientation: "vertical",
        terminalSplitRatio: 50,
        rightPanelWidth: 400,
      });
    });

    it("saves and retrieves ui preferences per workspace", async () => {
      const { createWorkspace, saveUiPreferences, getUiPreferences } = await import("../config");
      createWorkspace("WS");
      saveUiPreferences({
        sidebarSize: 30,
        previewSize: 40,
        terminalSplitEnabled: true,
      }, "test-uuid-1");
      const prefs = getUiPreferences("test-uuid-1");

      expect(prefs.sidebarSize).toBe(30);
      expect(prefs.previewSize).toBe(40);
      expect(prefs.terminalSplitEnabled).toBe(true);
      // defaults preserved
      expect(prefs.sidebarOpen).toBe(true);
      expect(prefs.rightPanelWidth).toBe(400);
    });

    it("getUiPreferences without workspaceId uses active workspace", async () => {
      const { createWorkspace, setActiveWorkspace, saveUiPreferences, getUiPreferences } =
        await import("../config");
      createWorkspace("WS");
      setActiveWorkspace("test-uuid-1");
      saveUiPreferences({ sidebarSize: 42 }, "test-uuid-1");

      const prefs = getUiPreferences();
      expect(prefs.sidebarSize).toBe(42);
    });

    it("getUiPreferences without workspaceId and no active workspace returns defaults", async () => {
      const { getUiPreferences } = await import("../config");
      const prefs = getUiPreferences();

      expect(prefs).toEqual({
        sidebarSize: 20,
        previewSize: 0,
        sidebarOpen: true,
        terminalSplitEnabled: false,
        terminalSplitOrientation: "vertical",
        terminalSplitRatio: 50,
        rightPanelWidth: 400,
      });
    });

    it("different workspaces have independent ui preferences", async () => {
      const { createWorkspace, saveUiPreferences, getUiPreferences } = await import("../config");
      createWorkspace("WS1");
      vi.mocked(crypto.randomUUID).mockReturnValueOnce("test-uuid-2");
      createWorkspace("WS2");

      saveUiPreferences({ sidebarSize: 25 }, "test-uuid-1");
      saveUiPreferences({ sidebarSize: 35 }, "test-uuid-2");

      expect(getUiPreferences("test-uuid-1").sidebarSize).toBe(25);
      expect(getUiPreferences("test-uuid-2").sidebarSize).toBe(35);
    });
  });

  // ─── Config Migration ──────────────────────────────────────────────────────

  describe("config migration", () => {
    it("migrates old format with recentProjects into default workspace", async () => {
      const config = await import("../config");
      const oldProjects = [
        { path: "/home/user/project-a", name: "project-a", last_opened: "2026-01-01T00:00:00.000Z" },
        { path: "/home/user/project-b", name: "project-b", last_opened: "2026-01-02T00:00:00.000Z", icon_path: "/icon.svg" },
      ];
      const oldUiPrefs = {
        sidebarSize: 30,
        previewSize: 10,
        sidebarOpen: false,
        terminalSplitEnabled: true,
        terminalSplitOrientation: "horizontal" as const,
        terminalSplitRatio: 60,
        rightPanelWidth: 500,
      };

      // Inject old format data
      config._testHelpers.setStoreValue("recentProjects", oldProjects);
      config._testHelpers.setStoreValue("uiPreferences", oldUiPrefs);

      // Run migration
      config._testHelpers.runMigration();

      // Old keys should be removed
      expect(config._testHelpers.getStoreValue("recentProjects")).toBeUndefined();
      expect(config._testHelpers.getStoreValue("uiPreferences")).toBeUndefined();

      // Should have a "Default Workspace" with the old projects
      const workspaces = config.getWorkspaces();
      expect(workspaces.length).toBeGreaterThanOrEqual(1);
      const defaultWs = workspaces.find((ws) => ws.name === "Default Workspace");
      expect(defaultWs).toBeDefined();
      expect(defaultWs!.projects).toHaveLength(2);
      expect(defaultWs!.projects[0].path).toBe("/home/user/project-a");
      expect(defaultWs!.projects[1].icon_path).toBe("/icon.svg");
      expect(defaultWs!.uiPreferences.sidebarSize).toBe(30);
      expect(defaultWs!.uiPreferences.terminalSplitEnabled).toBe(true);
    });

    it("migration merges existing workspaces with string project paths", async () => {
      const config = await import("../config");
      const oldProjects = [
        { path: "/project-a", name: "project-a", last_opened: "2026-01-01T00:00:00.000Z" },
        { path: "/project-b", name: "project-b", last_opened: "2026-01-02T00:00:00.000Z" },
      ];
      const existingWorkspaces = [
        {
          id: "existing-ws",
          name: "My Workspace",
          projects: ["/project-a"], // old string[] format
          createdAt: "2026-01-01T00:00:00.000Z",
          lastUsedAt: "2026-01-01T00:00:00.000Z",
        },
      ];

      config._testHelpers.setStoreValue("recentProjects", oldProjects);
      config._testHelpers.setStoreValue("workspaces", existingWorkspaces);
      config._testHelpers.setStoreValue("uiPreferences", {
        sidebarSize: 20,
        previewSize: 0,
        sidebarOpen: true,
        terminalSplitEnabled: false,
        terminalSplitOrientation: "vertical",
        terminalSplitRatio: 50,
        rightPanelWidth: 400,
      });

      config._testHelpers.runMigration();

      const workspaces = config.getWorkspaces();
      const existingWs = workspaces.find((ws) => ws.id === "existing-ws");
      expect(existingWs).toBeDefined();
      // Project paths should be resolved to full WorkspaceProject objects
      expect(existingWs!.projects[0]).toMatchObject({
        path: "/project-a",
        name: "project-a",
      });
      expect(existingWs!.uiPreferences).toBeDefined();
    });

    it("no-op when config is already in new format", async () => {
      const config = await import("../config");
      // Fresh module — no recentProjects key. Migration should be no-op.
      config._testHelpers.runMigration();

      const workspaces = config.getWorkspaces();
      expect(workspaces).toEqual([]);
    });
  });

  // ─── Auto-migration: global → local .forja/config.json ───────────────────

  describe("auto-migration to local .forja/config.json", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "forja-migration-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("getProjectUiState migrates ui_state from global to local config", async () => {
      const config = await import("../config");
      config.createWorkspace("WS");
      config.addProjectToWorkspace("test-uuid-1", tmpDir);

      // Manually inject ui_state into global (simulating pre-migration data)
      const workspaces = config.getWorkspaces();
      const ws = workspaces[0];
      const updatedProjects = [...ws.projects];
      updatedProjects[0] = {
        ...updatedProjects[0],
        ui_state: {
          sidebarOpen: false,
          tabs: [{ id: "tab-1", sessionType: "claude" }],
          activeTabIndex: 0,
          previewFile: "/src/main.ts",
        },
      };
      config._testHelpers.setStoreValue("workspaces", [
        { ...ws, projects: updatedProjects },
      ]);

      // Call getProjectUiState — should return data and trigger migration
      const state = config.getProjectUiState("test-uuid-1", tmpDir);
      expect(state).not.toBeNull();
      expect(state!.sidebarOpen).toBe(false);
      expect(state!.tabs).toHaveLength(1);

      // Verify local .forja/config.json was created
      const localConfigPath = path.join(tmpDir, ".forja", "config.json");
      expect(fs.existsSync(localConfigPath)).toBe(true);

      const localContent = JSON.parse(fs.readFileSync(localConfigPath, "utf-8"));
      expect(localContent.ui.sidebarOpen).toBe(false);
      expect(localContent.ui.tabs).toHaveLength(1);
      expect(localContent.ui.previewFile).toBe("/src/main.ts");

      // Global ui_state should be cleared
      const migratedWorkspaces = config.getWorkspaces();
      expect(migratedWorkspaces[0].projects[0].ui_state).toBeNull();
    });

    it("getProjectUiState merges workspace uiPreferences into local config", async () => {
      const config = await import("../config");
      config.createWorkspace("WS");
      config.addProjectToWorkspace("test-uuid-1", tmpDir);

      // Set custom workspace uiPreferences
      config.saveUiPreferences({
        sidebarSize: 30,
        terminalSplitEnabled: true,
        terminalSplitRatio: 60,
        rightPanelWidth: 500,
      }, "test-uuid-1");

      // Inject ui_state into global project
      const workspaces = config.getWorkspaces();
      const ws = workspaces[0];
      const updatedProjects = [...ws.projects];
      updatedProjects[0] = {
        ...updatedProjects[0],
        ui_state: { sidebarOpen: false, tabs: [{ sessionType: "terminal" }] },
      };
      config._testHelpers.setStoreValue("workspaces", [
        { ...ws, projects: updatedProjects },
      ]);

      config.getProjectUiState("test-uuid-1", tmpDir);

      // Local config should have merged data from both sources
      const localConfigPath = path.join(tmpDir, ".forja", "config.json");
      const localContent = JSON.parse(fs.readFileSync(localConfigPath, "utf-8"));
      expect(localContent.ui.sidebarOpen).toBe(false); // from ui_state (project precedence)
      expect(localContent.ui.sidebarSize).toBe(30);    // from uiPreferences
      expect(localContent.ui.terminalSplitEnabled).toBe(true); // from uiPreferences
      expect(localContent.ui.rightPanelWidth).toBe(500); // from uiPreferences
    });

    it("getUiPreferences triggers migration and returns migrated data", async () => {
      const config = await import("../config");
      config.createWorkspace("WS");
      config.addProjectToWorkspace("test-uuid-1", tmpDir);

      // Set uiPreferences with layoutJson
      const layoutJson = { global: {}, layout: { type: "row", children: [] } };
      config.saveUiPreferences({
        sidebarSize: 25,
        layoutJson,
      }, "test-uuid-1");

      // Inject ui_state into global project
      const workspaces = config.getWorkspaces();
      const ws = workspaces[0];
      const updatedProjects = [...ws.projects];
      updatedProjects[0] = {
        ...updatedProjects[0],
        ui_state: { sidebarOpen: false },
      };
      config._testHelpers.setStoreValue("workspaces", [
        { ...ws, projects: updatedProjects },
      ]);

      // Call getUiPreferences with projectPath — should trigger migration
      const prefs = config.getUiPreferences("test-uuid-1", tmpDir);
      expect(prefs.sidebarOpen).toBe(false);     // from ui_state
      expect(prefs.sidebarSize).toBe(25);         // from uiPreferences
      expect(prefs.layoutJson).toEqual(layoutJson); // from uiPreferences

      // Verify migration happened
      const localConfigPath = path.join(tmpDir, ".forja", "config.json");
      expect(fs.existsSync(localConfigPath)).toBe(true);
    });

    it("migration is idempotent — does not re-migrate after local exists", async () => {
      const config = await import("../config");
      config.createWorkspace("WS");
      config.addProjectToWorkspace("test-uuid-1", tmpDir);

      // Inject ui_state into global
      const workspaces = config.getWorkspaces();
      const ws = workspaces[0];
      const updatedProjects = [...ws.projects];
      updatedProjects[0] = {
        ...updatedProjects[0],
        ui_state: { sidebarOpen: false },
      };
      config._testHelpers.setStoreValue("workspaces", [
        { ...ws, projects: updatedProjects },
      ]);

      // First call triggers migration
      config.getProjectUiState("test-uuid-1", tmpDir);

      // Now save new data to local (simulating app usage after migration)
      config.saveProjectUiState("test-uuid-1", tmpDir, {
        sidebarOpen: true,
        tabs: [{ sessionType: "claude" }, { sessionType: "terminal" }],
      });

      // Second call should read from local (not re-migrate)
      const state = config.getProjectUiState("test-uuid-1", tmpDir);
      expect(state!.sidebarOpen).toBe(true);
      expect(state!.tabs).toHaveLength(2);
    });

    it("migration does nothing when project has no ui_state in global", async () => {
      const config = await import("../config");
      config.createWorkspace("WS");
      config.addProjectToWorkspace("test-uuid-1", tmpDir);

      // No ui_state set — migration should be a no-op
      const state = config.getProjectUiState("test-uuid-1", tmpDir);
      expect(state).toBeNull();

      // No local config should be created
      const localConfigPath = path.join(tmpDir, ".forja", "config.json");
      expect(fs.existsSync(localConfigPath)).toBe(false);
    });
  });

  // ─── Deprecated backward-compat wrappers ──────────────────────────────────

  describe("deprecated wrappers", () => {
    it("getRecentProjects collects projects from active workspace", async () => {
      const { createWorkspace, addProjectToWorkspace, setActiveWorkspace, getRecentProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-a");
      setActiveWorkspace("test-uuid-1");

      const projects = getRecentProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0].path).toBe("/home/user/project-a");
    });

    it("getRecentProjects returns empty when no active workspace", async () => {
      const { getRecentProjects } = await import("../config");
      expect(getRecentProjects()).toEqual([]);
    });

    it("addRecentProject adds to active workspace", async () => {
      const { createWorkspace, setActiveWorkspace, addRecentProject, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      setActiveWorkspace("test-uuid-1");

      addRecentProject("/home/user/new-project");

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects.some((p) => p.path === "/home/user/new-project")).toBe(true);
    });

    it("removeRecentProject removes from active workspace", async () => {
      const { createWorkspace, addProjectToWorkspace, setActiveWorkspace, removeRecentProject, getWorkspaceProjects } =
        await import("../config");
      createWorkspace("WS");
      addProjectToWorkspace("test-uuid-1", "/home/user/project-a");
      setActiveWorkspace("test-uuid-1");

      removeRecentProject("/home/user/project-a");

      const projects = getWorkspaceProjects("test-uuid-1");
      expect(projects).toHaveLength(0);
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

  // ─── Plugin Order tests ───────────────────────────────────────────────────

  describe("pluginOrder", () => {
    it("returns empty array by default", async () => {
      vi.resetModules();
      const { getPluginOrder } = await import("../config.js");
      expect(getPluginOrder()).toEqual([]);
    });

    it("saves and retrieves plugin order", async () => {
      vi.resetModules();
      const { getPluginOrder, setPluginOrder } = await import("../config.js");
      setPluginOrder(["plugin-b", "plugin-a", "plugin-c"]);
      expect(getPluginOrder()).toEqual(["plugin-b", "plugin-a", "plugin-c"]);
    });

    it("overwrites previous order", async () => {
      vi.resetModules();
      const { getPluginOrder, setPluginOrder } = await import("../config.js");
      setPluginOrder(["a", "b"]);
      setPluginOrder(["b", "a"]);
      expect(getPluginOrder()).toEqual(["b", "a"]);
    });

    it("accepts empty array to clear order", async () => {
      vi.resetModules();
      const { getPluginOrder, setPluginOrder } = await import("../config.js");
      setPluginOrder(["a", "b"]);
      setPluginOrder([]);
      expect(getPluginOrder()).toEqual([]);
    });
  });

  describe("resetConfig", () => {
    it("resets all config to defaults", async () => {
      vi.resetModules();
      const { createWorkspace, getWorkspaces, getUiPreferences, resetConfig } =
        await import("../config.js");

      createWorkspace("Test");

      resetConfig();

      expect(getWorkspaces()).toEqual([]);
      expect(getUiPreferences().sidebarSize).toBe(20);
    });
  });
});
