import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalPane } from "../terminal-pane";

vi.mock("../terminal-session", () => ({
  TerminalSession: ({ tabId, isVisible, sessionType }: { tabId: string; isVisible: boolean; sessionType?: string }) => (
    <div data-testid={`session-${tabId}`} data-visible={isVisible} data-session-type={sessionType ?? ""}>
      Session {tabId}
    </div>
  ),
}));

const tabsState = {
  tabs: [
    { id: "tab-1", name: "Terminal #1", path: "/project", isRunning: true, sessionType: "claude" },
    { id: "tab-2", name: "Terminal #2", path: "/project", isRunning: true, sessionType: "terminal" },
    { id: "tab-3", name: "Terminal #3", path: "/project", isRunning: true, sessionType: "terminal" },
  ],
  activeTabId: "tab-1",
};

const splitState = {
  orientation: "none" as "none" | "horizontal" | "vertical",
  ratio: 50,
  splitTabId: null as string | null,
  secondarySessionType: null as string | null,
  focusedPane: "primary",
  setRatio: vi.fn(),
};

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: (selector: (state: typeof tabsState) => unknown) =>
    selector(tabsState),
}));

vi.mock("@/stores/terminal-split-layout", () => ({
  useTerminalSplitLayoutStore: (selector: (state: typeof splitState) => unknown) =>
    selector(splitState),
}));

describe("TerminalPane split rendering", () => {
  beforeEach(() => {
    tabsState.activeTabId = "tab-1";
    splitState.orientation = "none";
    splitState.splitTabId = null;
    splitState.secondarySessionType = null;
    splitState.setRatio.mockClear();
  });

  it("keeps single-pane behavior when split is disabled", () => {
    render(<TerminalPane projectPath="/project" />);
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "false");
  });

  it("shows primary and secondary sessions when split is active", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";

    render(<TerminalPane projectPath="/project" />);

    // Primary tab-1 visible
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "true");
    // Secondary pane with derived tabId
    expect(screen.getByTestId("session-tab-1:split")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("session-tab-1:split")).toHaveAttribute("data-session-type", "claude");
  });

  it("renders all primary tabs in DOM regardless of split mode", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";

    render(<TerminalPane projectPath="/project" />);

    expect(screen.getByTestId("session-tab-1")).toBeInTheDocument();
    expect(screen.getByTestId("session-tab-2")).toBeInTheDocument();
    expect(screen.getByTestId("session-tab-3")).toBeInTheDocument();
  });

  it("hides non-split primary sessions when split is active", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "terminal";

    render(<TerminalPane projectPath="/project" />);

    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "true");
    expect(screen.getByTestId("session-tab-2")).toHaveAttribute("data-visible", "false");
    expect(screen.getByTestId("session-tab-3")).toHaveAttribute("data-visible", "false");
  });

  it("shows resize handle only when split is active", () => {
    render(<TerminalPane projectPath="/project" />);
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();

    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";

    const { unmount } = render(<TerminalPane projectPath="/project" />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
    unmount();
  });

  it("uses row direction for vertical split", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";

    const { container } = render(<TerminalPane projectPath="/project" />);
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.style.flexDirection).toBe("row");
  });

  it("uses column direction for horizontal split", () => {
    splitState.orientation = "horizontal";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";

    const { container } = render(<TerminalPane projectPath="/project" />);
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.style.flexDirection).toBe("column");
  });

  it("applies correct flex-basis from splitRatio", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";
    splitState.ratio = 60;

    render(<TerminalPane projectPath="/project" />);

    const primary = screen.getByTestId("session-tab-1").closest('[role="tabpanel"]') as HTMLElement;
    const secondary = screen.getByTestId("session-tab-1:split").parentElement!;
    expect(primary.style.flexBasis).toBe("60%");
    expect(secondary.style.flexBasis).toBe("40%");
  });

  it("applies CSS order for correct visual placement", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";

    render(<TerminalPane projectPath="/project" />);

    const primary = screen.getByTestId("session-tab-1").closest('[role="tabpanel"]') as HTMLElement;
    const secondary = screen.getByTestId("session-tab-1:split").parentElement!;
    expect(primary.style.order).toBe("0");
    expect(secondary.style.order).toBe("2");
  });

  it("hides split when active tab is NOT the split tab", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";
    tabsState.activeTabId = "tab-3";

    render(<TerminalPane projectPath="/project" />);

    // Only tab-3 (the active tab) should be visible
    expect(screen.getByTestId("session-tab-1")).toHaveAttribute("data-visible", "false");
    expect(screen.getByTestId("session-tab-3")).toHaveAttribute("data-visible", "true");
    // No resize handle
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("shows close header on both panes with correct labels when split is active", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "terminal";

    render(<TerminalPane projectPath="/project" />);

    // Primary header shows the tab display name ("Claude Code" from cli-registry)
    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    // Secondary header shows the session type display name
    expect(screen.getByText("Terminal")).toBeInTheDocument();
  });

  it("does not show primary pane header when split is inactive", () => {
    splitState.orientation = "none";
    splitState.splitTabId = null;

    render(<TerminalPane projectPath="/project" />);

    // No split headers should be visible
    const closeButtons = screen.queryAllByRole("button", { name: "Close split" });
    expect(closeButtons).toHaveLength(0);
  });

  it("shows close buttons on both panes when split is active", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "claude";

    render(<TerminalPane projectPath="/project" />);

    const closeButtons = screen.getAllByRole("button", { name: "Close split" });
    expect(closeButtons).toHaveLength(2);
  });

  it("does not render secondary pane when splitTabId is null", () => {
    splitState.orientation = "none";
    splitState.splitTabId = null;
    splitState.secondarySessionType = null;

    render(<TerminalPane projectPath="/project" />);

    expect(screen.queryByTestId("session-tab-1:split")).not.toBeInTheDocument();
  });

  it("secondary pane receives sessionType from store", () => {
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";
    splitState.secondarySessionType = "gemini";

    render(<TerminalPane projectPath="/project" />);

    expect(screen.getByTestId("session-tab-1:split")).toHaveAttribute("data-session-type", "gemini");
  });
});
