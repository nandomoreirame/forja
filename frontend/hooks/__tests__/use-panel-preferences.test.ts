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
    mockInvoke.mockResolvedValueOnce({
      sidebarSize: 33,
      previewSize: 27,
      terminalSplitEnabled: true,
      terminalSplitOrientation: "horizontal",
      terminalSplitRatio: 62,
    });
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    expect(result.current.loaded).toBe(false);

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.panelSizes).toEqual({ sidebarSize: 33, previewSize: 27, rightPanelWidth: 400 });
    expect(result.current.terminalSplit).toEqual({
      enabled: true,
      orientation: "horizontal",
      ratio: 62,
    });
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

  it("loads terminal split defaults when fields are not persisted", async () => {
    mockInvoke.mockResolvedValueOnce({ sidebarSize: 20, previewSize: 0, sidebarOpen: true });
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.terminalSplit).toEqual({
      enabled: false,
      orientation: "vertical",
      ratio: 50,
    });
  });

  it("saveTerminalSplit persists terminal split fields via IPC", async () => {
    mockInvoke
      .mockResolvedValueOnce({ sidebarSize: 20, previewSize: 0, sidebarOpen: true })
      .mockResolvedValueOnce(undefined);
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    result.current.saveTerminalSplit({
      enabled: true,
      orientation: "horizontal",
      ratio: 70,
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_ui_preferences", {
      terminalSplitEnabled: true,
      terminalSplitOrientation: "horizontal",
      terminalSplitRatio: 70,
    });
  });

  // Bug 2: Right panel width persistence
  it("loads persisted rightPanelWidth from ui preferences", async () => {
    mockInvoke.mockResolvedValueOnce({
      sidebarSize: 20,
      previewSize: 0,
      rightPanelWidth: 520,
    });
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.panelSizes.rightPanelWidth).toBe(520);
  });

  it("defaults rightPanelWidth to 400 when not present in persisted preferences", async () => {
    mockInvoke.mockResolvedValueOnce({ sidebarSize: 20, previewSize: 0 });
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    // Should fall back to the default of 400px, not undefined
    expect(result.current.panelSizes.rightPanelWidth).toBe(400);
  });

  it("savePanelSize with rightPanelWidth persists via IPC", async () => {
    mockInvoke
      .mockResolvedValueOnce({ sidebarSize: 20, previewSize: 0, rightPanelWidth: 400 })
      .mockResolvedValueOnce(undefined);
    const { usePanelPreferences } = await import("../use-panel-preferences");

    const { result } = renderHook(() => usePanelPreferences());

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    result.current.savePanelSize("rightPanelWidth", 480);

    expect(mockInvoke).toHaveBeenCalledWith("save_ui_preferences", { rightPanelWidth: 480 });
  });
});
