import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useProjectsStore, saveCurrentProjectToDisk, loadProjectFromDisk } from "../projects";
import { useWorkspaceStore } from "../workspace";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
  getCurrentWindow: () => ({ label: "main" }),
}));

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: vi.fn(() => ({
      openProjectPath: vi.fn(),
      isOpen: true,
    })),
    setState: vi.fn(),
  },
}));

const mockEnterFocusMode = vi.fn();
const mockExitFocusMode = vi.fn();
vi.mock("@/stores/focus-mode", () => ({
  useFocusModeStore: {
    getState: vi.fn(() => ({
      isActive: false,
      enterFocusMode: mockEnterFocusMode,
      exitFocusMode: mockExitFocusMode,
    })),
  },
}));

vi.mock("@/stores/file-preview", () => ({
  useFilePreviewStore: {
    getState: vi.fn(() => ({
      currentFile: null,
    })),
    setState: vi.fn(),
  },
}));

vi.mock("@/stores/plugins", () => ({
  usePluginsStore: {
    getState: vi.fn(() => ({
      activePluginName: null,
      pinnedPluginName: null,
    })),
    setState: vi.fn(),
  },
}));

import { invoke } from "@/lib/ipc";
import { useFileTreeStore } from "@/stores/file-tree";
import { useFocusModeStore } from "@/stores/focus-mode";
import { usePluginsStore } from "@/stores/plugins";
import { useRightPanelStore } from "@/stores/right-panel";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";

