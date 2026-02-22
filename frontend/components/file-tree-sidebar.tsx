import { useFileTreeStore } from "@/stores/file-tree";
import { ChevronsDownUp, FolderOpen } from "lucide-react";
import { FileIcon } from "./file-icon";
import { FileTreeNode } from "./file-tree-node";

export function FileTreeSidebar() {
  const { isOpen, tree, expandedPaths, openProject, collapseAll } = useFileTreeStore();

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
            disabled={expandedPaths.size === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Collapse all folders"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* File tree */}
      <div className="file-tree-scroll flex-1 overflow-y-auto">
        {tree ? (
          <div className="py-1">
            {tree.root.children?.map((node) => (
              <FileTreeNode key={node.path} node={node} depth={0} />
            ))}
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
