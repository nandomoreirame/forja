import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRightPanelStore } from "../right-panel";
import { usePluginsStore } from "../plugins";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

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

  describe("closePanel - pinned plugin protection (Bug 1)", () => {
    beforeEach(() => {
      usePluginsStore.setState({ pinnedPluginName: null });
      useRightPanelStore.setState({ isOpen: true, activeView: "plugin" });
    });

    it("closePanel closes the panel when no plugin is pinned", () => {
      usePluginsStore.setState({ pinnedPluginName: null });
      useRightPanelStore.getState().closePanel();
      expect(useRightPanelStore.getState().isOpen).toBe(false);
    });

    it("closePanel does NOT close the panel when a plugin is pinned", () => {
      usePluginsStore.setState({ pinnedPluginName: "pomodoro" });
      useRightPanelStore.getState().closePanel();
      expect(useRightPanelStore.getState().isOpen).toBe(true);
    });

    it("closePanel keeps activeView as plugin when pinned plugin blocks close", () => {
      usePluginsStore.setState({ pinnedPluginName: "pomodoro" });
      useRightPanelStore.getState().closePanel();
      expect(useRightPanelStore.getState().activeView).toBe("plugin");
    });

    it("closePanel resets activeView to empty when closing without pinned plugin", () => {
      usePluginsStore.setState({ pinnedPluginName: null });
      useRightPanelStore.getState().closePanel();
      expect(useRightPanelStore.getState().activeView).toBe("empty");
    });
  });
});
