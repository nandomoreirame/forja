import {
  useFileTreeStore,
  type DirectoryTree,
  type FileNode,
} from "@/stores/file-tree";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import {
  ChevronsDownUp,
  FolderOpen,
  FolderPlus,
  Plus,
} from "lucide-react";
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

function WorkspaceHeader() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setCreateWorkspaceOpen = useAppDialogsStore(
    (s) => s.setCreateWorkspaceOpen,
  );

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  if (!activeWorkspace) return null;

  return (
    <div className="flex h-8 shrink-0 items-center gap-1 border-b border-ctp-surface0 px-3">
      <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-ctp-overlay1">
        {activeWorkspace.name}
      </span>
      <button
        onClick={() => setCreateWorkspaceOpen(true)}
        className="inline-flex h-6 w-6 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
        aria-label="Create new workspace"
      >
        <Plus className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

interface SingleTreeViewProps {
  tree: DirectoryTree;
  expandedPaths: Record<string, boolean>;
  collapseAll: () => void;
}

function SingleTreeView({
  tree,
  expandedPaths,
  collapseAll,
}: SingleTreeViewProps) {
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

  return (
    <>
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ctp-surface0 px-3">
        <FileIcon isDir isOpen />
        <span className="flex-1 text-sm font-semibold text-ctp-text">
          {tree.root.name}
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

      {/* File tree */}
      <div ref={scrollRef} className="file-tree-scroll flex-1 overflow-y-auto">
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
      </div>
    </>
  );
}

interface MultiTreeViewProps {
  trees: Record<string, DirectoryTree>;
  expandedPaths: Record<string, boolean>;
  collapseAll: () => void;
}

function MultiTreeView({
  trees,
  expandedPaths,
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
      result.push({ node: projectTree.root, depth: 0 });
      if (expandedPaths[projectPath] && projectTree.root.children) {
        result.push(
          ...flattenVisibleNodes(projectTree.root.children, expandedPaths, 1),
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
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ctp-surface0 px-3">
        <span className="flex-1 text-sm font-semibold text-ctp-text">
          Explorer
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
      <div ref={scrollRef} className="file-tree-scroll flex-1 overflow-y-auto">
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
      </div>
    </>
  );
}

export function FileTreeSidebar() {
  const isOpen = useFileTreeStore((s) => s.isOpen);
  const tree = useFileTreeStore((s) => s.tree);
  const trees = useFileTreeStore((s) => s.trees);
  const activeProjectPath = useFileTreeStore((s) => s.activeProjectPath);
  const setActiveProjectPath = useFileTreeStore((s) => s.setActiveProjectPath);
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const openProject = useFileTreeStore((s) => s.openProject);
  const collapseAll = useFileTreeStore((s) => s.collapseAll);

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const treeCount = Object.keys(trees).length;
  const isMultiTree = treeCount > 1;

  if (!isOpen) return null;

  return (
    <div
      data-testid="file-tree-sidebar"
      className="flex h-full w-80 shrink-0 flex-col border-r border-ctp-surface0 bg-ctp-mantle"
    >
      <WorkspaceHeader />

      {isMultiTree ? (
        <MultiTreeView
          trees={trees}
          expandedPaths={expandedPaths}
          collapseAll={collapseAll}
        />
      ) : tree ? (
        <SingleTreeView
          tree={tree}
          expandedPaths={expandedPaths}
          collapseAll={collapseAll}
        />
      ) : (
        <>
          {/* Header when no tree */}
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-ctp-surface0 px-3">
            <span className="flex-1 text-sm text-ctp-overlay1">Explorer</span>
          </div>

          {/* Empty state */}
          <div className="file-tree-scroll flex-1 overflow-y-auto">
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
          </div>
        </>
      )}

      {/* Add repository button when workspace is active */}
      {activeWorkspaceId && (
        <div className="shrink-0 border-t border-ctp-surface0 p-2">
          <button
            onClick={openProject}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          >
            <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Add repository
          </button>
        </div>
      )}
    </div>
  );
}
