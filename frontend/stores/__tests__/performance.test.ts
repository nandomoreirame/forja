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
      loaded: false,
      isLite: false,
    });
  });

  it("initializes with full mode defaults", () => {
    const state = usePerformanceStore.getState();
    expect(state.resolved).toBe("full");
    expect(state.loaded).toBe(false);
    expect(state.isLite).toBe(false);
  });

  it("loads performance mode from IPC", async () => {
    vi.mocked(invoke).mockResolvedValue({
      resolved: "lite",
    });

    await usePerformanceStore.getState().loadPerformanceMode();

    const state = usePerformanceStore.getState();
    expect(state.resolved).toBe("lite");
    expect(state.loaded).toBe(true);
    expect(invoke).toHaveBeenCalledWith("get_performance_mode");
  });

  it("exposes isLite computed value", async () => {
    vi.mocked(invoke).mockResolvedValue({
      resolved: "lite",
    });

    await usePerformanceStore.getState().loadPerformanceMode();
    expect(usePerformanceStore.getState().isLite).toBe(true);
  });

  it("sets isLite to false for full mode", async () => {
    vi.mocked(invoke).mockResolvedValue({
      resolved: "full",
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
    });

    it("toggles from lite back to full mode", () => {
      usePerformanceStore.setState({
        resolved: "lite",
        isLite: true,
      });

      usePerformanceStore.getState().toggleLiteMode();

      const state = usePerformanceStore.getState();
      expect(state.resolved).toBe("full");
      expect(state.isLite).toBe(false);
    });
  });
});
