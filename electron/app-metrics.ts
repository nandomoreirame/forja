import { app } from "electron";
import type { WebContents } from "electron";

const INTERVAL_MS = 2000;
let appMetricsInterval: ReturnType<typeof setInterval> | null = null;

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

export function startAppMetricsLoop(getWindows: () => WebContents[]): void {
  if (appMetricsInterval) return;

  appMetricsInterval = setInterval(() => {
    const metrics = collectAppMetrics();
    const windows = getWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.send("app-metrics", metrics);
      }
    }
  }, INTERVAL_MS);
}

export function stopAppMetricsLoop(): void {
  if (appMetricsInterval) {
    clearInterval(appMetricsInterval);
    appMetricsInterval = null;
  }
}
