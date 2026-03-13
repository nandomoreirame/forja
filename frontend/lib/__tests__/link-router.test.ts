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

  it("opens external URL in system browser", async () => {
    const { openUrl } = await import("@/lib/ipc");
    const navigateToUrl = vi.spyOn(
      useBrowserPaneStore.getState(),
      "navigateToUrl"
    );

    routeLinkClick("https://example.com");

    expect(openUrl).toHaveBeenCalledWith("https://example.com");
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it("opens github URL in system browser", async () => {
    const { openUrl } = await import("@/lib/ipc");

    routeLinkClick("https://github.com/repo");

    expect(openUrl).toHaveBeenCalledWith("https://github.com/repo");
  });

  it("does not open non-http URLs", async () => {
    const { openUrl } = await import("@/lib/ipc");
    const navigateToUrl = vi.spyOn(
      useBrowserPaneStore.getState(),
      "navigateToUrl"
    );

    routeLinkClick("javascript:alert(1)");

    expect(openUrl).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();
  });
});
