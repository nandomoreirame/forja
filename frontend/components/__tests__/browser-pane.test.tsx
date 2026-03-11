import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoist mockInvoke so it's available when vi.mock is hoisted
const mockInvoke = vi.hoisted(() => vi.fn());

// Mock IPC invoke (hoisted - must come before other mocks)
vi.mock("@/lib/ipc", () => ({
  invoke: mockInvoke,
}));

// Mock the store
const mockState = {
  isOpen: true,
  url: "http://localhost:3000",
  committedUrl: "http://localhost:3000",
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  title: "",
  error: null as { code: number; description: string; url: string } | null,
  toggleOpen: vi.fn(),
  closePane: vi.fn(),
  // setUrl updates mockState.url so the controlled input reflects typed value
  setUrl: vi.fn((url: string) => {
    mockState.url = url;
  }),
  navigate: vi.fn(),
  navigateToUrl: vi.fn(),
  setLoading: vi.fn(),
  setNavigationState: vi.fn(),
  setTitle: vi.fn(),
  onDidNavigate: vi.fn(),
  openPane: vi.fn(),
  setError: vi.fn(),
  clearError: vi.fn(),
};

vi.mock("@/stores/browser-pane", () => ({
  useBrowserPaneStore: (selector?: (s: typeof mockState) => unknown) =>
    selector ? selector(mockState) : mockState,
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

describe("BrowserPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.isOpen = true;
    mockState.url = "http://localhost:3000";
    mockState.isLoading = false;
    mockState.canGoBack = false;
    mockState.canGoForward = false;
    mockState.error = null;
    mockInvoke.mockResolvedValue({ success: true });
  });

  it("renders the address bar input with current url", () => {
    render(<BrowserPane />);
    const input = screen.getByRole("textbox", { name: /address/i });
    expect(input).toHaveValue("http://localhost:3000");
  });

  it("renders back/forward/refresh buttons", () => {
    render(<BrowserPane />);
    expect(screen.getByLabelText(/go back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/go forward/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reload/i)).toBeInTheDocument();
  });

  it("back button is disabled when canGoBack=false", () => {
    mockState.canGoBack = false;
    render(<BrowserPane />);
    expect(screen.getByLabelText(/go back/i)).toBeDisabled();
  });

  it("forward button is disabled when canGoForward=false", () => {
    mockState.canGoForward = false;
    render(<BrowserPane />);
    expect(screen.getByLabelText(/go forward/i)).toBeDisabled();
  });

  it("updates url input when user types", () => {
    render(<BrowserPane />);
    const input = screen.getByRole("textbox", { name: /address/i });
    fireEvent.change(input, { target: { value: "http://localhost:5173" } });
    expect(mockState.setUrl).toHaveBeenLastCalledWith("http://localhost:5173");
  });

  it("calls navigate on Enter key press", async () => {
    const user = userEvent.setup();
    render(<BrowserPane />);
    const input = screen.getByRole("textbox", { name: /address/i });
    await user.click(input);
    await user.keyboard("{Enter}");
    expect(mockState.navigate).toHaveBeenCalled();
  });

  it("shows loading indicator when isLoading=true", () => {
    mockState.isLoading = true;
    render(<BrowserPane />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders close button that calls closePane", async () => {
    const user = userEvent.setup();
    render(<BrowserPane />);
    await user.click(screen.getByLabelText(/close browser/i));
    expect(mockState.closePane).toHaveBeenCalled();
  });

  describe("screenshot button", () => {
    it("renders the screenshot button in the toolbar", () => {
      render(<BrowserPane />);
      expect(screen.getByLabelText(/take screenshot/i)).toBeInTheDocument();
    });

    it("screenshot button is visible next to close button", () => {
      render(<BrowserPane />);
      const screenshotBtn = screen.getByLabelText(/take screenshot/i);
      const closeBtn = screen.getByLabelText(/close browser/i);
      // Both buttons should be in the same toolbar container
      expect(screenshotBtn.closest("div")).toBe(closeBtn.closest("div"));
    });

    it("calls invoke with browser:screenshot when clicked", async () => {
      render(<BrowserPane />);
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
      render(<BrowserPane />);
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

  describe("error overlay", () => {
    const sampleError = {
      code: -102,
      description: "ERR_CONNECTION_REFUSED",
      url: "http://localhost:9999",
    };

    it("does not render error overlay when error is null", () => {
      mockState.error = null;
      render(<BrowserPane />);
      expect(screen.queryByText(/could not access/i)).not.toBeInTheDocument();
    });

    it("renders error overlay when error is set", () => {
      mockState.error = sampleError;
      render(<BrowserPane />);
      expect(screen.getByText(/could not access/i)).toBeInTheDocument();
      expect(screen.getByText("localhost")).toBeInTheDocument();
      expect(screen.getByText("ERR_CONNECTION_REFUSED")).toBeInTheDocument();
    });

    it("renders a reload button in the error overlay", () => {
      mockState.error = sampleError;
      render(<BrowserPane />);
      expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    });

    it("reload button clears error and reloads webview", async () => {
      mockState.error = sampleError;
      render(<BrowserPane />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Reload" }));
      });
      expect(mockState.clearError).toHaveBeenCalled();
    });
  });
});
