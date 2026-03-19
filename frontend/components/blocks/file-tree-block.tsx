import { useEffect, useRef } from "react";
import { FileTreeSidebar } from "@/components/file-tree-sidebar";
import { useFileTreeStore } from "@/stores/file-tree";
import { useFileTreeKeyboard } from "@/hooks/use-file-tree-keyboard";
import { paneFocusRegistry } from "@/lib/pane-focus-registry";

interface FileTreeBlockProps {
  nodeId?: string;
}

export function FileTreeBlock({ nodeId }: FileTreeBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleKeyDown = useFileTreeKeyboard();

  useEffect(() => {
    if (!useFileTreeStore.getState().isOpen) {
      useFileTreeStore.setState({ isOpen: true });
    }
  }, []);

  useEffect(() => {
    if (!nodeId) return;
    paneFocusRegistry.register(nodeId, () => {
      containerRef.current?.focus();
    });
    return () => { paneFocusRegistry.unregister(nodeId); };
  }, [nodeId]);

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} className="h-full w-full overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand)]">
      <FileTreeSidebar />
    </div>
  );
}
