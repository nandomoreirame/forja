import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock electron's app module
vi.mock("electron", () => ({
  app: {
    getAppMetrics: vi.fn(),
  },
}));

describe("app-metrics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("collectAppMetrics", () => {
    it("returns the correct shape with aggregated process data", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 5.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 100 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
        {
          pid: 2,
          type: "Tab",
          creationTime: 0,
          cpu: { percentCPUUsage: 8.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 50 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { collectAppMetrics } = await import("../app-metrics");
      const result = collectAppMetrics();

      expect(result).toEqual({
        total_rss: (100 + 50) * 1024 * 1024,
        heap_used: expect.any(Number),
        heap_total: expect.any(Number),
        total_cpu_percent: 13.0,
        main_cpu_percent: 5.0,
        renderer_cpu_percent: 8.0,
        main_rss: 100 * 1024 * 1024,
        renderer_rss: 50 * 1024 * 1024,
        process_count: 2,
      });
    });

    it("converts workingSetSize from KB to bytes", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 200 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { collectAppMetrics } = await import("../app-metrics");
      const result = collectAppMetrics();

      // workingSetSize is in KB, total_rss should be in bytes
      expect(result.total_rss).toBe(200 * 1024 * 1024);
    });

    it("accumulates per-process RSS for main and renderer", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 80 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
        {
          pid: 2,
          type: "Tab",
          creationTime: 0,
          cpu: { percentCPUUsage: 0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 120 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
        {
          pid: 3,
          type: "Tab",
          creationTime: 0,
          cpu: { percentCPUUsage: 0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 30 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
        {
          pid: 4,
          type: "GPU",
          creationTime: 0,
          cpu: { percentCPUUsage: 0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 50 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { collectAppMetrics } = await import("../app-metrics");
      const result = collectAppMetrics();

      expect(result.main_rss).toBe(80 * 1024 * 1024);
      expect(result.renderer_rss).toBe((120 + 30) * 1024 * 1024);
      expect(result.total_rss).toBe((80 + 120 + 30 + 50) * 1024 * 1024);
    });

    it("separates main (Browser) and renderer (Tab) CPU", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 3.5, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 0, privateBytes: 0, sharedBytes: 0 },
        },
        {
          pid: 2,
          type: "Tab",
          creationTime: 0,
          cpu: { percentCPUUsage: 7.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 0, privateBytes: 0, sharedBytes: 0 },
        },
        {
          pid: 3,
          type: "Tab",
          creationTime: 0,
          cpu: { percentCPUUsage: 2.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 0, privateBytes: 0, sharedBytes: 0 },
        },
        {
          pid: 4,
          type: "GPU",
          creationTime: 0,
          cpu: { percentCPUUsage: 1.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 0, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { collectAppMetrics } = await import("../app-metrics");
      const result = collectAppMetrics();

      expect(result.main_cpu_percent).toBe(3.5);
      expect(result.renderer_cpu_percent).toBe(9.0); // 7.0 + 2.0
      expect(result.total_cpu_percent).toBe(13.5); // 3.5 + 7.0 + 2.0 + 1.0
      expect(result.process_count).toBe(4);
    });

    it("returns heap_used and heap_total from process.memoryUsage", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { collectAppMetrics } = await import("../app-metrics");
      const result = collectAppMetrics();

      // heap values come from process.memoryUsage() - should be positive numbers
      expect(result.heap_used).toBeGreaterThan(0);
      expect(result.heap_total).toBeGreaterThan(0);
      expect(result.heap_used).toBeLessThanOrEqual(result.heap_total);
    });
  });

  describe("startAppMetricsLoop / stopAppMetricsLoop", () => {
    it("sends app-metrics events to all windows at interval", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 2.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 50 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      startAppMetricsLoop(getWindows);

      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledWith("app-metrics", expect.objectContaining({
        total_rss: expect.any(Number),
        process_count: 1,
      }));

      stopAppMetricsLoop();
    });

    it("does not send to destroyed windows", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => true };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      startAppMetricsLoop(getWindows);
      vi.advanceTimersByTime(2000);

      expect(mockSend).not.toHaveBeenCalled();

      stopAppMetricsLoop();
    });

    it("stopAppMetricsLoop clears the interval", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      startAppMetricsLoop(getWindows);
      stopAppMetricsLoop();

      vi.advanceTimersByTime(4000);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("does not start a second loop if already running", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      startAppMetricsLoop(getWindows);
      startAppMetricsLoop(getWindows); // second call should be no-op

      vi.advanceTimersByTime(2000);
      // Should only send once per tick, not twice
      expect(mockSend).toHaveBeenCalledTimes(1);

      stopAppMetricsLoop();
    });

    it("collects metrics only once per interval even with multiple windows", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 1.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 10 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const firstWindow = { send: vi.fn(), isDestroyed: () => false };
      const secondWindow = { send: vi.fn(), isDestroyed: () => false };

      startAppMetricsLoop(
        () =>
          [
            firstWindow as unknown as Electron.WebContents,
            secondWindow as unknown as Electron.WebContents,
          ],
      );

      vi.advanceTimersByTime(2000);

      expect(app.getAppMetrics).toHaveBeenCalledTimes(1);
      expect(firstWindow.send).toHaveBeenCalledTimes(1);
      expect(secondWindow.send).toHaveBeenCalledTimes(1);

      stopAppMetricsLoop();
    });
  });

  describe("registerMetricsSubscriber / unregisterMetricsSubscriber", () => {
    it("starts the loop when subscriber count goes from 0 to 1", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 1.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 10 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { registerMetricsSubscriber, unregisterMetricsSubscriber } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      // No subscriber yet — loop should not run
      vi.advanceTimersByTime(2000);
      expect(mockSend).not.toHaveBeenCalled();

      // Register first subscriber — loop should start
      registerMetricsSubscriber(getWindows);

      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledWith("app-metrics", expect.objectContaining({
        process_count: 1,
      }));

      unregisterMetricsSubscriber();
    });

    it("stops the loop when subscriber count drops to 0", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { registerMetricsSubscriber, unregisterMetricsSubscriber } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      registerMetricsSubscriber(getWindows);

      // Loop is running — advance one tick
      vi.advanceTimersByTime(2000);
      const callCountAfterStart = mockSend.mock.calls.length;

      // Unregister — loop should stop
      unregisterMetricsSubscriber();

      // Advance more time — no more calls
      vi.advanceTimersByTime(4000);
      expect(mockSend.mock.calls.length).toBe(callCountAfterStart);
    });

    it("does not drop subscriberCount below 0", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { registerMetricsSubscriber, unregisterMetricsSubscriber } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      // Unregister more than register — should not crash
      unregisterMetricsSubscriber();
      unregisterMetricsSubscriber();

      // Register one — loop should start (count goes from 0 to 1)
      registerMetricsSubscriber(getWindows);

      vi.advanceTimersByTime(2000);
      // Loop should work because count is 1 not negative
      expect(mockSend).toHaveBeenCalledTimes(1);

      unregisterMetricsSubscriber();
    });

    it("keeps loop running while at least one subscriber is active", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { registerMetricsSubscriber, unregisterMetricsSubscriber } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      registerMetricsSubscriber(getWindows);
      registerMetricsSubscriber(getWindows); // 2 subscribers

      unregisterMetricsSubscriber(); // back to 1

      // Loop should still be running
      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledTimes(1);

      unregisterMetricsSubscriber(); // back to 0 — loop stops

      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledTimes(1); // no new calls
    });

    it("resumes loop when subscriber re-registers after stopping", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 1.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 10 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { registerMetricsSubscriber, unregisterMetricsSubscriber } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      registerMetricsSubscriber(getWindows);
      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledTimes(1);

      unregisterMetricsSubscriber(); // stop
      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledTimes(1); // still 1

      registerMetricsSubscriber(getWindows); // restart
      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledTimes(2); // resumes

      unregisterMetricsSubscriber();
    });
  });

  describe("startAppMetricsLoop with isAnyWindowFocused callback", () => {
    it("skips metrics collection when isAnyWindowFocused returns false", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];
      const isAnyWindowFocused = vi.fn().mockReturnValue(false);

      startAppMetricsLoop(getWindows, isAnyWindowFocused);
      vi.advanceTimersByTime(2000);

      // collectAppMetrics calls app.getAppMetrics internally — it must NOT be called
      expect(app.getAppMetrics).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();

      stopAppMetricsLoop();
    });

    it("collects and sends metrics when isAnyWindowFocused returns true", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 2.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 50 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];
      const isAnyWindowFocused = vi.fn().mockReturnValue(true);

      startAppMetricsLoop(getWindows, isAnyWindowFocused);
      vi.advanceTimersByTime(2000);

      expect(app.getAppMetrics).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith("app-metrics", expect.objectContaining({
        process_count: 1,
      }));

      stopAppMetricsLoop();
    });

    it("collects metrics when isAnyWindowFocused is not provided (backwards compatible)", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 1.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 10 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      // No isAnyWindowFocused provided — should behave as before
      startAppMetricsLoop(getWindows);
      vi.advanceTimersByTime(2000);

      expect(app.getAppMetrics).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalledWith("app-metrics", expect.objectContaining({
        process_count: 1,
      }));

      stopAppMetricsLoop();
    });

    it("resumes collecting when window regains focus", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([
        {
          pid: 1,
          type: "Browser",
          creationTime: 0,
          cpu: { percentCPUUsage: 1.0, idleWakeupsPerSecond: 0 },
          memory: { workingSetSize: 10 * 1024, privateBytes: 0, sharedBytes: 0 },
        },
      ] as Electron.ProcessMetric[]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const mockSend = vi.fn();
      const mockWebContents = { send: mockSend, isDestroyed: () => false };
      const getWindows = () => [mockWebContents as unknown as Electron.WebContents];

      let focused = false;
      const isAnyWindowFocused = vi.fn().mockImplementation(() => focused);

      startAppMetricsLoop(getWindows, isAnyWindowFocused);

      // First tick: window not focused — skip
      vi.advanceTimersByTime(2000);
      expect(mockSend).not.toHaveBeenCalled();

      // Window gains focus
      focused = true;

      // Second tick: window focused — collect and send
      vi.advanceTimersByTime(2000);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith("app-metrics", expect.objectContaining({
        process_count: 1,
      }));

      stopAppMetricsLoop();
    });

    it("does not call getWindows or app metrics work while unfocused", async () => {
      const { app } = await import("electron");
      vi.mocked(app.getAppMetrics).mockReturnValue([]);

      const { startAppMetricsLoop, stopAppMetricsLoop } = await import("../app-metrics");

      const getWindows = vi.fn(() => []);
      const isAnyWindowFocused = vi.fn().mockReturnValue(false);

      startAppMetricsLoop(getWindows, isAnyWindowFocused);

      vi.advanceTimersByTime(4000);

      expect(isAnyWindowFocused).toHaveBeenCalledTimes(2);
      expect(app.getAppMetrics).not.toHaveBeenCalled();
      expect(getWindows).not.toHaveBeenCalled();

      stopAppMetricsLoop();
    });
  });
});
