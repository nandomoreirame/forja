import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Titlebar } from "../titlebar";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useUserSettingsStore } from "@/stores/user-settings";
import { DEFAULT_SETTINGS } from "@/lib/settings-types";

vi.mock("@/lib/ipc", () => {
  const appWindow = {
    label: "main",
    isMaximized: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(() => {}),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
  };
  return {
    getCurrentWindow: () => appWindow,
    getName: vi.fn().mockResolvedValue("Forja"),
    getVersion: vi.fn().mockResolvedValue("0.1.0"),
    getElectronVersion: vi.fn().mockResolvedValue("32.0.0"),
    isTilingDesktop: vi.fn().mockResolvedValue(false),
    isDev: vi.fn().mockResolvedValue(false),
    listen: vi.fn().mockResolvedValue(() => {}),
    invoke: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("@/hooks/use-app-metrics", () => ({
  useAppMetrics: () => ({
    current: null,
    rssHistory: [],
    cpuHistory: [],
    historyVersion: 0,
  }),
}));

vi.mock("@/stores/file-tree", async () => {
  const { create } = await import("zustand");

  const useFileTreeStore = create(() => ({
    isOpen: false,
    tree: null,
    trees: {} as Record<string, unknown>,
    currentPath: null as string | null,
    openProject: vi.fn(),
  }));

  return {
    APP_NAME: "Forja",
    useFileTreeStore,
  };
});

vi.mock("../quick-actions", () => ({ QuickActions: () => null }));

vi.mock("@/stores/workspace", () => ({
  useWorkspaceStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        workspaces: [],
        activeWorkspaceId: null,
        loading: false,
        loadWorkspaces: vi.fn(),
        activateWorkspace: vi.fn(),
        updateWorkspaceDetails: vi.fn(),
        deleteWorkspace: vi.fn(),
        createWorkspace: vi.fn(),
        renameWorkspace: vi.fn(),
        addProject: vi.fn(),
        removeProject: vi.fn(),
        setActiveWorkspace: vi.fn(),
        openWorkspaceInNewWindow: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        workspaces: [],
        activeWorkspaceId: null,
        loading: false,
        loadWorkspaces: vi.fn(),
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

describe("Titlebar", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      aboutOpen: false,
      shortcutsOpen: false,
      settingsOpen: false,
    });
  });

  it('shows "About" menu item in English', async () => {
    const user = userEvent.setup();
    render(<Titlebar />);

    const menuButton = screen.getByRole("button", { name: "Menu" });
    await user.click(menuButton);

    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("opens AboutDialog when About is clicked", async () => {
    const user = userEvent.setup();
    render(<Titlebar />);

    const menuButton = screen.getByRole("button", { name: "Menu" });
    await user.click(menuButton);

    const aboutItem = screen.getByText("About");
    await user.click(aboutItem);

    expect(
      await screen.findByRole("dialog")
    ).toBeInTheDocument();
  });

  it("hides all window controls on tiling desktop sessions", async () => {
    const { isTilingDesktop } = await import("@/lib/ipc");
    vi.mocked(isTilingDesktop).mockResolvedValueOnce(true);

    render(<Titlebar />);

    // Wait for the tiling desktop state to resolve
    await screen.findByRole("button", { name: "Menu" });
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Minimize" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Maximize" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });

  it("does not render sidebar or browser toggle buttons", () => {
    render(<Titlebar />);
    expect(screen.queryByLabelText(/sidebar/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/toggle browser/i)).not.toBeInTheDocument();
  });
});

describe("Titlebar context menu visibility", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      aboutOpen: false,
      shortcutsOpen: false,
      settingsOpen: false,
    });
    useUserSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      loaded: true,
    });
  });

  it("hides command bar when titlebar.commandBar is false", () => {
    useUserSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        ui: {
          ...DEFAULT_SETTINGS.ui,
          titlebar: { ...DEFAULT_SETTINGS.ui.titlebar, commandBar: false },
        },
      },
    });
    render(<Titlebar />);
    expect(screen.queryByText("Command Palette")).not.toBeInTheDocument();
  });

  it("shows project title with app name when command bar is hidden", () => {
    useUserSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        ui: {
          ...DEFAULT_SETTINGS.ui,
          titlebar: { ...DEFAULT_SETTINGS.ui.titlebar, commandBar: false },
        },
      },
    });
    render(<Titlebar />);
    expect(screen.getByText("Forja")).toBeInTheDocument();
  });

  it("hides resource usage when titlebar.resourceUsage is false", () => {
    useUserSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        ui: {
          ...DEFAULT_SETTINGS.ui,
          titlebar: { ...DEFAULT_SETTINGS.ui.titlebar, resourceUsage: false },
        },
      },
    });
    render(<Titlebar />);
    expect(screen.queryByText(/CPU:/)).not.toBeInTheDocument();
  });

  it("shows context menu with visibility options on right-click", async () => {
    const user = userEvent.setup();
    render(<Titlebar />);

    const titlebar = screen.getByTestId("titlebar");
    await user.pointer({ keys: "[MouseRight]", target: titlebar });

    expect(screen.getByText("Command Bar")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions (Left)")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions (Right)")).toBeInTheDocument();
    expect(screen.getByText("Resource Usage")).toBeInTheDocument();
    expect(screen.getByText("Workspace Switcher")).toBeInTheDocument();
  });

  it("toggles command bar visibility via context menu", async () => {
    const mockInvoke = vi.mocked((await import("@/lib/ipc")).invoke);
    mockInvoke.mockResolvedValue(null);

    const user = userEvent.setup();
    render(<Titlebar />);

    const titlebar = screen.getByTestId("titlebar");
    await user.pointer({ keys: "[MouseRight]", target: titlebar });

    const commandBarItem = screen.getByText("Command Bar");
    await user.click(commandBarItem);

    // save_user_settings is debounced 300ms — wait for it to fire
    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "save_user_settings",
          expect.objectContaining({
            content: expect.stringContaining('"commandBar": false'),
          }),
        );
      },
      { timeout: 1000 },
    );
  });
});
