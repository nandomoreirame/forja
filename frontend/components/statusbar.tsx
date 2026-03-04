import { useCallback, useEffect, useState } from "react";
import { invoke, listen, getCurrentWindow, isDev as isDevIpc } from "@/lib/ipc";
import { MemoryStick, Cpu, Database, HardDrive, GitBranch } from "lucide-react";
import { useSystemMetrics } from "@/hooks/use-system-metrics";
import { useFileTreeStore } from "@/stores/file-tree";
import { useUserSettingsStore } from "@/stores/user-settings";
import { Sparkline } from "./sparkline";
import { DevMetrics } from "./dev-metrics";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "./ui/hover-card";

function formatGb(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
}

function formatGbDetailed(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

interface GitInfo {
  isGitRepo: boolean;
  branch: string | null;
  fileStatus: string | null;
  changedFiles: number;
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

function GitSection() {
  const currentPath = useFileTreeStore((s) => s.currentPath);
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);

  const fetchGitInfo = useCallback(() => {
    if (!currentPath) return;
    invoke<GitInfo>("get_git_info_command", { filePath: currentPath })
      .then(setGitInfo)
      .catch(() => setGitInfo(null));
  }, [currentPath]);

  // Start watcher and poll as fallback (30s)
  useEffect(() => {
    if (!currentPath) {
      setGitInfo(null);
      return;
    }

    fetchGitInfo();
    const windowLabel = getCurrentWindow().label;
    invoke("start_watcher", { path: currentPath, windowLabel }).catch((err) => console.warn("[statusbar] Watcher IPC failed:", err));
    const interval = setInterval(fetchGitInfo, 30000);
    return () => {
      clearInterval(interval);
      invoke("stop_watcher", { windowLabel }).catch((err) => console.warn("[statusbar] Watcher IPC failed:", err));
    };
  }, [currentPath, fetchGitInfo]);

  // Listen for git:changed events from file watcher
  useEffect(() => {
    const unlisten = listen("git:changed", () => {
      fetchGitInfo();
    });
    return () => {
      unlisten.then((fn) => fn()).catch((err) => console.warn("[statusbar] Cleanup unlisten failed:", err));
    };
  }, [fetchGitInfo]);

  if (!gitInfo?.isGitRepo) {
    return null;
  }

  return (
    <>
      <span className="text-ctp-surface0">|</span>

      <div className="flex items-center gap-1">
        <GitBranch className="h-3 w-3" strokeWidth={1.5} />
        <span className="text-ctp-subtext0">{gitInfo.branch}</span>
      </div>

      {gitInfo.changedFiles > 0 && (
        <span className="text-ctp-yellow">+{gitInfo.changedFiles}</span>
      )}
    </>
  );
}

export function Statusbar() {
  const statusbarVisible = useUserSettingsStore((s) => s.settings.statusbar.visible);
  const { current, cpuHistory } = useSystemMetrics();
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    isDevIpc().then(setDevMode).catch(() => setDevMode(false));
  }, []);

  if (!statusbarVisible) return null;

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
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label="Memory usage details"
            className="flex cursor-help items-center gap-1.5 rounded px-1 focus-visible:ring-1 focus-visible:ring-brand"
          >
            <MemoryStick className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatGb(current.memory_used)}</span>
            <MiniProgressBar
              used={current.memory_used}
              total={current.memory_total}
            />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          className="w-56 border-ctp-surface0 bg-ctp-mantle p-3 text-xs text-ctp-text"
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-ctp-text">Memory</p>
            <div className="space-y-0.5 text-ctp-subtext1">
              <div className="flex justify-between">
                <span>Used:</span>
                <span className="font-mono text-ctp-text">
                  {formatGbDetailed(current.memory_used)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-mono text-ctp-text">
                  {formatGbDetailed(current.memory_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Usage:</span>
                <span className="font-mono text-ctp-text">
                  {formatPercent(
                    (current.memory_used / current.memory_total) * 100
                  )}
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      <span className="text-ctp-surface0">|</span>

      {/* CPU */}
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label="CPU usage details"
            className="flex cursor-help items-center gap-1.5 rounded px-1 focus-visible:ring-1 focus-visible:ring-brand"
          >
            <Cpu className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatPercent(current.cpu_usage)}</span>
            <Sparkline data={cpuHistory} />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          className="w-56 border-ctp-surface0 bg-ctp-mantle p-3 text-xs text-ctp-text"
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-ctp-text">CPU Usage</p>
            <div className="space-y-0.5 text-ctp-subtext1">
              <div className="flex justify-between">
                <span>Current:</span>
                <span className="font-mono text-ctp-text">
                  {current.cpu_usage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      <span className="text-ctp-surface0">|</span>

      {/* Swap */}
      {current.swap_total > 0 && (
        <>
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                aria-label="Swap usage details"
                className="flex cursor-help items-center gap-1.5 rounded px-1 focus-visible:ring-1 focus-visible:ring-brand"
              >
                <Database className="h-3 w-3" strokeWidth={1.5} />
                <span>{formatGb(current.swap_used)}</span>
                <MiniProgressBar
                  used={current.swap_used}
                  total={current.swap_total}
                />
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              className="w-56 border-ctp-surface0 bg-ctp-mantle p-3 text-xs text-ctp-text"
            >
              <div className="space-y-1.5">
                <p className="font-semibold text-ctp-text">Swap</p>
                <div className="space-y-0.5 text-ctp-subtext1">
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span className="font-mono text-ctp-text">
                      {formatGbDetailed(current.swap_used)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-mono text-ctp-text">
                      {formatGbDetailed(current.swap_total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span>
                    <span className="font-mono text-ctp-text">
                      {formatPercent(
                        (current.swap_used / current.swap_total) * 100
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
          <span className="text-ctp-surface0">|</span>
        </>
      )}

      {/* Disk */}
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label="Disk usage details"
            className="flex cursor-help items-center gap-1.5 rounded px-1 focus-visible:ring-1 focus-visible:ring-brand"
          >
            <HardDrive className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatGb(current.disk_used)}</span>
            <MiniProgressBar
              used={current.disk_used}
              total={current.disk_total}
            />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          className="w-56 border-ctp-surface0 bg-ctp-mantle p-3 text-xs text-ctp-text"
        >
          <div className="space-y-1.5">
            <p className="font-semibold text-ctp-text">Disk</p>
            <div className="space-y-0.5 text-ctp-subtext1">
              <div className="flex justify-between">
                <span>Used:</span>
                <span className="font-mono text-ctp-text">
                  {formatGbDetailed(current.disk_used)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-mono text-ctp-text">
                  {formatGbDetailed(current.disk_total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Free:</span>
                <span className="font-mono text-ctp-text">
                  {formatGbDetailed(current.disk_total - current.disk_used)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Usage:</span>
                <span className="font-mono text-ctp-text">
                  {formatPercent(
                    (current.disk_used / current.disk_total) * 100
                  )}
                </span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: dev metrics + git info */}
      {devMode && <DevMetrics />}
      <GitSection />
    </div>
  );
}
