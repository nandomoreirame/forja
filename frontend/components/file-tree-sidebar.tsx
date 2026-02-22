import { X, Search, Copy, FilePlus, FolderOpen } from "lucide-react";
import { useFileTreeStore } from "@/stores/file-tree";
import { FileTreeNode } from "./file-tree-node";
import { FileIcon } from "./file-icon";

export function FileTreeSidebar() {
  const { isOpen, tree, openProject, toggleSidebar } = useFileTreeStore();

  if (!isOpen) return null;

  return (
    <div
      data-testid="file-tree-sidebar"
      className="flex h-full w-64 shrink-0 flex-col border-r border-ctp-surface0 bg-ctp-mantle"
    >
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ctp-surface0 px-3">
        <div className="flex items-center gap-1">
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text"
            aria-label="New file"
            title="New file"
          >
            <FilePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text"
            aria-label="Search"
            title="Search"
          >
            <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text"
            aria-label="Copy path"
            title="Copy path"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <button
          onClick={toggleSidebar}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-ctp-overlay1 transition-colors duration-100 hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label="Close sidebar"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Project name header */}
      {tree && (
        <div className="flex items-center gap-2 border-b border-ctp-surface0 px-3 py-2">
          <FileIcon isDir isOpen />
          <span className="text-sm font-semibold text-ctp-text">
            {tree.root.name}
          </span>
        </div>
      )}

      {/* File tree */}
      <div className="file-tree-scroll flex-1 overflow-y-auto">
        {tree ? (
          <div className="py-1">
            {tree.root.children?.map((node) => (
              <FileTreeNode key={node.path} node={node} depth={0} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12">
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
