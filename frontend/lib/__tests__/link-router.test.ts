import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeLinkClick } from "../link-router";

vi.mock("@/lib/ipc", () => ({
  openUrl: vi.fn(),
}));

const tilingActions = {
  addBlock: vi.fn(),
};

vi.mock("@/stores/tiling-layout", () => ({
  useTilingLayoutStore: {
    getState: () => tilingActions,
  },
}));

describe("routeLinkClick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds browser block for localhost URL", () => {
    routeLinkClick("http://localhost:3000/app");

    expect(tilingActions.addBlock).toHaveBeenCalledWith(
      { type: "browser", url: "http://localhost:3000/app" },
      undefined,
      expect.stringContaining("browser-"),
    );
  });

  it("adds browser block for 127.0.0.1 URL", () => {
    routeLinkClick("http://127.0.0.1:5173");

    expect(tilingActions.addBlock).toHaveBeenCalledWith(
      { type: "browser", url: "http://127.0.0.1:5173" },
      undefined,
      expect.stringContaining("browser-"),
    );
  });

  it("opens external URL in system browser", async () => {
    const { openUrl } = await import("@/lib/ipc");

    routeLinkClick("https://example.com");

    expect(openUrl).toHaveBeenCalledWith("https://example.com");
    expect(tilingActions.addBlock).not.toHaveBeenCalled();
  });

  it("opens github URL in system browser", async () => {
    const { openUrl } = await import("@/lib/ipc");

    routeLinkClick("https://github.com/repo");

    expect(openUrl).toHaveBeenCalledWith("https://github.com/repo");
  });

  it("does not open non-http URLs", async () => {
    const { openUrl } = await import("@/lib/ipc");

    routeLinkClick("javascript:alert(1)");

    expect(openUrl).not.toHaveBeenCalled();
    expect(tilingActions.addBlock).not.toHaveBeenCalled();
  });
});
