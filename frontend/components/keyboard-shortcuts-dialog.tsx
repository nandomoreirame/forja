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
      { label: "Go to Project", keys: [mod, "Shift", "L"] },
      { label: "Switch Project 1-9", keys: [mod, "Shift", "1-9"] },
      { label: "Add Project", keys: [mod, "Shift", "O"] },
      { label: "Open Files", keys: [mod, "Shift", "E"] },
      { label: "Open Browser", keys: [mod, "Shift", "B"] },
      { label: "Close File Preview", keys: [mod, "W"] },
      { label: "Toggle Focus Mode", keys: [mod, "Shift", "M"] },
      { label: "Keyboard Shortcuts", keys: [mod, "?"] },
      { label: "Open Settings", keys: [mod, ","] },
    ],
  },
  {
    section: "Tabs",
    items: [
      { label: "New Tab", keys: [mod, "Shift", "T"] },
      { label: "Close Tab", keys: [mod, "Shift", "W"] },
      { label: "Next Tab", keys: ["Ctrl", "Tab"] },
      { label: "Previous Tab", keys: ["Ctrl", "Shift", "Tab"] },
    ],
  },
  {
    section: "Terminal",
    items: [
      { label: "Copy Selection", keys: [mod, "Shift", "C"] },
      { label: "Paste", keys: [mod, "Shift", "V"] },
      { label: "Zoom In", keys: [mod, "Alt", "="] },
      { label: "Zoom Out", keys: [mod, "Alt", "-"] },
      { label: "Reset Zoom", keys: [mod, "Alt", "0"] },
      { label: "Split Vertical", keys: [mod, "Alt", "V"] },
      { label: "Split Horizontal", keys: [mod, "Alt", "H"] },
      { label: "Close Split", keys: [mod, "Alt", "W"] },
      { label: "Focus Next Split Pane", keys: [mod, "Alt", "]"] },
      { label: "Focus Previous Split Pane", keys: [mod, "Alt", "["] },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded bg-ctp-surface0 px-1.5 py-0.5 font-mono text-app-xs text-ctp-overlay1">
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
        className="max-w-105 gap-0 border-ctp-surface0 bg-overlay-base p-0"
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

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {shortcuts.map((group) => (
            <div key={group.section}>
              <h3 className="mb-2 text-app-sm font-medium uppercase tracking-wider text-ctp-overlay0">
                {group.section}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-app text-ctp-subtext0">
                      {shortcut.label}
                    </span>
                    <span className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && (
                            <span className="text-app-xs text-ctp-surface1">
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
