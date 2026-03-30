import { useEffect, useState } from "react";
import { Check, Copy, Radio, Users, Wifi, WifiOff } from "lucide-react";
import { useWsBridgeStore } from "@/stores/ws-bridge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface WsBridgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WsBridgeDialog({ open, onOpenChange }: WsBridgeDialogProps) {
  const running = useWsBridgeStore((s) => s.running);
  const port = useWsBridgeStore((s) => s.port);
  const host = useWsBridgeStore((s) => s.host);
  const localIp = useWsBridgeStore((s) => s.localIp);
  const clients = useWsBridgeStore((s) => s.clients);
  const token = useWsBridgeStore((s) => s.token);
  const start = useWsBridgeStore((s) => s.start);
  const stop = useWsBridgeStore((s) => s.stop);
  const refreshStatus = useWsBridgeStore((s) => s.refreshStatus);

  const [copied, setCopied] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Refresh server status every time the dialog opens
  useEffect(() => {
    if (open) {
      refreshStatus();
    }
  }, [open, refreshStatus]);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      if (running) {
        await stop();
      } else {
        await start();
      }
    } finally {
      setIsToggling(false);
    }
  };

  const handleCopyHost = async () => {
    if (!displayHost) return;
    try {
      await navigator.clipboard.writeText(displayHost);
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed silently
    }
  };

  const displayHost = localIp || (host === "0.0.0.0" ? "localhost" : host);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-ctp-surface1 bg-overlay-mantle sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                running
                  ? "bg-ctp-green/10 text-ctp-green"
                  : "bg-ctp-surface0 text-ctp-overlay1"
              )}
            >
              <Radio className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <DialogTitle className="text-ctp-text">Remote Server</DialogTitle>
              <DialogDescription className="text-ctp-subtext0">
                WebSocket bridge for remote control via mobile app
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Status row */}
          <div className="flex items-center justify-between rounded-lg border border-ctp-surface1 bg-ctp-surface0/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  running ? "animate-pulse bg-ctp-green" : "bg-ctp-overlay0"
                )}
                aria-hidden="true"
              />
              <span className="text-app-sm font-medium text-ctp-text">
                {running ? "Running" : "Stopped"}
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleToggle}
              disabled={isToggling}
              aria-label={running ? "Stop Server" : "Start Server"}
              className={cn(
                "min-w-[100px] transition-colors",
                running
                  ? "border-ctp-red/30 bg-ctp-red/10 text-ctp-red hover:bg-ctp-red/20"
                  : "bg-ctp-green/10 text-ctp-green hover:bg-ctp-green/20 border-ctp-green/30"
              )}
              variant="outline"
            >
              {isToggling ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                  {running ? "Stopping..." : "Starting..."}
                </span>
              ) : running ? (
                <span className="flex items-center gap-1.5">
                  <WifiOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Stop Server
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Start Server
                </span>
              )}
            </Button>
          </div>

          {/* Server info and token — shown only when running */}
          {running && (
            <>
              {/* Host / Port */}
              <div className="flex flex-col gap-2">
                <p className="text-app-xs font-medium uppercase tracking-wide text-ctp-overlay1">
                  Connection Details
                </p>
                <div className="flex items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-surface0/50 px-3 py-2">
                  <div className="flex-1">
                    <p className="text-app-xs text-ctp-overlay1">Host</p>
                    <p className="mt-0.5 font-mono text-app-sm text-ctp-text">
                      {displayHost}:{port}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={copiedHost ? "Copied" : "Copy host"}
                    onClick={handleCopyHost}
                    className={cn(
                      "shrink-0 border-ctp-surface1 transition-colors",
                      copiedHost
                        ? "border-ctp-green/30 bg-ctp-green/10 text-ctp-green"
                        : "text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text"
                    )}
                  >
                    {copiedHost ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : (
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                    <span className="ml-1.5">{copiedHost ? "Copied!" : "Copy"}</span>
                  </Button>
                </div>
              </div>

              {/* Connected clients */}
              <div className="flex items-center gap-2 rounded-md border border-ctp-surface1 bg-ctp-surface0/50 px-3 py-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
                <span className="text-app-sm text-ctp-subtext0">
                  <span className="font-medium text-ctp-text">{clients}</span>{" "}
                  {clients === 1 ? "device" : "devices"} connected
                </span>
              </div>

              {/* Connection Token */}
              {token && (
                <div className="flex flex-col gap-2">
                  <p className="text-app-xs font-medium uppercase tracking-wide text-ctp-overlay1">
                    Connection Token
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-ctp-surface1 bg-ctp-base px-3 py-3">
                    <p
                      className="flex-1 text-center font-mono text-4xl font-bold tracking-[0.5em] text-ctp-mauve"
                      aria-label="Connection token"
                    >
                      {token}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={copied ? "Copied" : "Copy token"}
                      onClick={handleCopyToken}
                      className={cn(
                        "shrink-0 border-ctp-surface1 transition-colors",
                        copied
                          ? "border-ctp-green/30 bg-ctp-green/10 text-ctp-green"
                          : "text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text"
                      )}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : (
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                      <span className="ml-1.5">{copied ? "Copied!" : "Copy"}</span>
                    </Button>
                  </div>
                  <p className="text-app-xs text-ctp-overlay0">
                    Use this token in the Forja mobile app to connect to this desktop session.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Idle state hint */}
          {!running && (
            <p className="text-center text-app-sm text-ctp-overlay0">
              Start the server to allow remote control from the Forja mobile app.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
