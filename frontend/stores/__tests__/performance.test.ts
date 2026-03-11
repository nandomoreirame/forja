import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ipc", () => ({
  invoke: vi.fn(),
  listen: vi.fn(() => () => {}),
}));

import { invoke } from "@/lib/ipc";
import { usePerformanceStore } from "../performance";

describe("performance store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePerformanceStore.setState({
      resolved: "full",
      tabHibernation: false,
      tabHibernationTimeoutMs: 0,
      loaded: false,
      isLite: false,
    });
  });

  it("initializes with full mode defaults", () => {
    const state = usePerformanceStore.getState();
    expect(state.resolved).toBe("full");
    expect(state.tabHibernation).toBe(false);
    expect(state.tabHibernationTimeoutMs).toBe(0);
    expect(state.loaded).toBe(false);
    expect(state.isLite).toBe(false);
  });

  it("loads performance mode from IPC", async () => {
    vi.mocked(invoke).mockResolvedValue({
      resolved: "lite",
      tabHibernation: true,
      tabHibernationTimeoutMs: 60000,
    });

    await usePerformanceStore.getState().loadPerformanceMode();

    const state = usePerformanceStore.getState();
    expect(state.resolved).toBe("lite");
    expect(state.tabHibernation).toBe(true);
    expect(state.tabHibernationTimeoutMs).toBe(60000);
    expect(state.loaded).toBe(true);
    expect(invoke).toHaveBeenCalledWith("get_performance_mode");
  });

  it("exposes isLite computed value", async () => {
    vi.mocked(invoke).mockResolvedValue({
      resolved: "lite",
      tabHibernation: true,
      tabHibernationTimeoutMs: 60000,
    });

    await usePerformanceStore.getState().loadPerformanceMode();
    expect(usePerformanceStore.getState().isLite).toBe(true);
  });

  it("sets isLite to false for full mode", async () => {
    vi.mocked(invoke).mockResolvedValue({
      resolved: "full",
      tabHibernation: false,
      tabHibernationTimeoutMs: 0,
    });

    await usePerformanceStore.getState().loadPerformanceMode();
    expect(usePerformanceStore.getState().isLite).toBe(false);
  });

  it("sets loaded to true even on IPC error", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("IPC failed"));

    await usePerformanceStore.getState().loadPerformanceMode();

    const state = usePerformanceStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.resolved).toBe("full");
  });

  describe("toggleLiteMode", () => {
    it("toggles from full to lite mode", () => {
      usePerformanceStore.getState().toggleLiteMode();

      const state = usePerformanceStore.getState();
      expect(state.resolved).toBe("lite");
      expect(state.isLite).toBe(true);
      expect(state.tabHibernation).toBe(true);
      expect(state.tabHibernationTimeoutMs).toBe(60_000);
    });

    it("toggles from lite back to full mode", () => {
      usePerformanceStore.setState({
        resolved: "lite",
        isLite: true,
        tabHibernation: true,
        tabHibernationTimeoutMs: 60_000,
      });

      usePerformanceStore.getState().toggleLiteMode();

      const state = usePerformanceStore.getState();
      expect(state.resolved).toBe("full");
      expect(state.isLite).toBe(false);
      expect(state.tabHibernation).toBe(false);
      expect(state.tabHibernationTimeoutMs).toBe(0);
    });
  });
});
