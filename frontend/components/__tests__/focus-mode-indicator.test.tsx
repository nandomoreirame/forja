import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusModeIndicator } from "../focus-mode-indicator";

const mockExitFocusMode = vi.fn();

vi.mock("@/stores/focus-mode", () => ({
  useFocusModeStore: Object.assign(
    (selector: (s: any) => any) =>
      selector({ exitFocusMode: mockExitFocusMode }),
    {
      getState: () => ({ exitFocusMode: mockExitFocusMode }),
    },
  ),
}));

describe("FocusModeIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the focus mode text", () => {
    render(<FocusModeIndicator />);
    expect(screen.getByText("Focus Mode")).toBeInTheDocument();
  });

  it("renders the exit shortcut hint", () => {
    render(<FocusModeIndicator />);
    expect(screen.getByText(/Ctrl\+Shift\+M/)).toBeInTheDocument();
  });

  it("calls exitFocusMode when clicked", async () => {
    const user = userEvent.setup();
    render(<FocusModeIndicator />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(mockExitFocusMode).toHaveBeenCalledOnce();
  });

  it("has accessible button role", () => {
    render(<FocusModeIndicator />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
