import { useEffect, useRef } from "react";
import { PanelLeftClose } from "lucide-react";
import { useTilingLayoutStore } from "@/stores/tiling-layout";

interface TabsetContextMenuProps {
  tabsetId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function TabsetContextMenu({ tabsetId, position, onClose }: TabsetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  function handleClosePane() {
    useTilingLayoutStore.getState().closeTabset(tabsetId);
    onClose();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[9999] min-w-[160px] rounded-md border border-ctp-surface1 bg-overlay-base py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <button
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-app text-ctp-red hover:bg-ctp-surface0"
        onClick={handleClosePane}
      >
        <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.5} />
        Close pane
      </button>
    </div>
  );
}
