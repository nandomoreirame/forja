import { Check, Copy, Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const [copied, setCopied] = useState(false);
  const [appInfo, setAppInfo] = useState({
    name: "Forja",
    version: "0.1.0",
    tauriVersion: "",
    os: "",
  });

  useEffect(() => {
    async function loadInfo() {
      try {
        const { getName, getVersion, getTauriVersion } = await import(
          "@tauri-apps/api/app"
        );
        const [name, version, tauriVersion] = await Promise.all([
          getName(),
          getVersion(),
          getTauriVersion(),
        ]);

        const os = navigator.platform;
        setAppInfo({ name, version, tauriVersion, os });
      } catch {
        setAppInfo((prev) => ({ ...prev, os: navigator.platform }));
      }
    }
    if (open) {
      loadInfo();
      setCopied(false);
    }
  }, [open]);

  const infoText = [
    `Version: ${appInfo.version}`,
    `Tauri: ${appInfo.tauriVersion}`,
    `OS: ${appInfo.os}`,
  ].join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(infoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-105 gap-0 border-ctp-surface0 bg-ctp-base p-0"
      >
        <DialogHeader className="gap-0 border-b border-ctp-surface0 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ctp-surface0">
              <Info
                className="h-4 w-4 text-ctp-mauve"
                strokeWidth={1.5}
              />
            </div>
            <DialogTitle className="text-ctp-text">
              {appInfo.name}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Application version and system information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 px-5 py-4 font-mono text-sm">
          <div className="flex gap-2">
            <span className="text-ctp-overlay1">Version:</span>
            <span className="text-ctp-subtext0">{appInfo.version}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-ctp-overlay1">Tauri:</span>
            <span className="text-ctp-subtext0">{appInfo.tauriVersion}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-ctp-overlay1">OS:</span>
            <span className="text-ctp-subtext0">{appInfo.os}</span>
          </div>
        </div>

        <DialogFooter className="border-t border-ctp-surface0 px-5 py-3">
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 items-center justify-center rounded-md bg-ctp-surface0 px-4 text-sm font-medium text-ctp-text transition-colors hover:bg-ctp-surface1"
          >
            Ok
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-ctp-surface0 px-4 text-sm font-medium text-ctp-text transition-colors hover:bg-ctp-surface1"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
