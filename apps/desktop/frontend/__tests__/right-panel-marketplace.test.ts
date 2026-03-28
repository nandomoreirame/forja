import { describe, it, expect, beforeEach } from "vitest";
import { useRightPanelStore } from "../stores/right-panel";

describe("right-panel marketplace view", () => {
  beforeEach(() => {
    useRightPanelStore.setState({
      isOpen: false,
      activeView: "empty",
    });
  });

  it("supports marketplace as an active view", () => {
    useRightPanelStore.getState().setActiveView("marketplace");
    expect(useRightPanelStore.getState().activeView).toBe("marketplace");
  });

  it("resets marketplace view to empty when panel closes", () => {
    useRightPanelStore.setState({ isOpen: true, activeView: "marketplace" });
    useRightPanelStore.getState().togglePanel();
    expect(useRightPanelStore.getState().activeView).toBe("empty");
  });
});
