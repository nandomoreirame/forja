import { Sparkles, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionTypeSelect: (sessionType: "claude-code" | "terminal") => void;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  onSessionTypeSelect,
}: NewSessionDialogProps) {
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

        <div className="grid grid-cols-2 gap-3 p-5">
          <button
            onClick={() => onSessionTypeSelect("claude-code")}
            aria-label="Claude Code session"
            className="group flex flex-col items-center gap-3 rounded-lg border border-ctp-surface0 bg-ctp-mantle p-6 transition-all hover:border-brand hover:bg-ctp-surface0"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ctp-surface0 transition-colors group-hover:bg-brand/20">
              <Sparkles className="h-6 w-6 text-brand" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-ctp-text">
                Claude Code
              </span>
              <span className="text-center text-xs text-ctp-overlay1">
                AI-assisted terminal with Claude Code
              </span>
            </div>
          </button>

          <button
            onClick={() => onSessionTypeSelect("terminal")}
            aria-label="Terminal session"
            className="group flex flex-col items-center gap-3 rounded-lg border border-ctp-surface0 bg-ctp-mantle p-6 transition-all hover:border-brand hover:bg-ctp-surface0"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ctp-surface0 transition-colors group-hover:bg-brand/20">
              <Terminal
                className="h-6 w-6 text-ctp-subtext0"
                strokeWidth={1.5}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-ctp-text">
                Terminal
              </span>
              <span className="text-center text-xs text-ctp-overlay1">
                Standard shell session
              </span>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
