import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

const mockHasBlock = vi.fn(() => false);
const mockHasBlockOfType = vi.fn(() => false);
const mockAddBlock = vi.fn();
const mockRemoveBlock = vi.fn();

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { hasBlock: mockHasBlock, hasBlockOfType: mockHasBlockOfType, addBlock: mockAddBlock, removeBlock: mockRemoveBlock };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ hasBlock: mockHasBlock, hasBlockOfType: mockHasBlockOfType, addBlock: mockAddBlock, removeBlock: mockRemoveBlock }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    },
  ),
}));

import { RightSidebar } from "../components/right-sidebar";
import { useRightPanelStore } from "../stores/right-panel";
import { usePluginsStore } from "../stores/plugins";

describe("right-sidebar marketplace button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRightPanelStore.setState({
      isOpen: false,
      activeView: "empty",
      isOpenByProject: {},
      activeViewByProject: {},
    });
    usePluginsStore.setState({
      plugins: [],
      pluginOrder: [],
      activePluginName: null,
      pinnedPluginName: null,
      pluginBadges: {},
      loading: false,
      permissionPrompt: null,
      activePluginNameByProject: {},
    });
  });

  it("renders the marketplace button", () => {
    render(<RightSidebar hasProject />);
    expect(screen.getByLabelText("Marketplace")).toBeTruthy();
  });

  it("adds marketplace block on click", () => {
    mockHasBlock.mockReturnValue(false);
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Marketplace"));

    expect(mockAddBlock).toHaveBeenCalledWith(
      { type: "marketplace" },
      undefined,
      "block-marketplace",
    );

    const state = useRightPanelStore.getState();
    expect(state.activeView).toBe("marketplace");
  });

  it("removes marketplace block when already active", () => {
    mockHasBlock.mockReturnValue(true);
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Marketplace"));

    expect(mockRemoveBlock).toHaveBeenCalledWith("block-marketplace");
  });

  it("renders marketplace button even without active project", () => {
    render(<RightSidebar hasProject={false} />);
    expect(screen.getByLabelText("Marketplace")).toBeTruthy();
  });
});
