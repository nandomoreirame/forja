import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

import { RightSidebar } from "../components/right-sidebar";
import { useRightPanelStore } from "../stores/right-panel";
import { usePluginsStore } from "../stores/plugins";

describe("right-sidebar marketplace button", () => {
  beforeEach(() => {
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

  it("opens marketplace pane on click", () => {
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Marketplace"));

    const state = useRightPanelStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.activeView).toBe("marketplace");
  });

  it("toggles marketplace off when already active", () => {
    useRightPanelStore.setState({ isOpen: true, activeView: "marketplace" });
    render(<RightSidebar hasProject />);
    fireEvent.click(screen.getByLabelText("Marketplace"));

    const state = useRightPanelStore.getState();
    expect(state.activeView).toBe("empty");
  });

  it("does not render marketplace button when no project is active", () => {
    render(<RightSidebar hasProject={false} />);
    expect(screen.queryByLabelText("Marketplace")).toBeNull();
  });
});
