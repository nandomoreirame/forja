import { describe, it, expect, beforeEach } from "vitest";
import { useBrowserPaneStore } from "../browser-pane";

// Reset store state between tests
beforeEach(() => {
  useBrowserPaneStore.setState({
    isOpen: false,
    url: "http://localhost:3000",
    committedUrl: "http://localhost:3000",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    title: "",
  });
});

describe("useBrowserPaneStore", () => {
  it("starts closed by default", () => {
    const { isOpen } = useBrowserPaneStore.getState();
    expect(isOpen).toBe(false);
  });

  it("toggleOpen flips isOpen", () => {
    useBrowserPaneStore.getState().toggleOpen();
    expect(useBrowserPaneStore.getState().isOpen).toBe(true);
    useBrowserPaneStore.getState().toggleOpen();
    expect(useBrowserPaneStore.getState().isOpen).toBe(false);
  });

  it("setUrl updates url without navigating", () => {
    useBrowserPaneStore.getState().setUrl("http://localhost:5173");
    expect(useBrowserPaneStore.getState().url).toBe("http://localhost:5173");
    // committedUrl should NOT change until navigate() is called
    expect(useBrowserPaneStore.getState().committedUrl).toBe("http://localhost:3000");
  });

  it("navigate commits the url and opens the pane", () => {
    useBrowserPaneStore.getState().setUrl("http://localhost:8080");
    useBrowserPaneStore.getState().navigate();
    const state = useBrowserPaneStore.getState();
    expect(state.committedUrl).toBe("http://localhost:8080");
    expect(state.isOpen).toBe(true);
  });

  it("setLoading updates isLoading", () => {
    useBrowserPaneStore.getState().setLoading(true);
    expect(useBrowserPaneStore.getState().isLoading).toBe(true);
  });

  it("setNavigationState updates canGoBack and canGoForward", () => {
    useBrowserPaneStore.getState().setNavigationState({ canGoBack: true, canGoForward: false });
    const state = useBrowserPaneStore.getState();
    expect(state.canGoBack).toBe(true);
    expect(state.canGoForward).toBe(false);
  });

  it("setTitle updates title", () => {
    useBrowserPaneStore.getState().setTitle("My App");
    expect(useBrowserPaneStore.getState().title).toBe("My App");
  });

  it("navigateToUrl is a convenience method that sets url and commits", () => {
    useBrowserPaneStore.getState().navigateToUrl("http://localhost:4321");
    const state = useBrowserPaneStore.getState();
    expect(state.url).toBe("http://localhost:4321");
    expect(state.committedUrl).toBe("http://localhost:4321");
    expect(state.isOpen).toBe(true);
  });
});
