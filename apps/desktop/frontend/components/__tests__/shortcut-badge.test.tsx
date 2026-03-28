import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortcutBadge } from "../shortcut-badge";

describe("ShortcutBadge", () => {
  it("renders label text", () => {
    render(<ShortcutBadge label="1" variant="active" visible />);
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("has aria-hidden=true", () => {
    render(<ShortcutBadge label="E" variant="inactive" visible />);
    const el = screen.getByText("E");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies visible styles when visible=true", () => {
    render(<ShortcutBadge label="→" variant="direction-active" visible />);
    const el = screen.getByText("→");
    expect(el.className).toContain("opacity-100");
  });

  it("applies hidden styles when visible=false", () => {
    render(<ShortcutBadge label="N" variant="notification" visible={false} />);
    const el = screen.getByText("N");
    expect(el.className).toContain("opacity-0");
  });

  it("applies active variant styles", () => {
    render(<ShortcutBadge label="1" variant="active" visible />);
    const el = screen.getByText("1");
    expect(el.className).toContain("bg-ctp-mauve");
    expect(el.className).toContain("text-ctp-base");
  });

  it("applies notification variant styles", () => {
    render(<ShortcutBadge label="N" variant="notification" visible />);
    const el = screen.getByText("N");
    expect(el.className).toContain("bg-ctp-green");
  });
});
