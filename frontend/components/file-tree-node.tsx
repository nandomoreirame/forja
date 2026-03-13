import { memo, useCallback, useRef, useState, useEffect } from "react";
import { ChevronRight, Pencil, Trash2, FolderMinus } from "lucide-react";
import { FileIcon } from "./file-icon";
import { useFileTreeStore, type FileNode } from "@/stores/file-tree";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useGitStatusStore } from "@/stores/git-status";
import { useGitDiffStore } from "@/stores/git-diff";
import { useWorkspaceStore } from "@/stores/workspace";
import { getGitBadgeLetter, getGitStatusColor } from "@/lib/git-constants";
import { invoke } from "@/lib/ipc";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  projectPath?: string;
}

export const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  projectPath,
}: FileTreeNodeProps) {
  const expanded = useFileTreeStore((s) => !!s.expandedPaths[node.path]);
  const toggleExpanded = useFileTreeStore((s) => s.toggleExpanded);
  const selectFile = useFileTreeStore((s) => s.selectFile);
  const currentFile = useFilePreviewStore((s) => s.currentFile);
  const activeProjectPath = useFileTreeStore((s) => s.currentPath);
  const isActive = !node.isDir && currentFile === node.path;
  const effectiveProjectPath = projectPath ?? activeProjectPath;
  const projectCounters = useGitDiffStore((s) =>
    effectiveProjectPath ? s.projectCountersByPath[effectiveProjectPath] : undefined,
  );
  const isProjectRoot = Boolean(node.isDir && effectiveProjectPath && node.path === effectiveProjectPath);

  const relativePath = effectiveProjectPath
    ? node.path.substring(effectiveProjectPath.length + 1)
    : node.path;

  const fileStatus = useGitStatusStore((s) =>
    s.getFileStatus(relativePath, effectiveProjectPath ?? undefined),
  );
  const dirHasChanges = useGitStatusStore((s) =>
    node.isDir ? s.hasChangedChildren(relativePath, effectiveProjectPath ?? undefined) : false,
  );

  const statusColor = fileStatus ? getGitStatusColor(fileStatus) : null;
  const badgeLetter = fileStatus ? getGitBadgeLetter(fileStatus) : null;

  // Workspace state for "Remove from workspace"
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const removeProject = useWorkspaceStore((s) => s.removeProject);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const isInMultiProjectWorkspace = Boolean(
    activeWorkspace && activeWorkspace.projects.length > 1
  );

  // Rename inline state
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Focus rename input when it appears
  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  const loadSubdirectory = useFileTreeStore((s) => s.loadSubdirectory);

  const handleClick = useCallback(() => {
    if (renaming) return;
    if (node.isDir) {
      const wasExpanded = expanded;
      toggleExpanded(node.path);
      // Lazy-load children when expanding a directory with empty children (truncated by maxDepth)
      if (!wasExpanded && node.children && node.children.length === 0 && effectiveProjectPath) {
        loadSubdirectory(node.path, effectiveProjectPath);
      }
    } else {
      selectFile(node.path);
    }
  }, [node.isDir, node.path, toggleExpanded, selectFile, renaming, expanded, node.children, effectiveProjectPath, loadSubdirectory]);

  const handleRenameStart = useCallback(() => {
    setRenameValue(node.name);
    setRenaming(true);
  }, [node.name]);

  const handleRenameCommit = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === node.name || !effectiveProjectPath) {
      setRenaming(false);
      return;
    }

    const parentDir = node.path.substring(0, node.path.lastIndexOf("/"));
    const newPath = `${parentDir}/${trimmed}`;

    try {
      await invoke("rename_file_or_dir", {
        projectPath: effectiveProjectPath,
        oldPath: node.path,
        newPath,
      });
      // Reload tree after rename
      const { loadProjectTree } = useFileTreeStore.getState();
      await loadProjectTree(effectiveProjectPath);
    } catch (err) {
      console.error("[file-tree] Rename failed:", err);
    } finally {
      setRenaming(false);
    }
  }, [renameValue, node.name, node.path, effectiveProjectPath]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRenameCommit();
      } else if (e.key === "Escape") {
        setRenaming(false);
      }
    },
    [handleRenameCommit]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!effectiveProjectPath) return;
    setIsDeleting(true);
    try {
      await invoke("delete_file_or_dir", {
        projectPath: effectiveProjectPath,
        targetPath: node.path,
      });
      // Reload tree after delete
      const { loadProjectTree } = useFileTreeStore.getState();
      await loadProjectTree(effectiveProjectPath);
    } catch (err) {
      console.error("[file-tree] Delete failed:", err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [node.path, effectiveProjectPath]);

  const removeProjectTree = useFileTreeStore((s) => s.removeProjectTree);

  const handleRemoveFromWorkspace = useCallback(async () => {
    if (!activeWorkspaceId || !effectiveProjectPath) return;
    try {
      await removeProject(activeWorkspaceId, effectiveProjectPath);
      removeProjectTree(effectiveProjectPath);
    } catch (err) {
      console.error("[file-tree] Remove from workspace failed:", err);
    }
  }, [activeWorkspaceId, effectiveProjectPath, removeProject, removeProjectTree]);

  const nameColor = statusColor
    ? `${statusColor} group-hover:text-ctp-text`
    : isActive
      ? "text-ctp-text"
      : "text-ctp-subtext0 group-hover:text-ctp-text";
  const ignoredOpacity = node.ignored ? "opacity-50" : "";

  const nodeButton = (
    <button
      type="button"
      className={`flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors duration-100 hover:bg-ctp-surface0 group ${
        ignoredOpacity
      } ${
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

      {renaming ? (
        <input
          ref={renameInputRef}
          type="text"
          className="min-w-0 flex-1 rounded bg-ctp-surface1 px-1 py-0 text-sm text-ctp-text outline-none ring-1 ring-ctp-mauve"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameCommit}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={`truncate text-sm ${nameColor}`}>
          {node.name}
        </span>
      )}

      {isProjectRoot && projectCounters && projectCounters.total > 0 && (
        <span
          className="ml-auto shrink-0 text-[10px] font-medium text-ctp-overlay1"
          aria-label={`Changes: M:${projectCounters.modified} A:${projectCounters.added} D:${projectCounters.deleted} U:${projectCounters.untracked}`}
        >
          M:{projectCounters.modified} A:{projectCounters.added} D:{projectCounters.deleted} U:{projectCounters.untracked}
        </span>
      )}

      {/* Git status badge for files */}
      {!node.isDir && badgeLetter && statusColor && !isProjectRoot && (
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

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {nodeButton}
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-44 border-ctp-surface1 bg-overlay-mantle">
          <ContextMenuItem
            className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
            onSelect={handleRenameStart}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            Rename
          </ContextMenuItem>

          <ContextMenuItem
            className="gap-2 text-xs text-ctp-red focus:bg-ctp-surface0 focus:text-ctp-red"
            onSelect={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            Delete
          </ContextMenuItem>

          {/* Remove from workspace: shown only for project root in multi-project workspace */}
          {isProjectRoot && isInMultiProjectWorkspace && (
            <>
              <ContextMenuSeparator className="bg-ctp-surface0" />
              <ContextMenuItem
                className="gap-2 text-xs text-ctp-overlay1 focus:bg-ctp-surface0 focus:text-ctp-text"
                onSelect={handleRemoveFromWorkspace}
              >
                <FolderMinus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Remove from workspace
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-ctp-surface1 bg-overlay-mantle sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ctp-text">
              Delete {node.isDir ? "folder" : "file"}
            </DialogTitle>
            <DialogDescription className="text-ctp-subtext0">
              Are you sure you want to delete{" "}
              <span className="font-medium text-ctp-text">{node.name}</span>?
              {node.isDir && " This will delete all contents recursively."}
              {" "}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-ctp-red text-ctp-base hover:bg-ctp-red/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
