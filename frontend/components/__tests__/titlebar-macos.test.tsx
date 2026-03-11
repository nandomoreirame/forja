import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/platform", () => ({
  IS_MAC: true,
  MOD_KEY: "\u2318",
}));

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

vi.mock("@/stores/browser-pane", async () => {
  const { create } = await import("zustand");
  const useBrowserPaneStore = create<{
    isOpen: boolean;
    toggleOpen: () => void;
  }>((set) => ({
    isOpen: false,
    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  }));
  return { useBrowserPaneStore };
});

vi.mock("@/stores/app-dialogs", async () => {
  const { create } = await import("zustand");
  const useAppDialogsStore = create(() => ({
    aboutOpen: false,
    setAboutOpen: vi.fn(),
    shortcutsOpen: false,
    setShortcutsOpen: vi.fn(),
    settingsOpen: false,
    setSettingsOpen: vi.fn(),
  }));
  return { useAppDialogsStore };
});

// eslint-disable-next-line -- dynamic import after mock setup
const { Titlebar } = await import("../titlebar");

describe("Titlebar (macOS)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides all custom window controls on macOS", () => {
    render(<Titlebar />);

    expect(
      screen.queryByRole("button", { name: "Minimize" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Maximize" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Restore" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close" })
    ).not.toBeInTheDocument();
  });

  it("adds left padding for macOS traffic lights", () => {
    const { container } = render(<Titlebar />);
    const titlebar = container.firstElementChild as HTMLElement;

    expect(titlebar.className).toContain("pl-[78px]");
  });
});
