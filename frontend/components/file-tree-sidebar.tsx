import {
  useFileTreeStore,
  type DirectoryTree,
  type FileNode,
} from "@/stores/file-tree";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import {
  ChevronsDownUp,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileIcon } from "./file-icon";
import { FileTreeNode } from "./file-tree-node";
import { GitChangesPane } from "./git-changes-pane";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

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

function WorkspaceHeader() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activateWorkspace = useWorkspaceStore((s) => s.activateWorkspace);
  const setCreateWorkspaceOpen = useAppDialogsStore(
    (s) => s.setCreateWorkspaceOpen,
  );

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  if (!activeWorkspace) return null;

  return (
    <div className="shrink-0 border-b border-ctp-surface0 p-2">
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              aria-label="Workspace switcher"
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span className="flex-1 truncate text-left">{activeWorkspace.name}</span>
              <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-48 border-ctp-surface1 bg-ctp-mantle"
          >
            <DropdownMenuRadioGroup
              value={activeWorkspaceId ?? ""}
              onValueChange={(id) => activateWorkspace(id)}
            >
              {workspaces.map((ws) => (
                <DropdownMenuRadioItem
                  key={ws.id}
                  value={ws.id}
                  className="text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
                >
                  {ws.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator className="bg-ctp-surface0" />
            <DropdownMenuItem
              onClick={() => setCreateWorkspaceOpen(true)}
              className="text-xs text-ctp-overlay1 focus:bg-ctp-surface0 focus:text-ctp-text"
            >
              <Plus className="h-3 w-3" strokeWidth={1.5} />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() =>
            setCreateWorkspaceOpen(true, null, {
              workspaceId: activeWorkspace.id,
              initialName: activeWorkspace.name,
            })
          }
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Rename workspace"
          title="Rename workspace"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

interface SingleTreeViewProps {
  tree: DirectoryTree;
  expandedPaths: Record<string, boolean>;
  toggleExpanded: (path: string) => void;
  collapseAll: () => void;
}

function SingleTreeView({
  tree,
  expandedPaths,
  toggleExpanded,
  collapseAll,
}: SingleTreeViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const flatNodes = useMemo(() => {
    if (!expandedPaths[tree.root.path] || !tree.root.children) return [];
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
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 pl-[22px] pr-4">
        <button
          type="button"
          onClick={() => toggleExpanded(tree.root.path)}
          className="group -ml-2 flex min-w-0 flex-1 items-center gap-1.5 rounded px-2 py-1 text-left transition-colors duration-100 hover:bg-ctp-surface0"
          aria-label={
            expandedPaths[tree.root.path]
              ? `Collapse ${tree.root.name}`
              : `Expand ${tree.root.name}`
          }
          aria-expanded={!!expandedPaths[tree.root.path]}
        >
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-ctp-overlay1 transition-transform duration-150 ${
              expandedPaths[tree.root.path] ? "rotate-90" : ""
            }`}
            strokeWidth={1.5}
          />
          <FileIcon isDir isOpen={!!expandedPaths[tree.root.path]} />
          <span className="truncate text-sm font-semibold text-ctp-text">
            {tree.root.name}
          </span>
        </button>
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto pl-[32px]">
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
  workspaceName: string;
  collapseAll: () => void;
}

function MultiTreeView({
  trees,
  expandedPaths,
  workspaceName,
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
      {/* Workspace header */}
      <div className="flex h-9 shrink-0 items-center gap-2 pl-[22px] pr-4">
        <span className="flex-1 text-sm font-semibold text-ctp-text">
          {workspaceName}
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
  const trees = useFileTreeStore((s) => s.trees);
  const activeProjectPath = useFileTreeStore((s) => s.activeProjectPath);
  const setActiveProjectPath = useFileTreeStore((s) => s.setActiveProjectPath);
  const expandedPaths = useFileTreeStore((s) => s.expandedPaths);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const openProject = useFileTreeStore((s) => s.openProject);
  const collapseAll = useFileTreeStore((s) => s.collapseAll);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeWorkspaceName = workspaces.find((w) => w.id === activeWorkspaceId)?.name?.trim() || "Workspace";

  const treeCount = Object.keys(trees).length;
  const isMultiTree = treeCount > 1;
  const [explorerExpanded, setExplorerExpanded] = useState(true);

  if (!isOpen) return null;
  if (!tree && !isMultiTree) return null;

  return (
    <div
      data-testid="file-tree-sidebar"
      className="flex h-full w-full flex-col border-r border-ctp-surface0 bg-ctp-mantle"
    >
      <WorkspaceHeader />
      <GitChangesPane
        projectPaths={isMultiTree ? Object.keys(trees) : tree ? [tree.root.path] : []}
      />

      <button
        type="button"
        onClick={() => setExplorerExpanded((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-ctp-surface0 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ctp-overlay1 transition-colors hover:bg-ctp-surface0"
        aria-label={explorerExpanded ? "Collapse explorer" : "Expand explorer"}
        aria-expanded={explorerExpanded}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${explorerExpanded ? "rotate-90" : ""}`}
          strokeWidth={1.5}
        />
        <span>Explorer</span>
      </button>

      {explorerExpanded &&
        (isMultiTree ? (
          <MultiTreeView
            trees={trees}
            expandedPaths={expandedPaths}
            workspaceName={activeWorkspaceName}
            collapseAll={collapseAll}
          />
        ) : tree ? (
          <SingleTreeView
            tree={tree}
            expandedPaths={expandedPaths}
            toggleExpanded={toggleExpanded}
            collapseAll={collapseAll}
          />
        ) : null)}

      {/* Add repository button when workspace is active */}
      {activeWorkspaceId && (
        <div className="flex h-9 shrink-0 items-center border-t border-ctp-surface0 px-2">
          <button
            onClick={openProject}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          >
            <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Add repository
          </button>
        </div>
      )}
    </div>
  );
}
