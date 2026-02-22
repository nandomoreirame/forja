import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

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

const HISTORY_SIZE = 30;

export function useSystemMetrics() {
  const [current, setCurrent] = useState<SystemMetrics | null>(null);
  const cpuHistory = useRef<number[]>([]);
  const rxHistory = useRef<number[]>([]);
  const txHistory = useRef<number[]>([]);

  useEffect(() => {
    const unlisten = listen<SystemMetrics>("system-metrics", (event) => {
      const metrics = event.payload;
      setCurrent(metrics);

      cpuHistory.current = [
        ...cpuHistory.current.slice(-(HISTORY_SIZE - 1)),
        metrics.cpu_usage,
      ];
      rxHistory.current = [
        ...rxHistory.current.slice(-(HISTORY_SIZE - 1)),
        metrics.network_rx_rate,
      ];
      txHistory.current = [
        ...txHistory.current.slice(-(HISTORY_SIZE - 1)),
        metrics.network_tx_rate,
      ];
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return {
    current,
    cpuHistory: cpuHistory.current,
    rxHistory: rxHistory.current,
    txHistory: txHistory.current,
  };
}