describe("useProjectsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectsStore.setState({
      projects: [],
      activeProjectPath: null,
      loading: false,
      isSwitchingProject: false,
    });
    useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
  });

  it("loads projects from IPC", async () => {
    vi.mocked(invoke).mockResolvedValueOnce([
      { path: "/home/user/my-app", name: "my-app", last_opened: "2026-01-01" },
    ]);

    await useProjectsStore.getState().loadProjects();

    expect(useProjectsStore.getState().projects).toHaveLength(1);
    expect(useProjectsStore.getState().projects[0].path).toBe("/home/user/my-app");
  });

  it("sets active project", () => {
    useProjectsStore.setState({
      projects: [{ path: "/home/user/my-app", name: "my-app", lastOpened: "2026-01-01" }],
    });

    useProjectsStore.getState().setActiveProject("/home/user/my-app");

    expect(useProjectsStore.getState().activeProjectPath).toBe("/home/user/my-app");
  });

  it("generates letter icon from project name", () => {
    const icon = useProjectsStore.getState().getProjectInitial("my-app");
    expect(icon).toBe("M");
  });

  it("generates deterministic color from project name", () => {
    const color1 = useProjectsStore.getState().getProjectColor("my-app");
    const color2 = useProjectsStore.getState().getProjectColor("my-app");
    expect(color1).toBe(color2);
    expect(color1).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("adds a new project", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await useProjectsStore.getState().addProject("/home/user/new-project");

    expect(invoke).toHaveBeenCalledWith("add_project_to_workspace", { workspaceId: "ws-test", projectPath: "/home/user/new-project" });
  });

  it("addProject appends new project at the END of the list", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [
        { path: "/existing-a", name: "a", lastOpened: "" },
        { path: "/existing-b", name: "b", lastOpened: "" },
      ],
    });

    await useProjectsStore.getState().addProject("/new-project");

    const { projects } = useProjectsStore.getState();
    expect(projects).toHaveLength(3);
    // New project must be at the END, not at the beginning
    expect(projects[0].path).toBe("/existing-a");
    expect(projects[1].path).toBe("/existing-b");
    expect(projects[2].path).toBe("/new-project");
  });

  it("addProject does not duplicate an existing project", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [
        { path: "/existing-a", name: "a", lastOpened: "" },
        { path: "/existing-b", name: "b", lastOpened: "" },
      ],
    });

    await useProjectsStore.getState().addProject("/existing-a");

    const { projects } = useProjectsStore.getState();
    expect(projects).toHaveLength(2);
    expect(projects[0].path).toBe("/existing-a");
    expect(projects[1].path).toBe("/existing-b");
  });

  it("removes a project from the list and persists to disk", () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [
        { path: "/a", name: "a", lastOpened: "" },
        { path: "/b", name: "b", lastOpened: "" },
      ],
      activeProjectPath: "/a",
    });

    useProjectsStore.getState().removeProject("/a");

    const { projects, activeProjectPath } = useProjectsStore.getState();
    expect(projects).toHaveLength(1);
    expect(activeProjectPath).toBe("/b");
    expect(invoke).toHaveBeenCalledWith("remove_project_from_workspace", { workspaceId: "ws-test", projectPath: "/a" });
  });

  it("switches to project and loads file tree", async () => {
    const mockOpenProjectPath = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFileTreeStore.getState).mockReturnValue({
      openProjectPath: mockOpenProjectPath,
      isOpen: true,
    } as never);

    useProjectsStore.setState({
      projects: [{ path: "/home/user/my-app", name: "my-app", lastOpened: "" }],
    });

    await useProjectsStore.getState().switchToProject("/home/user/my-app");

    expect(useProjectsStore.getState().activeProjectPath).toBe("/home/user/my-app");
    expect(mockOpenProjectPath).toHaveBeenCalledWith("/home/user/my-app");
  });

  it("addProject does not overwrite existing custom icon", async () => {
    vi.mocked(invoke).mockImplementation(async (channel) => {
      if (channel === "detect_project_icon") return "/auto/detected.png";
      return undefined;
    });

    // Project already exists with a custom icon
    useProjectsStore.setState({
      projects: [{ path: "/home/user/my-app", name: "my-app", lastOpened: "", iconPath: "data:image/png;base64,custom" }],
    });

    await useProjectsStore.getState().addProject("/home/user/my-app");

    // detect_project_icon should NOT have been called
    const detectCalls = vi.mocked(invoke).mock.calls.filter(
      (call) => call[0] === "detect_project_icon"
    );
    expect(detectCalls).toHaveLength(0);

    // Custom icon should be preserved
    const project = useProjectsStore.getState().projects.find((p) => p.path === "/home/user/my-app");
    expect(project?.iconPath).toBe("data:image/png;base64,custom");
  });

  it("loads project icon via IPC", async () => {
    vi.mocked(invoke).mockImplementation(async (channel) => {
      if (channel === "detect_project_icon") return "file:///home/user/my-app/public/favicon.svg";
      return null;
    });

    useProjectsStore.setState({
      projects: [{ path: "/home/user/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    });

    await useProjectsStore.getState().loadProjectIcon("/home/user/my-app");

    const project = useProjectsStore.getState().projects.find((p) => p.path === "/home/user/my-app");
    expect(project?.iconPath).toBe("file:///home/user/my-app/public/favicon.svg");
  });

  it("sets iconPath to null when no icon found", async () => {
    vi.mocked(invoke).mockResolvedValue(null);

    useProjectsStore.setState({
      projects: [{ path: "/home/user/no-icon", name: "no-icon", lastOpened: "", iconPath: undefined }],
    });

    await useProjectsStore.getState().loadProjectIcon("/home/user/no-icon");

    const project = useProjectsStore.getState().projects.find((p) => p.path === "/home/user/no-icon");
    expect(project?.iconPath).toBeNull();
  });

  it("updates session state for a project to 'running'", () => {
    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      sessionStates: {},
      unreadProjects: new Set<string>(),
    });

    useProjectsStore.getState().setProjectSessionState("/a/my-app", "running");

    const state = useProjectsStore.getState().sessionStates["/a/my-app"];
    expect(state).toBe("running");
  });

  it("updates session state to 'exited' and marks as unread", () => {
    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/b/other",
      sessionStates: { "/a/my-app": "running" },
      unreadProjects: new Set<string>(),
    });

    useProjectsStore.getState().setProjectSessionState("/a/my-app", "exited");

    const state = useProjectsStore.getState().sessionStates["/a/my-app"];
    const unread = useProjectsStore.getState().unreadProjects;
    expect(state).toBe("exited");
    expect(unread.has("/a/my-app")).toBe(true);
  });

  it("does not mark active project as unread when exited", () => {
    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      activeProjectPath: "/a/my-app",
      sessionStates: { "/a/my-app": "running" },
      unreadProjects: new Set<string>(),
    });

    useProjectsStore.getState().setProjectSessionState("/a/my-app", "exited");

    const unread = useProjectsStore.getState().unreadProjects;
    expect(unread.has("/a/my-app")).toBe(false);
  });

  it("clears unread flag when switching to a project", async () => {
    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
      unreadProjects: new Set(["/a/my-app"]),
      sessionStates: {},
    });

    await useProjectsStore.getState().switchToProject("/a/my-app");

    const unread = useProjectsStore.getState().unreadProjects;
    expect(unread.has("/a/my-app")).toBe(false);
  });

  it("reorderProjects moves project from index 0 to index 2", () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [
        { path: "/a", name: "a", lastOpened: "", iconPath: null },
        { path: "/b", name: "b", lastOpened: "", iconPath: null },
        { path: "/c", name: "c", lastOpened: "", iconPath: null },
      ],
    });

    useProjectsStore.getState().reorderProjects(0, 2);

    const paths = useProjectsStore.getState().projects.map((p) => p.path);
    expect(paths).toEqual(["/b", "/c", "/a"]);
  });

  it("reorderProjects calls IPC with correct path order", () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [
        { path: "/a", name: "a", lastOpened: "", iconPath: null },
        { path: "/b", name: "b", lastOpened: "", iconPath: null },
        { path: "/c", name: "c", lastOpened: "", iconPath: null },
      ],
    });

    useProjectsStore.getState().reorderProjects(2, 0);

    expect(invoke).toHaveBeenCalledWith("reorder_workspace_projects", { workspaceId: "ws-test",
      paths: ["/c", "/a", "/b"],
    });
  });

  it("reorderProjects with same index is no-op", () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [
        { path: "/a", name: "a", lastOpened: "", iconPath: null },
        { path: "/b", name: "b", lastOpened: "", iconPath: null },
      ],
    });

    useProjectsStore.getState().reorderProjects(1, 1);

    expect(invoke).not.toHaveBeenCalled();
    const paths = useProjectsStore.getState().projects.map((p) => p.path);
    expect(paths).toEqual(["/a", "/b"]);
  });

  it("updates project name via updateProject", () => {
    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    });

    useProjectsStore.getState().updateProject("/a/my-app", { name: "renamed-app" });

    const project = useProjectsStore.getState().projects.find((p) => p.path === "/a/my-app");
    expect(project?.name).toBe("renamed-app");
  });

  it("updates project iconPath via updateProject", () => {
    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    });

    useProjectsStore.getState().updateProject("/a/my-app", { iconPath: "/icons/custom.svg" });

    const project = useProjectsStore.getState().projects.find((p) => p.path === "/a/my-app");
    expect(project?.iconPath).toBe("/icons/custom.svg");
  });

  it("does nothing when updateProject targets non-existent path", () => {
    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    });

    useProjectsStore.getState().updateProject("/non-existent", { name: "nope" });

    expect(useProjectsStore.getState().projects).toHaveLength(1);
    expect(useProjectsStore.getState().projects[0].name).toBe("my-app");
  });

  it("updateProject persists name change via IPC", () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    });

    useProjectsStore.getState().updateProject("/a/my-app", { name: "new-name" });

    expect(invoke).toHaveBeenCalledWith("update_workspace_project", { workspaceId: "ws-test",
      path: "/a/my-app",
      name: "new-name",
      icon_path: undefined,
    });
  });

  it("updateProject persists iconPath change via IPC", () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    useProjectsStore.setState({
      projects: [{ path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null }],
    });

    useProjectsStore.getState().updateProject("/a/my-app", { iconPath: "/icons/custom.svg" });

    expect(invoke).toHaveBeenCalledWith("update_workspace_project", { workspaceId: "ws-test",
      path: "/a/my-app",
      name: undefined,
      icon_path: "/icons/custom.svg",
    });
  });

  it("loadProjects maps icon_path from backend to iconPath", async () => {
    vi.mocked(invoke).mockImplementation(async (channel) => {
      if (channel === "get_workspace_projects") {
        return [
          { path: "/a/app1", name: "app1", last_opened: "2026-01-01", icon_path: "/icons/saved.svg" },
        ];
      }
      if (channel === "detect_project_icon") return null;
      return null;
    });

    await useProjectsStore.getState().loadProjects();

    const project = useProjectsStore.getState().projects[0];
    expect(project.iconPath).toBe("/icons/saved.svg");
  });

  it("loadProjects skips auto-detect for projects with persisted icon_path", async () => {
    vi.mocked(invoke).mockImplementation(async (channel) => {
      if (channel === "get_workspace_projects") {
        return [
          { path: "/a/app1", name: "app1", last_opened: "2026-01-01", icon_path: "/icons/saved.svg" },
        ];
      }
      if (channel === "detect_project_icon") return "/auto/detected.png";
      return null;
    });

    await useProjectsStore.getState().loadProjects();

    // Should NOT call detect_project_icon for projects with persisted icon
    const detectCalls = vi.mocked(invoke).mock.calls.filter(
      (call) => call[0] === "detect_project_icon"
    );
    expect(detectCalls).toHaveLength(0);
  });

  it("loads icons for all projects after loadProjects", async () => {
    vi.mocked(invoke).mockImplementation(async (channel) => {
      if (channel === "get_workspace_projects") {
        return [
          { path: "/a/app1", name: "app1", last_opened: "2026-01-01" },
          { path: "/b/app2", name: "app2", last_opened: "2026-01-02" },
        ];
      }
      if (channel === "detect_project_icon") return null;
      return null;
    });

    await useProjectsStore.getState().loadProjects();

    // loadProjectIcon should have been triggered for each project
    const detectCalls = vi.mocked(invoke).mock.calls.filter(
      (call) => call[0] === "detect_project_icon"
    );
    expect(detectCalls).toHaveLength(2);
    expect(detectCalls[0][1]).toEqual({ path: "/a/app1" });
    expect(detectCalls[1][1]).toEqual({ path: "/b/app2" });
  });


  describe("thinkingProjects and notifiedProjects", () => {
    beforeEach(() => {
      useProjectsStore.setState({
        projects: [
          { path: "/a/my-app", name: "my-app", lastOpened: "", iconPath: null },
          { path: "/b/other", name: "other", lastOpened: "", iconPath: null },
        ],
        activeProjectPath: "/a/my-app",
        thinkingProjects: new Set<string>(),
        notifiedProjects: new Set<string>(),
        notificationMessages: {},
      });
    });

    it("setProjectThinking(path, true) adds to thinkingProjects", () => {
      useProjectsStore.getState().setProjectThinking("/b/other", true);
      expect(useProjectsStore.getState().thinkingProjects.has("/b/other")).toBe(true);
    });

    it("setProjectThinking(path, false) removes from thinkingProjects", () => {
      useProjectsStore.setState({ thinkingProjects: new Set(["/b/other"]) });
      useProjectsStore.getState().setProjectThinking("/b/other", false);
      expect(useProjectsStore.getState().thinkingProjects.has("/b/other")).toBe(false);
    });

    it("markProjectNotified adds to notifiedProjects when not active project", () => {
      useProjectsStore.getState().markProjectNotified("/b/other");
      expect(useProjectsStore.getState().notifiedProjects.has("/b/other")).toBe(true);
    });

    it("markProjectNotified does NOT add when IS active project", () => {
      useProjectsStore.getState().markProjectNotified("/a/my-app");
      expect(useProjectsStore.getState().notifiedProjects.has("/a/my-app")).toBe(false);
    });

    it("clearProjectNotified removes from notifiedProjects", () => {
      useProjectsStore.setState({ notifiedProjects: new Set(["/b/other"]) });
      useProjectsStore.getState().clearProjectNotified("/b/other");
      expect(useProjectsStore.getState().notifiedProjects.has("/b/other")).toBe(false);
    });

    it("switchToProject clears notifiedProjects for that project", async () => {
      useProjectsStore.setState({ notifiedProjects: new Set(["/b/other"]) });
      await useProjectsStore.getState().switchToProject("/b/other");
      expect(useProjectsStore.getState().notifiedProjects.has("/b/other")).toBe(false);
    });

    it("markProjectNotified stores message when provided", () => {
      useProjectsStore.getState().markProjectNotified("/b/other", "Session finished");
      const state = useProjectsStore.getState();
      expect(state.notifiedProjects.has("/b/other")).toBe(true);
      expect(state.notificationMessages["/b/other"]).toBe("Session finished");
    });

    it("markProjectNotified without message does not set notificationMessages entry", () => {
      useProjectsStore.getState().markProjectNotified("/b/other");
      const state = useProjectsStore.getState();
      expect(state.notifiedProjects.has("/b/other")).toBe(true);
      expect(state.notificationMessages["/b/other"]).toBeUndefined();
    });

    it("markProjectNotified with message is no-op when project is active", () => {
      useProjectsStore.getState().markProjectNotified("/a/my-app", "Session finished");
      const state = useProjectsStore.getState();
      expect(state.notifiedProjects.has("/a/my-app")).toBe(false);
      expect(state.notificationMessages["/a/my-app"]).toBeUndefined();
    });

    it("clearProjectNotified also removes notification message", () => {
      useProjectsStore.setState({
        notifiedProjects: new Set(["/b/other"]),
        notificationMessages: { "/b/other": "Session finished" },
      });
      useProjectsStore.getState().clearProjectNotified("/b/other");
      const state = useProjectsStore.getState();
      expect(state.notifiedProjects.has("/b/other")).toBe(false);
      expect(state.notificationMessages["/b/other"]).toBeUndefined();
    });

    it("setProjectNotificationMessage stores message", () => {
      useProjectsStore.getState().setProjectNotificationMessage("/b/other", "Custom message");
      expect(useProjectsStore.getState().notificationMessages["/b/other"]).toBe("Custom message");
    });

    it("clearProjectNotificationMessage removes message", () => {
      useProjectsStore.setState({
        notificationMessages: { "/b/other": "Session finished" },
      });
      useProjectsStore.getState().clearProjectNotificationMessage("/b/other");
      expect(useProjectsStore.getState().notificationMessages["/b/other"]).toBeUndefined();
    });
  });

  describe("switchToProject saves and restores terminal tabs", () => {
    beforeEach(() => {
      useTerminalTabsStore.setState({
        tabs: [],
        activeTabId: null,
        counter: 0,
        isTerminalFullscreen: false,
      });
    });

    it("includes serialized terminal tabs in outgoing project disk save", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      // Set up tabs for project-a (outgoing project)
      const tabsStore = useTerminalTabsStore.getState();
      const id1 = tabsStore.nextTabId();
      tabsStore.addTab(id1, "/project-a", "claude");
      tabsStore.setCliSessionId(id1, "session-123");

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      // Find the save_project_ui_state call for the outgoing project
      const saveCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "save_project_ui_state" && (call[1] as any)?.path === "/project-a"
      );
      expect(saveCalls.length).toBeGreaterThan(0);

      const savedState = (saveCalls[0][1] as any).state;
      expect(savedState.tabs).toBeDefined();
      expect(savedState.tabs).toHaveLength(1);
      expect(savedState.tabs[0].id).toBe(id1);
      expect(savedState.tabs[0].sessionType).toBe("claude");
      expect(savedState.tabs[0].cliSessionId).toBe("session-123");
      expect(savedState.activeTabIndex).toBeDefined();
    });

    it("restores terminal tabs from disk when switching to a project with no in-memory tabs", async () => {
      const savedTabs = [
        { id: "saved-tab-1", sessionType: "claude", cliSessionId: "sess-abc" },
        { id: "saved-tab-2", sessionType: "terminal", exited: true },
      ];

      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            tabs: savedTabs,
            activeTabIndex: 0,
          };
        }
        return undefined;
      });

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      // Verify tabs were restored from disk
      const projectBTabs = useTerminalTabsStore.getState().getTabsForProject("/project-b");
      expect(projectBTabs).toHaveLength(2);
      expect(projectBTabs[0].sessionType).toBe("claude");
      expect(projectBTabs[0].cliSessionId).toBe("sess-abc");
      expect(projectBTabs[1].sessionType).toBe("terminal");
      expect(projectBTabs[1].isRunning).toBe(false);
    });

    it("does not restore tabs from disk when in-memory tabs already exist", async () => {
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            tabs: [{ id: "disk-tab", sessionType: "claude" }],
            activeTabIndex: 0,
          };
        }
        return undefined;
      });

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      // Pre-populate in-memory tabs for project-b
      const tabsStore = useTerminalTabsStore.getState();
      tabsStore.registerTab("mem-tab-1", "/project-b", "claude");

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      // In-memory tabs should be preserved (not overwritten by disk tabs)
      const projectBTabs = useTerminalTabsStore.getState().getTabsForProject("/project-b");
      expect(projectBTabs).toHaveLength(1);
      expect(projectBTabs[0].id).toBe("mem-tab-1");
    });
  });

  it("updates file-tree tab name with the NEW project name, not the stale previous one", async () => {
    const mockUpdateFileTreeTabName = vi.fn();
    const { useTilingLayoutStore } = await import("@/stores/tiling-layout");
    vi.spyOn(useTilingLayoutStore, "getState").mockReturnValue({
      ...useTilingLayoutStore.getState(),
      updateFileTreeTabName: mockUpdateFileTreeTabName,
    } as never);

    // Simulate the stale snapshot bug:
    // First getState() call returns tree for OLD project (forja).
    // After openProjectPath, the REAL store would have the NEW project tree.
    // The second getState() call should return the NEW tree.
    let callCount = 0;
    const mockOpenProjectPath = vi.fn().mockImplementation(async () => {
      // Simulate that openProjectPath internally calls set(),
      // so subsequent getState() calls return the NEW tree.
      callCount = 99; // flip to "after" state
    });
    vi.mocked(useFileTreeStore.getState).mockImplementation(() => {
      callCount++;
      const isAfterOpen = callCount > 99;
      const base = {
        openProjectPath: mockOpenProjectPath,
      };
      if (!isAfterOpen) {
        return { ...base, tree: { root: { name: "forja", path: "/project-a", isDir: true } } } as never;
      }
      return { ...base, tree: { root: { name: "play-etl-monitor", path: "/project-b", isDir: true } } } as never;
    });

    useProjectsStore.setState({
      projects: [
        { path: "/project-a", name: "forja", lastOpened: "" },
        { path: "/project-b", name: "play-etl-monitor", lastOpened: "" },
      ],
      activeProjectPath: "/project-a",
    });

    await useProjectsStore.getState().switchToProject("/project-b");

    // The tab name must be "play-etl-monitor" (NEW project), NOT "forja" (old/stale)
    expect(mockUpdateFileTreeTabName).toHaveBeenCalledWith("play-etl-monitor");
  });


  describe("switchToProject plugin and right panel guard", () => {
    beforeEach(() => {
      // Reset right panel store to defaults
      useRightPanelStore.setState({
        isOpen: false,
        activeView: "empty",
      });
    });


    it("does not open right panel from disk state when no active plugin", async () => {
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") return { rightPanelOpen: true };
        return undefined;
      });

      vi.mocked(usePluginsStore.getState).mockReturnValue({
        activePluginName: null,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useProjectsStore.setState({
        projects: [{ path: "/my-project", name: "my-project", lastOpened: "" }],
        activeProjectPath: null,
      });

      await useProjectsStore.getState().switchToProject("/my-project");

      expect(useRightPanelStore.getState().isOpen).toBe(false);
    });

    it("opens right panel from disk state when an active plugin exists", async () => {
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") return { rightPanelOpen: true };
        return undefined;
      });

      vi.mocked(usePluginsStore.getState).mockReturnValue({
        activePluginName: "my-plugin",
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useProjectsStore.setState({
        projects: [{ path: "/my-project", name: "my-project", lastOpened: "" }],
        activeProjectPath: null,
      });

      await useProjectsStore.getState().switchToProject("/my-project");

      expect(useRightPanelStore.getState().isOpen).toBe(true);
    });

    it("keeps right panel open when switching to a project that has no saved state if there is a pinned plugin", async () => {
      // Simulate: pinned plugin exists, panel was open, switching to a new project with no saved state
      vi.mocked(invoke).mockResolvedValue(null); // no saved disk state

      const mockSetActivePlugin = vi.fn();
      vi.mocked(usePluginsStore.getState).mockReturnValue({
        activePluginName: null, // restored null for new project
        pinnedPluginName: "pomodoro",
        setActivePlugin: mockSetActivePlugin,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      // Panel was open before switching
      useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      // Panel must stay open because there is a pinned plugin
      expect(useRightPanelStore.getState().isOpen).toBe(true);
      // The pinned plugin must be set as active
      expect(mockSetActivePlugin).toHaveBeenCalledWith("pomodoro");
    });

    it("keeps right panel open when switching between multiple projects with a pinned plugin", async () => {
      vi.mocked(invoke).mockResolvedValue(null); // no saved disk state for any project

      const mockSetActivePlugin = vi.fn();
      vi.mocked(usePluginsStore.getState).mockReturnValue({
        activePluginName: null, // always null after restore (new projects)
        pinnedPluginName: "pomodoro",
        setActivePlugin: mockSetActivePlugin,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
          { path: "/project-c", name: "c", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");
      expect(useRightPanelStore.getState().isOpen).toBe(true);

      await useProjectsStore.getState().switchToProject("/project-c");
      expect(useRightPanelStore.getState().isOpen).toBe(true);
      expect(mockSetActivePlugin).toHaveBeenLastCalledWith("pomodoro");
    });

    it("does not force panel open when switching projects with no pinned plugin", async () => {
      vi.mocked(invoke).mockResolvedValue(null); // no saved disk state

      vi.mocked(usePluginsStore.getState).mockReturnValue({
        activePluginName: null,
        pinnedPluginName: null,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useRightPanelStore.setState({ isOpen: false, activeView: "empty" });

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      // Panel should remain closed since there's no pinned plugin
      expect(useRightPanelStore.getState().isOpen).toBe(false);
    });
  });

  describe("focus mode preservation across project switch", () => {
    it("re-enters focus mode after switching projects when it was active", async () => {
      vi.mocked(useFocusModeStore.getState).mockReturnValue({
        isActive: true,
        enterFocusMode: mockEnterFocusMode,
        exitFocusMode: mockExitFocusMode,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      expect(mockExitFocusMode).toHaveBeenCalled();
      expect(mockEnterFocusMode).toHaveBeenCalled();
    });

    it("does not re-enter focus mode when it was not active before switch", async () => {
      vi.mocked(useFocusModeStore.getState).mockReturnValue({
        isActive: false,
        enterFocusMode: mockEnterFocusMode,
        exitFocusMode: mockExitFocusMode,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      expect(mockExitFocusMode).not.toHaveBeenCalled();
      expect(mockEnterFocusMode).not.toHaveBeenCalled();
    });
  });

  describe("switchToProject resets tiling layout to prevent cross-project contamination", () => {
    afterEach(async () => {
      // Clean up tiling layout state to avoid leakage to other tests
      const { useTilingLayoutStore } = await import("@/stores/tiling-layout");
      useTilingLayoutStore.getState().resetToDefault();
    });

    it("resets tiling layout before loading new project state", async () => {
      const { useTilingLayoutStore } = await import("@/stores/tiling-layout");
      const resetSpy = vi.spyOn(useTilingLayoutStore.getState(), "resetToDefault");

      vi.mocked(invoke).mockResolvedValue(null); // no saved disk state

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      expect(resetSpy).toHaveBeenCalled();
      resetSpy.mockRestore();
    });

    it("prevents outgoing project layout from bleeding into new project without saved state", async () => {
      const { useTilingLayoutStore } = await import("@/stores/tiling-layout");

      // Simulate outgoing project has terminal blocks in the layout
      useTilingLayoutStore.getState().addBlock(
        { type: "terminal", tabId: "stale-tab" },
        undefined,
        "stale-tab",
      );
      expect(useTilingLayoutStore.getState().hasBlock("stale-tab")).toBe(true);

      vi.mocked(invoke).mockResolvedValue(null); // no saved disk state for new project

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      // The stale block from project-a must NOT survive the switch
      expect(useTilingLayoutStore.getState().hasBlock("stale-tab")).toBe(false);
    });
  });

  describe("removeProject preserves other projects' state", () => {
    it("sets isSwitchingProject during removal of active project", () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      useProjectsStore.setState({
        projects: [
          { path: "/a", name: "a", lastOpened: "" },
          { path: "/b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/a",
        isSwitchingProject: false,
      });

      // Observe the flag during the synchronous part of removal
      const observed: boolean[] = [];
      const unsub = useProjectsStore.subscribe((state) => {
        observed.push(state.isSwitchingProject);
      });

      useProjectsStore.getState().removeProject("/a");

      unsub();

      // The flag must have been set to true at some point to guard persist effects
      expect(observed).toContain(true);
    });

    it("does not change activeProjectPath when removing a non-active project", () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      useProjectsStore.setState({
        projects: [
          { path: "/a", name: "a", lastOpened: "" },
          { path: "/b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/a",
      });

      useProjectsStore.getState().removeProject("/b");

      const { projects, activeProjectPath } = useProjectsStore.getState();
      expect(projects).toHaveLength(1);
      expect(activeProjectPath).toBe("/a");
    });

    it("cleanupProjectState on terminal-tabs removes tabs for the removed project", () => {
      useTerminalTabsStore.setState({
        tabs: [
          { id: "tab-1", path: "/a", name: "Claude", sessionType: "claude" as any, isRunning: true, cliSessionId: null, customName: undefined },
          { id: "tab-2", path: "/b", name: "Claude", sessionType: "claude" as any, isRunning: true, cliSessionId: null, customName: undefined },
        ],
        activeTabId: "tab-1",
      });

      useTerminalTabsStore.getState().cleanupProjectState("/a");

      const tabsState = useTerminalTabsStore.getState();
      // Tabs for the removed project should be gone
      expect(tabsState.tabs.filter((t) => t.path === "/a")).toHaveLength(0);
      // Other project's tabs should be preserved
      expect(tabsState.tabs.filter((t) => t.path === "/b")).toHaveLength(1);
      // Active tab should switch to remaining tab
      expect(tabsState.activeTabId).toBe("tab-2");
    });
  });

  describe("isSwitchingProject flag", () => {
    it("defaults to false", () => {
      expect(useProjectsStore.getState().isSwitchingProject).toBe(false);
    });

    it("is true during switchToProject and false after", async () => {
      const observed: boolean[] = [];

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockImplementation(async () => {
          observed.push(useProjectsStore.getState().isSwitchingProject);
        }),
      } as never);

      useProjectsStore.setState({
        projects: [{ path: "/project-x", name: "x", lastOpened: "" }],
        activeProjectPath: null,
      });

      await useProjectsStore.getState().switchToProject("/project-x");

      expect(observed).toContain(true);
      expect(useProjectsStore.getState().isSwitchingProject).toBe(false);
    });

    it("is false even if switchToProject throws", async () => {
      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockRejectedValue(new Error("boom")),
      } as never);

      useProjectsStore.setState({
        projects: [{ path: "/project-x", name: "x", lastOpened: "" }],
        activeProjectPath: null,
      });

      await useProjectsStore.getState().switchToProject("/project-x").catch(() => {});

      expect(useProjectsStore.getState().isSwitchingProject).toBe(false);
    });

    it("concurrent switch is rejected when already switching", async () => {
      let resolveSwitch: () => void;
      const switchPromise = new Promise<void>((resolve) => {
        resolveSwitch = resolve;
      });

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockImplementation(() => switchPromise),
      } as never);

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
          { path: "/project-c", name: "c", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      // Start first switch (will block on openProjectPath)
      const firstSwitch = useProjectsStore.getState().switchToProject("/project-b");
      // Allow microtask to progress so that activeProjectPath is set to /project-b
      await new Promise((r) => setTimeout(r, 0));

      // The flag should be true while the first switch is in flight
      expect(useProjectsStore.getState().isSwitchingProject).toBe(true);

      // Try concurrent switch to a THIRD project while first is still in progress
      await useProjectsStore.getState().switchToProject("/project-c");

      // The second switch must have been rejected; active path must NOT be /project-c
      expect(useProjectsStore.getState().activeProjectPath).not.toBe("/project-c");

      // Unblock and complete the first switch
      resolveSwitch!();
      await firstSwitch;
      expect(useProjectsStore.getState().isSwitchingProject).toBe(false);
    });
  });

  describe("saveCurrentProjectToDisk", () => {
    beforeEach(() => {
      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn(),
        isOpen: true,
      } as never);
    });

    it("is a no-op when no workspace ID", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: null });

      await saveCurrentProjectToDisk("/my-project");

      const saveCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "save_project_ui_state"
      );
      expect(saveCalls).toHaveLength(0);
    });

    it("invokes save_project_ui_state with collected UI state", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      useProjectsStore.setState({ activeProjectPath: "/my-project" });

      // Set up a tab for the project being saved
      const tabsStore = useTerminalTabsStore.getState();
      const id1 = tabsStore.nextTabId();
      tabsStore.addTab(id1, "/my-project", "claude");
      tabsStore.setCliSessionId(id1, "session-abc");

      await saveCurrentProjectToDisk("/my-project");

      const saveCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "save_project_ui_state"
      );
      expect(saveCalls).toHaveLength(1);

      const payload = saveCalls[0][1] as any;
      expect(payload.workspaceId).toBe("ws-test");
      expect(payload.path).toBe("/my-project");
      expect(payload.state).toBeDefined();
      expect(payload.state.sidebarOpen).toBe(true);
      expect(payload.state.tabs).toBeDefined();
    });

    it("includes rightPanelActiveView in the saved state", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      useProjectsStore.setState({ activeProjectPath: "/my-project" });

      await saveCurrentProjectToDisk("/my-project");

      const saveCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "save_project_ui_state"
      );
      expect(saveCalls).toHaveLength(1);

      const state = (saveCalls[0][1] as any).state;
      expect("rightPanelActiveView" in state).toBe(true);
    });

    it("skips the disk save when activeProjectPath changed during async operations", async () => {
      // Simulate a race: while resolveMissingSessionIds is in flight, the user
      // switches to a different project. The guard must abort the save to
      // prevent contaminating the NEW project's config with the wrong layout.
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });

      // When invoke is called (by resolveMissingSessionIds internally), switch the
      // active project so that by the time saveCurrentProjectToDisk checks
      // activeProjectPath it no longer matches the project being saved.
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_cli_sessions") {
          // Simulate the project switch happening during the async IPC roundtrip
          useProjectsStore.setState({ activeProjectPath: "/project-b" });
          return [];
        }
        return undefined;
      });

      // Set up a tab that will trigger resolveMissingSessionIds (claude session with no cliSessionId)
      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });
      const tabsStore = useTerminalTabsStore.getState();
      const id1 = tabsStore.nextTabId();
      tabsStore.addTab(id1, "/project-a", "claude");
      // No cliSessionId — this causes resolveMissingSessionIds to call get_cli_sessions

      // Initial state: active project is the one we're about to save
      useProjectsStore.setState({ activeProjectPath: "/project-a" });

      await saveCurrentProjectToDisk("/project-a");

      // save_project_ui_state must NOT have been called because activeProjectPath
      // changed from /project-a to /project-b during the async gap
      const saveCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "save_project_ui_state"
      );
      expect(saveCalls).toHaveLength(0);
    });

    it("proceeds with the disk save when activeProjectPath still matches during async operations", async () => {
      // When the active project does NOT change during async operations, the
      // save must complete normally.
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });

      vi.mocked(invoke).mockResolvedValue(undefined);

      useProjectsStore.setState({ activeProjectPath: "/my-project" });

      // A tab that does NOT trigger get_cli_sessions (terminal session has no sessionDirType)
      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });
      const tabsStore = useTerminalTabsStore.getState();
      const id1 = tabsStore.nextTabId();
      tabsStore.addTab(id1, "/my-project", "terminal");

      await saveCurrentProjectToDisk("/my-project");

      const saveCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "save_project_ui_state"
      );
      expect(saveCalls).toHaveLength(1);
      expect((saveCalls[0][1] as any).path).toBe("/my-project");
    });
  });

  describe("loadProjectFromDisk", () => {
    it("is a no-op when no workspace ID", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: null });

      // Should not throw and not call any IPC
      await loadProjectFromDisk("/my-project");

      const getCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "get_project_ui_state"
      );
      expect(getCalls).toHaveLength(0);
    });

    it("is a no-op when no saved state returned", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      vi.mocked(invoke).mockResolvedValue(null);

      // Should not throw
      await loadProjectFromDisk("/my-project");

      const getCalls = vi.mocked(invoke).mock.calls.filter(
        (call) => call[0] === "get_project_ui_state"
      );
      expect(getCalls).toHaveLength(1);
    });

    it("applies sidebarOpen to file-tree store", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") return { sidebarOpen: false };
        return undefined;
      });

      await loadProjectFromDisk("/my-project");

      expect(vi.mocked(useFileTreeStore.setState)).toHaveBeenCalledWith({ isOpen: false });
    });

    it("applies terminalFullscreen to terminal-tabs store", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") return { terminalFullscreen: true };
        return undefined;
      });

      await loadProjectFromDisk("/my-project");

      expect(useTerminalTabsStore.getState().isTerminalFullscreen).toBe(true);
    });

    it("restores terminal tabs from disk state", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            tabs: [
              { id: "loaded-tab-1", sessionType: "claude", cliSessionId: "sess-xyz" },
            ],
            activeTabIndex: 0,
          };
        }
        return undefined;
      });

      // No existing tabs for the project
      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });

      await loadProjectFromDisk("/load-project");

      const tabs = useTerminalTabsStore.getState().getTabsForProject("/load-project");
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toBe("loaded-tab-1");
      expect(tabs[0].sessionType).toBe("claude");
      expect(tabs[0].cliSessionId).toBe("sess-xyz");
    });

    it("does not overwrite existing in-memory tabs when loading from disk", async () => {
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            tabs: [{ id: "disk-tab", sessionType: "claude" }],
          };
        }
        return undefined;
      });

      // Start with a clean slate and pre-populate in-memory tabs
      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });
      const tabsStore = useTerminalTabsStore.getState();
      tabsStore.registerTab("mem-tab", "/load-project", "claude");

      await loadProjectFromDisk("/load-project");

      const tabs = useTerminalTabsStore.getState().getTabsForProject("/load-project");
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toBe("mem-tab");
    });

    it("preserves terminal block positions in layout when saved tabs exist", async () => {
      vi.restoreAllMocks();
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      const { useTilingLayoutStore } = await import("@/stores/tiling-layout");
      useTilingLayoutStore.getState().resetToDefault();

      // Layout with 2 tabsets: tab-left in the left tabset, tab-right in the right tabset
      const splitLayout = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 50,
              id: "tabset-left",
              enableDeleteWhenEmpty: false,
              children: [
                {
                  type: "tab",
                  id: "tab-left",
                  name: "Claude",
                  component: "terminal",
                  config: { type: "terminal", tabId: "tab-left", sessionType: "claude" },
                },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "tabset-right",
              children: [
                {
                  type: "tab",
                  id: "tab-right",
                  name: "Claude",
                  component: "terminal",
                  config: { type: "terminal", tabId: "tab-right", sessionType: "claude" },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            layoutJson: splitLayout,
            tabs: [
              { id: "tab-left", sessionType: "claude", cliSessionId: "sess-1" },
              { id: "tab-right", sessionType: "claude", cliSessionId: "sess-2" },
            ],
            activeTabIndex: 0,
          };
        }
        return undefined;
      });

      useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });

      await loadProjectFromDisk("/split-project");

      // Both tabs should be registered
      const tabs = useTerminalTabsStore.getState().getTabsForProject("/split-project");
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.id).sort()).toEqual(["tab-left", "tab-right"]);

      // Layout model should have both blocks in their respective tabsets
      const tilingStore = useTilingLayoutStore.getState();

      // Debug: check the full model structure
      const modelJson = tilingStore.model.toJson() as any;
      const allBlockIds: string[] = [];
      const blockTabsetMap: Record<string, string> = {};
      tilingStore.model.visitNodes((node) => {
        if (node.getType() === "tab") {
          allBlockIds.push(node.getId());
          blockTabsetMap[node.getId()] = node.getParent()?.getId() ?? "unknown";
        }
      });

      expect(tilingStore.hasBlock("tab-left")).toBe(true);
      expect(tilingStore.hasBlock("tab-right")).toBe(true);

      // Verify the blocks are in DIFFERENT tabsets (not coalesced into one)
      expect(blockTabsetMap["tab-left"]).toBe("tabset-left");
      expect(blockTabsetMap["tab-right"]).toBe("tabset-right");
      expect(blockTabsetMap["tab-left"]).not.toBe(blockTabsetMap["tab-right"]);
    });

    it("removes orphan terminal blocks that belong to a different project after loading", async () => {
      vi.restoreAllMocks();
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      const { useTilingLayoutStore } = await import("@/stores/tiling-layout");
      useTilingLayoutStore.getState().resetToDefault();

      // Simulate a contaminated layout: contains terminal blocks from Project A
      // (orphan-block-from-a) mixed with a valid block for the project being loaded
      // (valid-tab). This can happen when a previous save race captured another
      // project's tiling state.
      const contaminatedLayout = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 50,
              id: "tabset-a",
              enableDeleteWhenEmpty: false,
              children: [
                {
                  type: "tab",
                  id: "valid-tab",
                  name: "Claude",
                  component: "terminal",
                  config: { type: "terminal", tabId: "valid-tab", sessionType: "claude" },
                },
              ],
            },
            {
              type: "tabset",
              weight: 50,
              id: "tabset-b",
              children: [
                {
                  type: "tab",
                  id: "orphan-from-project-a",
                  name: "Claude",
                  component: "terminal",
                  config: { type: "terminal", tabId: "orphan-from-project-a", sessionType: "claude" },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            layoutJson: contaminatedLayout,
            tabs: [
              // Only valid-tab belongs to this project; orphan-from-project-a has no entry here
              { id: "valid-tab", sessionType: "claude", cliSessionId: "sess-valid" },
            ],
            activeTabIndex: 0,
          };
        }
        return undefined;
      });

      useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });

      await loadProjectFromDisk("/project-b");

      const tilingStore = useTilingLayoutStore.getState();

      // The valid block that matches a project tab must remain
      expect(tilingStore.hasBlock("valid-tab")).toBe(true);

      // The orphan block from a different project must be removed
      expect(tilingStore.hasBlock("orphan-from-project-a")).toBe(false);
    });

    it("does not remove terminal blocks that match loaded project tabs", async () => {
      vi.restoreAllMocks();
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      const { useTilingLayoutStore } = await import("@/stores/tiling-layout");
      useTilingLayoutStore.getState().resetToDefault();

      // Layout with a single terminal block that corresponds to the project's tab
      const cleanLayout = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 100,
              id: "tabset-main",
              enableDeleteWhenEmpty: false,
              children: [
                {
                  type: "tab",
                  id: "my-tab",
                  name: "Claude",
                  component: "terminal",
                  config: { type: "terminal", tabId: "my-tab", sessionType: "claude" },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            layoutJson: cleanLayout,
            tabs: [
              { id: "my-tab", sessionType: "claude", cliSessionId: "sess-ok" },
            ],
            activeTabIndex: 0,
          };
        }
        return undefined;
      });

      useTerminalTabsStore.setState({ tabs: [], activeTabId: null, counter: 0 });

      await loadProjectFromDisk("/my-clean-project");

      const tilingStore = useTilingLayoutStore.getState();

      // The matching block must survive the orphan cleanup
      expect(tilingStore.hasBlock("my-tab")).toBe(true);
    });

    it("strips terminal blocks from layout when no saved tabs exist", async () => {
      vi.restoreAllMocks();
      useWorkspaceStore.setState({ activeWorkspaceId: "ws-test" });
      const { useTilingLayoutStore: tilingLayoutStore } = await import("@/stores/tiling-layout");
      tilingLayoutStore.getState().resetToDefault();

      // Layout with terminal blocks but NO saved tabs
      const layoutWithBlocks = {
        global: {
          tabEnableClose: true,
          tabSetEnableDeleteWhenEmpty: true,
        },
        layout: {
          type: "row",
          weight: 100,
          children: [
            {
              type: "tabset",
              weight: 100,
              id: "tabset-main",
              enableDeleteWhenEmpty: false,
              children: [
                {
                  type: "tab",
                  id: "orphan-block",
                  name: "Claude",
                  component: "terminal",
                  config: { type: "terminal", tabId: "orphan-block", sessionType: "claude" },
                },
              ],
            },
          ],
        },
      };

      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") {
          return {
            layoutJson: layoutWithBlocks,
            // No tabs saved — blocks should be stripped
            tabs: [],
          };
        }
        return undefined;
      });

      useTerminalTabsStore.setState({ tabs: [], activeTabId: null });

      await loadProjectFromDisk("/empty-project");

      // Terminal blocks should be stripped since there are no saved tabs
      expect(tilingLayoutStore.getState().hasBlock("orphan-block")).toBe(false);
    });

  });

  describe("switchToProject — session persistence", () => {
    beforeEach(() => {
      // Reset terminal tabs and project store to a clean state
      useTerminalTabsStore.setState({
        tabs: [],
        activeTabId: null,
        counter: 0,
        isTerminalFullscreen: false,
      });

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
        isSwitchingProject: false,
      });

      // Default IPC mock: return null for all channels (no saved disk state)
      vi.mocked(invoke).mockResolvedValue(null);

      // Default file-tree mock
      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
      } as never);
    });

    it("tabs for outgoing project remain in store after switch", async () => {
      // Add a tab for project-a (outgoing project)
      const tabsStore = useTerminalTabsStore.getState();
      const tabId = tabsStore.nextTabId();
      tabsStore.addTab(tabId, "/project-a", "claude");

      // Confirm the tab exists before the switch
      expect(tabsStore.hasTab(tabId)).toBe(true);

      // Switch to project-b
      await useProjectsStore.getState().switchToProject("/project-b");

      // Project-a's tab must still exist in the store after the switch
      expect(useTerminalTabsStore.getState().hasTab(tabId)).toBe(true);
    });

    it("close_pty is NOT called during project switch", async () => {
      // Track any close_pty IPC calls
      const closePtyCalls: unknown[][] = [];
      vi.mocked(invoke).mockImplementation(async (channel: string, ...args: unknown[]) => {
        if (channel === "close_pty") {
          closePtyCalls.push(args);
        }
        return null as never;
      });

      // Add a tab for project-a so there is something to "switch away from"
      const tabsStore = useTerminalTabsStore.getState();
      const tabId = tabsStore.nextTabId();
      tabsStore.addTab(tabId, "/project-a", "claude");

      // Switch to project-b
      await useProjectsStore.getState().switchToProject("/project-b");

      // close_pty must never be called during a project switch
      expect(closePtyCalls).toHaveLength(0);
    });
  });
});
