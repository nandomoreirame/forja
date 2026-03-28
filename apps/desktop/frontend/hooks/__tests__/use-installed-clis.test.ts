import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInstalledClis } from "../use-installed-clis";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("useInstalledClis", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("starts with loading true and empty list", () => {
    mockInvoke.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useInstalledClis());
    expect(result.current.loading).toBe(true);
    expect(result.current.installedClis).toEqual([]);
  });

  it("returns installed CLIs after detection", async () => {
    mockInvoke.mockResolvedValue({
      claude: true,
      gemini: false,
      codex: true,
      "cursor-agent": false,
      "gh-copilot": false,
    });

    const { result } = renderHook(() => useInstalledClis());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.installedClis).toHaveLength(2);
    expect(result.current.installedClis.map((c) => c.id)).toEqual(["claude", "codex"]);
  });

  it("returns gh-copilot when installed", async () => {
    mockInvoke.mockResolvedValue({
      claude: false,
      gemini: false,
      codex: false,
      "cursor-agent": false,
      "gh-copilot": true,
    });

    const { result } = renderHook(() => useInstalledClis());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.installedClis).toHaveLength(1);
    expect(result.current.installedClis.map((c) => c.id)).toContain("gh-copilot");
  });

  it("returns empty list on error", async () => {
    mockInvoke.mockRejectedValue(new Error("IPC failed"));

    const { result } = renderHook(() => useInstalledClis());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.installedClis).toEqual([]);
  });

  it("calls detect_installed_clis with all CLI IDs", async () => {
    mockInvoke.mockResolvedValue({});

    renderHook(() => useInstalledClis());

    expect(mockInvoke).toHaveBeenCalledWith("detect_installed_clis", {
      cliIds: ["claude", "codex", "gemini", "cursor-agent", "gh-copilot"],
    });
  });
});
