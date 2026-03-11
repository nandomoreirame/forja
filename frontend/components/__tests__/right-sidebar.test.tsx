import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RightSidebar } from "../right-sidebar";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const mockToggleTerminalPane = vi.fn();
let mockIsTerminalPaneOpen = true;

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        isTerminalPaneOpen: mockIsTerminalPaneOpen,
        toggleTerminalPane: mockToggleTerminalPane,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        isTerminalPaneOpen: mockIsTerminalPaneOpen,
        toggleTerminalPane: mockToggleTerminalPane,
      }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

const mockSetSettingsOpen = vi.fn();
vi.mock("@/stores/app-dialogs", () => ({
  useAppDialogsStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = { setSettingsOpen: mockSetSettingsOpen };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ setSettingsOpen: mockSetSettingsOpen }),
      setState: vi.fn(),
      subscribe: vi.fn(() => () => {}),
    }
  ),
}));

describe("RightSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTerminalPaneOpen = true;
  });

  it("renders the sidebar container", () => {
    render(<RightSidebar />);
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("renders terminal toggle button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Toggle terminal")).toBeTruthy();
  });

  it("renders settings button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Settings")).toBeTruthy();
  });

  it("renders help button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Help")).toBeTruthy();
  });

  it("calls toggleTerminalPane when terminal toggle is clicked", () => {
    render(<RightSidebar />);
    fireEvent.click(screen.getByLabelText("Toggle terminal"));
    expect(mockToggleTerminalPane).toHaveBeenCalledOnce();
  });

  it("opens settings dialog when settings button is clicked", () => {
    render(<RightSidebar />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(mockSetSettingsOpen).toHaveBeenCalledWith(true);
  });

  it("shows hide icon when terminal is open", () => {
    mockIsTerminalPaneOpen = true;
    render(<RightSidebar />);
    const btn = screen.getByLabelText("Toggle terminal");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows show icon when terminal is closed", () => {
    mockIsTerminalPaneOpen = false;
    render(<RightSidebar />);
    const btn = screen.getByLabelText("Toggle terminal");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });
});
