import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "../command-palette";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useQuickActionsStore } from "@/stores/quick-actions";

// cmdk calls scrollIntoView which jsdom doesn't implement
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  open: vi.fn(),
}));

vi.mock("@/stores/file-tree", () => ({
  APP_NAME: "Forja",
  useFileTreeStore: Object.assign(
    () => ({
      tree: null,
      currentPath: null,
      toggleSidebar: vi.fn(),
      openProject: vi.fn(),
      selectFile: vi.fn(),
      isOpen: false,
      expandedPaths: new Set(),
      setTree: vi.fn(),
      toggleExpanded: vi.fn(),
      isExpanded: vi.fn(),
      collapseAll: vi.fn(),
    }),
    {
      getState: () => ({
        tree: null,
        currentPath: null,
        toggleSidebar: vi.fn(),
        openProject: vi.fn(),
        collapseAll: vi.fn(),
      }),
    },
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

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({ installedClis: [], loading: false }),
}));

vi.mock("@/stores/projects", () => ({
  useProjectsStore: Object.assign(
    () => ({
      projects: [],
      activeProjectPath: null,
      switchToProject: vi.fn(),
      getProjectInitial: (nameOrPath: string) => nameOrPath[0]?.toUpperCase() ?? "?",
      getProjectColor: () => "#cba6f7",
    }),
    {
      getState: () => ({
        projects: [],
        activeProjectPath: null,
        switchToProject: vi.fn(),
        getProjectInitial: (nameOrPath: string) => nameOrPath[0]?.toUpperCase() ?? "?",
        getProjectColor: () => "#cba6f7",
      }),
    },
  ),
}));

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { hasBlock: vi.fn(() => false), addBlock: vi.fn(), hasBlockOfType: vi.fn(() => false) };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ hasBlock: vi.fn(() => false), addBlock: vi.fn() }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    },
  ),
}));

vi.mock("@/stores/focus-mode", () => ({
  useFocusModeStore: Object.assign(() => ({}), {
    getState: () => ({
      toggleFocusMode: vi.fn(),
    }),
  }),
}));

describe("CommandPalette quick-actions mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommandPaletteStore.setState({ isOpen: false, mode: "files" });
    // Reset quick-actions store state
    useQuickActionsStore.setState({ actions: [], loaded: true });
  });

  it("shows 'Add quick action...' placeholder when in quick-actions mode", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText("Add quick action...")).toBeInTheDocument();
  });

  it("shows 'No actions found.' empty message when searching with no matches", async () => {
    const user = userEvent.setup();
    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);

    // Type something that won't match any action
    const input = screen.getByPlaceholderText("Add quick action...");
    await user.type(input, "zzzznotfound");

    expect(screen.getByText("No actions found.")).toBeInTheDocument();
  });

  it("shows grouped action entries from action registry", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);

    // Panels & View group actions
    expect(screen.getByText("Toggle Files")).toBeInTheDocument();
    expect(screen.getByText("Open Browser")).toBeInTheDocument();
    expect(screen.getByText("Toggle Focus Mode")).toBeInTheDocument();

    // Terminal group actions
    expect(screen.getByText("Zoom In")).toBeInTheDocument();
    expect(screen.getByText("Zoom Out")).toBeInTheDocument();
    expect(screen.getByText("Reset Zoom")).toBeInTheDocument();

    // Git group actions
    expect(screen.getByText("View Git Changes")).toBeInTheDocument();
    expect(screen.getByText("Toggle Diff Mode")).toBeInTheDocument();
    expect(screen.getByText("Refresh Git Status")).toBeInTheDocument();

    // Settings group actions
    expect(screen.getByText("Change Theme")).toBeInTheDocument();
    expect(screen.getByText("Open Settings")).toBeInTheDocument();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("shows group headings", () => {
    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);

    expect(screen.getByText("Panels & View")).toBeInTheDocument();
    expect(screen.getAllByText("Terminal").length).toBeGreaterThan(0);
    expect(screen.getByText("Git")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("does not show Check icon for unpinned actions", () => {
    useQuickActionsStore.setState({ actions: [], loaded: true });
    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);

    // Get the "Zoom In" item and check no check icon
    const zoomInItem = screen.getByText("Zoom In").closest("[cmdk-item]") as HTMLElement;
    expect(zoomInItem).toBeInTheDocument();
    // The check icon has aria-hidden and specific class; we check via the SVG count
    // There should be only the action icon, not a check mark icon with text-ctp-green class
    const checkIcons = zoomInItem.querySelectorAll(".text-ctp-green");
    expect(checkIcons.length).toBe(0);
  });

  it("shows Check icon for pinned actions", () => {
    useQuickActionsStore.setState({
      actions: [{ actionId: "zoom-in" }],
      loaded: true,
    });
    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);

    const zoomInItem = screen.getByText("Zoom In").closest("[cmdk-item]") as HTMLElement;
    expect(zoomInItem).toBeInTheDocument();
    // The check icon is rendered as an SVG with class text-ctp-green inside the item
    const checkIcon = zoomInItem.querySelector(".text-ctp-green");
    expect(checkIcon).toBeInTheDocument();
  });

  it("pins an unpinned action and closes palette on select", async () => {
    const user = userEvent.setup();
    const addActionMock = vi.fn().mockResolvedValue(undefined);
    useQuickActionsStore.setState({ actions: [], loaded: true });
    // Override addAction to track calls
    const originalGetState = useQuickActionsStore.getState;
    const mockStore = {
      ...originalGetState(),
      addAction: addActionMock,
      removeAction: vi.fn().mockResolvedValue(undefined),
      isPinned: () => false,
    };
    vi.spyOn(useQuickActionsStore, "getState").mockReturnValue(mockStore as ReturnType<typeof useQuickActionsStore.getState>);

    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);

    await user.click(screen.getByText("Zoom In"));
    expect(addActionMock).toHaveBeenCalledWith("zoom-in");

    const state = useCommandPaletteStore.getState();
    expect(state.isOpen).toBe(false);

    vi.restoreAllMocks();
  });

  it("unpins a pinned action and closes palette on select", async () => {
    const user = userEvent.setup();
    const removeActionMock = vi.fn().mockResolvedValue(undefined);
    useQuickActionsStore.setState({ actions: [{ actionId: "zoom-out" }], loaded: true });
    // Override removeAction to track calls
    const originalGetState = useQuickActionsStore.getState;
    const mockStore = {
      ...originalGetState(),
      addAction: vi.fn().mockResolvedValue(undefined),
      removeAction: removeActionMock,
      isPinned: (id: string) => id === "zoom-out",
    };
    vi.spyOn(useQuickActionsStore, "getState").mockReturnValue(mockStore as ReturnType<typeof useQuickActionsStore.getState>);

    useCommandPaletteStore.setState({ isOpen: true, mode: "quick-actions" });
    render(<CommandPalette />);

    await user.click(screen.getByText("Zoom Out"));
    expect(removeActionMock).toHaveBeenCalledWith("zoom-out");

    const state = useCommandPaletteStore.getState();
    expect(state.isOpen).toBe(false);

    vi.restoreAllMocks();
  });
});
