import { memo, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { FileIcon } from "./file-icon";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useGitStatusStore } from "@/stores/git-status";
import { getGitBadgeLetter, getGitStatusColor } from "@/lib/git-constants";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

export const FileTreeNode = memo(function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const expanded = useFileTreeStore((s) => !!s.expandedPaths[node.path]);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const selectFile = useFileTreeStore((s) => s.selectFile);
  const currentFile = useFilePreviewStore((s) => s.currentFile);
  const projectPath = useFileTreeStore((s) => s.currentPath);
  const isActive = !node.isDir && currentFile === node.path;

  const relativePath = projectPath
    ? node.path.substring(projectPath.length + 1)
    : node.path;

  const fileStatus = useGitStatusStore((s) => s.getFileStatus(relativePath));
  const dirHasChanges = useGitStatusStore((s) =>
    node.isDir ? s.hasChangedChildren(relativePath) : false,
  );

  const statusColor = fileStatus ? getGitStatusColor(fileStatus) : null;
  const badgeLetter = fileStatus ? getGitBadgeLetter(fileStatus) : null;

  const handleClick = useCallback(() => {
    if (node.isDir) {
      toggleExpanded(node.path);
    } else {
      selectFile(node.path);
    }
  }, [node.isDir, node.path, toggleExpanded, selectFile]);

  const nameColor = statusColor
    ? `${statusColor} group-hover:text-ctp-text`
    : isActive
      ? "text-ctp-text"
      : "text-ctp-subtext0 group-hover:text-ctp-text";

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

      <span className={`truncate text-sm ${nameColor}`}>
        {node.name}
      </span>

      {/* Git status badge for files */}
      {!node.isDir && badgeLetter && statusColor && (
        <span
          className={`ml-auto shrink-0 text-xs font-medium ${statusColor}`}
          aria-label={`Git status: ${badgeLetter}`}
        >
          {badgeLetter}
        </span>
      )}

      {/* Yellow dot indicator for directories with changes */}
      {node.isDir && dirHasChanges && (
        <span
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-ctp-yellow"
          aria-label="Directory has changes"
        />
      )}
    </button>
  );
});
