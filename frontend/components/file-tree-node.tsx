import { memo, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { FileIcon } from "./file-icon";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

export const FileTreeNode = memo(function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const expanded = useFileTreeStore((s) => !!s.expandedPaths[node.path]);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const selectFile = useFileTreeStore((s) => s.selectFile);
  const currentFile = useFilePreviewStore((s) => s.currentFile);
  const isActive = !node.isDir && currentFile === node.path;

  const handleClick = useCallback(() => {
    if (node.isDir) {
      toggleExpanded(node.path);
    } else {
      selectFile(node.path);
    }
  }, [node.isDir, node.path, toggleExpanded, selectFile]);

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors duration-100 hover:bg-ctp-surface0 group ${
        isActive ? "bg-ctp-surface0" : ""
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={handleClick}
    >
      {node.isDir ? (
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-ctp-overlay1 transition-transform duration-150 ${
            expanded ? "rotate-90" : ""
          }`}
          strokeWidth={1.5}
        />
      ) : (
        <div className="w-3 shrink-0" />
      )}

      <FileIcon
        isDir={node.isDir}
        extension={node.extension}
        isOpen={expanded}
      />

      <span className={`truncate text-sm group-hover:text-ctp-text ${
        isActive ? "text-ctp-text" : "text-ctp-subtext0"
      }`}>
        {node.name}
      </span>
    </button>
  );
});
