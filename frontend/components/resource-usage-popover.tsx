import { useState } from "react";
import { useAppMetrics } from "@/hooks/use-app-metrics";
import { invoke } from "@/lib/ipc";
import { formatBytes } from "@/lib/format";
import { Cpu, MemoryStick, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function ResourceUsagePopover() {
  const { current } = useAppMetrics();
  const [clearing, setClearing] = useState(false);

  if (!current) return null;

  const handleClearCache = async () => {
    setClearing(true);
    try {
      await invoke("app:clearCache");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-mono text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Resource usage"
        >
          <Cpu className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{`${current.total_cpu_percent.toFixed(1)}%`}</span>
          <MemoryStick className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{formatBytes(current.total_rss)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 border-none p-3">
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ctp-overlay0">
            Resource Usage
          </h4>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-ctp-overlay1">
              <Cpu className="h-3 w-3" strokeWidth={1.5} />
              CPU {current.total_cpu_percent.toFixed(1)}%
            </span>
            <span className="flex items-center gap-1 text-ctp-overlay1">
              <MemoryStick className="h-3 w-3" strokeWidth={1.5} />
              {formatBytes(current.total_rss)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ctp-text">Forja App</span>
              <span className="font-mono text-ctp-overlay1">{formatBytes(current.total_rss)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ctp-subtext0">Main</span>
              <span className="font-mono text-ctp-overlay1">{formatBytes(current.main_rss)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ctp-subtext0">Renderer</span>
              <span className="font-mono text-ctp-overlay1">{formatBytes(current.renderer_rss)}</span>
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className="border-t border-ctp-surface0 pt-2">
              <button
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text disabled:opacity-50"
                onClick={handleClearCache}
                disabled={clearing}
                aria-label="Clear cache"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                {clearing ? "Clearing..." : "Clear cache"}
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
