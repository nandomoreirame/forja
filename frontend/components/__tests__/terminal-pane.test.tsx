import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalPane } from "../terminal-pane";

// Mock TerminalSession
vi.mock("../terminal-session", () => ({
  TerminalSession: ({ tabId, isVisible }: { tabId: string; path: string; isVisible: boolean }) => (
    <div data-testid={`session-${tabId}`} data-visible={isVisible}>
      Mock Session {tabId}
    </div>
  ),
}));

// Mock terminal-tabs store
const mockStore = {
  tabs: [
    { id: "tab-1", name: "Claude #1", path: "/a", isRunning: true, sessionType: "claude" },
    { id: "tab-2", name: "Claude #2", path: "/b", isRunning: true, sessionType: "claude" },
  ],
  activeTabId: "tab-1",
};

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

describe("TerminalPane", () => {
  beforeEach(() => {
    mockStore.tabs = [
      { id: "tab-1", name: "Claude #1", path: "/a", isRunning: true, sessionType: "claude" },
      { id: "tab-2", name: "Claude #2", path: "/b", isRunning: true, sessionType: "claude" },
    ];
    mockStore.activeTabId = "tab-1";
  });

  it("renders a TerminalSession for each tab", () => {
    render(<TerminalPane projectPath={null} />);
    expect(screen.getByTestId("session-tab-1")).toBeInTheDocument();
    expect(screen.getByTestId("session-tab-2")).toBeInTheDocument();
  });

  it("sets isVisible=true only for active tab", () => {
    render(<TerminalPane projectPath={null} />);
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "false");
  });

  it("updates visibility when active tab changes", () => {
    mockStore.activeTabId = "tab-2";
    render(<TerminalPane projectPath={null} />);
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "false");
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "true");
  });

  it("only shows active tab of the current project", () => {
    mockStore.tabs = [
      { id: "tab-1", name: "Claude #1", path: "/project-a", isRunning: true, sessionType: "claude" },
      { id: "tab-2", name: "Claude #2", path: "/project-b", isRunning: true, sessionType: "claude" },
    ];
    mockStore.activeTabId = "tab-1";

    render(<TerminalPane projectPath="/project-a" />);

    // tab-1 belongs to project-a and is active => visible
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "true");
    // tab-2 belongs to project-b => not visible even though it's rendered
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "false");
  });

  it("hides tabs from other projects even if they match activeTabId", () => {
    mockStore.tabs = [
      { id: "tab-1", name: "Claude #1", path: "/project-a", isRunning: true, sessionType: "claude" },
      { id: "tab-2", name: "Claude #2", path: "/project-b", isRunning: true, sessionType: "claude" },
    ];
    // activeTabId points to tab from project-b, but we're viewing project-a
    mockStore.activeTabId = "tab-2";

    render(<TerminalPane projectPath="/project-a" />);

    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "false");
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "false");
  });
});
