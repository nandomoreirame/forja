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
    { id: "tab-1", name: "Claude #1", path: "/a", isRunning: true },
    { id: "tab-2", name: "Claude #2", path: "/b", isRunning: true },
  ],
  activeTabId: "tab-1",
};

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

describe("TerminalPane", () => {
  beforeEach(() => {
    mockStore.tabs = [
      { id: "tab-1", name: "Claude #1", path: "/a", isRunning: true },
      { id: "tab-2", name: "Claude #2", path: "/b", isRunning: true },
    ];
    mockStore.activeTabId = "tab-1";
  });

  it("renders a TerminalSession for each tab", () => {
    render(<TerminalPane />);
    expect(screen.getByTestId("session-tab-1")).toBeInTheDocument();
    expect(screen.getByTestId("session-tab-2")).toBeInTheDocument();
  });

  it("sets isVisible=true only for active tab", () => {
    render(<TerminalPane />);
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "false");
  });

  it("updates visibility when active tab changes", () => {
    mockStore.activeTabId = "tab-2";
    render(<TerminalPane />);
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "false");
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "true");
  });
});
