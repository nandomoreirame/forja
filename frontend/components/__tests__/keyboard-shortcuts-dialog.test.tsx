import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyboardShortcutsDialog } from "../keyboard-shortcuts-dialog";

describe("KeyboardShortcutsDialog", () => {
  it("shows split shortcut labels", () => {
    render(<KeyboardShortcutsDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Split Vertical")).toBeInTheDocument();
    expect(screen.getByText("Split Horizontal")).toBeInTheDocument();
    expect(screen.getByText("Close Split")).toBeInTheDocument();
    expect(screen.getByText("Focus Next Split Pane")).toBeInTheDocument();
  });
});
