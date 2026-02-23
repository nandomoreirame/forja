import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { ChevronsDownUp, FolderOpen } from "lucide-react";
import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileIcon } from "./file-icon";
import { FileTreeNode } from "./file-tree-node";

interface FlatNode {
  node: FileNode;
  depth: number;
}

function flattenVisibleNodes(
  nodes: FileNode[],
  expandedPaths: Record<string, boolean>,
  depth: number = 0,
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    result.push({ node, depth });
    if (node.isDir && expandedPaths[node.path] && node.children) {
      result.push(...flattenVisibleNodes(node.children, expandedPaths, depth + 1));
    }
  }
  return result;
}

const ITEM_HEIGHT = 28;
const OVERSCAN = 15;

export function FileTreeSidebar() {
  const isOpen = useFileTreeStore((s) => s.isOpen);
  const tree = useFileTreeStore((s) => s.tree);
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const openProject = useFileTreeStore((s) => s.openProject);
  const collapseAll = useFileTreeStore((s) => s.collapseAll);

  const scrollRef = useRef<HTMLDivElement>(null);

  const flatNodes = useMemo(() => {
    if (!tree?.root.children) return [];
    return flattenVisibleNodes(tree.root.children, expandedPaths);
  }, [tree, expandedPaths]);

  const hasExpandedPaths = useMemo(
    () => Object.values(expandedPaths).some(Boolean),
    [expandedPaths],
  );

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  if (!isOpen) return null;

  return (
    <div
      data-testid="file-tree-sidebar"
      className="flex h-full w-80 shrink-0 flex-col border-r border-ctp-surface0 bg-ctp-mantle"
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ctp-surface0 px-3">
        {tree ? (
          <>
            <FileIcon isDir isOpen />
            <span className="flex-1 text-sm font-semibold text-ctp-text">
              {tree.root.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-ctp-overlay1">Explorer</span>
        )}
        {tree && (
          <button
            onClick={collapseAll}
            disabled={!hasExpandedPaths}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Collapse all folders"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* File tree */}
      <div ref={scrollRef} className="file-tree-scroll flex-1 overflow-y-auto">
        {tree ? (
          <div
            className="relative py-1"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const { node, depth } = flatNodes[virtualItem.index];
              return (
                <div
                  key={node.path}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <FileTreeNode node={node} depth={depth} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
            <p className="text-sm text-ctp-overlay1">No project loaded</p>
            <button
              onClick={openProject}
              className="inline-flex items-center gap-2 rounded-md bg-ctp-surface0 px-3 py-1.5 text-sm text-ctp-subtext0 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text"
            >
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
              Add project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
