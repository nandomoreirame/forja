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

function pushToRing(arr: number[], value: number) {
  if (arr.length >= HISTORY_SIZE) arr.shift();
  arr.push(value);
}

export function useSystemMetrics() {
  const [current, setCurrent] = useState<SystemMetrics | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const cpuHistory = useRef<number[]>([]);
  const rxHistory = useRef<number[]>([]);
  const txHistory = useRef<number[]>([]);

  useEffect(() => {
    const unlisten = listen<SystemMetrics>("system-metrics", (event) => {
      const metrics = event.payload;
      setCurrent(metrics);

      pushToRing(cpuHistory.current, metrics.cpu_usage);
      pushToRing(rxHistory.current, metrics.network_rx_rate);
      pushToRing(txHistory.current, metrics.network_tx_rate);

      setHistoryVersion((v) => v + 1);
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
    historyVersion,
  };
}
