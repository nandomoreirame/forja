import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewSessionDialog } from "../new-session-dialog";
import type { CliDefinition } from "@/lib/cli-registry";

const mockUseInstalledClis = vi.fn();

vi.mock("@/hooks/use-installed-clis", () => ({
  useInstalledClis: () => mockUseInstalledClis(),
}));

const claudeCliDef: CliDefinition = {
  id: "claude",
  displayName: "Claude Code",
  binary: "claude",
  description: "AI-assisted coding with Anthropic Claude",
  iconColor: "text-brand",
  icon: "/images/claude.svg",
};

const geminiCliDef: CliDefinition = {
  id: "gemini",
  displayName: "Gemini CLI",
  binary: "gemini",
  description: "AI-assisted coding with Google Gemini",
  iconColor: "text-ctp-blue",
  icon: "/images/gemini.svg",
};

describe("NewSessionDialog", () => {
  beforeEach(() => {
    // Default: loading done, claude installed
    mockUseInstalledClis.mockReturnValue({
      installedClis: [claudeCliDef],
      loading: false,
    });
  });

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

  it("should show loading spinner while detecting CLIs", () => {
    mockUseInstalledClis.mockReturnValue({ installedClis: [], loading: true });

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={vi.fn()}
      />
    );

    // Loading state: spinner shown, no session buttons
    expect(screen.queryByRole("button", { name: /session/i })).not.toBeInTheDocument();
  });

  it("should render Claude Code option when installed", () => {
    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Claude Code")).toBeInTheDocument();
    expect(screen.getByText("AI-assisted coding with Anthropic Claude")).toBeInTheDocument();
  });

  it("should always render Terminal option", () => {
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

  it("should call onSessionTypeSelect with 'claude' when Claude Code is clicked", async () => {
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

    expect(onSessionTypeSelect).toHaveBeenCalledWith("claude");
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

  it("should call onSessionTypeSelect with 'gemini' when Gemini CLI is clicked", async () => {
    mockUseInstalledClis.mockReturnValue({
      installedClis: [claudeCliDef, geminiCliDef],
      loading: false,
    });

    const user = userEvent.setup();
    const onSessionTypeSelect = vi.fn();

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={onSessionTypeSelect}
      />
    );

    const geminiButton = screen.getByRole("button", {
      name: "Gemini CLI session",
    });
    await user.click(geminiButton);

    expect(onSessionTypeSelect).toHaveBeenCalledWith("gemini");
  });

  it("should show no-CLI message when no CLIs are installed", () => {
    mockUseInstalledClis.mockReturnValue({ installedClis: [], loading: false });

    render(
      <NewSessionDialog
        open={true}
        onOpenChange={vi.fn()}
        onSessionTypeSelect={vi.fn()}
      />
    );

    expect(
      screen.getByText(/No AI CLI tools detected/i)
    ).toBeInTheDocument();
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
