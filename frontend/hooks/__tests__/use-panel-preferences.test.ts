import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockInvoke = vi.fn();

vi.mock("@/lib/ipc", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe("usePanelPreferences", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("loads persisted panel sizes from ui preferences", async () => {
    mockInvoke.mockResolvedValueOnce({ sidebarSize: 33, previewSize: 27 });
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    expect(result.current.loaded).toBe(false);

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.panelSizes).toEqual({ sidebarSize: 33, previewSize: 27 });
    expect(mockInvoke).toHaveBeenCalledWith("get_ui_preferences");
  });

  it("falls back to defaults when loading preferences fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("boom"));
    const { DEFAULT_PANEL_SIZES, usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.panelSizes).toEqual(DEFAULT_PANEL_SIZES);
  });

  it("uses default panel sizes when no project is open", async () => {
    const { DEFAULT_PANEL_SIZES, getPanelSizesForLayout } = await import(
      "../use-panel-preferences"
    );

    expect(
      getPanelSizesForLayout(false, { sidebarSize: 35, previewSize: 22 })
    ).toEqual(DEFAULT_PANEL_SIZES);
  });

  it("loads sidebarOpen from persisted preferences", async () => {
    mockInvoke.mockResolvedValueOnce({ sidebarSize: 20, previewSize: 0, sidebarOpen: false });
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.sidebarOpen).toBe(false);
  });

  it("defaults sidebarOpen to true when not present in response", async () => {
    mockInvoke.mockResolvedValueOnce({ sidebarSize: 20, previewSize: 0 });
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.sidebarOpen).toBe(true);
  });

  it("saveSidebarOpen persists via IPC", async () => {
    mockInvoke
      .mockResolvedValueOnce({ sidebarSize: 20, previewSize: 0, sidebarOpen: true })
      .mockResolvedValueOnce(undefined);
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    result.current.saveSidebarOpen(false);

    expect(mockInvoke).toHaveBeenCalledWith("save_ui_preferences", { sidebarOpen: false });
  });
});
