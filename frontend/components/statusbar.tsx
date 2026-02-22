import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MemoryStick, Cpu, Database, HardDrive, GitBranch, FileText } from "lucide-react";
import { useSystemMetrics } from "@/hooks/use-system-metrics";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useFileTreeStore } from "@/stores/file-tree";
import { Sparkline } from "./sparkline";
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

const LANGUAGE_DISPLAY: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript JSX",
  js: "JavaScript",
  jsx: "JavaScript JSX",
  py: "Python",
  rs: "Rust",
  go: "Go",
  rb: "Ruby",
  java: "Java",
  cpp: "C++",
  c: "C",
  cs: "C#",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  scala: "Scala",
  sh: "Shell",
  bash: "Bash",
  md: "Markdown",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  graphql: "GraphQL",
  vue: "Vue",
  svelte: "Svelte",
  dockerfile: "Dockerfile",
};

function getLanguageDisplay(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANGUAGE_DISPLAY[ext] || ext.toUpperCase() || "Plain Text";
}

function getLineCount(content: string): number {
  return content.split("\n").length;
}

const GIT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  M: { label: "Modified", color: "text-ctp-yellow" },
  A: { label: "Added", color: "text-ctp-green" },
  D: { label: "Deleted", color: "text-ctp-red" },
  R: { label: "Renamed", color: "text-ctp-blue" },
  C: { label: "Copied", color: "text-ctp-blue" },
  "??": { label: "Untracked", color: "text-ctp-overlay0" },
  AM: { label: "Added", color: "text-ctp-green" },
  MM: { label: "Modified", color: "text-ctp-yellow" },
};

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

  useEffect(() => {
    if (!currentPath) {
      setGitInfo(null);
      return;
    }

    const fetchGitInfo = () => {
      invoke<GitInfo>("get_git_info_command", { filePath: currentPath })
        .then(setGitInfo)
        .catch(() => setGitInfo(null));
    };

    fetchGitInfo();
    const interval = setInterval(fetchGitInfo, 5000);
    return () => clearInterval(interval);
  }, [currentPath]);

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

function FileInfoSection() {
  const { isOpen, currentFile, content } = useFilePreviewStore();
  const [fileStatus, setFileStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!currentFile) {
      setFileStatus(null);
      return;
    }

    invoke<GitInfo>("get_git_info_command", { filePath: currentFile })
      .then((info) => setFileStatus(info.fileStatus))
      .catch(() => setFileStatus(null));
  }, [currentFile]);

  if (!isOpen || !currentFile || !content) {
    return null;
  }

  const filename = currentFile.split("/").pop() || "";
  const language = getLanguageDisplay(filename);
  const lines = getLineCount(content.content);
  const statusEntry = fileStatus
    ? GIT_STATUS_LABELS[fileStatus] || {
        label: fileStatus,
        color: "text-ctp-overlay1",
      }
    : null;

  return (
    <>
      {/* Line count */}
      <div className="flex items-center gap-1">
        <FileText className="h-3 w-3" strokeWidth={1.5} />
        <span>
          {lines} {lines === 1 ? "line" : "lines"}
        </span>
      </div>

      <span className="text-ctp-surface0">|</span>

      {/* Encoding */}
      <span>UTF-8</span>

      <span className="text-ctp-surface0">|</span>

      {/* Language */}
      <span className="text-ctp-subtext0">{language}</span>

      {/* File git status */}
      {statusEntry && (
        <>
          <span className="text-ctp-surface0">|</span>
          <span className={statusEntry.color}>{statusEntry.label}</span>
        </>
      )}
    </>
  );
}

export function Statusbar() {
  const { current, cpuHistory } = useSystemMetrics();

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
          <div className="flex cursor-help items-center gap-1.5">
            <MemoryStick className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatGb(current.memory_used)}</span>
            <MiniProgressBar
              used={current.memory_used}
              total={current.memory_total}
            />
          </div>
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
          <div className="flex cursor-help items-center gap-1.5">
            <Cpu className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatPercent(current.cpu_usage)}</span>
            <Sparkline data={cpuHistory} />
          </div>
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
              <div className="flex cursor-help items-center gap-1.5">
                <Database className="h-3 w-3" strokeWidth={1.5} />
                <span>{formatGb(current.swap_used)}</span>
                <MiniProgressBar
                  used={current.swap_used}
                  total={current.swap_total}
                />
              </div>
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
          <div className="flex cursor-help items-center gap-1.5">
            <HardDrive className="h-3 w-3" strokeWidth={1.5} />
            <span>{formatGb(current.disk_used)}</span>
            <MiniProgressBar
              used={current.disk_used}
              total={current.disk_total}
            />
          </div>
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

      {/* Right side: file info (only when preview open) + git (always visible) */}
      <FileInfoSection />
      <GitSection />
    </div>
  );
}
