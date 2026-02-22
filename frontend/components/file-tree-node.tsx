import { ChevronRight } from "lucide-react";
import { FileIcon } from "./file-icon";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

export function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const { isExpanded, toggleExpanded } = useFileTreeStore();
  const expanded = isExpanded(node.path);

  const handleClick = () => {
    if (node.isDir) {
      toggleExpanded(node.path);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors duration-100 hover:bg-ctp-surface0 group"
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

        <span className="truncate text-sm text-ctp-subtext0 group-hover:text-ctp-text">
          {node.name}
        </span>
      </button>

      {node.isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
