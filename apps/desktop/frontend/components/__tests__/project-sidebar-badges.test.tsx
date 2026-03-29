// frontend/components/__tests__/project-sidebar-badges.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShortcutBadge } from "../shortcut-badge";
import { useModifierHeldStore } from "@/stores/modifier-held";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
  open: vi.fn(),
}));

describe("Project sidebar badge integration", () => {
  beforeEach(() => {
    useModifierHeldStore.getState().cancelBadges();
  });

  it("renders numeric badge with active variant for current project", () => {
    render(
      <ShortcutBadge label="1" variant="active" visible className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("1");
    expect(badge.className).toContain("bg-ctp-mauve");
    expect(badge.className).toContain("opacity-100");
  });

  it("renders numeric badge with inactive variant for other projects", () => {
    render(
      <ShortcutBadge label="2" variant="inactive" visible className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("2");
    expect(badge.className).toContain("bg-ctp-surface2");
    expect(badge.className).toContain("opacity-100");
  });

  it("hides badge when not visible", () => {
    render(
      <ShortcutBadge label="1" variant="active" visible={false} className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("1");
    expect(badge.className).toContain("opacity-0");
  });

  it("renders N notification badge", () => {
    render(
      <ShortcutBadge label="N" variant="notification" visible className="absolute -bottom-1 -right-1 z-10" />
    );
    const badge = screen.getByText("N");
    expect(badge.className).toContain("bg-ctp-green");
  });
});
