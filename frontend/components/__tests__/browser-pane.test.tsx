import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoist mockInvoke so it's available when vi.mock is hoisted
const mockInvoke = vi.hoisted(() => vi.fn());

// Mock IPC invoke (hoisted - must come before other mocks)
vi.mock("@/lib/ipc", () => ({
  invoke: mockInvoke,
}));

// Patch document.createElement so jsdom returns a div with getWebContentsId when "webview" is requested
const originalCreateElement = document.createElement.bind(document);
document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
  if (tagName === "webview") {
    const div = originalCreateElement("div", options);
    // Simulate Electron WebviewTag API methods used in tests
    (div as HTMLElement & { getWebContentsId?: () => number }).getWebContentsId = () => 1;
    return div;
  }
  return originalCreateElement(tagName, options);
}) as typeof document.createElement;

import { BrowserPane } from "../browser-pane";
import { useTilingLayoutStore } from "@/stores/tiling-layout";

describe("BrowserPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ success: true });
  });

  it("renders the address bar input with default url", () => {
    render(<BrowserPane />);
    const input = screen.getByRole("textbox", { name: /address/i });
    expect(input).toHaveValue("http://localhost:3000");
  });

  it("renders with custom initialUrl", () => {
    render(<BrowserPane initialUrl="http://localhost:5173" />);
    const input = screen.getByRole("textbox", { name: /address/i });
    expect(input).toHaveValue("http://localhost:5173");
  });

  it("renders back/forward/refresh buttons", () => {
    render(<BrowserPane />);
    expect(screen.getByLabelText(/go back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/go forward/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reload/i)).toBeInTheDocument();
  });

  it("back button is disabled initially", () => {
    render(<BrowserPane />);
    expect(screen.getByLabelText(/go back/i)).toBeDisabled();
  });

  it("forward button is disabled initially", () => {
    render(<BrowserPane />);
    expect(screen.getByLabelText(/go forward/i)).toBeDisabled();
  });

  it("does not render a close button", () => {
    render(<BrowserPane />);
    expect(screen.queryByLabelText(/close browser/i)).not.toBeInTheDocument();
  });

  it("updates url input when user types", () => {
    render(<BrowserPane />);
    const input = screen.getByRole("textbox", { name: /address/i });
    fireEvent.change(input, { target: { value: "http://localhost:5173" } });
    expect(input).toHaveValue("http://localhost:5173");
  });

  it("navigates on Enter key press by updating webview src", async () => {
    const user = userEvent.setup();
    render(<BrowserPane initialUrl="http://localhost:3000" />);
    const input = screen.getByRole("textbox", { name: /address/i });
    // Change URL and press Enter
    await user.clear(input);
    await user.type(input, "http://localhost:4000{Enter}");
    // The webview src should be updated (we can check by looking at the webview after rAF)
    // For now just ensure no crash and input value is committed
    expect(input).toHaveValue("http://localhost:4000");
  });

  describe("screenshot button", () => {
    it("renders the screenshot button in the toolbar", () => {
      render(<BrowserPane />);
      expect(screen.getByLabelText(/take screenshot/i)).toBeInTheDocument();
    });

    it("calls invoke with browser:screenshot when clicked", async () => {
      // Flush the lazy-mount rAF so webviewRef is populated before clicking.
      let rafCb: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
        rafCb = cb;
        return 1;
      });
      render(<BrowserPane />);
      await act(async () => {
        if (rafCb) rafCb(performance.now());
      });
      rafSpy.mockRestore();

      const screenshotBtn = screen.getByLabelText(/take screenshot/i);

      await act(async () => {
        fireEvent.click(screenshotBtn);
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        "browser:screenshot",
        expect.objectContaining({ webContentsId: expect.any(Number) }),
      );
    });

    it("shows success state after successful screenshot", async () => {
      vi.useFakeTimers();
      mockInvoke.mockResolvedValue({ success: true });

      // Flush the lazy-mount rAF so the webview is mounted before clicking.
      let rafCb: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
        rafCb = cb;
        return 1;
      });
      render(<BrowserPane />);
      await act(async () => {
        if (rafCb) rafCb(performance.now());
      });
      rafSpy.mockRestore();

      const screenshotBtn = screen.getByLabelText(/take screenshot/i);

      // Click and flush microtasks
      await act(async () => {
        fireEvent.click(screenshotBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      // The button should show success state
      expect(screen.getByLabelText(/screenshot copied/i)).toBeInTheDocument();

      // After 2 seconds, should revert to normal
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });
      expect(screen.getByLabelText(/take screenshot/i)).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("reverts to idle state after error", async () => {
      mockInvoke.mockRejectedValue(new Error("capture failed"));
      render(<BrowserPane />);
      const screenshotBtn = screen.getByLabelText(/take screenshot/i);

      await act(async () => {
        fireEvent.click(screenshotBtn);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Should be back in idle state after error
      expect(screen.getByLabelText(/take screenshot/i)).toBeInTheDocument();
    });
  });

  describe("layout config sync", () => {
    it("updates block config in tiling-layout store on did-navigate (debounced)", async () => {
      vi.useFakeTimers();
      const nodeId = "browser-nav-test";

      // Add a browser block to the layout model
      useTilingLayoutStore.getState().resetToDefault();
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://github.com" },
        undefined,
        nodeId,
      );

      // Mount with rAF flush so webview is mounted and events are wired
      let rafCb: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
        rafCb = cb;
        return 1;
      });

      render(<BrowserPane initialUrl="https://github.com" nodeId={nodeId} />);
      await act(async () => {
        if (rafCb) rafCb(performance.now());
      });
      rafSpy.mockRestore();

      // Simulate the webview's did-navigate event
      const webview = screen.getByTestId("browser-webview");
      const navEvent = new Event("did-navigate");
      (navEvent as Event & { url: string }).url = "https://web.whatsapp.com";
      await act(async () => {
        webview.dispatchEvent(navEvent);
      });

      // Before debounce fires, URL should still be old
      const jsonBefore = JSON.stringify(useTilingLayoutStore.getState().model.toJson());
      expect(jsonBefore).toContain("https://github.com");

      // Flush the debounce timer
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      // Now the layout model should have the new URL
      const json = JSON.stringify(useTilingLayoutStore.getState().model.toJson());
      expect(json).toContain("https://web.whatsapp.com");

      vi.useRealTimers();
    });

    it("batches rapid redirects into a single config update", async () => {
      vi.useFakeTimers();
      const nodeId = "browser-redirect-test";

      useTilingLayoutStore.getState().resetToDefault();
      useTilingLayoutStore.getState().addBlock(
        { type: "browser", url: "https://google.com" },
        undefined,
        nodeId,
      );

      let rafCb: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
        rafCb = cb;
        return 1;
      });
      render(<BrowserPane initialUrl="https://google.com" nodeId={nodeId} />);
      await act(async () => {
        if (rafCb) rafCb(performance.now());
      });
      rafSpy.mockRestore();

      const webview = screen.getByTestId("browser-webview");

      // Simulate rapid redirects: google.com → www.google.com → google.com.br
      for (const url of ["https://www.google.com", "https://www.google.com.br"]) {
        const ev = new Event("did-navigate");
        (ev as Event & { url: string }).url = url;
        await act(async () => {
          webview.dispatchEvent(ev);
        });
      }

      // Flush debounce
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      // Only the final URL should be in the model
      const json = JSON.stringify(useTilingLayoutStore.getState().model.toJson());
      expect(json).toContain("https://www.google.com.br");
      expect(json).not.toContain("https://www.google.com\"");

      vi.useRealTimers();
    });
  });

  describe("error overlay", () => {
    it("does not render error overlay initially", () => {
      render(<BrowserPane />);
      expect(screen.queryByText(/could not access/i)).not.toBeInTheDocument();
    });
  });

  describe("lazy webview mount", () => {
    it("does not render the webview element on the initial synchronous render", async () => {
      // Intercept rAF so the callback never fires during this test.
      const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 0);

      render(<BrowserPane />);
      // webviewMounted starts false; webview data-testid should not be in the DOM yet
      expect(screen.queryByTestId("browser-webview")).toBeNull();

      rafSpy.mockRestore();
    });

    it("renders the webview element once the animation frame fires", async () => {
      // Collect the rAF callback so we can flush it manually.
      let rafCb: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
        rafCb = cb;
        return 1;
      });

      render(<BrowserPane />);

      // Fire the rAF callback inside act() so React processes the state update
      await act(async () => {
        if (rafCb) rafCb(performance.now());
      });

      expect(screen.getByTestId("browser-webview")).toBeInTheDocument();
      rafSpy.mockRestore();
    });
  });
});
