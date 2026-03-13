import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProjectsStore } from "../projects";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: {
    getState: vi.fn(() => ({
      openProjectPath: vi.fn(),
      saveSidebarStateForProject: vi.fn(),
      restoreSidebarStateForProject: vi.fn(),
      isOpenByProject: {},
    })),
    setState: vi.fn(),
  },
}));

const mockSavePreviewForProject = vi.fn();
const mockRestorePreviewForProject = vi.fn();
vi.mock("@/stores/file-preview", () => ({
  useFilePreviewStore: {
    getState: vi.fn(() => ({
      savePreviewForProject: mockSavePreviewForProject,
      restorePreviewForProject: mockRestorePreviewForProject,
      previewByProject: {},
    })),
  },
}));

const mockSaveActivePluginForProject = vi.fn();
const mockRestoreActivePluginForProject = vi.fn();
vi.mock("@/stores/plugins", () => ({
  usePluginsStore: {
    getState: vi.fn(() => ({
      saveActivePluginForProject: mockSaveActivePluginForProject,
      restoreActivePluginForProject: mockRestoreActivePluginForProject,
      activePluginName: null,
    })),
    setState: vi.fn(),
  },
}));

import { invoke } from "@/lib/ipc";
import { useFileTreeStore } from "@/stores/file-tree";
import { usePluginsStore } from "@/stores/plugins";
import { useRightPanelStore } from "@/stores/right-panel";

