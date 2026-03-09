import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Titlebar } from "../titlebar";
import { useAppDialogsStore } from "@/stores/app-dialogs";

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
    listen: vi.fn().mockResolvedValue(() => {}),
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
    toggleSidebar: vi.fn(),
    openProject: vi.fn(),
  }));

  return {
    APP_NAME: "Forja",
    useFileTreeStore,
  };
});

describe("Titlebar", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      aboutOpen: false,
      shortcutsOpen: false,
      settingsOpen: false,
    });
  });

  it("hides sidebar toggle button when no project is loaded", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    (useFileTreeStore as any).setState({ tree: null, trees: {}, currentPath: null });

    render(<Titlebar />);

    expect(screen.queryByRole("button", { name: /sidebar/i })).not.toBeInTheDocument();
  });

  it("shows sidebar toggle button when a project is loaded", async () => {
    const { useFileTreeStore } = await import("@/stores/file-tree");
    (useFileTreeStore as any).setState({
      tree: { root: { name: "test", path: "/test", isDir: true, children: [] } },
      trees: {},
      currentPath: "/test",
    });

    render(<Titlebar />);

    expect(screen.getByRole("button", { name: /sidebar/i })).toBeInTheDocument();
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
});
