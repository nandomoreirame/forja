import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewSessionDialog } from "../new-session-dialog";

describe("NewSessionDialog", () => {
  it("should not render when open is false", () => {
    render(
      <NewSessionDialog
        open={false}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={vi.fn()}
      />
    );

    expect(screen.queryByText(/New Session/i)).not.toBeInTheDocument();
  });

  it("should render when open is true", () => {
    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={vi.fn()}
      />
    );

    expect(screen.getByText("New Session")).toBeInTheDocument();
    expect(screen.getByText("Choose session type")).toBeInTheDocument();
  });

  it("should render Claude Code option", () => {
    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(
      screen.getByText("AI-assisted terminal with Claude Code")
    ).toBeInTheDocument();
  });

  it("should render Terminal option", () => {
    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Terminal")).toBeInTheDocument();
    expect(screen.getByText("Standard shell session")).toBeInTheDocument();
  });

  it("should call onSessionTypeSelect with 'claude-code' when Claude Code is clicked", async () => {
    const user = userEvent.setup();
    const onSessionTypeSelect = vi.fn();

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const claudeCodeButton = screen.getByRole("button", {
      name: "Claude Code session",
    });
    await user.click(claudeCodeButton);

    expect(onSessionTypeSelect).toHaveBeenCalledWith("claude-code");
    expect(onSessionTypeSelect).toHaveBeenCalledTimes(1);
  });

  it("should call onSessionTypeSelect with 'terminal' when Terminal is clicked", async () => {
    const user = userEvent.setup();
    const onSessionTypeSelect = vi.fn();

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const terminalButton = screen.getByRole("button", {
      name: "Terminal session",
    });
    await user.click(terminalButton);

    expect(onSessionTypeSelect).toHaveBeenCalledWith("terminal");
    expect(onSessionTypeSelect).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenChange with false when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={onOpenChange}
        onSessionTypeSelect={vi.fn()}
      />
    );

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
