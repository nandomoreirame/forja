import { Loader2 } from "lucide-react";
import { useInstalledClis } from "@/hooks/use-installed-clis";
import type { SessionType } from "@/lib/cli-registry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { CliIcon } from "./cli-icon";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionTypeSelect: (sessionType: SessionType) => void;
}

function SessionButton({
  label,
  description,
  sessionType,
  onClick,
}: {
  label: string;
  description: string;
  sessionType: SessionType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`${label} session`}
      className="group flex flex-col items-center gap-3 rounded-lg border border-ctp-surface0 bg-ctp-mantle p-6 transition-all hover:border-brand hover:bg-ctp-surface0"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ctp-surface0 transition-colors group-hover:bg-brand/20">
        <CliIcon sessionType={sessionType} className="h-6 w-6" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium text-ctp-text">{label}</span>
        <span className="text-center text-xs text-ctp-overlay1">{description}</span>
      </div>
    </button>
  );
}

export function NewSessionDialog({
  open,
  onOpenChange,
  onSessionTypeSelect,
}: NewSessionDialogProps) {
  const { installedClis, loading } = useInstalledClis();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-120 gap-0 border-ctp-surface0 bg-ctp-base p-0"
      >
        <DialogHeader className="gap-0 border-b border-ctp-surface0 px-5 py-4">
          <DialogTitle className="text-ctp-text">New Session</DialogTitle>
          <DialogDescription className="text-ctp-overlay1">
            Choose session type
          </DialogDescription>
        </DialogHeader>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-ctp-overlay1" />
            </div>
          ) : (
            <div
              className={`grid gap-3 ${
                installedClis.length === 0
                  ? "grid-cols-1"
                  : installedClis.length >= 3
                    ? "grid-cols-3"
                    : "grid-cols-2"
              }`}
            >
              {installedClis.map((cli) => (
                <SessionButton
                  key={cli.id}
                  label={cli.displayName}
                  description={cli.description}
                  sessionType={cli.id}
                  onClick={() => onSessionTypeSelect(cli.id)}
                />
              ))}
              <SessionButton
                label="Terminal"
                description="Standard shell session"
                sessionType="terminal"
                onClick={() => onSessionTypeSelect("terminal")}
              />
            </div>
          )}
          {!loading && installedClis.length === 0 && (
            <p className="mt-3 text-center text-xs text-ctp-overlay0">
              No AI CLI tools detected. Install claude, gemini, codex, or cursor-agent to use AI sessions.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
