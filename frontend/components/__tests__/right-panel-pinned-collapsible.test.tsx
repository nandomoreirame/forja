/**
 * Tests that the right panel's `collapsible` prop is driven by `pinnedPluginName`.
 *
 * Bug: when a plugin is pinned, dragging the resize handle below `minSize`
 * collapses the panel completely because `collapsible` is always `true` on
 * the <ResizablePanel>.  The fix is to pass `collapsible={!hasPinnedPlugin}`.
 *
 * Strategy: spy on ResizablePrimitive.Panel and capture the props it receives,
 * then assert that `collapsible` is `false` when a plugin is pinned and `true`
 * when no plugin is pinned.
 */

import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type * as ResizablePrimitive from "react-resizable-panels";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Capture props for every <Panel> render so tests can inspect them.
const capturedPanelProps: ResizablePrimitive.PanelProps[] = [];

// Controls what pinnedPlugin value the IPC mock returns for each test.
let mockPinnedPlugin: string | null = null;

vi.mock("react-resizable-panels", () => {
  const mockRef = {
    current: {
      resize: vi.fn(),
      expand: vi.fn(),
      collapse: vi.fn(),
      isCollapsed: vi.fn(() => false),
      getSize: () => ({ asPercentage: 20, inPixels: 300 }),
    },
  };
  return {
    usePanelRef: () => mockRef,
    Group: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="panel-group">{children}</div>
    ),
    Panel: (props: ResizablePrimitive.PanelProps) => {
      capturedPanelProps.push(props);
      return <div data-testid={`panel-order-${props.order ?? "n"}`}>{props.children}</div>;
    },
    Separator: () => <div data-testid="separator" />,
  };
});

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
      return Promise.resolve({ sidebarSize: 20, previewSize: 35, rightPanelWidth: 400 });
    if (channel === "get_recent_projects") return Promise.resolve([]);
    if (channel === "detect_installed_clis") return Promise.resolve({});
    if (channel === "plugin:list") return Promise.resolve([]);
    if (channel === "plugin:get-plugin-order") return Promise.resolve([]);
    // Use the per-test variable so we can simulate pinned vs. unpinned.
    if (channel === "plugin:get-pinned") return Promise.resolve(mockPinnedPlugin);
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

vi.mock("../file-tree-sidebar", () => ({
  FileTreeSidebar: () => <div data-testid="file-tree-sidebar" />,
  SIDEBAR_MAX_WIDTH: "500px",
}));
vi.mock("../file-preview-pane", () => ({
  FilePreviewPane: () => <div data-testid="file-preview-pane" />,
}));
vi.mock("../browser-pane", () => ({
  BrowserPane: () => <div data-testid="browser-pane" />,
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
vi.mock("../right-sidebar", () => ({
  RightSidebar: () => <div data-testid="right-sidebar" />,
}));
vi.mock("../plugin-host", () => ({
  PluginHost: () => <div data-testid="plugin-host" />,
}));
vi.mock("../chat-panel", () => ({
  ChatPanel: () => <div data-testid="chat-panel" />,
}));
vi.mock("../plugin-permission-dialog", () => ({
  PluginPermissionDialog: () => null,
}));
vi.mock("@/lib/cli-registry", () => ({
  getAllCliIds: () => [],
  getAllCliBinaries: () => [],
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the last set of props passed to the Panel with `order={3}` (right panel). */
function getRightPanelProps(): ResizablePrimitive.PanelProps | undefined {
  // Order=3 is the right panel (sidebar=1, main=2, right=3).
  // Use `findLast` to get the most recent render of that panel.
  for (let i = capturedPanelProps.length - 1; i >= 0; i--) {
    if (capturedPanelProps[i].order === 3) return capturedPanelProps[i];
  }
  return undefined;
}

// ─── Imports after mocks ──────────────────────────────────────────────────────

const { default: App } = await import("../../App");
const { useFileTreeStore } = await import("@/stores/file-tree");
const { usePluginsStore } = await import("@/stores/plugins");
const { useRightPanelStore } = await import("@/stores/right-panel");

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("Right panel collapsible prop - pinned plugin protection (Bug 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPanelProps.length = 0;
    mockPinnedPlugin = null;

    // Set up a project so the resizable layout renders
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

    useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });
    // Reset plugins store to avoid state bleeding between tests
    usePluginsStore.setState({
      pinnedPluginName: null,
      activePluginName: null,
      plugins: [],
      pluginOrder: [],
      loading: false,
    });
  });

  it("right panel is collapsible when no plugin is pinned", async () => {
    // mockPinnedPlugin = null (default) — loadPlugins() sets pinnedPluginName to null
    await act(async () => {
      render(<App />);
    });

    const props = getRightPanelProps();
    expect(props).toBeDefined();
    // collapsible should be true (or truthy) when no plugin is pinned
    expect(props?.collapsible).toBe(true);
  });

  it("right panel is NOT collapsible when a plugin is pinned", async () => {
    // Make loadPlugins() return "pomodoro" as the pinned plugin
    mockPinnedPlugin = "pomodoro";

    await act(async () => {
      render(<App />);
    });

    const props = getRightPanelProps();
    // collapsible must be false when a plugin is pinned — the library must not
    // be allowed to collapse the panel by dragging below minSize.
    expect(props).toBeDefined();
    expect(props?.collapsible).toBe(false);
  });

  it("right panel becomes collapsible again when plugin is unpinned", async () => {
    // Start with a pinned plugin
    mockPinnedPlugin = "pomodoro";

    const { rerender } = await act(async () => render(<App />));

    // Verify it starts as not collapsible
    const initialProps = getRightPanelProps();
    expect(initialProps?.collapsible).toBe(false);

    // Simulate unpinning: update the store directly and rerender
    capturedPanelProps.length = 0;
    await act(async () => {
      usePluginsStore.setState({ pinnedPluginName: null });
      rerender(<App />);
    });

    const updatedProps = getRightPanelProps();
    expect(updatedProps).toBeDefined();
    expect(updatedProps?.collapsible).toBe(true);
  });

  it("right panel stays open when a plugin is pinned (isOpen remains true after render)", async () => {
    mockPinnedPlugin = "pomodoro";

    await act(async () => {
      render(<App />);
    });

    // The right panel should still be open (pinned plugin visible)
    expect(useRightPanelStore.getState().isOpen).toBe(true);

    const props = getRightPanelProps();
    expect(props?.collapsible).toBe(false);
  });
});
