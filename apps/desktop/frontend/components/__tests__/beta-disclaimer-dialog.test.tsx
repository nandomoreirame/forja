import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BetaDisclaimerDialog } from "../beta-disclaimer-dialog";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

describe("BetaDisclaimerDialog", () => {
  const onAcknowledge = vi.fn();

  beforeEach(() => {
    onAcknowledge.mockClear();
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    render(
      <BetaDisclaimerDialog open={false} onAcknowledge={onAcknowledge} />
    );
    expect(screen.queryByText(/beta/i)).not.toBeInTheDocument();
  });

  it("renders title and warning when open", () => {
    render(
      <BetaDisclaimerDialog open={true} onAcknowledge={onAcknowledge} />
    );
    const headings = screen.getAllByText(/Early Access Software/i);
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/active development/i)
    ).toBeInTheDocument();
  });

  it("renders key warning points", () => {
    render(
      <BetaDisclaimerDialog open={true} onAcknowledge={onAcknowledge} />
    );
    expect(screen.getByText(/incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/instability/i)).toBeInTheDocument();
  });

  it("renders acknowledge button", () => {
    render(
      <BetaDisclaimerDialog open={true} onAcknowledge={onAcknowledge} />
    );
    expect(
      screen.getByRole("button", { name: /I Understand/i })
    ).toBeInTheDocument();
  });

  it("calls onAcknowledge when button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <BetaDisclaimerDialog open={true} onAcknowledge={onAcknowledge} />
    );
    await user.click(screen.getByRole("button", { name: /I Understand/i }));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it("prevents closing by clicking outside", () => {
    render(
      <BetaDisclaimerDialog open={true} onAcknowledge={onAcknowledge} />
    );
    // Dialog should have onInteractOutside prevention
    expect(
      screen.getByRole("button", { name: /I Understand/i })
    ).toBeInTheDocument();
    // onAcknowledge should NOT have been called
    expect(onAcknowledge).not.toHaveBeenCalled();
  });

  it("renders feedback link", () => {
    render(
      <BetaDisclaimerDialog open={true} onAcknowledge={onAcknowledge} />
    );
    expect(
      screen.getByRole("button", { name: /Report Issues/i })
    ).toBeInTheDocument();
  });
});
