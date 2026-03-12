import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RightSidebar } from "../right-sidebar";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const mockTogglePanel = vi.fn();
let mockIsOpen = false;

vi.mock("@/stores/right-panel", () => ({
  useRightPanelStore: Object.assign(
    (selector?: (s: unknown) => unknown) => {
      const state = {
        isOpen: mockIsOpen,
        togglePanel: mockTogglePanel,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        isOpen: mockIsOpen,
        togglePanel: mockTogglePanel,
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
    mockIsOpen = false;
  });

  it("renders the sidebar container", () => {
    render(<RightSidebar />);
    expect(screen.getByTestId("right-sidebar")).toBeTruthy();
  });

  it("renders panel toggle button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Toggle panel")).toBeTruthy();
  });

  it("renders settings button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Settings")).toBeTruthy();
  });

  it("renders help button", () => {
    render(<RightSidebar />);
    expect(screen.getByLabelText("Help")).toBeTruthy();
  });

  it("calls togglePanel when panel toggle is clicked", () => {
    render(<RightSidebar />);
    fireEvent.click(screen.getByLabelText("Toggle panel"));
    expect(mockTogglePanel).toHaveBeenCalledOnce();
  });

  it("opens settings dialog when settings button is clicked", () => {
    render(<RightSidebar />);
    fireEvent.click(screen.getByLabelText("Settings"));
    expect(mockSetSettingsOpen).toHaveBeenCalledWith(true);
  });

  it("shows close icon when panel is open", () => {
    mockIsOpen = true;
    render(<RightSidebar />);
    const btn = screen.getByLabelText("Toggle panel");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows open icon when panel is closed", () => {
    mockIsOpen = false;
    render(<RightSidebar />);
    const btn = screen.getByLabelText("Toggle panel");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });
});
