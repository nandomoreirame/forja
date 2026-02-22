import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "../tab-bar";
import type { TerminalTab } from "@/stores/terminal-tabs";

const baseTabs: TerminalTab[] = [
  { id: "tab-1", name: "Claude #1", path: "/a", isRunning: true },
  { id: "tab-2", name: "Claude #2", path: "/b", isRunning: true },
  { id: "tab-3", name: "Claude #3", path: "/c", isRunning: false },
];

describe("TabBar", () => {
  const onSelectTab = vi.fn();
  const onCloseTab = vi.fn();
  const onNewTab = vi.fn();

  beforeEach(() => {
    onSelectTab.mockClear();
    onCloseTab.mockClear();
    onNewTab.mockClear();
  });

  it("renders all tabs", () => {
    render(
      <TabBar
        tabs={baseTabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />
    );

    expect(screen.getByText("Claude #1")).toBeInTheDocument();
    expect(screen.getByText("Claude #2")).toBeInTheDocument();
    expect(screen.getByText("Claude #3")).toBeInTheDocument();
  });

  it("highlights active tab with aria-selected", () => {
    render(
      <TabBar
        tabs={baseTabs}
        activeTabId="tab-2"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[2]).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelectTab when a tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TabBar
        tabs={baseTabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />
    );

    await user.click(screen.getByText("Claude #2"));
    expect(onSelectTab).toHaveBeenCalledWith("tab-2");
  });

  it("calls onCloseTab when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TabBar
        tabs={baseTabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />
    );

    const closeButtons = screen.getAllByLabelText(/close/i);
    await user.click(closeButtons[1]);
    expect(onCloseTab).toHaveBeenCalledWith("tab-2");
  });

  it("calls onNewTab when new tab button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TabBar
        tabs={baseTabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />
    );

    const newTabButton = screen.getByLabelText(/new tab/i);
    await user.click(newTabButton);
    expect(onNewTab).toHaveBeenCalled();
  });

  it("shows exited indicator for non-running tabs", () => {
    render(
      <TabBar
        tabs={baseTabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />
    );

    const tabs = screen.getAllByRole("tab");
    // tab-3 is not running, should have italic/dimmed style
    expect(tabs[2]).toHaveClass("italic");
    expect(tabs[2]).toHaveClass("opacity-60");
  });

  it("has proper ARIA roles (tablist and tab)", () => {
    render(
      <TabBar
        tabs={baseTabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onNewTab={onNewTab}
      />
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});
