import { beforeEach, describe, expect, it } from "vitest";
import { useRightPanelStore } from "../right-panel";

describe("useRightPanelStore", () => {
  beforeEach(() => {
    useRightPanelStore.setState({ isOpen: false, activeView: "empty" });
  });

  it("starts with panel closed", () => {
    const state = useRightPanelStore.getState();
    expect(state.isOpen).toBe(false);
  });

  it("togglePanel opens the panel when closed", () => {
    useRightPanelStore.getState().togglePanel();
    expect(useRightPanelStore.getState().isOpen).toBe(true);
  });

  it("togglePanel closes the panel when open", () => {
    useRightPanelStore.setState({ isOpen: true });
    useRightPanelStore.getState().togglePanel();
    expect(useRightPanelStore.getState().isOpen).toBe(false);
  });

  it("starts with activeView as empty", () => {
    const state = useRightPanelStore.getState();
    expect(state.activeView).toBe("empty");
  });

  it("setActiveView changes the activeView", () => {
    useRightPanelStore.getState().setActiveView("plugin");
    expect(useRightPanelStore.getState().activeView).toBe("plugin");
  });

  it("togglePanel to close resets activeView to empty", () => {
    useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });
    useRightPanelStore.getState().togglePanel();
    expect(useRightPanelStore.getState().activeView).toBe("empty");
  });

  it("saveStateForProject saves activeView per project", () => {
    useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });
    useRightPanelStore.getState().saveStateForProject("/my/project");
    const { isOpenByProject, activeViewByProject } =
      useRightPanelStore.getState();
    expect(isOpenByProject["/my/project"]).toBe(true);
    expect(activeViewByProject["/my/project"]).toBe("plugin");
  });

  it("restoreStateForProject restores activeView per project", () => {
    useRightPanelStore.setState({
      activeViewByProject: { "/my/project": "plugin" },
      isOpenByProject: { "/my/project": true },
    });
    useRightPanelStore.getState().restoreStateForProject("/my/project");
    const { isOpen, activeView } = useRightPanelStore.getState();
    expect(isOpen).toBe(true);
    expect(activeView).toBe("plugin");
  });

  it("restoreStateForProject defaults activeView to empty when no saved state", () => {
    useRightPanelStore.getState().restoreStateForProject("/unknown/project");
    expect(useRightPanelStore.getState().activeView).toBe("empty");
  });
});
