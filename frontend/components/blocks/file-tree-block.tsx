import { useCallback, useEffect, useRef } from "react";
import { FileTreeSidebar } from "@/components/file-tree-sidebar";
import { useFileTreeStore } from "@/stores/file-tree";
import { flattenVisibleNodes } from "@/components/file-tree-sidebar";
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

  // When the file-tree container gains focus, ensure focusedPath is set
  const handleFocus = useCallback(() => {
    const state = useFileTreeStore.getState();
    if (state.focusedPath) return; // Already has a focused item
    if (!state.tree?.root.children) return;
    const flatNodes = flattenVisibleNodes(state.tree.root.children, state.expandedPaths, state.tree.root.path, 0);
    if (flatNodes.length > 0) {
      state.setFocusedPath(flatNodes[0].node.path);
    }
  }, []);

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} onFocus={handleFocus} className="h-full w-full overflow-hidden outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-brand)]">
      <FileTreeSidebar />
    </div>
  );
}
