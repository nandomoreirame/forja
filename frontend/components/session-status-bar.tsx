import { invoke } from "@/lib/ipc";
import { CLI_REGISTRY, type SessionType } from "@/lib/cli-registry";
import { useSessionStateStore } from "@/stores/session-state";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useWsBridgeStore } from "@/stores/ws-bridge";
import { memo, useEffect, useState } from "react";
import { Radio } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface SessionStatusBarProps {
  tabId: string;
  path: string;
  sessionType: SessionType;
}

interface GitInfo {
  branch: string;
  modified_count: number;
}

interface HostInfo {
  hostname: string;
  username: string;
}

function formatElapsed(createdAt: number | undefined): string | null {
  if (!createdAt) return null;
  const diff = Math.floor((Date.now() - createdAt) / 1000);
  if (diff < 60) return "<1m";
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes > 0 ? `${minutes}m` : ""}`;
  return `${minutes}m`;
}

function formatStartTime(createdAt: number | undefined): string | null {
  if (!createdAt) return null;
  return new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function shortenPath(fullPath: string, username: string | null): string {
  if (!username) return fullPath;
  const homeDir = `/home/${username}`;
  if (fullPath.startsWith(homeDir)) {
    return `~${fullPath.slice(homeDir.length)}`;
  }
  return fullPath;
}

function Separator() {
  return <span className="text-ctp-surface1">|</span>;
}

/**
 * Converts a raw model ID (e.g. "claude-opus-4-6") into a friendly display
 * name (e.g. "Opus 4.6"). Falls back to the raw ID for unknown formats.
 */
function formatModelName(modelId: string): string {
  // Pattern: claude-<family>-<major>-<minor>
  const match = modelId.match(/^claude-(\w+)-(\d+)-(\d+)/);
  if (match) {
    const family = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    return `${family} ${match[2]}.${match[3]}`;
  }
  return modelId;
}

const SESSION_STATE_STYLES: Record<string, string> = {
  idle: "text-ctp-overlay1",
  thinking: "text-ctp-yellow",
  ready: "text-ctp-green",
  exited: "text-ctp-overlay0",
};

const SESSION_STATE_DESCRIPTIONS: Record<string, string> = {
  idle: "Waiting for input",
  thinking: "Processing response",
  ready: "Ready for input",
  exited: "Session ended",
};

interface StatusItemProps {
  tooltip: string;
  children: React.ReactNode;
  className?: string;
}

function StatusItem({ tooltip, children, className }: StatusItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export const SessionStatusBar = memo(function SessionStatusBar({
  tabId,
  path,
  sessionType,
}: SessionStatusBarProps) {
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [rawModelId, setRawModelId] = useState<string | null>(null);
  const sessionState = useSessionStateStore((s) => s.getState(tabId));
  const tab = useTerminalTabsStore((s) => s.tabs.find((t: { id: string }) => t.id === tabId));
  const wsBridgeRunning = useWsBridgeStore((s) => s.running);
  const wsBridgePort = useWsBridgeStore((s) => s.port);
  const wsBridgeClients = useWsBridgeStore((s) => s.clients);

  const isTerminal = sessionType === "terminal";
  const isAiCli = !isTerminal;

  // Fetch git info
  useEffect(() => {
    let cancelled = false;
    invoke<GitInfo>("get_git_info_command", { path }).then((info) => {
      if (!cancelled && info) setGitInfo(info);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [path]);

  // Fetch host info (only for terminal sessions)
  useEffect(() => {
    if (!isTerminal) return;
    let cancelled = false;
    invoke<HostInfo>("get_session_host_info").then((info) => {
      if (!cancelled && info) setHostInfo(info);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [isTerminal]);

  // Elapsed time ticker (only for AI sessions)
  useEffect(() => {
    if (!isAiCli || !tab?.createdAt) return;
    setElapsed(formatElapsed(tab.createdAt));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(tab.createdAt));
    }, 60_000);
    return () => clearInterval(interval);
  }, [isAiCli, tab?.createdAt]);

  // Fetch model name (only for AI sessions with a detected session ID).
  // Re-fetches when sessionState changes — the JSONL may not have an
  // assistant message yet when the session ID is first detected, but it
  // will once the CLI starts responding (state → "thinking").
  useEffect(() => {
    if (!isAiCli || !tab?.cliSessionId || modelName) return;
    let cancelled = false;
    invoke<string | null>("get_session_model", {
      cliId: sessionType,
      projectPath: path,
      sessionId: tab.cliSessionId,
    }).then((model) => {
      if (!cancelled && model) {
        setRawModelId(model);
        setModelName(formatModelName(model));
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [isAiCli, sessionType, path, tab?.cliSessionId, sessionState, modelName]);

  // Derive pane command from tab's customName (set by terminal-session polling)
  const derivedPaneCommand = tab?.tmuxSessionName ? (tab?.customName || null) : null;

  const projectName = path.split("/").pop() ?? path;
  const branchDisplay = gitInfo
    ? `${gitInfo.branch}${gitInfo.modified_count > 0 ? "*" : ""}`
    : null;

  const cliDef = isAiCli ? CLI_REGISTRY[sessionType as keyof typeof CLI_REGISTRY] : null;
  const startTime = formatStartTime(tab?.createdAt);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-9 shrink-0 items-center gap-3 border-t border-ctp-surface0 bg-ctp-mantle px-3 font-sans text-app-xs text-ctp-overlay1">
        {/* Left side: session/PTY context */}
        {isAiCli && (
          <>
            <StatusItem
              tooltip={`AI CLI: ${cliDef?.displayName ?? sessionType}`}
              className={cliDef?.iconColor ?? "text-ctp-overlay1"}
            >
              {cliDef?.displayName ?? sessionType}
            </StatusItem>
            {modelName && (
              <>
                <Separator />
                <StatusItem
                  tooltip={`Model: ${rawModelId ?? modelName}`}
                  className="text-ctp-subtext0"
                >
                  {modelName}
                </StatusItem>
              </>
            )}
            <Separator />
            <StatusItem
              tooltip={`State: ${SESSION_STATE_DESCRIPTIONS[sessionState] ?? sessionState}`}
              className={SESSION_STATE_STYLES[sessionState] ?? "text-ctp-overlay1"}
            >
              {sessionState}
            </StatusItem>
            {tab?.cliSessionId && (
              <>
                <Separator />
                <StatusItem tooltip={`Session: ${tab.cliSessionId}`}>
                  {tab.cliSessionId.slice(0, 8)}
                </StatusItem>
              </>
            )}
            {elapsed && (
              <>
                <Separator />
                <StatusItem tooltip={`Started at ${startTime}`}>
                  {elapsed}
                </StatusItem>
              </>
            )}
          </>
        )}

        {isTerminal && (
          <>
            {tab?.tmuxSessionName && (
              <>
                <StatusItem
                  tooltip="Persistent terminal (tmux)"
                  className="text-ctp-green text-[10px] font-medium"
                >
                  {derivedPaneCommand ?? "Terminal"}
                </StatusItem>
                <Separator />
              </>
            )}
            {hostInfo && (
              <StatusItem tooltip={`Host: ${hostInfo.hostname}`}>
                {hostInfo.username}@{hostInfo.hostname}
              </StatusItem>
            )}
            {hostInfo ? <Separator /> : null}
            <StatusItem tooltip={path}>
              {shortenPath(path, hostInfo?.username ?? null)}
            </StatusItem>
          </>
        )}

        {/* Right side: WS bridge indicator + git info */}
        <div className={`flex items-center gap-3 ${branchDisplay ? "" : "ml-auto"}`}>
          {wsBridgeRunning && (
            <>
              {branchDisplay && <Separator />}
              <StatusItem
                tooltip={`Remote Server running on port ${wsBridgePort}${wsBridgeClients > 0 ? ` · ${wsBridgeClients} client${wsBridgeClients !== 1 ? "s" : ""}` : ""}`}
                className="flex items-center gap-1 text-ctp-green"
              >
                <Radio className="h-3 w-3" strokeWidth={1.5} />
                <span>{wsBridgePort}</span>
                {wsBridgeClients > 0 && <span className="text-ctp-overlay1">·{wsBridgeClients}</span>}
              </StatusItem>
            </>
          )}
        </div>
        {branchDisplay && (
          <div className="ml-auto flex items-center gap-3">
            <StatusItem
              tooltip={`Branch: ${gitInfo!.branch}${gitInfo!.modified_count > 0 ? ` (${gitInfo!.modified_count} modified)` : ""}`}
            >
              {projectName} git:({branchDisplay})
            </StatusItem>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});
