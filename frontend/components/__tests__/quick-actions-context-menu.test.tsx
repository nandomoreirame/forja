import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "../ui/tooltip";
import type { ReactNode } from "react";

// --- mocks ---

const mockLoadActions = vi.fn();
const mockExecuteAction = vi.fn().mockReturnValue(true);
const mockOpenCommandPalette = vi.fn();
const mockRemoveAction = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue(null),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/lib/action-executor", () => ({
  executeAction: (...args: unknown[]) => mockExecuteAction(...args),
}));

vi.mock("@/lib/action-registry", () => ({
  getAction: (id: string) => {
    const actions: Record<
      string,
      { id: string; label: string; icon: string; group: string; shortcut?: string }
    > = {
      "open-settings": {
        id: "open-settings",
        label: "Open Settings",
        icon: "settings",
        group: "Settings",
        shortcut: "Ctrl+,",
      },
      "zoom-in": {
        id: "zoom-in",
        label: "Zoom In",
        icon: "zoom-in",
        group: "Terminal",
      },
    };
    return actions[id];
  },
  getDynamicActions: () => [],
}));

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({ installedClis: [], loading: false }),
}));

vi.mock("@/stores/plugins", () => ({
  usePluginsStore: (selector?: (s: unknown) => unknown) => {
    const state = { plugins: {}, pluginOrder: [] };
    return selector ? selector(state) : state;
  },
  getOrderedEnabledPlugins: () => [],
}));

vi.mock("@/lib/plugin-types", () => ({
  getPluginIcon: () => null,
}));

vi.mock("@/stores/file-tree", () => ({
  useFileTreeStore: (selector?: (s: unknown) => unknown) => {
    const state = { currentPath: "/test/project" };
    return selector ? selector(state) : state;
  },
}));

// Quick actions store mock — getState() returns a stable object with mocked fns
let mockActions: Array<{ actionId: string; position?: string }> = [];

const makeState = () => ({
  actions: mockActions,
  loaded: true,
  loadActions: mockLoadActions,
  addAction: vi.fn(),
  removeAction: mockRemoveAction,
  moveAction: vi.fn(),
  moveToPosition: vi.fn(),
  isPinned: (id: string) => mockActions.some((a) => a.actionId === id),
  getActionsForPosition: (pos: string) => mockActions.filter((a) => (a.position ?? "left") === pos),
});

vi.mock("@/stores/quick-actions", () => ({
  useQuickActionsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = makeState();
      return selector ? selector(state) : state;
    },
    { getState: () => makeState() },
  ),
}));

vi.mock("@/stores/command-palette", () => ({
  useCommandPaletteStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      isOpen: false,
      mode: "files",
      open: mockOpenCommandPalette,
      close: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

// --- helpers ---

function renderWithProvider(ui: ReactNode) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// --- tests ---

describe("QuickActions context menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActions = [{ actionId: "open-settings", position: "left" }, { actionId: "zoom-in", position: "left" }];
  });

  it("shows 'Remove from quick actions' menu item on right-click of a pinned button", async () => {
    const user = userEvent.setup();
    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    const settingsButton = screen.getByRole("button", { name: "Open Settings" });
    await user.pointer({ target: settingsButton, keys: "[MouseRight]" });

    expect(
      screen.getByText("Remove from quick actions")
    ).toBeInTheDocument();
  });

  it("calls removeAction with the correct actionId when menu item is clicked", async () => {
    const user = userEvent.setup();
    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    const settingsButton = screen.getByRole("button", { name: "Open Settings" });
    await user.pointer({ target: settingsButton, keys: "[MouseRight]" });

    const removeItem = screen.getByText("Remove from quick actions");
    await user.click(removeItem);

    expect(mockRemoveAction).toHaveBeenCalledWith("open-settings");
    expect(mockRemoveAction).toHaveBeenCalledTimes(1);
  });

  it("calls removeAction with correct actionId for different pinned buttons", async () => {
    const user = userEvent.setup();
    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    const zoomButton = screen.getByRole("button", { name: "Zoom In" });
    await user.pointer({ target: zoomButton, keys: "[MouseRight]" });

    const removeItem = screen.getByText("Remove from quick actions");
    await user.click(removeItem);

    expect(mockRemoveAction).toHaveBeenCalledWith("zoom-in");
  });
});
