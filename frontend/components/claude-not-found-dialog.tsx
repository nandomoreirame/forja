import { invoke } from "@/lib/ipc";
import { AlertTriangle, ExternalLink, RefreshCw, Terminal } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

interface ClaudeNotFoundDialogProps {
  open: boolean;
  onResolved: () => void;
}

async function openExternal(url: string) {
  try {
    const { openUrl } = await import("@/lib/ipc");
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

export function ClaudeNotFoundDialog({
  open,
  onResolved,
}: ClaudeNotFoundDialogProps) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      await invoke("check_claude_installed");
      onResolved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }, [onResolved]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden border-ctp-surface0 bg-ctp-base p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Claude Code CLI not found</DialogTitle>
        <DialogDescription className="sr-only">
          Claude Code CLI is required to use Forja
        </DialogDescription>

        <div className="flex flex-col items-center px-6 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ctp-red/15">
            <AlertTriangle
              className="h-8 w-8 text-ctp-red"
              strokeWidth={1.5}
            />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-ctp-text">
            Claude Code CLI not found
          </h2>
          <p className="mt-2 text-center text-sm text-ctp-overlay1">
            The <code className="rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-xs text-ctp-text">claude</code> command
            could not be found in your system PATH. Install Claude Code to continue.
          </p>

          <div className="mt-6 w-full rounded-lg bg-ctp-mantle p-4">
            <div className="flex items-center gap-2 text-xs text-ctp-overlay1">
              <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Install via npm:</span>
            </div>
            <pre className="mt-2 select-all rounded bg-ctp-surface0 px-3 py-2 font-mono text-sm text-ctp-text">
              npm install -g @anthropic-ai/claude-code
            </pre>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-ctp-red">{error}</p>
          )}

          <div className="mt-6 flex w-full flex-col gap-2">
            <button
              aria-label="Try Again"
              onClick={handleRetry}
              disabled={checking}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-ctp-base transition-colors hover:bg-brand/90 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
                strokeWidth={1.5}
              />
              {checking ? "Checking..." : "Try Again"}
            </button>

            <button
              aria-label="Installation Guide"
              onClick={() =>
                openExternal(
                  "https://docs.anthropic.com/en/docs/claude-code/overview"
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ctp-surface0 px-4 py-2.5 text-sm text-ctp-text transition-colors hover:bg-ctp-surface1"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              Installation Guide
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
