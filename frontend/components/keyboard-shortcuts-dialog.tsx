import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = navigator.userAgent.includes("Mac");
const mod = isMac ? "\u2318" : "Ctrl";

interface Shortcut {
  label: string;
  keys: string[];
}

const shortcuts: { section: string; items: Shortcut[] }[] = [
  {
    section: "General",
    items: [
      { label: "File Search", keys: [mod, "P"] },
      { label: "Command Palette", keys: [mod, "Shift", "P"] },
      { label: "Open Project", keys: [mod, "O"] },
      { label: "Toggle Sidebar", keys: [mod, "B"] },
      { label: "Toggle File Preview", keys: [mod, "E"] },
      { label: "Keyboard Shortcuts", keys: [mod, "?"] },
      { label: "Toggle Terminal", keys: [mod, "J"] },
      { label: "Open Settings", keys: [mod, ","] },
    ],
  },
  {
    section: "Tabs",
    items: [
      { label: "New Tab", keys: [mod, "T"] },
      { label: "Close Tab", keys: [mod, "W"] },
      { label: "Next Tab", keys: ["Ctrl", "Tab"] },
      { label: "Previous Tab", keys: ["Ctrl", "Shift", "Tab"] },
    ],
  },
  {
    section: "Terminal",
    items: [
      { label: "Zoom In", keys: [mod, "Alt", "="] },
      { label: "Zoom Out", keys: [mod, "Alt", "-"] },
      { label: "Reset Zoom", keys: [mod, "Alt", "0"] },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-[11px] text-ctp-overlay1">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-105 gap-0 border-ctp-surface0 bg-ctp-base p-0"
      >
        <DialogHeader className="gap-0 border-b border-ctp-surface0 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ctp-surface0">
              <Keyboard
                className="h-4 w-4 text-ctp-mauve"
                strokeWidth={1.5}
              />
            </div>
            <DialogTitle className="text-ctp-text">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            List of available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {shortcuts.map((group) => (
            <div key={group.section}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ctp-overlay0">
                {group.section}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-ctp-subtext0">
                      {shortcut.label}
                    </span>
                    <span className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-[11px] text-ctp-surface1">
                              +
                            </span>
                          )}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
