import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyboardShortcutsDialog } from "../keyboard-shortcuts-dialog";

describe("KeyboardShortcutsDialog", () => {
  it("shows updated project and file/browser shortcut labels", () => {
    render(<KeyboardShortcutsDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Add Project")).toBeInTheDocument();
    expect(screen.getByText("Open Files")).toBeInTheDocument();
    expect(screen.getByText("Open Browser")).toBeInTheDocument();
    expect(screen.getAllByText("Shift").length).toBeGreaterThan(0);
  });

  it("shows split shortcut labels", () => {
    render(<KeyboardShortcutsDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Split Vertical")).toBeInTheDocument();
    expect(screen.getByText("Split Horizontal")).toBeInTheDocument();
    expect(screen.getByText("Close Split")).toBeInTheDocument();
    expect(screen.getByText("Focus Next Split Pane")).toBeInTheDocument();
  });
});
