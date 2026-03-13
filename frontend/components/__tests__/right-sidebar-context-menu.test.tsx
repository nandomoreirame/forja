import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
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
const mockPinPlugin = vi.fn();
const mockUnpinPlugin = vi.fn();
let mockPlugins: Array<{
  manifest: { name: string; displayName: string; icon: string; permissions: string[] };
  enabled: boolean;
  path: string;
  entryUrl: string;
}> = [];
let mockActivePluginName: string | null = null;
let mockPinnedPluginName: string | null = null;

vi.mock("@/stores/plugins", () => ({
  getOrderedEnabledPlugins: (state: { plugins: typeof mockPlugins }) =>
    state.plugins.filter((p) => p.enabled),
  usePluginsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        plugins: mockPlugins,
        pluginOrder: mockPlugins.map((p) => p.manifest.name),
        activePluginName: mockActivePluginName,
        pinnedPluginName: mockPinnedPluginName,
        pluginBadges: {} as Record<string, string>,
        setActivePlugin: mockSetActivePlugin,
        reorderPlugins: mockReorderPlugins,
        pinPlugin: mockPinPlugin,
        unpinPlugin: mockUnpinPlugin,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        plugins: mockPlugins,
        pluginOrder: mockPlugins.map((p) => p.manifest.name),
        activePluginName: mockActivePluginName,
        pinnedPluginName: mockPinnedPluginName,
        pluginBadges: {} as Record<string, string>,
        setActivePlugin: mockSetActivePlugin,
        reorderPlugins: mockReorderPlugins,
        pinPlugin: mockPinPlugin,
        unpinPlugin: mockUnpinPlugin,
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

function makePlugin(name: string, displayName: string) {
  return {
    manifest: { name, displayName, icon: "Puzzle", permissions: [] },
    enabled: true,
    path: "/mock",
    entryUrl: "file:///mock/index.html",
  };
}

describe("RightSidebar - Plugin Context Menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOpen = false;
    mockPlugins = [];
    mockActivePluginName = null;
    mockPinnedPluginName = null;
  });

  it("shows context menu on right-click of a plugin icon", async () => {
    const user = userEvent.setup();
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    render(<RightSidebar hasProject />);

    const btn = screen.getByLabelText("Pomodoro");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("shows 'Pin Pomodoro' option when plugin is not pinned", async () => {
    const user = userEvent.setup();
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    mockPinnedPluginName = null;
    render(<RightSidebar hasProject />);

    const btn = screen.getByLabelText("Pomodoro");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    expect(await screen.findByText("Pin Pomodoro")).toBeInTheDocument();
  });

  it("shows 'Unpin Pomodoro' option when plugin is already pinned", async () => {
    const user = userEvent.setup();
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    mockPinnedPluginName = "pomodoro";
    render(<RightSidebar hasProject />);

    const btn = screen.getByLabelText("Pomodoro");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    expect(await screen.findByText("Unpin Pomodoro")).toBeInTheDocument();
  });

  it("calls pinPlugin when 'Pin' is clicked", async () => {
    const user = userEvent.setup();
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    mockPinnedPluginName = null;
    render(<RightSidebar hasProject />);

    const btn = screen.getByLabelText("Pomodoro");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const pinOption = await screen.findByText("Pin Pomodoro");
    await user.click(pinOption);

    expect(mockPinPlugin).toHaveBeenCalledWith("pomodoro");
  });

  it("calls unpinPlugin when 'Unpin' is clicked", async () => {
    const user = userEvent.setup();
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    mockPinnedPluginName = "pomodoro";
    render(<RightSidebar hasProject />);

    const btn = screen.getByLabelText("Pomodoro");
    await user.pointer({ target: btn, keys: "[MouseRight]" });

    const unpinOption = await screen.findByText("Unpin Pomodoro");
    await user.click(unpinOption);

    expect(mockUnpinPlugin).toHaveBeenCalledOnce();
  });

  it("does NOT close panel when clicking pinned plugin icon", () => {
    mockIsOpen = true;
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    mockActivePluginName = "pomodoro";
    mockPinnedPluginName = "pomodoro";
    render(<RightSidebar hasProject />);

    fireEvent.click(screen.getByLabelText("Pomodoro"));

    // Panel should remain open (toggle NOT called)
    expect(mockTogglePanel).not.toHaveBeenCalled();
    expect(mockSetActiveView).not.toHaveBeenCalledWith("empty");
  });

  it("shows pin icon/indicator on pinned plugin icon", () => {
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    mockPinnedPluginName = "pomodoro";
    render(<RightSidebar hasProject />);

    // Pinned plugin icon should have a pin indicator
    expect(screen.getByTestId("pin-indicator-pomodoro")).toBeTruthy();
  });

  it("reverts to pinned plugin when a temporarily opened plugin closes", () => {
    // Setup: pomodoro is pinned, notes is temporarily active
    mockIsOpen = true;
    mockPlugins = [
      makePlugin("pomodoro", "Pomodoro"),
      makePlugin("notes", "Notes"),
    ];
    mockPinnedPluginName = "pomodoro";
    mockActivePluginName = "notes";
    render(<RightSidebar hasProject />);

    // Click the notes icon (active) to close it — should revert to pinned
    fireEvent.click(screen.getByLabelText("Notes"));

    // Should switch back to pinned plugin instead of closing
    expect(mockSetActivePlugin).toHaveBeenCalledWith("pomodoro");
    expect(mockSetActiveView).toHaveBeenCalledWith("plugin");
    // Panel should stay open
    expect(mockTogglePanel).not.toHaveBeenCalled();
  });

  it("opens a non-pinned plugin temporarily when clicked", () => {
    // Setup: pomodoro is pinned and active, user clicks notes
    mockIsOpen = true;
    mockPlugins = [
      makePlugin("pomodoro", "Pomodoro"),
      makePlugin("notes", "Notes"),
    ];
    mockPinnedPluginName = "pomodoro";
    mockActivePluginName = "pomodoro";
    render(<RightSidebar hasProject />);

    // Click notes icon — should open notes temporarily
    fireEvent.click(screen.getByLabelText("Notes"));

    expect(mockSetActivePlugin).toHaveBeenCalledWith("notes");
    expect(mockSetActiveView).toHaveBeenCalledWith("plugin");
  });

  it("does not show context menu for non-plugin utility buttons", async () => {
    const user = userEvent.setup();
    mockPlugins = [makePlugin("pomodoro", "Pomodoro")];
    render(<RightSidebar hasProject />);

    const settingsBtn = screen.getByLabelText("Settings");
    await user.pointer({ target: settingsBtn, keys: "[MouseRight]" });

    // Should not show a context menu
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
