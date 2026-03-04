import si from "systeminformation";
import type { WebContents } from "electron";

const INTERVAL_MS = 2000;
let metricsInterval: ReturnType<typeof setInterval> | null = null;

interface NetworkState {
  rxBytes: number;
  txBytes: number;
  lastTime: number;
}

let prevNetwork: NetworkState | null = null;

export interface SystemMetrics {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  swap_used: number;
  swap_total: number;
  disk_used: number;
  disk_total: number;
  network_rx_rate: number;
  network_tx_rate: number;
}

export function startMetricsLoop(getWindows: () => WebContents[]): void {
  if (metricsInterval) return;

  metricsInterval = setInterval(async () => {
    try {
      const metrics = await collectMetrics();
      const windows = getWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.send("system-metrics", metrics);
        }
      }
    } catch {
      // ignore transient errors
    }
  }, INTERVAL_MS);
}

export function stopMetricsLoop(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}

async function collectMetrics(): Promise<SystemMetrics> {
  const [cpuLoad, mem, disks, networkStats] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
  ]);

  const cpuUsage = cpuLoad.currentLoad ?? 0;

  const memUsed = mem.used ?? 0;
  const memTotal = mem.total ?? 0;
  const swapUsed = mem.swapused ?? 0;
  const swapTotal = mem.swaptotal ?? 0;

  let diskUsed = 0;
  let diskTotal = 0;
  if (disks.length > 0) {
    const main = disks.find((d) => d.mount === "/") ?? disks[0];
    diskUsed = main.used ?? 0;
    diskTotal = main.size ?? 0;
  }

  let rxRate = 0;
  let txRate = 0;

  if (networkStats.length > 0) {
    const totalRx = networkStats.reduce((s, n) => s + (n.rx_bytes ?? 0), 0);
    const totalTx = networkStats.reduce((s, n) => s + (n.tx_bytes ?? 0), 0);
    const now = Date.now();

    if (prevNetwork) {
      const elapsed = (now - prevNetwork.lastTime) / 1000;
      if (elapsed > 0) {
        rxRate = Math.max(0, (totalRx - prevNetwork.rxBytes) / elapsed);
        txRate = Math.max(0, (totalTx - prevNetwork.txBytes) / elapsed);
      }
    }

    prevNetwork = { rxBytes: totalRx, txBytes: totalTx, lastTime: now };
  }

  return {
    cpu_usage: cpuUsage,
    memory_used: memUsed,
    memory_total: memTotal,
    swap_used: swapUsed,
    swap_total: swapTotal,
    disk_used: diskUsed,
    disk_total: diskTotal,
    network_rx_rate: rxRate,
    network_tx_rate: txRate,
  };
}
