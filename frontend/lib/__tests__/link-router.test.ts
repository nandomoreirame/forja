import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeLinkClick } from "../link-router";
import { useBrowserPaneStore } from "@/stores/browser-pane";

vi.mock("@/lib/ipc", () => ({
  openUrl: vi.fn(),
}));

describe("routeLinkClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBrowserPaneStore.setState({
      isOpen: false,
      url: "http://localhost:3000",
      committedUrl: "http://localhost:3000",
    });
  });

  it("navigates browser pane for localhost URL", async () => {
    const navigateToUrl = vi.spyOn(
      useBrowserPaneStore.getState(),
      "navigateToUrl"
    );

    routeLinkClick("http://localhost:3000/app");

    expect(navigateToUrl).toHaveBeenCalledWith("http://localhost:3000/app");
  });

  it("navigates browser pane for 127.0.0.1 URL", async () => {
    const navigateToUrl = vi.spyOn(
      useBrowserPaneStore.getState(),
      "navigateToUrl"
    );

    routeLinkClick("http://127.0.0.1:5173");

    expect(navigateToUrl).toHaveBeenCalledWith("http://127.0.0.1:5173");
  });

  it("ignores external URL (does not open in browser)", async () => {
    const { openUrl } = await import("@/lib/ipc");
    const navigateToUrl = vi.spyOn(
      useBrowserPaneStore.getState(),
      "navigateToUrl"
    );

    routeLinkClick("https://example.com");

    expect(openUrl).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it("ignores github URL (does not open in browser)", async () => {
    const { openUrl } = await import("@/lib/ipc");
    const navigateToUrl = vi.spyOn(
      useBrowserPaneStore.getState(),
      "navigateToUrl"
    );

    routeLinkClick("https://github.com/repo");

    expect(openUrl).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();
  });
});
