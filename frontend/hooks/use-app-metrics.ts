import { useEffect, useRef, useState } from "react";
import { listen } from "@/lib/ipc";

export interface AppMetrics {
  total_rss: number;
  heap_used: number;
  heap_total: number;
  total_cpu_percent: number;
  main_cpu_percent: number;
  renderer_cpu_percent: number;
  process_count: number;
}

const HISTORY_SIZE = 30;

function pushToRing(arr: number[], value: number) {
  if (arr.length >= HISTORY_SIZE) arr.shift();
  arr.push(value);
}

export function useAppMetrics() {
  const [current, setCurrent] = useState<AppMetrics | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const rssHistory = useRef<number[]>([]);
  const cpuHistory = useRef<number[]>([]);

  useEffect(() => {
    const unlisten = listen<AppMetrics>("app-metrics", (event) => {
      const metrics = event.payload;
      setCurrent(metrics);

      pushToRing(rssHistory.current, metrics.total_rss);
      pushToRing(cpuHistory.current, metrics.total_cpu_percent);

      setHistoryVersion((v) => v + 1);
    });

    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[use-app-metrics] Cleanup unlisten failed:", err));
    };
  }, []);

  return {
    current,
    rssHistory: rssHistory.current,
    cpuHistory: cpuHistory.current,
    historyVersion,
  };
}
