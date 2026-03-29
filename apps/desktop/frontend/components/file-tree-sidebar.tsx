import {
  useFileTreeStore,
  findNode,
  type DirectoryTree,
  type FileNode,
} from "@/stores/file-tree";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { invoke } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "./error-boundary";
import { FileIcon } from "./file-icon";
import { FileTreeNode, DeleteConfirmDialog } from "./file-tree-node";
import { GitChangesPane } from "./git-changes-pane";

/** Maximum pixel width for the file tree sidebar resizable panel. */
export const SIDEBAR_MAX_WIDTH = "500px";

/** Inline input rendered as a virtual node when creating a new file/folder. */
function InlineCreateInput({ depth, projectPath }: { depth: number; projectPath: string }) {
  const creatingType = useFileTreeStore((s) => s.creatingType);
  const creatingInDir = useFileTreeStore((s) => s.creatingInDir);
  const stopCreating = useFileTreeStore((s) => s.stopCreating);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || !creatingInDir || !creatingType) {
      stopCreating();
      return;
    }
    const newPath = `${creatingInDir}/${trimmed}`;
    try {
      if (creatingType === "file") {
        await invoke("create_file", { projectPath, filePath: newPath });
      } else {
        await invoke("create_directory", { projectPath, dirPath: newPath });
      }
      await useFileTreeStore.getState().refreshTree(projectPath);
    } catch (err) {
      console.error(`[file-tree] Create ${creatingType} failed:`, err);
    } finally {
      stopCreating();
    }
  }, [name, creatingInDir, creatingType, projectPath, stopCreating]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      } else if (e.key === "Escape") {
        stopCreating();
      }
    },
    [handleCommit, stopCreating],
  );

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1"
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <div className="w-3 shrink-0" />
      <FileIcon isDir={creatingType === "dir"} className="shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder={creatingType === "file" ? "filename..." : "foldername..."}
        className="min-w-0 flex-1 rounded bg-ctp-surface1 px-1 py-0 text-app text-ctp-text outline-none ring-1 ring-ctp-mauve"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={stopCreating}
      />
    </div>
  );
}

export interface FlatNode {
  node: FileNode;
  depth: number;
  projectPath: string;
  isCreatePlaceholder?: boolean;
}

