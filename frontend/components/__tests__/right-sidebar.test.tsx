import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RightSidebar } from "../right-sidebar";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
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

  it("highlights active plugin icon", () => {
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
    expect(btn.className).toContain("bg-ctp-surface0");
    expect(btn.className).toContain("text-ctp-mauve");
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
    expect(mockSetActiveView).toHaveBeenCalledWith("plugin");
    expect(mockTogglePanel).toHaveBeenCalledOnce();
  });

  it("deactivates plugin and closes panel when active plugin icon is clicked", () => {
    mockIsOpen = true;
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
    expect(mockSetActivePlugin).toHaveBeenCalledWith(null);
    expect(mockSetActiveView).toHaveBeenCalledWith("empty");
    expect(mockTogglePanel).toHaveBeenCalledOnce();
  });
});
