import { app } from "electron";
import type { WebContents } from "electron";

const DEFAULT_INTERVAL_MS = 2000;
let appMetricsInterval: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;
let cachedGetWindows: (() => WebContents[]) | null = null;

export interface AppMetrics {
  total_rss: number;
  main_rss: number;
  renderer_rss: number;
  heap_used: number;
  heap_total: number;
  total_cpu_percent: number;
  main_cpu_percent: number;
  renderer_cpu_percent: number;
  process_count: number;
}

export function collectAppMetrics(): AppMetrics {
  const processMetrics = app.getAppMetrics();
  const mem = process.memoryUsage();

  let totalRss = 0;
  let mainRss = 0;
  let rendererRss = 0;
  let totalCpu = 0;
  let mainCpu = 0;
  let rendererCpu = 0;

  for (const pm of processMetrics) {
    // workingSetSize is in KB, convert to bytes
    const rssBytes = pm.memory.workingSetSize * 1024;
    totalRss += rssBytes;
    totalCpu += pm.cpu.percentCPUUsage;

    if (pm.type === "Browser") {
      mainCpu += pm.cpu.percentCPUUsage;
      mainRss += rssBytes;
    } else if (pm.type === "Tab") {
      rendererCpu += pm.cpu.percentCPUUsage;
      rendererRss += rssBytes;
    }
  }

  return {
    total_rss: totalRss,
    main_rss: mainRss,
    renderer_rss: rendererRss,
    heap_used: mem.heapUsed,
    heap_total: mem.heapTotal,
    total_cpu_percent: totalCpu,
    main_cpu_percent: mainCpu,
    renderer_cpu_percent: rendererCpu,
    process_count: processMetrics.length,
  };
}

export function startAppMetricsLoop(
  getWindows: () => WebContents[],
  isAnyWindowFocused?: () => boolean,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): void {
  if (appMetricsInterval) return;

  appMetricsInterval = setInterval(() => {
    if (isAnyWindowFocused && !isAnyWindowFocused()) return;

    const metrics = collectAppMetrics();
    const windows = getWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.send("app-metrics", metrics);
      }
    }
  }, intervalMs);
}

export function stopAppMetricsLoop(): void {
  if (appMetricsInterval) {
    clearInterval(appMetricsInterval);
    appMetricsInterval = null;
  }
}

/**
 * Registers a subscriber for app metrics. When the subscriber count goes from
 * 0 to 1, the metrics loop is started automatically. The getWindows callback
 * is stored so the loop knows which windows to broadcast to.
 */
export function registerMetricsSubscriber(getWindows: () => WebContents[], intervalMs?: number): void {
  cachedGetWindows = getWindows;
  subscriberCount = Math.max(0, subscriberCount) + 1;
  if (subscriberCount === 1) {
    startAppMetricsLoop(getWindows, undefined, intervalMs);
  }
}

/**
 * Unregisters a subscriber. When the subscriber count drops to 0, the metrics
 * loop is stopped automatically.
 */
export function unregisterMetricsSubscriber(): void {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0) {
    stopAppMetricsLoop();
  }
}

/**
 * Returns the current subscriber count (useful for testing and diagnostics).
 */
export function getSubscriberCount(): number {
  return subscriberCount;
}

/**
 * Resets subscriber state. Used internally for test isolation.
 * @internal
 */
export function _resetSubscriberState(): void {
  subscriberCount = 0;
  cachedGetWindows = null;
  stopAppMetricsLoop();
}
