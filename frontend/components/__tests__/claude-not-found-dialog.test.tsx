import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClaudeNotFoundDialog } from "../claude-not-found-dialog";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

describe("ClaudeNotFoundDialog", () => {
  const onResolved = vi.fn();

  beforeEach(() => {
    onResolved.mockClear();
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    render(<ClaudeNotFoundDialog open={false} onResolved={onResolved} />);
    expect(
      screen.queryByText("Claude Code CLI not found")
    ).not.toBeInTheDocument();
  });

  it("renders title and description when open", () => {
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);
    const headings = screen.getAllByRole("heading", { name: /Claude Code CLI not found/i });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/could not be found in your system PATH/i)
    ).toBeInTheDocument();
  });

  it("renders installation instructions", () => {
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);
    expect(screen.getByText("npm install -g @anthropic-ai/claude-code")).toBeInTheDocument();
  });

  it("renders Try Again button", () => {
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("renders installation docs link", () => {
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);
    expect(
      screen.getByRole("button", { name: /installation guide/i })
    ).toBeInTheDocument();
  });

  it("calls check_claude_installed on Try Again click", async () => {
    const { invoke } = await import("@/lib/ipc");
    (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("not found")
    );

    const user = userEvent.setup();
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainBtn);

    expect(invoke).toHaveBeenCalledWith("check_claude_installed");
  });

  it("calls onResolved when claude is found on retry", async () => {
    const { invoke } = await import("@/lib/ipc");
    (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(
      "/usr/local/bin/claude"
    );

    const user = userEvent.setup();
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainBtn);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalled();
    });
  });

  it("shows error message when retry fails", async () => {
    const { invoke } = await import("@/lib/ipc");
    (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("still not found")
    );

    const user = userEvent.setup();
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    await user.click(tryAgainBtn);

    await waitFor(() => {
      expect(screen.getByText(/still not found/i)).toBeInTheDocument();
    });
    expect(onResolved).not.toHaveBeenCalled();
  });

  it("opens external URL when installation guide is clicked", async () => {
    const { openUrl } = await import("@/lib/ipc");
    const user = userEvent.setup();
    render(<ClaudeNotFoundDialog open={true} onResolved={onResolved} />);

    const docsBtn = screen.getByRole("button", { name: /installation guide/i });
    await user.click(docsBtn);

    expect(openUrl).toHaveBeenCalled();
  });
});
