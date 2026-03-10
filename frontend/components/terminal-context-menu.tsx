import { memo } from "react";
import {
  Copy,
  Clipboard,
  SplitSquareVertical,
  SplitSquareHorizontal,
  X,
  PanelLeftClose,
} from "lucide-react";
import { useTerminalSplitLayoutStore } from "@/stores/terminal-split-layout";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "./ui/context-menu";

interface TerminalContextMenuProps {
  tabId: string;
  onCopy: () => void;
  onPaste: () => void;
  children: React.ReactNode;
}

export const TerminalContextMenu = memo(function TerminalContextMenu({
  tabId,
  onCopy,
  onPaste,
  children,
}: TerminalContextMenuProps) {
  const openSplit = useTerminalSplitLayoutStore((s) => s.openSplit);
  const closeSplit = useTerminalSplitLayoutStore((s) => s.closeSplit);
  const splitOrientation = useTerminalSplitLayoutStore((s) => s.orientation);
  const splitTabId = useTerminalSplitLayoutStore((s) => s.splitTabId);
  const removeTab = useTerminalTabsStore((s) => s.removeTab);

  // The split is active if this tab has a split open
  const isSplitActive = splitOrientation !== "none" && splitTabId === tabId;

  const handleSplitVertical = () => {
    openSplit("vertical", tabId, "terminal");
  };

  const handleSplitHorizontal = () => {
    openSplit("horizontal", tabId, "terminal");
  };

  const handleCloseTerminal = () => {
    if (isSplitActive) {
      closeSplit();
    }
    removeTab(tabId);
  };

  const handleCloseSplit = () => {
    closeSplit();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* ContextMenuTrigger requires a single child element */}
        <div className="h-full w-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48 border-ctp-surface1 bg-ctp-mantle">
        {/* Copy / Paste */}
        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
          onSelect={onCopy}
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
          onSelect={onPaste}
        >
          <Clipboard className="h-3.5 w-3.5" strokeWidth={1.5} />
          Paste
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-ctp-surface0" />

        {/* Split options */}
        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text data-disabled:opacity-40"
          onSelect={handleSplitVertical}
          disabled={isSplitActive}
        >
          <SplitSquareVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
          Split Vertical
        </ContextMenuItem>

        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text data-disabled:opacity-40"
          onSelect={handleSplitHorizontal}
          disabled={isSplitActive}
        >
          <SplitSquareHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
          Split Horizontal
        </ContextMenuItem>

        {/* Close Split — only shown when split is active */}
        {isSplitActive && (
          <ContextMenuItem
            className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
            onSelect={handleCloseSplit}
          >
            <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.5} />
            Close Split
          </ContextMenuItem>
        )}

        <ContextMenuSeparator className="bg-ctp-surface0" />

        {/* Close Terminal */}
        <ContextMenuItem
          className="gap-2 text-xs text-ctp-red focus:bg-ctp-surface0 focus:text-ctp-red"
          onSelect={handleCloseTerminal}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          Close Terminal
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
