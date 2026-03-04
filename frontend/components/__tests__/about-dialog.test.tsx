import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AboutDialog } from "../about-dialog";

vi.mock("@/lib/ipc", () => ({
  getName: vi.fn().mockResolvedValue("Forja"),
  getVersion: vi.fn().mockResolvedValue(__APP_VERSION__),
  getElectronVersion: vi.fn().mockResolvedValue("32.0.0"),
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

describe("AboutDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    vi.clearAllMocks();
  });

  it("does not render when open is false", () => {
    render(<AboutDialog open={false} onOpenChange={onOpenChange} />);
    expect(screen.queryByText("Forja")).not.toBeInTheDocument();
  });

  describe("home view", () => {
    it("renders app name and subtitle", async () => {
      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Forja")).toBeInTheDocument();
      });
      expect(
        screen.getByText("A dedicated desktop client for Claude Code")
      ).toBeInTheDocument();
    });

    it("shows Forja when Electron returns generic app name", async () => {
      const { getName } = await import("@/lib/ipc");
      vi.mocked(getName).mockResolvedValueOnce("Electron");

      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Forja")).toBeInTheDocument();
      });
      expect(screen.queryByText("Electron")).not.toBeInTheDocument();
    });

    it("renders version badge", async () => {
      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText(__APP_VERSION__)).toBeInTheDocument();
      });
    });

    it("shows package.json version below description", async () => {
      const { getVersion } = await import("@/lib/ipc");
      vi.mocked(getVersion).mockResolvedValueOnce("32.3.3");

      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText(__APP_VERSION__)).toBeInTheDocument();
      });
      expect(screen.queryByText("32.3.3")).not.toBeInTheDocument();
    });

    it("renders all four menu items", async () => {
      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(screen.getByText("Details")).toBeInTheDocument();
      });
      expect(screen.getByText("Send feedback")).toBeInTheDocument();
      expect(screen.getByText("Credits")).toBeInTheDocument();
      expect(screen.getByText("Legal info")).toBeInTheDocument();
    });
  });

  describe("details view", () => {
    it("navigates to details when Details is clicked", async () => {
      const user = userEvent.setup();
      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      const detailsItem = await screen.findByText("Details");
      await user.click(detailsItem);

      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Version")).toBeInTheDocument();
      expect(screen.getByText("Electron Version")).toBeInTheDocument();
      expect(screen.getByText("OS")).toBeInTheDocument();
      expect(screen.getByText("Platform")).toBeInTheDocument();
    });

    it("shows package.json version in Details version row", async () => {
      const user = userEvent.setup();
      const { getVersion, getElectronVersion } = await import("@/lib/ipc");
      vi.mocked(getVersion).mockResolvedValueOnce("32.3.3");
      vi.mocked(getElectronVersion).mockResolvedValueOnce("32.3.3");

      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      const detailsItem = await screen.findByText("Details");
      await user.click(detailsItem);

      await waitFor(() => {
        expect(screen.getByText("Version")).toBeInTheDocument();
      });
      expect(screen.getByText(__APP_VERSION__)).toBeInTheDocument();
    });

    it("returns to home when back button is clicked", async () => {
      const user = userEvent.setup();
      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      const detailsItem = await screen.findByText("Details");
      await user.click(detailsItem);

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      expect(
        screen.getByText("A dedicated desktop client for Claude Code")
      ).toBeInTheDocument();
    });
  });

  describe("credits view", () => {
    it("navigates to credits when Credits is clicked", async () => {
      const user = userEvent.setup();
      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      const creditsItem = await screen.findByText("Credits");
      await user.click(creditsItem);

      expect(screen.getByText("Created by")).toBeInTheDocument();
      expect(screen.getByText("Fernando Moreira")).toBeInTheDocument();
      expect(screen.getByText("Built with")).toBeInTheDocument();
    });
  });

  describe("legal view", () => {
    it("navigates to legal info when Legal info is clicked", async () => {
      const user = userEvent.setup();
      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      const legalItem = await screen.findByText("Legal info");
      await user.click(legalItem);

      expect(screen.getByText(/Copyright/)).toBeInTheDocument();
      expect(screen.getByText(/MIT License/)).toBeInTheDocument();
    });
  });

  describe("send feedback", () => {
    it("opens external URL when Send feedback is clicked", async () => {
      const user = userEvent.setup();
      const { openUrl } = await import("@/lib/ipc");

      render(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      const feedbackItem = await screen.findByText("Send feedback");
      await user.click(feedbackItem);

      expect(openUrl).toHaveBeenCalledWith(
        "https://github.com/nandomoreirame/forja/issues"
      );
    });
  });

  describe("dialog reset", () => {
    it("resets to home view when dialog is closed and reopened", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <AboutDialog open={true} onOpenChange={onOpenChange} />
      );

      const detailsItem = await screen.findByText("Details");
      await user.click(detailsItem);

      expect(screen.getByText("Version")).toBeInTheDocument();

      rerender(<AboutDialog open={false} onOpenChange={onOpenChange} />);
      rerender(<AboutDialog open={true} onOpenChange={onOpenChange} />);

      await waitFor(() => {
        expect(
          screen.getByText("A dedicated desktop client for Claude Code")
        ).toBeInTheDocument();
      });
    });
  });
});
