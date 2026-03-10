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
    error: null,
    browserStateByProject: {},
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

  describe("error state", () => {
    const sampleError = {
      code: -102,
      description: "ERR_CONNECTION_REFUSED",
      url: "http://localhost:9999",
    };

    it("starts with error as null", () => {
      expect(useBrowserPaneStore.getState().error).toBeNull();
    });

    it("setError stores error details", () => {
      useBrowserPaneStore.getState().setError(sampleError);
      expect(useBrowserPaneStore.getState().error).toEqual(sampleError);
    });

    it("clearError resets error to null", () => {
      useBrowserPaneStore.getState().setError(sampleError);
      useBrowserPaneStore.getState().clearError();
      expect(useBrowserPaneStore.getState().error).toBeNull();
    });

    it("navigate clears error", () => {
      useBrowserPaneStore.getState().setError(sampleError);
      useBrowserPaneStore.getState().setUrl("http://localhost:8080");
      useBrowserPaneStore.getState().navigate();
      expect(useBrowserPaneStore.getState().error).toBeNull();
    });

    it("navigateToUrl clears error", () => {
      useBrowserPaneStore.getState().setError(sampleError);
      useBrowserPaneStore.getState().navigateToUrl("http://localhost:8080");
      expect(useBrowserPaneStore.getState().error).toBeNull();
    });

    it("onDidNavigate clears error", () => {
      useBrowserPaneStore.getState().setError(sampleError);
      useBrowserPaneStore.getState().onDidNavigate("http://localhost:8080");
      expect(useBrowserPaneStore.getState().error).toBeNull();
    });
  });

  describe("per-project browser state", () => {
    it("saveBrowserStateForProject saves current state keyed by project path", () => {
      useBrowserPaneStore.setState({
        isOpen: true,
        url: "http://127.0.0.1:3000/api/docs",
        committedUrl: "http://127.0.0.1:3000/api/docs",
      });

      useBrowserPaneStore.getState().saveBrowserStateForProject("/project-a");
      const { browserStateByProject } = useBrowserPaneStore.getState();

      expect(browserStateByProject["/project-a"]).toEqual({
        isOpen: true,
        url: "http://127.0.0.1:3000/api/docs",
        committedUrl: "http://127.0.0.1:3000/api/docs",
      });
    });

    it("restoreBrowserStateForProject restores saved state for a project", () => {
      // Save state for project-a (open with a custom URL)
      useBrowserPaneStore.setState({
        isOpen: true,
        url: "http://127.0.0.1:3000/api/docs",
        committedUrl: "http://127.0.0.1:3000/api/docs",
      });
      useBrowserPaneStore.getState().saveBrowserStateForProject("/project-a");

      // Save state for project-b (open with a different URL)
      useBrowserPaneStore.setState({
        isOpen: true,
        url: "http://localhost:5173",
        committedUrl: "http://localhost:5173",
      });
      useBrowserPaneStore.getState().saveBrowserStateForProject("/project-b");

      // Restore project-a
      useBrowserPaneStore.getState().restoreBrowserStateForProject("/project-a");
      let state = useBrowserPaneStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.url).toBe("http://127.0.0.1:3000/api/docs");
      expect(state.committedUrl).toBe("http://127.0.0.1:3000/api/docs");

      // Restore project-b
      useBrowserPaneStore.getState().restoreBrowserStateForProject("/project-b");
      state = useBrowserPaneStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.url).toBe("http://localhost:5173");
      expect(state.committedUrl).toBe("http://localhost:5173");
    });

    it("restoreBrowserStateForProject closes pane when project has no saved state", () => {
      // Open the pane first
      useBrowserPaneStore.setState({ isOpen: true, url: "http://127.0.0.1:3000" });

      // Switch to a project that has no saved browser state
      useBrowserPaneStore.getState().restoreBrowserStateForProject("/project-new");
      const state = useBrowserPaneStore.getState();
      expect(state.isOpen).toBe(false);
    });

    it("restoreBrowserStateForProject resets navigation state on project switch", () => {
      useBrowserPaneStore.setState({
        isOpen: true,
        url: "http://127.0.0.1:3000",
        committedUrl: "http://127.0.0.1:3000",
        canGoBack: true,
        canGoForward: true,
      });
      useBrowserPaneStore.getState().saveBrowserStateForProject("/project-a");

      useBrowserPaneStore.getState().restoreBrowserStateForProject("/project-a");
      const state = useBrowserPaneStore.getState();
      // Navigation history resets since it's a new webview session
      expect(state.canGoBack).toBe(false);
      expect(state.canGoForward).toBe(false);
    });
  });
});
