import { memo } from "react";
import {
  Copy,
  Clipboard,
  SplitSquareVertical,
  SplitSquareHorizontal,
  X,
} from "lucide-react";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
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
  const removeTab = useTerminalTabsStore((s) => s.removeTab);

  const handleSplitVertical = () => {
    useTilingLayoutStore.getState().splitActiveTabset("vertical");
  };

  const handleSplitHorizontal = () => {
    useTilingLayoutStore.getState().splitActiveTabset("horizontal");
  };

  const handleCloseTerminal = () => {
    removeTab(tabId);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* ContextMenuTrigger requires a single child element */}
        <div className="h-full w-full">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48 border-ctp-surface1 bg-overlay-mantle">
        {/* Copy / Paste */}
        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
          onSelect={onCopy}
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          Copy
          <ContextMenuShortcut>Ctrl+Shift+C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
          onSelect={onPaste}
        >
          <Clipboard className="h-3.5 w-3.5" strokeWidth={1.5} />
          Paste
          <ContextMenuShortcut>Ctrl+Shift+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-ctp-surface0" />

        {/* Split options — always available, flexlayout supports unlimited splits */}
        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
          onSelect={handleSplitVertical}
        >
          <SplitSquareHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
          Split Vertical
        </ContextMenuItem>

        <ContextMenuItem
          className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
          onSelect={handleSplitHorizontal}
        >
          <SplitSquareVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
          Split Horizontal
        </ContextMenuItem>

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
