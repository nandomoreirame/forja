import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InlineEdit } from "../inline-edit";

describe("InlineEdit", () => {
  const defaultProps = {
    value: "My Workspace",
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders value as text by default", () => {
    render(<InlineEdit {...defaultProps} />);
    expect(screen.getByText("My Workspace")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("enters edit mode on double-click", () => {
    render(<InlineEdit {...defaultProps} />);
    fireEvent.doubleClick(screen.getByText("My Workspace"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("My Workspace");
  });

  it("auto-selects text when entering edit mode", () => {
    render(<InlineEdit {...defaultProps} />);
    fireEvent.doubleClick(screen.getByText("My Workspace"));

    const input = screen.getByRole("textbox");
    expect(input).toHaveFocus();
  });

  it("saves on Enter key", () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Old Name" onSave={onSave} />);

    fireEvent.doubleClick(screen.getByText("Old Name"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).toHaveBeenCalledWith("New Name");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("saves on blur", () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Old Name" onSave={onSave} />);

    fireEvent.doubleClick(screen.getByText("Old Name"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Blurred Name" } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith("Blurred Name");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("cancels on Escape key without saving", () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Original" onSave={onSave} />);

    fireEvent.doubleClick(screen.getByText("Original"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("trims whitespace before saving", () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Name" onSave={onSave} />);

    fireEvent.doubleClick(screen.getByText("Name"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  Trimmed  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).toHaveBeenCalledWith("Trimmed");
  });

  it("does not save empty string", () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Name" onSave={onSave} />);

    fireEvent.doubleClick(screen.getByText("Name"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not save when value is unchanged", () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Same" onSave={onSave} />);

    fireEvent.doubleClick(screen.getByText("Same"));
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(<InlineEdit {...defaultProps} className="custom-class" />);
    const span = screen.getByText("My Workspace");
    expect(span.className).toContain("custom-class");
  });
});
