import { useEffect, useRef } from "react";
import { Pencil, X } from "lucide-react";
import { useTilingLayoutStore } from "@/stores/tiling-layout";

interface TabContextMenuProps {
  nodeId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onStartRename: (nodeId: string) => void;
}

export function TabContextMenu({ nodeId, position, onClose, onStartRename }: TabContextMenuProps) {
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

  function handleEditTab() {
    onStartRename(nodeId);
    onClose();
  }

  function handleCloseTab() {
    useTilingLayoutStore.getState().removeBlock(nodeId);
    onClose();
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[9999] min-w-[160px] rounded-md border border-ctp-surface1 bg-ctp-base py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      <button
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ctp-text hover:bg-ctp-surface0"
        onClick={handleEditTab}
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        Edit tab
      </button>
      <button
        role="menuitem"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ctp-red hover:bg-ctp-surface0"
        onClick={handleCloseTab}
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        Fechar tab
      </button>
    </div>
  );
}
