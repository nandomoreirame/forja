import {
  useFileTreeStore,
  type DirectoryTree,
  type FileNode,
} from "@/stores/file-tree";
import { ChevronsDownUp, RefreshCw } from "lucide-react";
import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ErrorBoundary } from "./error-boundary";
import { FileTreeNode } from "./file-tree-node";
import { GitChangesPane } from "./git-changes-pane";

/** Maximum pixel width for the file tree sidebar resizable panel. */
export const SIDEBAR_MAX_WIDTH = "500px";

interface FlatNode {
  node: FileNode;
  depth: number;
  projectPath: string;
}

function flattenVisibleNodes(
  nodes: FileNode[],
  expandedPaths: Record<string, boolean>,
  projectPath: string,
  depth: number = 0,
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    result.push({ node, depth, projectPath });
    if (node.isDir && expandedPaths[node.path] && node.children) {
      result.push(...flattenVisibleNodes(node.children, expandedPaths, projectPath, depth + 1));
    }
  }
  return result;
}

const ITEM_HEIGHT = 28;
const OVERSCAN = 15;

interface SingleTreeViewProps {
  tree: DirectoryTree;
  expandedPaths: Record<string, boolean>;
  toggleExpanded: (path: string) => void;
  collapseAll: () => void;
  refreshTree: () => void;
}

function SingleTreeView({
  tree,
  expandedPaths,
  collapseAll,
  refreshTree,
}: SingleTreeViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const flatNodes = useMemo(() => {
    if (!tree.root.children) return [];
    return flattenVisibleNodes(tree.root.children, expandedPaths, tree.root.path, 0);
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

  return (
    <>
      {/* Project name header */}
      <div className="flex h-7 shrink-0 items-center gap-2 px-4">
        <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-ctp-subtext0">
          {tree.root.name}
        </span>
        <button
          onClick={refreshTree}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Refresh file tree"
        >
          <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
        </button>
        <button
          onClick={collapseAll}
          disabled={!hasExpandedPaths}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text disabled:pointer-events-none disabled:opacity-30"
          aria-label="Collapse all folders"
        >
          <ChevronsDownUp className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>

      {/* File tree */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pl-[12px]">
        <div
          className="relative py-1"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const { node, depth, projectPath } = flatNodes[virtualItem.index];
            return (
              <div
                key={node.path}
                className="absolute left-0 top-0 w-full"
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <FileTreeNode node={node} depth={depth} projectPath={projectPath} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

interface MultiTreeViewProps {
  trees: Record<string, DirectoryTree>;
  expandedPaths: Record<string, boolean>;
  projectCount: number;
  collapseAll: () => void;
}

function MultiTreeView({
  trees,
  expandedPaths,
  projectCount,
  collapseAll,
}: MultiTreeViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasExpandedPaths = useMemo(
    () => Object.values(expandedPaths).some(Boolean),
    [expandedPaths],
  );

  // Flatten all project trees into a single virtual list.
  // Each project root appears as a depth-0 directory node;
  // its children appear indented below when the root is expanded.
  const flatNodes = useMemo(() => {
    const result: FlatNode[] = [];
    for (const [projectPath, projectTree] of Object.entries(trees)) {
      result.push({ node: projectTree.root, depth: 0, projectPath });
      if (expandedPaths[projectPath] && projectTree.root.children) {
        result.push(
          ...flattenVisibleNodes(projectTree.root.children, expandedPaths, projectPath, 1),
        );
      }
    }
    return result;
  }, [trees, expandedPaths]);

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  return (
    <>
      {/* Projects header */}
      <div className="flex h-9 shrink-0 items-center gap-2 pl-[22px] pr-4">
        <span className="flex-1 text-sm font-semibold text-ctp-text">
          Projects ({projectCount})
        </span>
        <button
          onClick={collapseAll}
          disabled={!hasExpandedPaths}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text disabled:pointer-events-none disabled:opacity-30"
          aria-label="Collapse all folders"
        >
          <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* All project trees in a single scrollable list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pl-[12px]">
        <div
          className="relative py-1"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const { node, depth, projectPath } = flatNodes[virtualItem.index];
            return (
              <div
                key={node.path}
                className="absolute left-0 top-0 w-full"
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <FileTreeNode node={node} depth={depth} projectPath={projectPath} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function FileTreeSidebar() {
  const isOpen = useFileTreeStore((s) => s.isOpen);
  const tree = useFileTreeStore((s) => s.tree);
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const collapseAll = useFileTreeStore((s) => s.collapseAll);
  const refreshTree = useFileTreeStore((s) => s.refreshTree);

  if (!isOpen) return null;
  if (!tree) return null;

  return (
    <div
      data-testid="file-tree-sidebar"
      className="flex h-full w-full flex-col border-r border-ctp-surface0 bg-ctp-mantle"
    >
      <ErrorBoundary
        fallback={
          <div className="flex-1 flex items-center justify-center p-4 text-xs text-ctp-overlay1">
            Failed to load file tree.
          </div>
        }
      >
        <SingleTreeView
          tree={tree}
          expandedPaths={expandedPaths}
          toggleExpanded={toggleExpanded}
          collapseAll={collapseAll}
          refreshTree={refreshTree}
        />
      </ErrorBoundary>

      <div className="mt-auto">
        <GitChangesPane
          projectPaths={[tree.root.path]}
        />
      </div>
    </div>
  );
}
