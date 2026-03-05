import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useFilePreviewStore } from "@/stores/file-preview";

// Track resize calls on the mock panel handle
const mockResize = vi.fn();
const mockExpand = vi.fn();
const mockCollapse = vi.fn();
const mockIsCollapsed = vi.fn(() => true);

vi.mock("react-resizable-panels", () => ({
  usePanelRef: () => ({
    current: {
      resize: mockResize,
      expand: mockExpand,
      collapse: mockCollapse,
      isCollapsed: mockIsCollapsed,
      getSize: () => ({ asPercentage: 0, inPixels: 0 }),
    },
  }),
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="panel-group">{children}</div>,
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  Separator: () => <div data-testid="separator" />,
}));

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockImplementation((channel: string) => {
    if (channel === "get_user_settings")
      return Promise.resolve({
        app: { fontFamily: "sans-serif", fontSize: 14 },
        editor: { fontFamily: "monospace", fontSize: 13 },
        terminal: { fontFamily: "monospace", fontSize: 14 },
        window: { zoomLevel: 0, opacity: 1 },
        sessions: {},
      });
    if (channel === "get_ui_preferences")
      return Promise.resolve({ sidebarSize: 20, previewSize: 0 });
    if (channel === "get_recent_projects") return Promise.resolve([]);
    if (channel === "detect_installed_clis") return Promise.resolve({});
    if (channel === "get_git_info_command")
      return Promise.resolve({
        isGitRepo: false,
        branch: null,
        fileStatus: null,
        changedFiles: 0,
      });
    return Promise.resolve(undefined);
  }),
  listen: vi.fn().mockResolvedValue(() => {}),
  open: vi.fn(),
  getName: vi.fn().mockResolvedValue("Forja"),
  getVersion: vi.fn().mockResolvedValue("0.0.0"),
  getElectronVersion: vi.fn().mockResolvedValue("0.0.0"),
  getCurrentWindow: vi.fn().mockReturnValue({
    label: "main",
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(() => {}),
  }),
}));

// Stub heavy child components to keep the test focused
vi.mock("../file-tree-sidebar", () => ({
  FileTreeSidebar: () => <div data-testid="file-tree-sidebar" />,
}));
vi.mock("../file-preview-pane", () => ({
  FilePreviewPane: () => <div data-testid="file-preview-pane" />,
}));
vi.mock("../titlebar", () => ({
  Titlebar: () => <div data-testid="titlebar" />,
}));
vi.mock("../tab-bar", () => ({
  TabBar: () => <div data-testid="tab-bar" />,
}));
vi.mock("../terminal-pane", () => ({
  TerminalPane: () => <div data-testid="terminal-pane" />,
}));
vi.mock("../new-session-dropdown", () => ({
  NewSessionDropdown: () => <div data-testid="new-session-dropdown" />,
}));
vi.mock("../command-palette", () => ({
  CommandPalette: () => null,
}));
vi.mock("../claude-not-found-dialog", () => ({
  ClaudeNotFoundDialog: () => null,
}));
vi.mock("../create-workspace-dialog", () => ({
  CreateWorkspaceDialog: () => null,
}));
vi.mock("@/lib/cli-registry", () => ({
  getAllCliBinaries: () => [],
}));

// Need to import App after all mocks are set up
const { default: App } = await import("../../App");
const { useFileTreeStore } = await import("@/stores/file-tree");

describe("Preview panel sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsCollapsed.mockReturnValue(true);

    // Set up a project so the resizable panels render
    useFileTreeStore.setState({
      isOpen: true,
      currentPath: "/test/project",
      tree: {
        root: {
          name: "project",
          path: "/test/project",
          isDir: true,
          children: [],
        },
      },
      trees: {
        "/test/project": {
          root: {
            name: "project",
            path: "/test/project",
            isDir: true,
            children: [],
          },
        },
      },
    });

    useFilePreviewStore.setState({
      isOpen: false,
      currentFile: null,
      content: null,
      isLoading: false,
      error: null,
    });
  });

  it("calls panel.resize with a percentage string, not a bare number", async () => {
    render(<App />);

    // Simulate a file being selected and preview opening
    await act(async () => {
      useFilePreviewStore.setState({ isOpen: true });
    });

    expect(mockExpand).toHaveBeenCalled();
    expect(mockResize).toHaveBeenCalled();

    // The bug: resize(35) passes 35 pixels instead of 35%.
    // react-resizable-panels v4+ treats numbers as pixels.
    // The fix: pass "35%" (string with unit) for percentage sizing.
    const resizeArg = mockResize.mock.calls[mockResize.mock.calls.length - 1][0];
    expect(typeof resizeArg).toBe("string");
    expect(resizeArg).toMatch(/%$/);
  });
});
