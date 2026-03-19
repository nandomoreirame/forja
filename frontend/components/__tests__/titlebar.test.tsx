import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Titlebar } from "../titlebar";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { usePerformanceStore } from "@/stores/performance";

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

  it("shows only close button on tiling desktop sessions", async () => {
    const { isTilingDesktop } = await import("@/lib/ipc");
    vi.mocked(isTilingDesktop).mockResolvedValueOnce(true);

    render(<Titlebar />);

    expect(await screen.findByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Minimize" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Maximize" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });

  it("does not render sidebar or browser toggle buttons", () => {
    render(<Titlebar />);
    expect(screen.queryByLabelText(/sidebar/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/toggle browser/i)).not.toBeInTheDocument();
  });

  describe("dev lite mode toggle", () => {
    it("does not show lite mode toggle when not in dev mode", async () => {
      const { isDev } = await import("@/lib/ipc");
      vi.mocked(isDev).mockResolvedValue(false);

      render(<Titlebar />);

      // Wait for async isDev to resolve
      await screen.findByRole("button", { name: "Menu" });
      expect(screen.queryByLabelText(/toggle lite mode/i)).not.toBeInTheDocument();
    });

    it("shows lite mode toggle in dev mode", async () => {
      const { isDev } = await import("@/lib/ipc");
      vi.mocked(isDev).mockResolvedValue(true);

      render(<Titlebar />);

      expect(await screen.findByLabelText(/toggle lite mode/i)).toBeInTheDocument();
    });

    it("toggles lite mode on click", async () => {
      const user = userEvent.setup();
      const { isDev } = await import("@/lib/ipc");
      vi.mocked(isDev).mockResolvedValue(true);
      usePerformanceStore.setState({ resolved: "full", isLite: false });

      render(<Titlebar />);

      const toggle = await screen.findByLabelText(/toggle lite mode/i);
      await user.click(toggle);

      expect(usePerformanceStore.getState().isLite).toBe(true);
    });
  });
});
