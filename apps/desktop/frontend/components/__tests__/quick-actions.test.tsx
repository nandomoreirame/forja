import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "../ui/tooltip";
import type { ReactNode } from "react";

// --- mocks ---

const mockLoadActions = vi.fn();
const mockExecuteAction = vi.fn().mockReturnValue(true);
const mockOpenCommandPalette = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn().mockResolvedValue(null),
  listen: vi.fn(() => () => {}),
}));

vi.mock("@/lib/action-executor", () => ({
  executeAction: (...args: unknown[]) => mockExecuteAction(...args),
}));

// Minimal action registry mock with two test actions
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
        shortcut: "Ctrl+Alt+=",
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

// Quick actions store mock
let mockActions: Array<{ actionId: string; position?: string }> = [];
let mockLoaded = true;

vi.mock("@/stores/quick-actions", () => ({
  useQuickActionsStore: (selector?: (s: unknown) => unknown) => {
    const state = {
      actions: mockActions,
      loaded: mockLoaded,
      loadActions: mockLoadActions,
      addAction: vi.fn(),
      removeAction: vi.fn(),
      moveAction: vi.fn(),
      moveToPosition: vi.fn(),
      isPinned: (id: string) => mockActions.some((a) => a.actionId === id),
      getActionsForPosition: (pos: string) => mockActions.filter((a) => (a.position ?? "left") === pos),
    };
    return selector ? selector(state) : state;
  },
}));

// Command palette store mock
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

describe("QuickActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActions = [];
    mockLoaded = true;
    mockExecuteAction.mockReturnValue(true);
  });

  it("renders the add button with correct aria-label when no actions are pinned", async () => {
    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    expect(
      screen.getByRole("button", { name: "Add quick action" })
    ).toBeInTheDocument();
  });

  it("renders pinned action buttons with correct aria-labels", async () => {
    mockActions = [{ actionId: "open-settings", position: "left" }, { actionId: "zoom-in", position: "left" }];

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    expect(
      screen.getByRole("button", { name: "Open Settings" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Zoom In" })
    ).toBeInTheDocument();
  });

  it("renders the add button after the pinned action buttons", async () => {
    mockActions = [{ actionId: "open-settings", position: "left" }];

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    const buttons = screen.getAllByRole("button");
    const addButton = screen.getByRole("button", { name: "Add quick action" });
    const settingsButton = screen.getByRole("button", { name: "Open Settings" });

    const settingsIndex = buttons.indexOf(settingsButton);
    const addIndex = buttons.indexOf(addButton);

    expect(addIndex).toBeGreaterThan(settingsIndex);
  });

  it("calls executeAction with the correct action id on button click", async () => {
    mockActions = [{ actionId: "open-settings", position: "left" }];
    const user = userEvent.setup();

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    const settingsButton = screen.getByRole("button", { name: "Open Settings" });
    await user.click(settingsButton);

    expect(mockExecuteAction).toHaveBeenCalledWith("open-settings");
    expect(mockExecuteAction).toHaveBeenCalledTimes(1);
  });

  it("calls executeAction with zoom-in id on zoom button click", async () => {
    mockActions = [{ actionId: "zoom-in" }];
    const user = userEvent.setup();

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    const zoomButton = screen.getByRole("button", { name: "Zoom In" });
    await user.click(zoomButton);

    expect(mockExecuteAction).toHaveBeenCalledWith("zoom-in");
  });

  it("opens command palette in quick-actions mode when add button is clicked", async () => {
    const user = userEvent.setup();

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    const addButton = screen.getByRole("button", { name: "Add quick action" });
    await user.click(addButton);

    expect(mockOpenCommandPalette).toHaveBeenCalledWith("quick-actions");
    expect(mockOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it("calls loadActions on mount when not yet loaded", async () => {
    mockLoaded = false;

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    expect(mockLoadActions).toHaveBeenCalledTimes(1);
  });

  it("does not call loadActions when already loaded", async () => {
    mockLoaded = true;

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    expect(mockLoadActions).not.toHaveBeenCalled();
  });

  it("skips rendering buttons for unknown action ids", async () => {
    mockActions = [{ actionId: "nonexistent-action", position: "left" }];

    const { QuickActions } = await import("../quick-actions");
    renderWithProvider(<QuickActions position="left" />);

    // Only the add button should be present
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Add quick action" })
    ).toBeInTheDocument();
  });
});