describe("useProjectsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectsStore.setState({
      projects: [],
      activeProjectPath: null,
      loading: false,
    });
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

    expect(invoke).toHaveBeenCalledWith("add_recent_project", { path: "/home/user/new-project" });
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
    expect(invoke).toHaveBeenCalledWith("remove_recent_project", { path: "/a" });
  });

  it("switches to project and loads file tree", async () => {
    const mockOpenProjectPath = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFileTreeStore.getState).mockReturnValue({
      openProjectPath: mockOpenProjectPath,
      saveSidebarStateForProject: vi.fn(),
      restoreSidebarStateForProject: vi.fn(),
      isOpenByProject: {},
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

    expect(invoke).toHaveBeenCalledWith("reorder_recent_projects", {
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

    expect(invoke).toHaveBeenCalledWith("update_recent_project", {
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

    expect(invoke).toHaveBeenCalledWith("update_recent_project", {
      path: "/a/my-app",
      name: undefined,
      icon_path: "/icons/custom.svg",
    });
  });

  it("loadProjects maps icon_path from backend to iconPath", async () => {
    vi.mocked(invoke).mockImplementation(async (channel) => {
      if (channel === "get_recent_projects") {
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
      if (channel === "get_recent_projects") {
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
      if (channel === "get_recent_projects") {
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

  it("saves preview for previous project and restores for new project when switching", async () => {
    const mockOpenProjectPath = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFileTreeStore.getState).mockReturnValue({
      openProjectPath: mockOpenProjectPath,
      saveSidebarStateForProject: vi.fn(),
      restoreSidebarStateForProject: vi.fn(),
      isOpenByProject: {},
    } as never);

    useProjectsStore.setState({
      projects: [
        { path: "/project-a", name: "project-a", lastOpened: "" },
        { path: "/project-b", name: "project-b", lastOpened: "" },
      ],
      activeProjectPath: "/project-a",
    });

    await useProjectsStore.getState().switchToProject("/project-b");

    expect(mockSavePreviewForProject).toHaveBeenCalledWith("/project-a");
    expect(mockRestorePreviewForProject).toHaveBeenCalledWith("/project-b");
  });

  it("does not save or restore preview when switching to the same project", async () => {
    const mockOpenProjectPath = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFileTreeStore.getState).mockReturnValue({
      openProjectPath: mockOpenProjectPath,
      saveSidebarStateForProject: vi.fn(),
      restoreSidebarStateForProject: vi.fn(),
      isOpenByProject: {},
    } as never);

    useProjectsStore.setState({
      projects: [{ path: "/project-a", name: "project-a", lastOpened: "" }],
      activeProjectPath: "/project-a",
    });

    await useProjectsStore.getState().switchToProject("/project-a");

    expect(mockSavePreviewForProject).not.toHaveBeenCalled();
    expect(mockRestorePreviewForProject).not.toHaveBeenCalled();
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
  });

  it("only restores preview (no save) when there is no previous active project", async () => {
    const mockOpenProjectPath = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useFileTreeStore.getState).mockReturnValue({
      openProjectPath: mockOpenProjectPath,
      saveSidebarStateForProject: vi.fn(),
      restoreSidebarStateForProject: vi.fn(),
      isOpenByProject: {},
    } as never);

    useProjectsStore.setState({
      projects: [{ path: "/project-a", name: "project-a", lastOpened: "" }],
      activeProjectPath: null,
    });

    await useProjectsStore.getState().switchToProject("/project-a");

    expect(mockSavePreviewForProject).not.toHaveBeenCalled();
    expect(mockRestorePreviewForProject).toHaveBeenCalledWith("/project-a");
  });

  describe("switchToProject plugin and right panel guard", () => {
    beforeEach(() => {
      // Reset right panel store to defaults
      useRightPanelStore.setState({
        isOpen: false,
        isOpenByProject: {},
        activeView: "empty",
        activeViewByProject: {},
      });
    });

    it("saves active plugin for previous project and restores for new project", async () => {
      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
        saveSidebarStateForProject: vi.fn(),
        restoreSidebarStateForProject: vi.fn(),
        isOpenByProject: {},
      } as never);

      useProjectsStore.setState({
        projects: [
          { path: "/project-a", name: "a", lastOpened: "" },
          { path: "/project-b", name: "b", lastOpened: "" },
        ],
        activeProjectPath: "/project-a",
      });

      await useProjectsStore.getState().switchToProject("/project-b");

      expect(mockSaveActivePluginForProject).toHaveBeenCalledWith("/project-a");
      expect(mockRestoreActivePluginForProject).toHaveBeenCalledWith("/project-b");
    });

    it("does not open right panel from disk state when no active plugin", async () => {
      vi.mocked(invoke).mockImplementation(async (ch: string) => {
        if (ch === "get_project_ui_state") return { rightPanelOpen: true };
        return undefined;
      });

      vi.mocked(usePluginsStore.getState).mockReturnValue({
        saveActivePluginForProject: mockSaveActivePluginForProject,
        restoreActivePluginForProject: mockRestoreActivePluginForProject,
        activePluginName: null,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
        saveSidebarStateForProject: vi.fn(),
        restoreSidebarStateForProject: vi.fn(),
        isOpenByProject: {},
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
        saveActivePluginForProject: mockSaveActivePluginForProject,
        restoreActivePluginForProject: mockRestoreActivePluginForProject,
        activePluginName: "my-plugin",
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
        saveSidebarStateForProject: vi.fn(),
        restoreSidebarStateForProject: vi.fn(),
        isOpenByProject: {},
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
        saveActivePluginForProject: mockSaveActivePluginForProject,
        restoreActivePluginForProject: mockRestoreActivePluginForProject,
        activePluginName: null, // restored null for new project
        pinnedPluginName: "pomodoro",
        setActivePlugin: mockSetActivePlugin,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
        saveSidebarStateForProject: vi.fn(),
        restoreSidebarStateForProject: vi.fn(),
        isOpenByProject: {},
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
        saveActivePluginForProject: mockSaveActivePluginForProject,
        restoreActivePluginForProject: mockRestoreActivePluginForProject,
        activePluginName: null, // always null after restore (new projects)
        pinnedPluginName: "pomodoro",
        setActivePlugin: mockSetActivePlugin,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
        saveSidebarStateForProject: vi.fn(),
        restoreSidebarStateForProject: vi.fn(),
        isOpenByProject: {},
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
        saveActivePluginForProject: mockSaveActivePluginForProject,
        restoreActivePluginForProject: mockRestoreActivePluginForProject,
        activePluginName: null,
        pinnedPluginName: null,
      } as never);

      vi.mocked(useFileTreeStore.getState).mockReturnValue({
        openProjectPath: vi.fn().mockResolvedValue(undefined),
        saveSidebarStateForProject: vi.fn(),
        restoreSidebarStateForProject: vi.fn(),
        isOpenByProject: {},
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
});
