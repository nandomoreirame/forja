import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ForjaEmptyState } from "../forja-empty-state";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

describe("ForjaEmptyState", () => {
  it("renders Forja branding (logo text and tagline)", () => {
    render(<ForjaEmptyState />);

    expect(screen.getByText("Forja")).toBeInTheDocument();
    expect(screen.getByText("A dedicated desktop client for vibe coders")).toBeInTheDocument();
  });

  it("renders keyboard shortcuts (Ctrl/Cmd+P and Ctrl/Cmd+Shift+P)", () => {
    render(<ForjaEmptyState />);

    expect(screen.getByText("Quick open")).toBeInTheDocument();
    expect(screen.getByText("Command palette")).toBeInTheDocument();
  });

  it("renders children when provided", () => {
    render(
      <ForjaEmptyState>
        <button>Custom Action</button>
      </ForjaEmptyState>
    );

    expect(screen.getByText("Custom Action")).toBeInTheDocument();
    expect(screen.getByText("Forja")).toBeInTheDocument();
  });

  it("does not render children slot when no children provided", () => {
    const { container } = render(<ForjaEmptyState />);

    // Should not have any button elements (no action slot)
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(0);
  });
});
