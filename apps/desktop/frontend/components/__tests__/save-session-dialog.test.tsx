import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SaveSessionDialog } from "../save-session-dialog";
import { useAppDialogsStore } from "@/stores/app-dialogs";

const tabs = [
  {
    id: "tab-1",
    name: "Claude Code",
    path: "/repo-a",
    isRunning: true,
    sessionType: "claude",
    customName: "Feature work",
  },
];

vi.mock("../cli-icon", () => ({
  CliIcon: ({ sessionType }: { sessionType: string }) => (
    <div data-testid="cli-icon">{sessionType}</div>
  ),
}));

vi.mock("@/stores/terminal-tabs", () => ({
  useTerminalTabsStore: (selector?: (state: { tabs: typeof tabs }) => unknown) => {
    const state = { tabs };
    return selector ? selector(state) : state;
  },
}));

describe("SaveSessionDialog", () => {
  beforeEach(() => {
    useAppDialogsStore.setState({
      shortcutsOpen: false,
      aboutOpen: false,
      settingsOpen: false,
      createWorkspaceOpen: false,
      createWorkspacePendingPath: null,
      createWorkspaceEditId: null,
      createWorkspaceInitialName: null,
      saveSessionOpen: true,
      saveSessionTabId: "tab-1",
      saveSessionResolve: vi.fn(),
    });
  });

  it("renders tab information and actions", () => {
    render(<SaveSessionDialog />);

    expect(screen.getByText("Save session before closing?")).toBeInTheDocument();
    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText('"Feature work"')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save & Close" })).toBeInTheDocument();
  });

  it("resolves with save when Save & Close is clicked", async () => {
    const user = userEvent.setup();
    const closeSaveSessionDialog = vi.spyOn(
      useAppDialogsStore.getState(),
      "closeSaveSessionDialog",
    );

    render(<SaveSessionDialog />);
    await user.click(screen.getByRole("button", { name: "Save & Close" }));

    expect(closeSaveSessionDialog).toHaveBeenCalledWith("save");
  });

  it("resolves with close when Close is clicked", async () => {
    const user = userEvent.setup();
    const closeSaveSessionDialog = vi.spyOn(
      useAppDialogsStore.getState(),
      "closeSaveSessionDialog",
    );

    render(<SaveSessionDialog />);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(closeSaveSessionDialog).toHaveBeenCalledWith("close");
  });

  it("resolves with cancel when Escape is pressed", async () => {
    const user = userEvent.setup();
    const closeSaveSessionDialog = vi.spyOn(
      useAppDialogsStore.getState(),
      "closeSaveSessionDialog",
    );

    render(<SaveSessionDialog />);
    await user.keyboard("{Escape}");

    expect(closeSaveSessionDialog).toHaveBeenCalledWith("cancel");
  });

  it("resolves with save when Enter is pressed", async () => {
    const user = userEvent.setup();
    const closeSaveSessionDialog = vi.spyOn(
      useAppDialogsStore.getState(),
      "closeSaveSessionDialog",
    );

    render(<SaveSessionDialog />);
    await user.keyboard("{Enter}");

    expect(closeSaveSessionDialog).toHaveBeenCalledWith("save");
  });
});
