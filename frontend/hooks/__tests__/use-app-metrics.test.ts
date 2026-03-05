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

describe("useAppMetrics", () => {
  beforeEach(() => {
    capturedCallbacks = {};
    vi.clearAllMocks();
  });

  it("returns null metrics initially", async () => {
    const { useAppMetrics } = await import("../use-app-metrics");
    const { result } = renderHook(() => useAppMetrics());

    expect(result.current.current).toBeNull();
    expect(result.current.rssHistory).toEqual([]);
    expect(result.current.cpuHistory).toEqual([]);
  });

  it("updates current metrics on app-metrics event", async () => {
    const { useAppMetrics } = await import("../use-app-metrics");
    const { result } = renderHook(() => useAppMetrics());

    const mockMetrics = {
      total_rss: 150 * 1024 * 1024,
      main_rss: 60 * 1024 * 1024,
      renderer_rss: 90 * 1024 * 1024,
      heap_used: 98 * 1024 * 1024,
      heap_total: 128 * 1024 * 1024,
      total_cpu_percent: 12.5,
      main_cpu_percent: 5.0,
      renderer_cpu_percent: 7.5,
      process_count: 3,
    };

    act(() => {
      capturedCallbacks["app-metrics"]?.({ payload: mockMetrics });
    });

    expect(result.current.current).toEqual(mockMetrics);
    expect(result.current.rssHistory).toContain(150 * 1024 * 1024);
    expect(result.current.cpuHistory).toContain(12.5);
  });

  it("appends to history on multiple events", async () => {
    const { useAppMetrics } = await import("../use-app-metrics");
    const { result } = renderHook(() => useAppMetrics());

    const base = {
      main_rss: 0,
      renderer_rss: 0,
      heap_used: 0,
      heap_total: 0,
      main_cpu_percent: 0,
      renderer_cpu_percent: 0,
      process_count: 1,
    };

    act(() => {
      capturedCallbacks["app-metrics"]?.({ payload: { ...base, total_rss: 100, total_cpu_percent: 10 } });
      capturedCallbacks["app-metrics"]?.({ payload: { ...base, total_rss: 200, total_cpu_percent: 20 } });
      capturedCallbacks["app-metrics"]?.({ payload: { ...base, total_rss: 300, total_cpu_percent: 30 } });
    });

    expect(result.current.rssHistory).toEqual([100, 200, 300]);
    expect(result.current.cpuHistory).toEqual([10, 20, 30]);
    expect(result.current.historyVersion).toBe(3);
  });

  it("limits history to 30 samples (ring buffer)", async () => {
    const { useAppMetrics } = await import("../use-app-metrics");
    const { result } = renderHook(() => useAppMetrics());

    const base = {
      main_rss: 0,
      renderer_rss: 0,
      heap_used: 0,
      heap_total: 0,
      main_cpu_percent: 0,
      renderer_cpu_percent: 0,
      process_count: 1,
    };

    act(() => {
      for (let i = 0; i < 35; i++) {
        capturedCallbacks["app-metrics"]?.({ payload: { ...base, total_rss: i, total_cpu_percent: i } });
      }
    });

    expect(result.current.rssHistory).toHaveLength(30);
    expect(result.current.cpuHistory).toHaveLength(30);
    // First 5 should have been dropped
    expect(result.current.rssHistory[0]).toBe(5);
    expect(result.current.rssHistory[29]).toBe(34);
  });
});
