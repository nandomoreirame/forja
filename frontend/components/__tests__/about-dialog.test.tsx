import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AboutDialog } from "../about-dialog";

vi.mock("@tauri-apps/api/app", () => ({
  getName: vi.fn().mockResolvedValue("Forja"),
  getVersion: vi.fn().mockResolvedValue("0.1.0"),
  getTauriVersion: vi.fn().mockResolvedValue("2.5.0"),
}));

describe("AboutDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
  });

  it("renders app name in dialog title", async () => {
    render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText("Forja")).toBeInTheDocument();
    });
  });

  it("renders version info", async () => {
    render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText(/Version:/)).toBeInTheDocument();
      expect(screen.getByText(/0\.1\.0/)).toBeInTheDocument();
    });
  });

  it("renders Tauri version", async () => {
    render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText(/Tauri:/)).toBeInTheDocument();
      expect(screen.getByText(/2\.5\.0/)).toBeInTheDocument();
    });
  });

  it("renders OS info", async () => {
    render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText(/OS:/)).toBeInTheDocument();
    });
  });

  it("calls onOpenChange(false) when Ok button is clicked", async () => {
    const user = userEvent.setup();
    render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

    const okButton = await screen.findByRole("button", { name: "Ok" });
    await user.click(okButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("copies info to clipboard and shows feedback when Copy is clicked", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

    const copyButton = await screen.findByRole("button", { name: /copy/i });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Version: 0.1.0")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Tauri: 2.5.0")
    );

    await waitFor(() => {
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });
  });

  it("does not render when open is false", () => {
    render(<AboutDialog open={false} onOpenChange={onOpenChange} />);

    expect(screen.queryByText("Forja")).not.toBeInTheDocument();
  });
});