export function flattenVisibleNodes(
  nodes: FileNode[],
  expandedPaths: Record<string, boolean>,
  projectPath: string,
  depth: number = 0,
  creatingInDir?: string | null,
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    result.push({ node, depth, projectPath });
    if (node.isDir && expandedPaths[node.path]) {
      // Insert create placeholder as first child if creating in this dir
      if (creatingInDir === node.path) {
        const placeholder: FileNode = { name: "__create__", path: `${node.path}/__create__`, isDir: false };
        result.push({ node: placeholder, depth: depth + 1, projectPath, isCreatePlaceholder: true });
      }
      if (node.children) {
        result.push(...flattenVisibleNodes(node.children, expandedPaths, projectPath, depth + 1, creatingInDir));
      }
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
}

function SingleTreeView({
  tree,
  expandedPaths,
}: SingleTreeViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  const creatingInDir = useFileTreeStore((s) => s.creatingInDir);

  const flatNodes = useMemo(() => {
    if (!tree.root.children) return [];
    const nodes: FlatNode[] = [];
    // If creating at root level, insert placeholder first
    if (creatingInDir === tree.root.path) {
      const placeholder: FileNode = { name: "__create__", path: `${tree.root.path}/__create__`, isDir: false };
      nodes.push({ node: placeholder, depth: 0, projectPath: tree.root.path, isCreatePlaceholder: true });
    }
    nodes.push(...flattenVisibleNodes(tree.root.children, expandedPaths, tree.root.path, 0, creatingInDir));
    return nodes;
  }, [tree, expandedPaths, creatingInDir]);

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  const focusedPath = useFileTreeStore((s) => s.focusedPath);

  useEffect(() => {
    if (!focusedPath) return;
    const index = flatNodes.findIndex((fn) => fn.node.path === focusedPath);
    if (index !== -1) {
      virtualizer.scrollToIndex(index, { align: "auto" });
    }
  }, [focusedPath, flatNodes, virtualizer]);

  // Root-level drop zone: allows dropping files/folders into project root
  const handleRootDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setRootDragOver(true);
    },
    [],
  );

  const handleRootDragLeave = useCallback(() => {
    setRootDragOver(false);
  }, []);

  const handleRootDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setRootDragOver(false);
      const raw = e.dataTransfer.getData("application/x-forja-paths");
      if (!raw) return;

      const projectPath = tree.root.path;
      const paths: string[] = JSON.parse(raw);
      for (const sourcePath of paths) {
        // Don't move if already at root
        const sourceParent = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
        if (sourceParent === projectPath) continue;
        await invoke("move_file_or_dir", { projectPath, sourcePath, targetDir: projectPath });
      }
      await useFileTreeStore.getState().refreshTree(projectPath);
    },
    [tree.root.path],
  );

  return (
    <div
      ref={scrollRef}
      className={cn("flex-1 overflow-y-auto", rootDragOver && "bg-ctp-blue/10 outline outline-1 outline-ctp-blue")}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      <div
        className="relative py-1"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const flatNode = flatNodes[virtualItem.index];
          const { node, depth, projectPath } = flatNode;
          return (
            <div
              key={node.path}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                willChange: "transform",
              }}
            >
              {flatNode.isCreatePlaceholder ? (
                <InlineCreateInput depth={depth} projectPath={projectPath} />
              ) : (
                <FileTreeNode node={node} depth={depth} projectPath={projectPath} />
              )}
            </div>
          );
        })}
      </div>
    </div>
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

  const creatingInDir = useFileTreeStore((s) => s.creatingInDir);

  const flatNodes = useMemo(() => {
    const result: FlatNode[] = [];
    for (const [projectPath, projectTree] of Object.entries(trees)) {
      result.push({ node: projectTree.root, depth: 0, projectPath });
      if (expandedPaths[projectPath] && projectTree.root.children) {
        if (creatingInDir === projectPath) {
          const placeholder: FileNode = { name: "__create__", path: `${projectPath}/__create__`, isDir: false };
          result.push({ node: placeholder, depth: 1, projectPath, isCreatePlaceholder: true });
        }
        result.push(
          ...flattenVisibleNodes(projectTree.root.children, expandedPaths, projectPath, 1, creatingInDir),
        );
      }
    }
    return result;
  }, [trees, expandedPaths, creatingInDir]);

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
        <span className="flex-1 text-app font-semibold text-ctp-text">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="relative py-1"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const flatNode = flatNodes[virtualItem.index];
            const { node, depth, projectPath } = flatNode;
            return (
              <div
                key={node.path}
                className="absolute left-0 top-0 w-full"
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {flatNode.isCreatePlaceholder ? (
                  <InlineCreateInput depth={depth} projectPath={projectPath} />
                ) : (
                  <FileTreeNode node={node} depth={depth} projectPath={projectPath} />
                )}
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

  if (!isOpen) return null;
  if (!tree) return null;

  return (
    <div
      data-testid="file-tree-sidebar"
      className="flex h-full w-full flex-col border-r border-ctp-surface0 bg-ctp-mantle"
    >
      <ErrorBoundary
        fallback={
          <div className="flex-1 flex items-center justify-center p-4 text-app-sm text-ctp-overlay1">
            Failed to load file tree.
          </div>
        }
      >
        <SingleTreeView
          tree={tree}
          expandedPaths={expandedPaths}
          toggleExpanded={toggleExpanded}
        />
      </ErrorBoundary>

      <div className="mt-auto">
        <GitChangesPane
          projectPaths={[tree.root.path]}
        />
      </div>

      <DeleteConfirmDialog />
    </div>
  );
}
