import { beforeEach, describe, expect, it } from "vitest";
import { useRightPanelStore } from "../right-panel";

describe("useRightPanelStore", () => {
  beforeEach(() => {
    useRightPanelStore.setState({ isOpen: false });
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
});
