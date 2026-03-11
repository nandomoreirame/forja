import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "../command-palette";
import { useCommandPaletteStore } from "@/stores/command-palette";

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
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    // Session group
    expect(screen.getByText("New Session")).toBeInTheDocument();
    expect(screen.getByText("Add Project")).toBeInTheDocument();

    // Panels & View group
    expect(screen.getByText("Toggle Sidebar")).toBeInTheDocument();
    expect(screen.getByText("Toggle File Preview")).toBeInTheDocument();
    expect(screen.getByText("Toggle Terminal")).toBeInTheDocument();
    expect(screen.getByText("Toggle Chat Panel")).toBeInTheDocument();
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
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(screen.getByText("Panels & View")).toBeInTheDocument();
    expect(screen.getByText("Terminal")).toBeInTheDocument();
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
    useCommandPaletteStore.setState({ isOpen: true, mode: "commands" });
    render(<CommandPalette />);

    const newSessionItem = screen.getByText("New Session").closest("[cmdk-item]") as HTMLElement;
    expect(newSessionItem).toBeInTheDocument();
    expect(within(newSessionItem).getByText(/T$/)).toBeInTheDocument();
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
});
