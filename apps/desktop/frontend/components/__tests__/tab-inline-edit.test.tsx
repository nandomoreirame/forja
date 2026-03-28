import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabInlineEdit } from "../tab-inline-edit";
import { useTilingLayoutStore } from "@/stores/tiling-layout";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  getCurrentWindow: vi.fn(() => ({ label: "main" })),
}));

describe("TabInlineEdit", () => {
  beforeEach(() => {
    useTilingLayoutStore.setState({ editingTabId: null });
  });

  it("renders text when not editing", () => {
    render(<TabInlineEdit nodeId="tab-1" value="My Tab" onSave={vi.fn()} />);
    expect(screen.getByText("My Tab")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows input when editingTabId matches nodeId", () => {
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });
    render(<TabInlineEdit nodeId="tab-1" value="My Tab" onSave={vi.fn()} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("My Tab");
  });

  it("does not show input when editingTabId is a different node", () => {
    useTilingLayoutStore.setState({ editingTabId: "tab-2" });
    render(<TabInlineEdit nodeId="tab-1" value="My Tab" onSave={vi.fn()} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("calls onSave and clears editingTabId on Enter", () => {
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });
    const onSave = vi.fn();
    render(<TabInlineEdit nodeId="tab-1" value="Old Name" onSave={onSave} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).toHaveBeenCalledWith("New Name");
    expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
  });

  it("clears editingTabId on Escape without saving", () => {
    useTilingLayoutStore.setState({ editingTabId: "tab-1" });
    const onSave = vi.fn();
    render(<TabInlineEdit nodeId="tab-1" value="Name" onSave={onSave} />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
    expect(useTilingLayoutStore.getState().editingTabId).toBeNull();
  });

  it("sets editingTabId via onEditingChange(true) on double-click", () => {
    render(<TabInlineEdit nodeId="tab-1" value="Name" onSave={vi.fn()} />);

    fireEvent.doubleClick(screen.getByText("Name"));

    expect(useTilingLayoutStore.getState().editingTabId).toBe("tab-1");
  });
});
