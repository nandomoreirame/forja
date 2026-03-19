import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabsetContextMenu } from "../tabset-context-menu";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: vi.fn(() => ({
      closeTabset: vi.fn(),
    })),
  },
}));

import { useTilingLayoutStore } from "@/stores/tiling-layout";

describe("TabsetContextMenu", () => {
  const defaultProps = {
    tabsetId: "tabset-1",
    position: { x: 150, y: 250 },
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Close pane menu item", () => {
    render(<TabsetContextMenu {...defaultProps} />);

    expect(screen.getByText("Close pane")).toBeInTheDocument();
  });

  it("calls closeTabset and onClose when Close pane is clicked", () => {
    const mockCloseTabset = vi.fn();
    vi.mocked(useTilingLayoutStore.getState).mockReturnValue({
      closeTabset: mockCloseTabset,
    } as any);

    render(<TabsetContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByText("Close pane"));

    expect(mockCloseTabset).toHaveBeenCalledWith("tabset-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("closes menu on Escape key", () => {
    render(<TabsetContextMenu {...defaultProps} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("closes menu on click outside", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <TabsetContextMenu {...defaultProps} />
      </div>,
    );

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("renders at the correct position", () => {
    render(<TabsetContextMenu {...defaultProps} />);

    const menu = screen.getByRole("menu");
    expect(menu).toHaveStyle({ left: "150px", top: "250px" });
  });

  it("renders as a menu with role=menu", () => {
    render(<TabsetContextMenu {...defaultProps} />);

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
