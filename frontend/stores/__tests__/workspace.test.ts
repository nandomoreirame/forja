import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorkspaceStore } from "../workspace";
import { useFileTreeStore } from "../file-tree";
import { useProjectsStore } from "../projects";
import { useTerminalTabsStore } from "../terminal-tabs";
import { useTilingLayoutStore } from "../tiling-layout";
import type { Workspace, WorkspaceProject } from "../workspace";
import { _resetLoadWorkspacesGuard } from "../workspace";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  getCurrentWindow: () => ({ label: "main" }),
}));

const makeProject = (path: string): WorkspaceProject => ({
  path,
  name: path.split("/").pop() ?? path,
  last_opened: "2026-03-03T00:00:00.000Z",
});

const makeWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: "ws-1",
  name: "My Workspace",
  projects: [],
  uiPreferences: {
    sidebarSize: 20,
    previewSize: 0,
    sidebarOpen: true,
    terminalSplitEnabled: false,
    terminalSplitOrientation: "vertical",
    terminalSplitRatio: 50,
    rightPanelWidth: 400,
  },
  createdAt: "2026-03-03T00:00:00.000Z",
  lastUsedAt: "2026-03-03T00:00:00.000Z",
  ...overrides,
});

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    _resetLoadWorkspacesGuard();
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
    });
    mockInvoke.mockReset();
    // Default: any unmatched invoke call returns a resolved Promise (fire-and-forget calls like close_pty)
    mockInvoke.mockResolvedValue(undefined);
  });

  it("starts with empty workspaces and no active workspace", () => {
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.activeWorkspaceId).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("loadWorkspaces fetches workspaces and active workspace", async () => {
    const ws1 = makeWorkspace({ id: "ws-1", name: "Workspace 1" });
    const ws2 = makeWorkspace({ id: "ws-2", name: "Workspace 2" });
    const activeWs = makeWorkspace({ id: "ws-1", name: "Workspace 1" });

    mockInvoke
      .mockResolvedValueOnce([ws1, ws2])
      .mockResolvedValueOnce(activeWs);

    await useWorkspaceStore.getState().loadWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([ws1, ws2]);
    expect(state.activeWorkspaceId).toBe("ws-1");
    expect(state.loading).toBe(false);

    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
    expect(mockInvoke).toHaveBeenCalledWith("get_active_workspace");
  });

  it("loadWorkspaces sets loading state", async () => {
    let resolveWorkspaces!: (value: Workspace[]) => void;
    let resolveActive!: (value: null) => void;

    mockInvoke
      .mockReturnValueOnce(
        new Promise<Workspace[]>((res) => {
          resolveWorkspaces = res;
        }),
      )
      .mockReturnValueOnce(
        new Promise<null>((res) => {
          resolveActive = res;
        }),
      );

    const promise = useWorkspaceStore.getState().loadWorkspaces();

    expect(useWorkspaceStore.getState().loading).toBe(true);

    resolveWorkspaces([]);
    resolveActive(null);
    await promise;

    expect(useWorkspaceStore.getState().loading).toBe(false);
  });

  it("loadWorkspaces auto-creates a default workspace when none exist", async () => {
    const defaultWs = makeWorkspace({ id: "ws-default", name: "Default Workspace" });

    mockInvoke
      .mockResolvedValueOnce([])  // get_workspaces (empty)
      .mockResolvedValueOnce(null) // get_active_workspace (none)
      .mockResolvedValueOnce(defaultWs) // create_workspace
      .mockResolvedValueOnce(undefined); // set_active_workspace

    await useWorkspaceStore.getState().loadWorkspaces();

    expect(mockInvoke).toHaveBeenCalledWith("create_workspace", {
      name: "Default Workspace",
    });
    expect(mockInvoke).toHaveBeenCalledWith("set_active_workspace", {
      id: "ws-default",
    });

    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.activeWorkspaceId).toBe("ws-default");
  });

  it("loadWorkspaces does NOT auto-create when workspaces already exist", async () => {
    const existingWs = makeWorkspace({ id: "ws-1" });

    mockInvoke
      .mockResolvedValueOnce([existingWs]) // get_workspaces
      .mockResolvedValueOnce(existingWs);  // get_active_workspace

    await useWorkspaceStore.getState().loadWorkspaces();

    // Should NOT call create_workspace
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "create_workspace",
      expect.anything()
    );
  });

  it("concurrent loadWorkspaces calls only create one default workspace", async () => {
    const defaultWs = makeWorkspace({ id: "ws-default", name: "Default Workspace" });

    // Both concurrent calls see empty workspaces and null active
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_workspaces") return Promise.resolve([]);
      if (cmd === "get_active_workspace") return Promise.resolve(null);
      if (cmd === "create_workspace") return Promise.resolve(defaultWs);
      if (cmd === "set_active_workspace") return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    // Fire two concurrent calls (simulating App.tsx + workspace-switcher)
    const p1 = useWorkspaceStore.getState().loadWorkspaces();
    const p2 = useWorkspaceStore.getState().loadWorkspaces();
    await Promise.all([p1, p2]);

    // create_workspace should only have been called ONCE
    const createCalls = mockInvoke.mock.calls.filter(
      (call) => call[0] === "create_workspace"
    );
    expect(createCalls).toHaveLength(1);
  });

  it("loadWorkspaces preserves existing activeWorkspaceId instead of overwriting from config", async () => {
    const wsForja = makeWorkspace({ id: "ws-forja", name: "Forja" });
    const wsLiquid = makeWorkspace({ id: "ws-liquid", name: "Liquid" });

    // Window A already has its local activeWorkspaceId set to "ws-forja"
    useWorkspaceStore.setState({ activeWorkspaceId: "ws-forja" });

    // Global config returns "ws-liquid" as active (set by Window B)
    mockInvoke
      .mockResolvedValueOnce([wsForja, wsLiquid]) // get_workspaces
      .mockResolvedValueOnce(wsLiquid);           // get_active_workspace (from config)

    await useWorkspaceStore.getState().loadWorkspaces();

    const state = useWorkspaceStore.getState();
    // Must preserve "ws-forja" — NOT overwrite with "ws-liquid" from config
    expect(state.activeWorkspaceId).toBe("ws-forja");
    expect(state.workspaces).toEqual([wsForja, wsLiquid]);
  });

  it("loadWorkspaces uses config activeWorkspaceId when local is null", async () => {
    const ws1 = makeWorkspace({ id: "ws-1", name: "Workspace 1" });

    // No local activeWorkspaceId set (null)
    useWorkspaceStore.setState({ activeWorkspaceId: null });

    mockInvoke
      .mockResolvedValueOnce([ws1])  // get_workspaces
      .mockResolvedValueOnce(ws1);   // get_active_workspace

    await useWorkspaceStore.getState().loadWorkspaces();

    // Should use value from config since local is null
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("ws-1");
  });

  it("loadWorkspaces handles error gracefully", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));

    await useWorkspaceStore.getState().loadWorkspaces();

    const state = useWorkspaceStore.getState();
    expect(state.loading).toBe(false);
    expect(state.workspaces).toEqual([]);
  });

  it("createWorkspace calls IPC and reloads", async () => {
    const newWs = makeWorkspace({ id: "ws-new", name: "New Workspace" });

    mockInvoke
      .mockResolvedValueOnce(newWs) // create_workspace
      .mockResolvedValueOnce([newWs]) // get_workspaces (loadWorkspaces)
      .mockResolvedValueOnce(null); // get_active_workspace (loadWorkspaces)

    const result = await useWorkspaceStore.getState().createWorkspace("New Workspace");

    expect(result).toEqual(newWs);
    expect(mockInvoke).toHaveBeenCalledWith("create_workspace", {
      name: "New Workspace",
      initialProject: undefined,
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("createWorkspace with initialProject passes it through", async () => {
    const newWs = makeWorkspace({ id: "ws-new", name: "New Workspace" });

    mockInvoke
      .mockResolvedValueOnce(newWs)
      .mockResolvedValueOnce([newWs])
      .mockResolvedValueOnce(null);

    await useWorkspaceStore.getState().createWorkspace("New Workspace", "/my/project");

    expect(mockInvoke).toHaveBeenCalledWith("create_workspace", {
      name: "New Workspace",
      initialProject: "/my/project",
    });
  });

  it("deleteWorkspace calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // delete_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().deleteWorkspace("ws-1");

    expect(mockInvoke).toHaveBeenCalledWith("delete_workspace", { id: "ws-1" });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("renameWorkspace calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // update_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().renameWorkspace("ws-1", "Renamed Workspace");

    expect(mockInvoke).toHaveBeenCalledWith("update_workspace", {
      id: "ws-1",
      name: "Renamed Workspace",
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("addProject calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // add_project_to_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().addProject("ws-1", "/my/new/project");

    expect(mockInvoke).toHaveBeenCalledWith("add_project_to_workspace", {
      workspaceId: "ws-1",
      projectPath: "/my/new/project",
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("removeProject calls IPC and reloads", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined) // remove_project_from_workspace
      .mockResolvedValueOnce([]) // get_workspaces
      .mockResolvedValueOnce(null); // get_active_workspace

    await useWorkspaceStore.getState().removeProject("ws-1", "/my/project");

    expect(mockInvoke).toHaveBeenCalledWith("remove_project_from_workspace", {
      workspaceId: "ws-1",
      projectPath: "/my/project",
    });
    expect(mockInvoke).toHaveBeenCalledWith("get_workspaces");
  });

  it("setActiveWorkspace calls IPC and updates state", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await useWorkspaceStore.getState().setActiveWorkspace("ws-1");

    expect(mockInvoke).toHaveBeenCalledWith("set_active_workspace", { id: "ws-1" });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("ws-1");
  });

  it("openWorkspaceInNewWindow calls IPC", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    await useWorkspaceStore.getState().openWorkspaceInNewWindow("ws-1");

    expect(mockInvoke).toHaveBeenCalledWith("open_workspace_in_new_window", {
      workspaceId: "ws-1",
    });
  });

  describe("activateWorkspace", () => {
    it("sets active workspace and loads project trees", async () => {
      const ws = makeWorkspace({
        id: "ws-1",
        projects: [makeProject("/project/a"), makeProject("/project/b")],
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([]); // get_workspace_projects (loadProjects)

      await useWorkspaceStore.getState().activateWorkspace("ws-1");

      expect(mockInvoke).toHaveBeenCalledWith("set_active_workspace", { id: "ws-1" });
      expect(mockLoadProjectTree).toHaveBeenCalledWith("/project/a");
      expect(mockLoadProjectTree).toHaveBeenCalledWith("/project/b");
      expect(mockOpenProjectPath).toHaveBeenCalledWith("/project/a");
    });

    it("does nothing if workspace not found", async () => {
      useWorkspaceStore.setState({ workspaces: [] });

      await useWorkspaceStore.getState().activateWorkspace("nonexistent");

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("clears existing file trees before loading new workspace projects", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/new")],
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      // Pre-populate file tree store with trees from a previous workspace
      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        trees: {
          "/project/old-a": { root: { name: "old-a", path: "/project/old-a", isDir: true } },
          "/project/old-b": { root: { name: "old-b", path: "/project/old-b", isDir: true } },
        },
        expandedPaths: { "/project/old-a": true },
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([]); // get_workspace_projects (loadProjects)

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // After activating new workspace, old trees must be cleared
      const fileTreeState = useFileTreeStore.getState();
      expect(fileTreeState.trees).not.toHaveProperty("/project/old-a");
      expect(fileTreeState.trees).not.toHaveProperty("/project/old-b");
      expect(fileTreeState.expandedPaths).toEqual({});
      expect(mockLoadProjectTree).toHaveBeenCalledWith("/project/new");
    });

    it("clears the projects sidebar store on activation", async () => {
      const ws = makeWorkspace({ id: "ws-1", projects: [] });
      useWorkspaceStore.setState({ workspaces: [ws] });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      // Pre-populate projects store
      useProjectsStore.setState({
        projects: [{ path: "/old/project", name: "old-project", lastOpened: "2026-01-01" }],
        activeProjectPath: "/old/project",
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([]); // get_workspace_projects (empty workspace)

      await useWorkspaceStore.getState().activateWorkspace("ws-1");

      // Workspace with no projects results in empty projects store
      const projectsState = useProjectsStore.getState();
      expect(projectsState.projects).toEqual([]);
      expect(projectsState.activeProjectPath).toBeNull();
    });

    it("reloads the projects store after activation", async () => {
      const ws = makeWorkspace({
        id: "ws-1",
        projects: [makeProject("/project/a"), makeProject("/project/b")],
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      // Mock IPC calls:
      // 1. set_active_workspace
      // 2. get_workspace_projects (called by loadProjects)
      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([ // get_workspace_projects
          { path: "/project/a", name: "a", last_opened: "2026-01-01" },
          { path: "/project/b", name: "b", last_opened: "2026-01-01" },
        ]);

      await useWorkspaceStore.getState().activateWorkspace("ws-1");

      // loadProjects should have been called (via get_workspace_projects IPC)
      expect(mockInvoke).toHaveBeenCalledWith("get_workspace_projects", {
        workspaceId: "ws-1",
      });

      // Projects store should be populated
      const projectsState = useProjectsStore.getState();
      expect(projectsState.projects).toHaveLength(2);
      expect(projectsState.projects[0].path).toBe("/project/a");
      expect(projectsState.projects[1].path).toBe("/project/b");
    });

    it("does not open project path when workspace has no projects", async () => {
      const ws = makeWorkspace({ id: "ws-empty", projects: [] });
      useWorkspaceStore.setState({ workspaces: [ws] });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([]); // get_workspace_projects (empty)

      await useWorkspaceStore.getState().activateWorkspace("ws-empty");

      expect(mockLoadProjectTree).not.toHaveBeenCalled();
      expect(mockOpenProjectPath).not.toHaveBeenCalled();
    });

    it("clears terminal tabs and resets tiling layout when switching workspaces", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/new")],
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      // Pre-populate terminal tabs from previous workspace
      useTerminalTabsStore.setState({
        tabs: [
          { id: "tab-old-1", name: "Claude", path: "/project/old", isRunning: true, sessionType: "claude" },
          { id: "tab-old-2", name: "Terminal", path: "/project/old", isRunning: true, sessionType: "terminal" },
        ],
        activeTabId: "tab-old-1",
      });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([])        // get_workspace_projects
        .mockResolvedValueOnce(null);     // get_project_ui_state (no saved state)

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // Terminal tabs from previous workspace must be cleared
      const tabsState = useTerminalTabsStore.getState();
      expect(tabsState.tabs).toEqual([]);
      expect(tabsState.activeTabId).toBeNull();
    });

    it("closes existing PTYs via IPC before clearing terminal tabs on workspace switch", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/new")],
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      // Pre-populate terminal tabs from previous workspace
      useTerminalTabsStore.setState({
        tabs: [
          { id: "tab-old-1", name: "Claude", path: "/project/old", isRunning: true, sessionType: "claude" },
          { id: "tab-old-2", name: "Terminal", path: "/project/old", isRunning: true, sessionType: "terminal" },
        ],
        activeTabId: "tab-old-1",
      });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([])        // get_workspace_projects
        .mockResolvedValueOnce(null);     // get_project_ui_state (no saved state)

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // Must have called close_pty for each tab before clearing
      expect(mockInvoke).toHaveBeenCalledWith("close_pty", { tabId: "tab-old-1" });
      expect(mockInvoke).toHaveBeenCalledWith("close_pty", { tabId: "tab-old-2" });
    });

    it("does not call close_pty when there are no existing tabs on workspace switch", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/new")],
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      // No existing tabs
      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      mockInvoke
        .mockResolvedValueOnce(undefined) // set_active_workspace
        .mockResolvedValueOnce([])        // get_workspace_projects
        .mockResolvedValueOnce(null);     // get_project_ui_state

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // Must NOT call close_pty at all when no tabs exist
      expect(mockInvoke).not.toHaveBeenCalledWith("close_pty", expect.anything());
    });

    it("saves outgoing layout and restores incoming layout on workspace switch", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/new")],
      });
      useWorkspaceStore.setState({ workspaces: [ws], activeWorkspaceId: "ws-1" });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      // Saved layout for ws-2 includes a file-tree block
      const savedLayoutJson = {
        global: {},
        layout: {
          type: "row",
          children: [
            {
              type: "tabset",
              id: "tabset-file-tree",
              children: [{ type: "tab", id: "tab-file-tree", name: "Files", component: "file-tree" }],
            },
            {
              type: "tabset",
              id: "tabset-main",
              children: [],
            },
          ],
        },
      };

      const savedUiPrefs = {
        sidebarSize: 20,
        previewSize: 0,
        sidebarOpen: true,
        terminalSplitEnabled: false,
        terminalSplitOrientation: "vertical",
        terminalSplitRatio: 50,
        rightPanelWidth: 400,
        layoutJson: savedLayoutJson,
      };

      const loadFromJsonSpy = vi.spyOn(useTilingLayoutStore.getState(), "loadFromJson");

      mockInvoke.mockImplementation((cmd: string, args?: any) => {
        if (cmd === "set_active_workspace") return Promise.resolve(undefined);
        if (cmd === "get_workspace_projects") return Promise.resolve([]);
        if (cmd === "save_ui_preferences") return Promise.resolve(undefined);
        if (cmd === "get_ui_preferences") {
          expect(args).toEqual({ workspaceId: "ws-2", projectPath: "/project/new" });
          return Promise.resolve(savedUiPrefs);
        }
        if (cmd === "get_project_ui_state") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // Should save outgoing workspace layout
      expect(mockInvoke).toHaveBeenCalledWith("save_ui_preferences", expect.objectContaining({
        workspaceId: "ws-1",
        layoutJson: expect.any(Object),
      }));

      // Should fetch incoming workspace's UI prefs
      expect(mockInvoke).toHaveBeenCalledWith("get_ui_preferences", { workspaceId: "ws-2", projectPath: "/project/new" });

      // Should restore layout from the incoming workspace (not resetToDefault)
      expect(loadFromJsonSpy).toHaveBeenCalledWith(savedLayoutJson);

      loadFromJsonSpy.mockRestore();
    });

    it("sets activeProjectPath before layout restoration so terminal blocks get correct path", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/alpha"), makeProject("/project/beta")],
        lastActiveProjectPath: "/project/alpha",
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      // Pre-set activeProjectPath from previous workspace
      useProjectsStore.setState({ activeProjectPath: "/old/project" });

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "set_active_workspace") return Promise.resolve(undefined);
        if (cmd === "get_workspace_projects") return Promise.resolve([
          { path: "/project/alpha", name: "alpha", last_opened: "2026-01-01" },
          { path: "/project/beta", name: "beta", last_opened: "2026-01-01" },
        ]);
        return Promise.resolve(undefined);
      });

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // activeProjectPath must be set to the workspace's lastActiveProjectPath
      expect(useProjectsStore.getState().activeProjectPath).toBe("/project/alpha");
    });

    it("preserves terminal blocks in saved layout to retain custom names", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/b")],
        lastActiveProjectPath: "/project/b",
      });
      useWorkspaceStore.setState({ workspaces: [ws], activeWorkspaceId: "ws-1" });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
      });

      // Saved layout includes terminal blocks (from previous session)
      const savedLayoutWithTerminals = {
        global: {},
        layout: {
          type: "row",
          children: [
            {
              type: "tabset",
              id: "tabset-file-tree",
              children: [{ type: "tab", id: "tab-file-tree", name: "Files", component: "file-tree" }],
            },
            {
              type: "tabset",
              id: "tabset-main",
              children: [
                { type: "tab", id: "old-tab-1", name: "Claude", component: "terminal", config: { type: "terminal", tabId: "old-tab-1", sessionType: "claude" } },
              ],
            },
          ],
        },
      };

      const loadFromJsonSpy = vi.spyOn(useTilingLayoutStore.getState(), "loadFromJson");

      mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "set_active_workspace") return Promise.resolve(undefined);
        if (cmd === "get_workspace_projects") return Promise.resolve([]);
        if (cmd === "save_ui_preferences") return Promise.resolve(undefined);
        if (cmd === "get_ui_preferences") return Promise.resolve({ layoutJson: savedLayoutWithTerminals });
        if (cmd === "get_project_ui_state") return Promise.resolve(null);
        return Promise.resolve(undefined);
      });

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // loadFromJson should be called with full layout INCLUDING terminal blocks
      // (terminal blocks are now preserved to retain custom names from layoutJson)
      expect(loadFromJsonSpy).toHaveBeenCalled();
      const loadedLayout = loadFromJsonSpy.mock.calls[0][0] as any;
      const mainTabset = loadedLayout.layout.children.find((c: any) => c.id === "tabset-main");
      const terminalTabs = (mainTabset?.children ?? []).filter((c: any) => c.component === "terminal");
      expect(terminalTabs).toHaveLength(1);

      // file-tree structural block should be preserved
      const fileTreeTabset = loadedLayout.layout.children.find((c: any) => c.id === "tabset-file-tree");
      const fileTreeTabs = (fileTreeTabset?.children ?? []).filter((c: any) => c.component === "file-tree");
      expect(fileTreeTabs).toHaveLength(1);

      loadFromJsonSpy.mockRestore();
    });

    it("restores saved tabs from config.json when switching workspaces", async () => {
      const ws = makeWorkspace({
        id: "ws-2",
        projects: [makeProject("/project/b")],
        lastActiveProjectPath: "/project/b",
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
        currentPath: "/project/b",
      });

      // Pre-populate terminal tabs from previous workspace
      useTerminalTabsStore.setState({
        tabs: [
          { id: "tab-old", name: "Claude", path: "/project/a", isRunning: true, sessionType: "claude" },
        ],
        activeTabId: "tab-old",
      });

      const savedUiState = {
        tabs: [
          { id: "tab-saved-1", path: "/project/b", sessionType: "claude" },
          { id: "tab-saved-2", path: "/project/b", sessionType: "terminal" },
        ],
        activeTabIndex: 1,
      };

      mockInvoke.mockImplementation((cmd: string, args?: any) => {
        if (cmd === "set_active_workspace") return Promise.resolve(undefined);
        if (cmd === "get_workspace_projects") return Promise.resolve([]);
        if (cmd === "get_project_ui_state") {
          expect(args).toEqual({ workspaceId: "ws-2", path: "/project/b" });
          return Promise.resolve(savedUiState);
        }
        return Promise.resolve(undefined);
      });

      await useWorkspaceStore.getState().activateWorkspace("ws-2");

      // Old tabs must be gone, new tabs restored
      const tabsState = useTerminalTabsStore.getState();
      expect(tabsState.tabs).toHaveLength(2);
      expect(tabsState.tabs[0].sessionType).toBe("claude");
      expect(tabsState.tabs[1].sessionType).toBe("terminal");
    });

    it("preserves cliSessionId on restored tabs after workspace activation", async () => {
      // Regression test: App.tsx was wiping restored tabs (including cliSessionId)
      // right after activateWorkspace restored them, breaking session resume.
      const ws = makeWorkspace({
        id: "ws-session",
        projects: [makeProject("/project/c")],
        lastActiveProjectPath: "/project/c",
      });
      useWorkspaceStore.setState({ workspaces: [ws] });

      const mockLoadProjectTree = vi.fn().mockResolvedValue(undefined);
      const mockOpenProjectPath = vi.fn();
      useFileTreeStore.setState({
        loadProjectTree: mockLoadProjectTree,
        openProjectPath: mockOpenProjectPath,
        currentPath: "/project/c",
      });

      const savedUiState = {
        tabs: [
          {
            id: "tab-resumed",
            path: "/project/c",
            sessionType: "claude",
            cliSessionId: "abc-session-9f3e21",
          },
        ],
        activeTabIndex: 0,
      };

      mockInvoke.mockImplementation((cmd: string, args?: any) => {
        if (cmd === "set_active_workspace") return Promise.resolve(undefined);
        if (cmd === "get_workspace_projects") return Promise.resolve([]);
        if (cmd === "get_project_ui_state") {
          expect(args).toEqual({ workspaceId: "ws-session", path: "/project/c" });
          return Promise.resolve(savedUiState);
        }
        return Promise.resolve(undefined);
      });

      await useWorkspaceStore.getState().activateWorkspace("ws-session");

      // activateWorkspace must restore the cliSessionId so terminal-session
      // can resume the CLI session with --resume <id>
      const tabsState = useTerminalTabsStore.getState();
      expect(tabsState.tabs).toHaveLength(1);
      expect(tabsState.tabs[0].id).toBe("tab-resumed");
      expect(tabsState.tabs[0].cliSessionId).toBe("abc-session-9f3e21");
    });
  });
});
