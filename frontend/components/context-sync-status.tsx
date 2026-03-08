import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useContextHubStore } from "@/stores/context-hub";
import { cn } from "@/lib/utils";

interface ContextSyncStatusProps {
  projectPath: string;
}

export function ContextSyncStatus({ projectPath }: ContextSyncStatusProps) {
  const { status, loading, error, syncOut } = useContextHubStore();

  if (!status) return null;

  const counts = status.counts ?? {};
  const totalItems =
    (counts.skill ?? 0) + (counts.agent ?? 0) + (counts.doc ?? 0) + (counts.plan ?? 0);

  const parts: string[] = [];
  if (counts.skill) parts.push(`${counts.skill} skills`);
  if (counts.agent) parts.push(`${counts.agent} agents`);
  if (counts.doc) parts.push(`${counts.doc} docs`);
  if (counts.plan) parts.push(`${counts.plan} plans`);

  const summary = parts.length > 0 ? parts.join(", ") : "empty";

  let ariaLabel: string;
  let Icon: typeof RefreshCw;
  let iconColor: string;

  if (loading) {
    ariaLabel = "Syncing context hub...";
    Icon = Loader2;
    iconColor = "text-ctp-blue";
  } else if (error) {
    ariaLabel = `Context hub error: ${error}`;
    Icon = AlertCircle;
    iconColor = "text-ctp-red";
  } else {
    ariaLabel = `Context hub: ${summary} (${totalItems} items)`;
    Icon = totalItems > 0 ? CheckCircle2 : RefreshCw;
    iconColor = totalItems > 0 ? "text-ctp-green" : "text-ctp-overlay1";
  }

  return (
    <button
      type="button"
      data-testid="context-sync-status"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => syncOut(projectPath)}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-ctp-surface0",
        iconColor
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", loading && "animate-spin")}
        strokeWidth={1.5}
      />
    </button>
  );
}
