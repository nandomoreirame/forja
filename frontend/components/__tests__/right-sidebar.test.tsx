import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RightSidebar } from "../right-sidebar";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const mockHasBlock = vi.fn(() => false);
const mockHasBlockOfType = vi.fn(() => false);
const mockAddBlock = vi.fn();
const mockRemoveBlock = vi.fn();
const mockSelectTab = vi.fn();

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { hasBlock: mockHasBlock, hasBlockOfType: mockHasBlockOfType, addBlock: mockAddBlock, removeBlock: mockRemoveBlock, selectTab: mockSelectTab };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ hasBlock: mockHasBlock, hasBlockOfType: mockHasBlockOfType, addBlock: mockAddBlock, removeBlock: mockRemoveBlock, selectTab: mockSelectTab }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    },
  ),
}));

const mockTogglePanel = vi.fn();
const mockSetActiveView = vi.fn();
let mockIsOpen = false;

vi.mock("@/stores/right-panel", () => ({
  useRightPanelStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        isOpen: mockIsOpen,
        togglePanel: mockTogglePanel,
        setActiveView: mockSetActiveView,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        isOpen: mockIsOpen,
        togglePanel: mockTogglePanel,
        setActiveView: mockSetActiveView,
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

const mockSetSettingsOpen = vi.fn();
vi.mock("@/stores/app-dialogs", () => ({
  useAppDialogsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { setSettingsOpen: mockSetSettingsOpen };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ setSettingsOpen: mockSetSettingsOpen }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

const mockSetActivePlugin = vi.fn();
const mockReorderPlugins = vi.fn();
let mockPlugins: Array<{
  manifest: { name: string; displayName: string; icon: string; permissions: string[] };
  enabled: boolean;
  path: string;
  entryUrl: string;
}> = [];
let mockActivePluginName: string | null = null;

vi.mock("@/stores/plugins", () => ({
  getOrderedEnabledPlugins: (state: { plugins: typeof mockPlugins }) =>
    state.plugins.filter((p) => p.enabled),
  usePluginsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        plugins: mockPlugins,
        pluginOrder: mockPlugins.map((p) => p.manifest.name),
        activePluginName: mockActivePluginName,
        pluginBadges: {} as Record<string, string>,
        setActivePlugin: mockSetActivePlugin,
        reorderPlugins: mockReorderPlugins,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        plugins: mockPlugins,
        pluginOrder: mockPlugins.map((p) => p.manifest.name),
        activePluginName: mockActivePluginName,
        pluginBadges: {} as Record<string, string>,
        setActivePlugin: mockSetActivePlugin,
        reorderPlugins: mockReorderPlugins,
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

describe("RightSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOpen = false;
    mockPlugins = [];
    mockActivePluginName = null;
    mockHasBlock.mockReturnValue(false);
    mockHasBlockOfType.mockReturnValue(false);
  });

  it("renders the sidebar container", () => {
    render(<RightSidebar />);
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("renders settings button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Settings")).toBeTruthy();
  });

  it("renders help button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Help")).toBeTruthy();
  });

  it("opens settings dialog when settings button is clicked", () => {
    render(<RightSidebar />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(mockSetSettingsOpen).toHaveBeenCalledWith(true);
  });

  it("renders plugin icon buttons for enabled plugins", () => {
    mockPlugins = [
      {
        manifest: { name: "test-plugin", displayName: "Test Plugin", icon: "Sparkles", permissions: [] },
        enabled: true,
        path: "/mock",
        entryUrl: "file:///mock/index.html",
      },
    ];
    render(<RightSidebar hasProject />);
    expect(screen.getByLabelText("Test Plugin")).toBeTruthy();
  });

  it("does not render plugin icons when no project is active", () => {
    mockPlugins = [
      {
        manifest: { name: "test-plugin", displayName: "Test Plugin", icon: "Sparkles", permissions: [] },
        enabled: true,
        path: "/mock",
        entryUrl: "file:///mock/index.html",
      },
    ];
    render(<RightSidebar />);
    expect(screen.queryByLabelText("Test Plugin")).toBeNull();
  });

  it("does not render disabled plugins", () => {
    mockPlugins = [
      {
        manifest: { name: "disabled-plugin", displayName: "Disabled", icon: "Sparkles", permissions: [] },
        enabled: false,
        path: "/mock",
        entryUrl: "file:///mock/index.html",
      },
    ];
    render(<RightSidebar hasProject />);
    expect(screen.queryByLabelText("Disabled")).toBeNull();
  });

  it("plugin icon uses hover-only styling without active highlight", () => {
    mockIsOpen = true;
    mockPlugins = [
      {
        manifest: { name: "my-plugin", displayName: "My Plugin", icon: "Sparkles", permissions: [] },
        enabled: true,
        path: "/mock",
        entryUrl: "file:///mock/index.html",
      },
    ];
    mockActivePluginName = "my-plugin";
    render(<RightSidebar hasProject />);
    const btn = screen.getByLabelText("My Plugin");
    const classes = btn.className.split(" ");
    // No active highlight — only hover classes
    expect(classes).not.toContain("bg-ctp-surface0");
    expect(classes).not.toContain("text-ctp-mauve");
    expect(btn.className).toContain("hover:bg-ctp-surface0");
    expect(btn.className).toContain("hover:text-ctp-text");
  });

  it("activates plugin and opens panel when plugin icon is clicked", () => {
    mockPlugins = [
      {
        manifest: { name: "click-plugin", displayName: "Click Plugin", icon: "Sparkles", permissions: [] },
        enabled: true,
        path: "/mock",
        entryUrl: "file:///mock/index.html",
      },
    ];
    mockActivePluginName = null;
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Click Plugin"));
    expect(mockSetActivePlugin).toHaveBeenCalledWith("click-plugin");
    expect(mockAddBlock).toHaveBeenCalledWith(
      { type: "plugin", pluginName: "click-plugin", pluginDisplayName: "Click Plugin", pluginIcon: "Sparkles" },
      undefined,
      "block-plugin-click-plugin",
      expect.anything(), // DockLocation.RIGHT
    );
    expect(mockSetActiveView).toHaveBeenCalledWith("plugin");
    expect(mockTogglePanel).toHaveBeenCalledOnce();
  });

  it("focuses plugin tab instead of removing when plugin icon is clicked and block exists", () => {
    mockIsOpen = true;
    mockHasBlock.mockReturnValue(true);
    mockPlugins = [
      {
        manifest: { name: "active-plugin", displayName: "Active Plugin", icon: "Sparkles", permissions: [] },
        enabled: true,
        path: "/mock",
        entryUrl: "file:///mock/index.html",
      },
    ];
    mockActivePluginName = "active-plugin";
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Active Plugin"));
    // Should focus the existing tab, not remove it
    expect(mockSelectTab).toHaveBeenCalledWith("block-plugin-active-plugin");
    expect(mockRemoveBlock).not.toHaveBeenCalled();
    expect(mockSetActivePlugin).toHaveBeenCalledWith("active-plugin");
  });

  it("renders browser icon when project is active", () => {
    render(<RightSidebar hasProject />);
    expect(screen.getByLabelText("Browser")).toBeTruthy();
  });

  it("does not render browser icon when no project is active", () => {
    render(<RightSidebar />);
    expect(screen.queryByLabelText("Browser")).toBeNull();
  });

  it("opens browser block when browser icon is clicked", () => {
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Browser"));
    expect(mockAddBlock).toHaveBeenCalledWith(
      { type: "browser", url: "https://github.com/nandomoreirame/forja" },
      undefined,
      expect.stringMatching(/^browser-/),
    );
  });

  it("creates a new browser block on each click", () => {
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Browser"));
    fireEvent.click(screen.getByLabelText("Browser"));
    expect(mockAddBlock).toHaveBeenCalledTimes(2);
    const firstId = mockAddBlock.mock.calls[0][2];
    const secondId = mockAddBlock.mock.calls[1][2];
    expect(firstId).not.toBe(secondId);
  });

  it("highlights browser icon when a browser block exists", () => {
    mockHasBlockOfType.mockImplementation((type: string) => type === "browser");
    render(<RightSidebar hasProject />);
    const btn = screen.getByLabelText("Browser");
    expect(btn.className).toContain("bg-ctp-surface0");
    expect(btn.className).toContain("text-ctp-mauve");
  });
});
