import { describe, it, expect, beforeEach } from "vitest";
import { useRightPanelStore } from "../stores/right-panel";

describe("right-panel marketplace view", () => {
  beforeEach(() => {
    useRightPanelStore.setState({
      isOpen: false,
      activeView: "empty",
      isOpenByProject: {},
      activeViewByProject: {},
    });
  });

  it("supports marketplace as an active view", () => {
    useRightPanelStore.getState().setActiveView("marketplace");
    expect(useRightPanelStore.getState().activeView).toBe("marketplace");
  });

  it("persists marketplace view per project", () => {
    useRightPanelStore.getState().setActiveView("marketplace");
    useRightPanelStore.setState({ isOpen: true });
    useRightPanelStore.getState().saveStateForProject("/test/project");

    // Switch away
    useRightPanelStore.getState().setActiveView("plugin");

    // Restore
    useRightPanelStore.getState().restoreStateForProject("/test/project");
    expect(useRightPanelStore.getState().activeView).toBe("marketplace");
  });

  it("resets marketplace view to empty when panel closes", () => {
    useRightPanelStore.setState({ isOpen: true, activeView: "marketplace" });
    useRightPanelStore.getState().togglePanel();
    expect(useRightPanelStore.getState().activeView).toBe("empty");
  });
});
