import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the store
const mockState = {
  isOpen: true,
  url: "http://localhost:3000",
  committedUrl: "http://localhost:3000",
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  title: "",
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
};

vi.mock("@/stores/browser-pane", () => ({
  useBrowserPaneStore: (selector?: (s: typeof mockState) => unknown) =>
    selector ? selector(mockState) : mockState,
}));

// Patch document.createElement so jsdom returns a div when "webview" is requested
const originalCreateElement = document.createElement.bind(document);
document.createElement = ((tagName: string, options?: ElementCreationOptions) => {
  if (tagName === "webview") return originalCreateElement("div", options);
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
});
