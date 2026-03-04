import { Cpu, MemoryStick, Layers } from "lucide-react";
import { useAppMetrics } from "@/hooks/use-app-metrics";
import { Sparkline } from "./sparkline";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "./ui/hover-card";

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function formatMbDetailed(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DevMetrics() {
  const { current, rssHistory, cpuHistory } = useAppMetrics();

  if (!current) return null;

  const heapUsedMb = Math.round(current.heap_used / (1024 * 1024));
  const heapTotalMb = Math.round(current.heap_total / (1024 * 1024));
  const heapRatio = current.heap_total > 0 ? current.heap_used / current.heap_total : 0;
  const cpuRounded = Math.round(current.total_cpu_percent);

  const heapColor = heapRatio > 0.85 ? "text-ctp-red" : "text-ctp-peach";
  const cpuColor = current.total_cpu_percent > 50 ? "text-ctp-red" : "text-ctp-peach";

  return (
    <div className="flex items-center gap-2 border-l-2 border-ctp-peach pl-2">
      <span className="rounded bg-ctp-peach/20 px-1 text-[10px] font-bold text-ctp-peach">
        DEV
      </span>

      {/* RSS */}
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label="App memory usage details"
            className="flex cursor-help items-center gap-1 rounded px-0.5 text-ctp-peach focus-visible:ring-1 focus-visible:ring-brand"
          >
            <MemoryStick className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatMb(current.total_rss)}</span>
            <Sparkline data={rssHistory} color="#fab387" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          className="w-60 border-ctp-surface0 bg-ctp-mantle p-3 text-xs text-ctp-text"
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-ctp-peach">App Memory</p>
            <div className="space-y-0.5 text-ctp-subtext1">
              <div className="flex justify-between">
                <span>RSS (total):</span>
                <span className="font-mono text-ctp-text">
                  {formatMbDetailed(current.total_rss)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Heap used:</span>
                <span className={`font-mono ${heapColor}`}>
                  {formatMbDetailed(current.heap_used)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Heap total:</span>
                <span className="font-mono text-ctp-text">
                  {formatMbDetailed(current.heap_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Heap usage:</span>
                <span className={`font-mono ${heapColor}`}>
                  {Math.round(heapRatio * 100)}%
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Heap */}
      <span className={heapColor}>{heapUsedMb}/{heapTotalMb}MB</span>

      {/* CPU */}
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label="App CPU usage details"
            className={`flex cursor-help items-center gap-1 rounded px-0.5 focus-visible:ring-1 focus-visible:ring-brand ${cpuColor}`}
          >
            <Cpu className="h-3 w-3" strokeWidth={1.5} />
            <span>{cpuRounded}%</span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          className="w-60 border-ctp-surface0 bg-ctp-mantle p-3 text-xs text-ctp-text"
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-ctp-peach">App CPU</p>
            <div className="space-y-0.5 text-ctp-subtext1">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className={`font-mono ${cpuColor}`}>
                  {current.total_cpu_percent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Main process:</span>
                <span className="font-mono text-ctp-text">
                  {current.main_cpu_percent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Renderers:</span>
                <span className="font-mono text-ctp-text">
                  {current.renderer_cpu_percent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Processes:</span>
                <span className="font-mono text-ctp-text">
                  {current.process_count}
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Process count */}
      <span className="flex items-center gap-0.5 text-ctp-overlay1">
        <Layers className="h-3 w-3" strokeWidth={1.5} />
        {current.process_count}
      </span>
    </div>
  );
}
