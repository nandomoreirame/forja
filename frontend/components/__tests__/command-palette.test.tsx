import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "../command-palette";
import { useCommandPaletteStore } from "@/stores/command-palette";
import type { Project } from "@/stores/projects";

// cmdk calls scrollIntoView which jsdom doesn't implement
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

const mockFileTreeState = {
  tree: null as ReturnType<typeof import("@/stores/file-tree").useFileTreeStore> extends { tree: infer T } ? T : unknown,
  currentPath: null as string | null,
  toggleSidebar: vi.fn(),
  openProject: vi.fn(),
  selectFile: vi.fn(),
  isOpen: false,
  expandedPaths: new Set<string>(),
  setTree: vi.fn(),
  toggleExpanded: vi.fn(),
  isExpanded: vi.fn(),
  collapseAll: vi.fn(),
};

vi.mock("@/stores/file-tree", () => ({
  APP_NAME: "Forja",
  useFileTreeStore: Object.assign(
    () => mockFileTreeState,
    { getState: () => mockFileTreeState }
  ),
}));

vi.mock("@/stores/file-preview", () => ({
  useFilePreviewStore: Object.assign(() => ({}), {
    getState: () => ({
      loadFile: vi.fn(),
      togglePreview: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: Object.assign(() => ({}), {
    getState: () => ({
      addTab: vi.fn(),
      nextTabId: () => "tab-1",
    }),
  }),
}));

vi.mock("@/stores/app-dialogs", () => ({
  useAppDialogsStore: Object.assign(() => ({}), {
    getState: () => ({
      setShortcutsOpen: vi.fn(),
      setAboutOpen: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/user-settings", () => ({
  useUserSettingsStore: Object.assign(() => ({}), {
    getState: () => ({
      openSettingsEditor: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/agent-chat", () => ({
  useAgentChatStore: Object.assign(() => ({}), {
    getState: () => ({
      togglePanel: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/terminal-zoom", () => ({
  useTerminalZoomStore: Object.assign(() => ({}), {
    getState: () => ({
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetZoom: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/git-diff", () => ({
  useGitDiffStore: Object.assign(() => ({}), {
    getState: () => ({
      changedFilesByProject: {},
      selectedProjectPath: null,
      selectedPath: null,
      fetchChangedFiles: vi.fn(),
      selectChangedFile: vi.fn(),
      diffMode: "split",
      setDiffMode: vi.fn(),
    }),
  }),
}));

vi.mock("@/stores/git-status", () => ({
  useGitStatusStore: Object.assign(() => ({}), {
    getState: () => ({
      forceFetchStatuses: vi.fn(),
    }),
  }),
}));

const mockInstalledClis = {
  installedClis: [] as Array<{ id: string; displayName: string; icon: string }>,
  loading: false,
};

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => mockInstalledClis,
}));

const mockSwitchToProject = vi.fn();
const mockProjectsState = {
  projects: [] as Project[],
  activeProjectPath: null as string | null,
  switchToProject: mockSwitchToProject,
  getProjectInitial: (nameOrPath: string) => nameOrPath[0]?.toUpperCase() ?? "?",
  getProjectColor: () => "#cba6f7",
};

vi.mock("@/stores/projects", () => ({
  useProjectsStore: Object.assign(
    () => mockProjectsState,
    { getState: () => mockProjectsState }
  ),
}));

const mockTilingHasBlock = vi.fn(() => false);
const mockTilingAddBlock = vi.fn();

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { hasBlock: mockTilingHasBlock, addBlock: mockTilingAddBlock, hasBlockOfType: vi.fn(() => false) };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ hasBlock: mockTilingHasBlock, addBlock: mockTilingAddBlock }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    },
  ),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ isOpen: false, mode: "files" });
    mockFileTreeState.tree = null;
    mockFileTreeState.currentPath = null;
  });

  it("does not render dialog content when isOpen is false", () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText("Search files...")).not.toBeInTheDocument();
  });

  it("renders files mode with correct placeholder", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "files" });
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText("Search files...")).toBeInTheDocument();
  });

  it("renders commands mode with correct placeholder", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText("Type a command...")).toBeInTheDocument();
  });

  it("lists commands in commands mode", () => {
    mockFileTreeState.currentPath = "/project";
    mockTilingHasBlock.mockReturnValue(true);
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    // Session group
    expect(screen.getByText("New Session")).toBeInTheDocument();
    expect(screen.getByText("Add Project")).toBeInTheDocument();

    // Panels & View group
    expect(screen.getByText("Open Files")).toBeInTheDocument();
    expect(screen.getByText("Open Browser")).toBeInTheDocument();
    expect(screen.getByText("Collapse All Folders")).toBeInTheDocument();

    // Terminal group
    expect(screen.getByText("Zoom In")).toBeInTheDocument();
    expect(screen.getByText("Zoom Out")).toBeInTheDocument();
    expect(screen.getByText("Reset Zoom")).toBeInTheDocument();

    // Git group
    expect(screen.getByText("View Git Changes")).toBeInTheDocument();
    expect(screen.getByText("Toggle Diff Mode")).toBeInTheDocument();
    expect(screen.getByText("Refresh Git Status")).toBeInTheDocument();

    // Settings & Help group
    expect(screen.getByText("Open Settings")).toBeInTheDocument();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("renders command groups with headings", () => {
    mockFileTreeState.currentPath = "/project";
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(screen.getByText("Panels & View")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    // "Terminal" appears both as a group heading and as a session item
    const terminals = screen.getAllByText("Terminal");
    expect(terminals.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Git")).toBeInTheDocument();
    expect(screen.getByText("Settings & Help")).toBeInTheDocument();
  });

  it("lists flattened files when tree is available in files mode", () => {
    mockFileTreeState.tree = {
      root: {
        name: "project",
        path: "/home/user/project",
        isDir: true,
        children: [
          {
            name: "README.md",
            path: "/home/user/project/README.md",
            isDir: false,
            extension: "md",
          },
          {
            name: "src",
            path: "/home/user/project/src",
            isDir: true,
            children: [
              {
                name: "index.ts",
                path: "/home/user/project/src/index.ts",
                isDir: false,
                extension: "ts",
              },
            ],
          },
        ],
      },
    };
    mockFileTreeState.currentPath = "/home/user/project";

    useCommandPaletteStore.setState({ isOpen: true, mode: "files" });
    render(<CommandPalette />);

    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();
  });

  it("shows shortcut badges on commands", () => {
    mockFileTreeState.currentPath = "/project";
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    const newSessionItem = screen.getByText("New Session").closest("[cmdk-item]") as HTMLElement;
    expect(newSessionItem).toBeInTheDocument();
    expect(within(newSessionItem).getByText(/T$/)).toBeInTheDocument();

    const addProjectItem = screen.getByText("Add Project").closest("[cmdk-item]") as HTMLElement;
    expect(addProjectItem).toBeInTheDocument();
    expect(within(addProjectItem).getByText(/Shift\+O$/)).toBeInTheDocument();

  });

  describe("sessions mode", () => {
    beforeEach(() => {
      mockInstalledClis.installedClis = [];
      mockInstalledClis.loading = false;
    });

    it("renders sessions mode with correct placeholder", () => {
      useCommandPaletteStore.setState({ isOpen: true, mode: "sessions" });
      render(<CommandPalette />);
      expect(screen.getByPlaceholderText("Select session type...")).toBeInTheDocument();
    });

    it("always shows Terminal in sessions mode", () => {
      useCommandPaletteStore.setState({ isOpen: true, mode: "sessions" });
      render(<CommandPalette />);
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("shows installed CLIs in sessions mode", () => {
      mockInstalledClis.installedClis = [
        { id: "claude", displayName: "Claude Code", icon: "./images/claude.svg" },
        { id: "gemini", displayName: "Gemini CLI", icon: "./images/gemini.svg" },
      ];
      useCommandPaletteStore.setState({ isOpen: true, mode: "sessions" });
      render(<CommandPalette />);
      expect(screen.getByText("Claude Code")).toBeInTheDocument();
      expect(screen.getByText("Gemini CLI")).toBeInTheDocument();
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });

    it("shows loading spinner while detecting CLIs", () => {
      mockInstalledClis.loading = true;
      useCommandPaletteStore.setState({ isOpen: true, mode: "sessions" });
      render(<CommandPalette />);
      expect(screen.getByText("Detecting installed CLIs...")).toBeInTheDocument();
    });

    it("selecting a CLI creates tab and closes palette", async () => {
      const user = userEvent.setup();
      const addTabMock = vi.fn();
      const { useTerminalTabsStore } = await import("@/stores/terminal-tabs");
      const original = useTerminalTabsStore.getState;
      (useTerminalTabsStore as any).getState = () => ({
        addTab: addTabMock,
        nextTabId: () => "tab-new",
      });

      mockInstalledClis.installedClis = [
        { id: "claude", displayName: "Claude Code", icon: "./images/claude.svg" },
      ];
      mockFileTreeState.currentPath = "/project";
      useCommandPaletteStore.setState({ isOpen: true, mode: "sessions" });
      render(<CommandPalette />);

      await user.click(screen.getByText("Claude Code"));
      expect(addTabMock).toHaveBeenCalledWith("tab-new", "/project", "claude");

      const state = useCommandPaletteStore.getState();
      expect(state.isOpen).toBe(false);

      (useTerminalTabsStore as any).getState = original;
    });

    it("'New Session' command in commands mode switches to sessions mode", async () => {
      const user = userEvent.setup();
      mockFileTreeState.currentPath = "/project";
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);

      await user.click(screen.getByText("New Session"));
      const state = useCommandPaletteStore.getState();
      expect(state.mode).toBe("sessions");
      expect(state.isOpen).toBe(true);
    });
  });

  describe("Open Files and Open Browser commands", () => {
    beforeEach(() => {
      mockTilingHasBlock.mockReturnValue(false);
      mockTilingAddBlock.mockClear();
    });

    it("shows Open Files in Panels & View commands group", () => {
      mockFileTreeState.currentPath = "/project";
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);
      expect(screen.getByText("Open Files")).toBeInTheDocument();
    });

    it("shows Open Browser in Panels & View commands group", () => {
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);
      expect(screen.getByText("Open Browser")).toBeInTheDocument();
    });

    it("does not show Toggle File Preview in commands mode", () => {
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);
      expect(screen.queryByText("Toggle File Preview")).not.toBeInTheDocument();
    });

    it("does not show Toggle Right Panel in commands mode", () => {
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);
      expect(screen.queryByText("Toggle Right Panel")).not.toBeInTheDocument();
    });

    it("does not show Toggle Chat Panel in commands mode", () => {
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);
      expect(screen.queryByText("Toggle Chat Panel")).not.toBeInTheDocument();
    });

    it("does not show Files in sessions mode", () => {
      mockInstalledClis.installedClis = [];
      useCommandPaletteStore.setState({ isOpen: true, mode: "sessions" });
      render(<CommandPalette />);
      expect(screen.queryByText("Files")).not.toBeInTheDocument();
    });

    it("Open Files adds file-tree block via tiling layout", async () => {
      const user = userEvent.setup();
      mockFileTreeState.tree = {
        root: { name: "my-project", path: "/project", isDir: true, children: [] },
      };
      mockFileTreeState.currentPath = "/project";
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);

      await user.click(screen.getByText("Open Files"));
      expect(mockTilingAddBlock).toHaveBeenCalledWith(
        { type: "file-tree", projectName: "my-project" },
        undefined,
        "tab-file-tree",
      );
    });

    it("Open Browser adds browser block via tiling layout", async () => {
      const user = userEvent.setup();
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);

      await user.click(screen.getByText("Open Browser"));
      expect(mockTilingAddBlock).toHaveBeenCalledWith(
        expect.objectContaining({ type: "browser" }),
        undefined,
        expect.stringContaining("browser-"),
      );
    });
  });

  describe("projects mode", () => {
    beforeEach(() => {
      mockProjectsState.projects = [];
      mockProjectsState.activeProjectPath = null;
      mockSwitchToProject.mockClear();
    });

    it("renders projects mode with correct placeholder", () => {
      useCommandPaletteStore.setState({ isOpen: true, mode: "projects" });
      render(<CommandPalette />);
      expect(screen.getByPlaceholderText("Go to project...")).toBeInTheDocument();
    });

    it("shows empty state when no projects available", () => {
      mockProjectsState.projects = [];
      useCommandPaletteStore.setState({ isOpen: true, mode: "projects" });
      render(<CommandPalette />);
      expect(screen.getByText("No projects found.")).toBeInTheDocument();
    });

    it("lists projects in projects mode", () => {
      mockProjectsState.projects = [
        { path: "/home/user/project-a", name: "project-a", lastOpened: "", iconPath: null },
        { path: "/home/user/project-b", name: "project-b", lastOpened: "", iconPath: null },
      ];
      useCommandPaletteStore.setState({ isOpen: true, mode: "projects" });
      render(<CommandPalette />);
      expect(screen.getByText("project-a")).toBeInTheDocument();
      expect(screen.getByText("project-b")).toBeInTheDocument();
    });

    it("highlights active project with indicator", () => {
      mockProjectsState.projects = [
        { path: "/home/user/project-a", name: "project-a", lastOpened: "", iconPath: null },
        { path: "/home/user/project-b", name: "project-b", lastOpened: "", iconPath: null },
      ];
      mockProjectsState.activeProjectPath = "/home/user/project-a";
      useCommandPaletteStore.setState({ isOpen: true, mode: "projects" });
      render(<CommandPalette />);
      // The active project item should have aria-selected=true (cmdk sets this)
      const activeItem = screen.getByText("project-a").closest("[cmdk-item]") as HTMLElement;
      expect(activeItem).toBeInTheDocument();
    });

    it("calls switchToProject and closes palette when selecting a project", async () => {
      const user = userEvent.setup();
      mockProjectsState.projects = [
        { path: "/home/user/project-a", name: "project-a", lastOpened: "", iconPath: null },
      ];
      useCommandPaletteStore.setState({ isOpen: true, mode: "projects" });
      render(<CommandPalette />);

      await user.click(screen.getByText("project-a"));
      expect(mockSwitchToProject).toHaveBeenCalledWith("/home/user/project-a");
      const state = useCommandPaletteStore.getState();
      expect(state.isOpen).toBe(false);
    });

    it("'Go to Project' command in commands mode switches to projects mode", async () => {
      const user = userEvent.setup();
      mockProjectsState.projects = [{ path: "/project", name: "project", lastOpened: "", iconPath: null }];
      useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
      render(<CommandPalette />);

      await user.click(screen.getByText("Go to Project"));
      const state = useCommandPaletteStore.getState();
      expect(state.mode).toBe("projects");
      expect(state.isOpen).toBe(true);
    });

    it("shows project path as secondary text", () => {
      mockProjectsState.projects = [
        { path: "/home/user/my-project", name: "my-project", lastOpened: "", iconPath: null },
      ];
      useCommandPaletteStore.setState({ isOpen: true, mode: "projects" });
      render(<CommandPalette />);
      expect(screen.getByText("/home/user/my-project")).toBeInTheDocument();
    });
  });
});
