import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabContextMenu } from "../tab-context-menu";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: vi.fn(() => ({
      removeBlock: vi.fn(),
    })),
  },
}));

import { useTilingLayoutStore } from "@/stores/tiling-layout";

describe("TabContextMenu", () => {
  const defaultProps = {
    nodeId: "tab-1",
    position: { x: 100, y: 200 },
    onClose: vi.fn(),
    onStartRename: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Edit tab and Close tab menu items", () => {
    render(<TabContextMenu {...defaultProps} />);

    expect(screen.getByText("Edit tab")).toBeInTheDocument();
    expect(screen.getByText("Close tab")).toBeInTheDocument();
  });

  it("calls onStartRename when Edit tab is clicked", () => {
    render(<TabContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByText("Edit tab"));

    expect(defaultProps.onStartRename).toHaveBeenCalledWith("tab-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls removeBlock when Close tab is clicked", () => {
    const mockRemoveBlock = vi.fn();
    vi.mocked(useTilingLayoutStore.getState).mockReturnValue({
      removeBlock: mockRemoveBlock,
    } as any);

    render(<TabContextMenu {...defaultProps} />);

    fireEvent.click(screen.getByText("Close tab"));

    expect(mockRemoveBlock).toHaveBeenCalledWith("tab-1");
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("closes menu on Escape key", () => {
    render(<TabContextMenu {...defaultProps} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("closes menu on click outside", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <TabContextMenu {...defaultProps} />
      </div>,
    );

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
