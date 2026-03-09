import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createRef } from "react";
import { SlashCommandMenu } from "../slash-command-menu";
import type { SlashCommandMenuHandle } from "../slash-command-menu";
import { SLASH_COMMANDS, type SlashCommandDef } from "@/lib/slash-commands";

describe("SlashCommandMenu", () => {
  const mockOnSelect = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders with data-testid", () => {
    render(<SlashCommandMenu query="" onSelect={mockOnSelect} />);
    expect(screen.getByTestId("slash-command-menu")).toBeDefined();
  });

  it("shows group headings", () => {
    render(<SlashCommandMenu query="" onSelect={mockOnSelect} />);
    expect(screen.getByText("Context")).toBeDefined();
    expect(screen.getByText("Skills")).toBeDefined();
    expect(screen.getByText("Agents")).toBeDefined();
  });

  it("shows command labels and descriptions", () => {
    render(<SlashCommandMenu query="" onSelect={mockOnSelect} />);
    expect(screen.getByText("/context init")).toBeDefined();
    expect(screen.getByText("Initialize context hub")).toBeDefined();
    expect(screen.getByText("/skill create <slug>")).toBeDefined();
    expect(screen.getByText("Create a new skill")).toBeDefined();
  });

  it("calls onSelect with correct command when item clicked", () => {
    render(<SlashCommandMenu query="" onSelect={mockOnSelect} />);
    const item = screen.getByText("/context init");
    fireEvent.click(item.closest("[role='option']")!);
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    const selected: SlashCommandDef = mockOnSelect.mock.calls[0][0];
    expect(selected.command).toBe("/context init");
    expect(selected.group).toBe("Context");
  });

  it("filters commands based on query", () => {
    render(<SlashCommandMenu query="context" onSelect={mockOnSelect} />);
    expect(screen.getByText("/context init")).toBeDefined();
    const items = screen.getAllByRole("option");
    expect(items).toHaveLength(4);
  });

  it("shows empty state when query matches nothing", () => {
    render(
      <SlashCommandMenu query="zzzznonexistent" onSelect={mockOnSelect} />
    );
    expect(screen.getByText("No commands found")).toBeDefined();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  describe("keyboard navigation via ref", () => {
    it("exposes moveUp, moveDown, confirm via ref", () => {
      const ref = createRef<SlashCommandMenuHandle>();
      render(<SlashCommandMenu ref={ref} query="" onSelect={mockOnSelect} />);
      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.moveUp).toBe("function");
      expect(typeof ref.current?.moveDown).toBe("function");
      expect(typeof ref.current?.confirm).toBe("function");
    });

    it("highlights first item by default", () => {
      render(<SlashCommandMenu query="" onSelect={mockOnSelect} />);
      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveAttribute("aria-selected", "true");
    });

    it("moveDown advances selection to next item", () => {
      const ref = createRef<SlashCommandMenuHandle>();
      render(<SlashCommandMenu ref={ref} query="" onSelect={mockOnSelect} />);

      act(() => {
        ref.current?.moveDown();
      });

      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveAttribute("aria-selected", "false");
      expect(items[1]).toHaveAttribute("aria-selected", "true");
    });

    it("moveUp moves selection to previous item", () => {
      const ref = createRef<SlashCommandMenuHandle>();
      render(<SlashCommandMenu ref={ref} query="" onSelect={mockOnSelect} />);

      act(() => {
        ref.current?.moveDown();
      });
      act(() => {
        ref.current?.moveUp();
      });

      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveAttribute("aria-selected", "true");
    });

    it("moveDown wraps around to first item", () => {
      const ref = createRef<SlashCommandMenuHandle>();
      render(<SlashCommandMenu ref={ref} query="" onSelect={mockOnSelect} />);

      for (let i = 0; i < SLASH_COMMANDS.length; i++) {
        act(() => {
          ref.current?.moveDown();
        });
      }

      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveAttribute("aria-selected", "true");
    });

    it("moveUp wraps around to last item", () => {
      const ref = createRef<SlashCommandMenuHandle>();
      render(<SlashCommandMenu ref={ref} query="" onSelect={mockOnSelect} />);

      act(() => {
        ref.current?.moveUp();
      });

      const items = screen.getAllByRole("option");
      expect(items[items.length - 1]).toHaveAttribute("aria-selected", "true");
    });

    it("confirm calls onSelect with currently selected item", () => {
      const ref = createRef<SlashCommandMenuHandle>();
      render(<SlashCommandMenu ref={ref} query="" onSelect={mockOnSelect} />);

      act(() => {
        ref.current?.moveDown();
      });
      act(() => {
        ref.current?.confirm();
      });

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect.mock.calls[0][0].command).toBe(
        SLASH_COMMANDS[1].command
      );
    });

    it("resets selection to 0 when query changes", () => {
      const ref = createRef<SlashCommandMenuHandle>();
      const { rerender } = render(
        <SlashCommandMenu ref={ref} query="" onSelect={mockOnSelect} />
      );

      act(() => {
        ref.current?.moveDown();
        ref.current?.moveDown();
      });

      rerender(
        <SlashCommandMenu ref={ref} query="context" onSelect={mockOnSelect} />
      );

      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveAttribute("aria-selected", "true");
    });
  });
});
