import { AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

interface BetaDisclaimerDialogProps {
  open: boolean;
  onAcknowledge: () => void;
}

async function openExternal(url: string) {
  try {
    const { openUrl } = await import("@/lib/ipc");
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

export function BetaDisclaimerDialog({
  open,
  onAcknowledge,
}: BetaDisclaimerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden border-ctp-surface0 bg-overlay-base p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Early Access Software</DialogTitle>
        <DialogDescription className="sr-only">
          Beta disclaimer for Forja
        </DialogDescription>

        <div className="flex flex-col items-center px-6 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ctp-yellow/15">
            <AlertTriangle
              className="h-8 w-8 text-ctp-yellow"
              strokeWidth={1.5}
            />
          </div>

          <h2 className="mt-4 text-app-lg font-semibold text-ctp-text">
            Early Access Software
          </h2>
          <p className="mt-2 text-center text-app text-ctp-overlay1">
            Forja is under active development (beta stage). You should expect:
          </p>

          <ul className="mt-4 w-full space-y-2 text-app text-ctp-subtext0">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-ctp-yellow">&#8226;</span>
              <span>Incomplete features and tools that may change or be removed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-ctp-yellow">&#8226;</span>
              <span>Potential instability, crashes, or unexpected behavior</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-ctp-yellow">&#8226;</span>
              <span>Breaking changes between updates without prior notice</span>
            </li>
          </ul>

          <div className="mt-4 w-full rounded-lg bg-overlay-mantle px-4 py-3">
            <p className="text-app-sm text-ctp-overlay1">
              Your settings and session data are stored locally and may need to
              be reset after major updates. We recommend keeping backups of
              important project configurations.
            </p>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2">
            <button
              aria-label="I Understand"
              onClick={onAcknowledge}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-app font-medium text-ctp-base transition-colors hover:bg-brand/90"
            >
              I Understand
            </button>

            <button
              aria-label="Report Issues"
              onClick={() =>
                openExternal("https://github.com/nandomoreirame/forja/issues")
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ctp-surface0 px-4 py-2.5 text-app text-ctp-text transition-colors hover:bg-ctp-surface1"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              Report Issues
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
