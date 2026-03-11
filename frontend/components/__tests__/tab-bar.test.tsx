import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "../tab-bar";
import type { TerminalTab } from "@/stores/terminal-tabs";

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => ({
    installedClis: [
      {
        id: "claude",
        displayName: "Claude Code",
        binary: "claude",
        description: "AI-assisted coding with Anthropic Claude",
        iconColor: "text-brand",
        icon: "./images/claude.svg",
      },
    ],
    loading: false,
  }),
}));

describe("TabBar", () => {
  const onSelectTab = vi.fn();
  const onCloseTab = vi.fn();
  const onSessionTypeSelect = vi.fn();

  beforeEach(() => {
    onSelectTab.mockClear();
    onCloseTab.mockClear();
    onSessionTypeSelect.mockClear();
  });

  describe("dynamic display names — single type tabs", () => {
    it("single tab shows name without number", () => {
      const tabs: TerminalTab[] = [
        { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
      ];
      render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSessionTypeSelect={onSessionTypeSelect}
        />
      );

      expect(screen.getByText("Claude Code")).toBeInTheDocument();
      // Should NOT show #1 for a single tab
      expect(screen.queryByText("Claude Code #1")).not.toBeInTheDocument();
    });

    it("one tab of each type: all show without numbers", () => {
      const tabs: TerminalTab[] = [
        { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
        { id: "tab-2", name: "Gemini CLI", path: "/b", isRunning: true, sessionType: "gemini" },
        { id: "tab-3", name: "Terminal", path: "/c", isRunning: true, sessionType: "terminal" },
      ];
      render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSessionTypeSelect={onSessionTypeSelect}
        />
      );

      expect(screen.getByText("Claude Code")).toBeInTheDocument();
      expect(screen.getByText("Gemini CLI")).toBeInTheDocument();
      expect(screen.getByText("Terminal")).toBeInTheDocument();
    });
  });

  describe("dynamic display names — multiple tabs of same type", () => {
    it("two claude tabs get per-type #1 and #2", () => {
      const tabs: TerminalTab[] = [
        { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
        { id: "tab-2", name: "Claude Code", path: "/b", isRunning: true, sessionType: "claude" },
      ];
      render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSessionTypeSelect={onSessionTypeSelect}
        />
      );

      expect(screen.getByText("Claude Code #1")).toBeInTheDocument();
      expect(screen.getByText("Claude Code #2")).toBeInTheDocument();
    });

    it("three terminal tabs get #1, #2, #3", () => {
      const tabs: TerminalTab[] = [
        { id: "tab-1", name: "Terminal", path: "/a", isRunning: true, sessionType: "terminal" },
        { id: "tab-2", name: "Terminal", path: "/b", isRunning: true, sessionType: "terminal" },
        { id: "tab-3", name: "Terminal", path: "/c", isRunning: false, sessionType: "terminal" },
      ];
      render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSessionTypeSelect={onSessionTypeSelect}
        />
      );

      expect(screen.getByText("Terminal #1")).toBeInTheDocument();
      expect(screen.getByText("Terminal #2")).toBeInTheDocument();
      expect(screen.getByText("Terminal #3")).toBeInTheDocument();
    });

    it("mixed: two claude, one gemini — only claude gets numbers", () => {
      const tabs: TerminalTab[] = [
        { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
        { id: "tab-2", name: "Gemini CLI", path: "/b", isRunning: true, sessionType: "gemini" },
        { id: "tab-3", name: "Claude Code", path: "/c", isRunning: true, sessionType: "claude" },
      ];
      render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSessionTypeSelect={onSessionTypeSelect}
        />
      );

      expect(screen.getByText("Claude Code #1")).toBeInTheDocument();
      expect(screen.getByText("Gemini CLI")).toBeInTheDocument();
      expect(screen.getByText("Claude Code #2")).toBeInTheDocument();
    });
  });

  it("highlights active tab with aria-selected", () => {
    const tabs: TerminalTab[] = [
      { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
      { id: "tab-2", name: "Claude Code", path: "/b", isRunning: true, sessionType: "claude" },
      { id: "tab-3", name: "Claude Code", path: "/c", isRunning: false, sessionType: "claude" },
    ];
    render(
      <TabBar
        tabs={tabs}
        activeTabId="tab-2"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const tabButtons = screen.getAllByRole("tab");
    expect(tabButtons[0]).toHaveAttribute("aria-selected", "false");
    expect(tabButtons[1]).toHaveAttribute("aria-selected", "true");
    expect(tabButtons[2]).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelectTab when a tab is clicked", async () => {
    const user = userEvent.setup();
    const tabs: TerminalTab[] = [
      { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
      { id: "tab-2", name: "Claude Code", path: "/b", isRunning: true, sessionType: "claude" },
    ];
    render(
      <TabBar
        tabs={tabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    await user.click(screen.getByText("Claude Code #2"));
    expect(onSelectTab).toHaveBeenCalledWith("tab-2");
  });

  it("calls onCloseTab when close button is clicked", async () => {
    const user = userEvent.setup();
    const tabs: TerminalTab[] = [
      { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
      { id: "tab-2", name: "Claude Code", path: "/b", isRunning: true, sessionType: "claude" },
    ];
    render(
      <TabBar
        tabs={tabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const closeButtons = screen.getAllByLabelText(/close/i);
    await user.click(closeButtons[1]);
    expect(onCloseTab).toHaveBeenCalledWith("tab-2");
  });

  it("renders new tab dropdown trigger", () => {
    const tabs: TerminalTab[] = [
      { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
    ];
    render(
      <TabBar
        tabs={tabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    expect(screen.getByLabelText(/new tab/i)).toBeInTheDocument();
  });

  it("shows exited indicator for non-running tabs", () => {
    const tabs: TerminalTab[] = [
      { id: "tab-1", name: "Terminal", path: "/a", isRunning: true, sessionType: "terminal" },
      { id: "tab-2", name: "Terminal", path: "/b", isRunning: true, sessionType: "terminal" },
      { id: "tab-3", name: "Terminal", path: "/c", isRunning: false, sessionType: "terminal" },
    ];
    render(
      <TabBar
        tabs={tabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const tabButtons = screen.getAllByRole("tab");
    // tab-3 is not running, should have italic/dimmed style
    expect(tabButtons[2]).toHaveClass("italic");
    expect(tabButtons[2]).toHaveClass("opacity-60");
  });

  describe("fullscreen toggle button", () => {
    it("renders a fullscreen toggle button", () => {
      const tabs: TerminalTab[] = [
        { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
      ];
      render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSessionTypeSelect={onSessionTypeSelect}
        />
      );

      expect(screen.getByLabelText("Toggle fullscreen")).toBeInTheDocument();
    });

    it("calls toggleTerminalFullscreen when clicked", async () => {
      const user = userEvent.setup();
      const tabs: TerminalTab[] = [
        { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
      ];
      render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          onSelectTab={onSelectTab}
          onCloseTab={onCloseTab}
          onSessionTypeSelect={onSessionTypeSelect}
        />
      );

      await user.click(screen.getByLabelText("Toggle fullscreen"));

      const { useTerminalTabsStore } = await import("@/stores/terminal-tabs");
      expect(useTerminalTabsStore.getState().isTerminalFullscreen).toBe(true);
    });
  });

  it("has proper ARIA roles (tablist and tab)", () => {
    const tabs: TerminalTab[] = [
      { id: "tab-1", name: "Claude Code", path: "/a", isRunning: true, sessionType: "claude" },
      { id: "tab-2", name: "Gemini CLI", path: "/b", isRunning: true, sessionType: "gemini" },
      { id: "tab-3", name: "Terminal", path: "/c", isRunning: false, sessionType: "terminal" },
    ];
    render(
      <TabBar
        tabs={tabs}
        activeTabId="tab-1"
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});
