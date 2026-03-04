import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

type ListenCallback = (event: { payload: unknown }) => void;
let capturedCallbacks: Record<string, ListenCallback> = {};

vi.mock("@/lib/ipc", () => ({
  listen: vi.fn((event: string, cb: ListenCallback) => {
    capturedCallbacks[event] = cb;
    return Promise.resolve(() => {});
  }),
}));

describe("useSystemMetrics", () => {
  beforeEach(() => {
    capturedCallbacks = {};
    vi.clearAllMocks();
  });

  it("returns null metrics initially", async () => {
    const { useSystemMetrics } = await import("../use-system-metrics");
    const { result } = renderHook(() => useSystemMetrics());

    expect(result.current.current).toBeNull();
    expect(result.current.cpuHistory).toEqual([]);
    expect(result.current.rxHistory).toEqual([]);
    expect(result.current.txHistory).toEqual([]);
  });

  it("updates current metrics on system-metrics event", async () => {
    const { useSystemMetrics } = await import("../use-system-metrics");
    const { result } = renderHook(() => useSystemMetrics());

    const mockMetrics = {
      cpu_usage: 45.5,
      memory_used: 8 * 1024 * 1024 * 1024,
      memory_total: 16 * 1024 * 1024 * 1024,
      swap_used: 0,
      swap_total: 0,
      disk_used: 100 * 1024 * 1024 * 1024,
      disk_total: 500 * 1024 * 1024 * 1024,
      network_rx_rate: 1024,
      network_tx_rate: 512,
    };

    act(() => {
      capturedCallbacks["system-metrics"]?.({ payload: mockMetrics });
    });

    expect(result.current.current).toEqual(mockMetrics);
    expect(result.current.cpuHistory).toContain(45.5);
    expect(result.current.rxHistory).toContain(1024);
    expect(result.current.txHistory).toContain(512);
  });

  it("appends to history on multiple events", async () => {
    const { useSystemMetrics } = await import("../use-system-metrics");
    const { result } = renderHook(() => useSystemMetrics());

    const base = {
      memory_used: 0,
      memory_total: 0,
      swap_used: 0,
      swap_total: 0,
      disk_used: 0,
      disk_total: 0,
      network_rx_rate: 0,
      network_tx_rate: 0,
    };

    act(() => {
      capturedCallbacks["system-metrics"]?.({ payload: { ...base, cpu_usage: 10 } });
      capturedCallbacks["system-metrics"]?.({ payload: { ...base, cpu_usage: 20 } });
      capturedCallbacks["system-metrics"]?.({ payload: { ...base, cpu_usage: 30 } });
    });

    expect(result.current.cpuHistory).toEqual([10, 20, 30]);
    expect(result.current.historyVersion).toBe(3);
  });
});
