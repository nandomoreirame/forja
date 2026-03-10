import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TerminalContextMenu } from "../terminal-context-menu";

const mockOpenSplit = vi.fn();
const mockCloseSplit = vi.fn();
const mockRemoveTab = vi.fn();

const splitState = {
  orientation: "none" as "none" | "horizontal" | "vertical",
  splitTabId: null as string | null,
  openSplit: mockOpenSplit,
  closeSplit: mockCloseSplit,
};

vi.mock("@/stores/terminal-split-layout", () => ({
  useTerminalSplitLayoutStore: (selector: (state: typeof splitState) => unknown) =>
    selector(splitState),
}));

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: (selector: (state: { removeTab: typeof mockRemoveTab }) => unknown) =>
    selector({ removeTab: mockRemoveTab }),
}));

describe("TerminalContextMenu", () => {
  beforeEach(() => {
    splitState.orientation = "none";
    splitState.splitTabId = null;
    mockOpenSplit.mockClear();
    mockCloseSplit.mockClear();
    mockRemoveTab.mockClear();
  });

  it("renders children inside context menu trigger", () => {
    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    expect(screen.getByTestId("terminal-child")).toBeInTheDocument();
  });

  it("shows context menu on right-click", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });

    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("shows Copy option in context menu", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    expect(await screen.findByText("Copy")).toBeInTheDocument();
  });

  it("shows Paste option in context menu", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    expect(await screen.findByText("Paste")).toBeInTheDocument();
  });

  it("shows Split Vertical option in context menu", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    expect(await screen.findByText("Split Vertical")).toBeInTheDocument();
  });

  it("shows Split Horizontal option in context menu", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    expect(await screen.findByText("Split Horizontal")).toBeInTheDocument();
  });

  it("shows Close Terminal option in context menu", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    expect(await screen.findByText("Close Terminal")).toBeInTheDocument();
  });

  it("calls onCopy when Copy is clicked", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={onCopy} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const copyItem = await screen.findByText("Copy");
    await user.click(copyItem);

    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("calls onPaste when Paste is clicked", async () => {
    const user = userEvent.setup();
    const onPaste = vi.fn();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={onPaste}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const pasteItem = await screen.findByText("Paste");
    await user.click(pasteItem);

    expect(onPaste).toHaveBeenCalledTimes(1);
  });

  it("calls openSplit with vertical when Split Vertical is clicked", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const splitVerticalItem = await screen.findByText("Split Vertical");
    await user.click(splitVerticalItem);

    expect(mockOpenSplit).toHaveBeenCalledWith("vertical", "tab-1", "terminal");
  });

  it("calls openSplit with horizontal when Split Horizontal is clicked", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const splitHorizontalItem = await screen.findByText("Split Horizontal");
    await user.click(splitHorizontalItem);

    expect(mockOpenSplit).toHaveBeenCalledWith("horizontal", "tab-1", "terminal");
  });

  it("calls removeTab when Close Terminal is clicked without split", async () => {
    const user = userEvent.setup();

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const closeItem = await screen.findByText("Close Terminal");
    await user.click(closeItem);

    expect(mockRemoveTab).toHaveBeenCalledWith("tab-1");
    expect(mockCloseSplit).not.toHaveBeenCalled();
  });

  it("closes split instead of removing tab when Close Terminal is clicked on primary pane with split", async () => {
    const user = userEvent.setup();
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const closeItem = await screen.findByText("Close Terminal");
    await user.click(closeItem);

    expect(mockCloseSplit).toHaveBeenCalledTimes(1);
    expect(mockRemoveTab).not.toHaveBeenCalled();
  });

  it("closes split instead of removing tab when Close Terminal is clicked on secondary split pane", async () => {
    const user = userEvent.setup();
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";

    render(
      <TerminalContextMenu tabId="tab-1:split" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const closeItem = await screen.findByText("Close Terminal");
    await user.click(closeItem);

    expect(mockCloseSplit).toHaveBeenCalledTimes(1);
    expect(mockRemoveTab).not.toHaveBeenCalled();
  });

  it("detects split as active in secondary pane (tabId with :split suffix)", async () => {
    const user = userEvent.setup();
    splitState.orientation = "horizontal";
    splitState.splitTabId = "tab-1";

    render(
      <TerminalContextMenu tabId="tab-1:split" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    await screen.findByRole("menu");

    expect(screen.getByText("Close Split")).toBeInTheDocument();

    const splitVertical = screen.getByText("Split Vertical").closest('[role="menuitem"]');
    expect(splitVertical).toHaveAttribute("data-disabled");
  });

  it("uses baseTabId for openSplit when called from secondary split pane", async () => {
    const user = userEvent.setup();
    splitState.orientation = "none";
    splitState.splitTabId = null;

    render(
      <TerminalContextMenu tabId="tab-1:split" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const splitVerticalItem = await screen.findByText("Split Vertical");
    await user.click(splitVerticalItem);

    expect(mockOpenSplit).toHaveBeenCalledWith("vertical", "tab-1", "terminal");
  });

  it("does not show Close Split when split is inactive", async () => {
    const user = userEvent.setup();
    splitState.orientation = "none";
    splitState.splitTabId = null;

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    await screen.findByRole("menu");

    expect(screen.queryByText("Close Split")).not.toBeInTheDocument();
  });

  it("shows Close Split when split is active for this tab", async () => {
    const user = userEvent.setup();
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    expect(await screen.findByText("Close Split")).toBeInTheDocument();
  });

  it("calls closeSplit when Close Split is clicked", async () => {
    const user = userEvent.setup();
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    const closeSplitItem = await screen.findByText("Close Split");
    await user.click(closeSplitItem);

    expect(mockCloseSplit).toHaveBeenCalledTimes(1);
  });

  it("disables Split options when a split is already active for this tab", async () => {
    const user = userEvent.setup();
    splitState.orientation = "vertical";
    splitState.splitTabId = "tab-1";

    render(
      <TerminalContextMenu tabId="tab-1" onCopy={vi.fn()} onPaste={vi.fn()}>
        <div data-testid="terminal-child">terminal</div>
      </TerminalContextMenu>
    );

    await user.pointer({ target: screen.getByTestId("terminal-child"), keys: "[MouseRight]" });
    await screen.findByRole("menu");

    const splitVertical = screen.getByText("Split Vertical").closest('[role="menuitem"]');
    const splitHorizontal = screen.getByText("Split Horizontal").closest('[role="menuitem"]');

    expect(splitVertical).toHaveAttribute("data-disabled");
    expect(splitHorizontal).toHaveAttribute("data-disabled");
  });
});
