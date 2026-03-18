import { useEffect, useRef } from "react";
import { FileTreeSidebar } from "@/components/file-tree-sidebar";
import { useFileTreeStore } from "@/stores/file-tree";
import { paneFocusRegistry } from "@/lib/pane-focus-registry";

interface FileTreeBlockProps {
  nodeId?: string;
}

export function FileTreeBlock({ nodeId }: FileTreeBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} tabIndex={0} className="h-full w-full overflow-hidden outline-none">
      <FileTreeSidebar />
    </div>
  );
}
