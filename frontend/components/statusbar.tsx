import {
  MemoryStick,
  Cpu,
  Database,
  HardDrive,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useSystemMetrics } from "@/hooks/use-system-metrics";
import { Sparkline } from "./sparkline";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function formatGb(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function usageColor(ratio: number): string {
  if (ratio > 0.9) return "bg-ctp-red";
  if (ratio > 0.75) return "bg-ctp-yellow";
  return "bg-ctp-overlay1";
}

function MiniProgressBar({
  used,
  total,
}: {
  used: number;
  total: number;
}) {
  const ratio = total > 0 ? used / total : 0;
  const pct = Math.min(ratio * 100, 100);

  return (
    <div className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-ctp-surface0">
      <div
        className={`h-full rounded-full transition-all ${usageColor(ratio)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Statusbar() {
  const { current, cpuHistory, rxHistory, txHistory } = useSystemMetrics();

  if (!current) {
    return (
      <div className="flex h-7 shrink-0 items-center border-t border-ctp-surface0 bg-ctp-base px-3 font-mono text-[13px] text-ctp-overlay1">
        Loading metrics...
      </div>
    );
  }

  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t border-ctp-surface0 bg-ctp-base px-3 font-mono text-[13px] text-ctp-overlay1">
      {/* Memory */}
      <div className="flex items-center gap-1.5">
        <MemoryStick className="h-3 w-3" strokeWidth={1.5} />
        <span>{formatGb(current.memory_used)}</span>
        <MiniProgressBar
          used={current.memory_used}
          total={current.memory_total}
        />
      </div>

      <span className="text-ctp-surface0">|</span>

      {/* CPU */}
      <div className="flex items-center gap-1.5">
        <Cpu className="h-3 w-3" strokeWidth={1.5} />
        <span>{formatPercent(current.cpu_usage)}</span>
        <Sparkline data={cpuHistory} />
      </div>

      <span className="text-ctp-surface0">|</span>

      {/* Swap */}
      {current.swap_total > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <Database className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatGb(current.swap_used)}</span>
            <MiniProgressBar
              used={current.swap_used}
              total={current.swap_total}
            />
          </div>
          <span className="text-ctp-surface0">|</span>
        </>
      )}

      {/* Disk */}
      <div className="flex items-center gap-1.5">
        <HardDrive className="h-3 w-3" strokeWidth={1.5} />
        <span>{formatGb(current.disk_used)}</span>
        <MiniProgressBar
          used={current.disk_used}
          total={current.disk_total}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Download */}
      <div className="flex items-center gap-1.5">
        <ArrowDown className="h-3 w-3" strokeWidth={1.5} />
        <span>{formatBytes(current.network_rx_rate)}/s</span>
        <Sparkline data={rxHistory} color="#a6e3a1" />
      </div>

      <span className="text-ctp-surface0">|</span>

      {/* Upload */}
      <div className="flex items-center gap-1.5">
        <Sparkline data={txHistory} color="#89b4fa" />
        <span>{formatBytes(current.network_tx_rate)}/s</span>
        <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
      </div>
    </div>
  );
}
