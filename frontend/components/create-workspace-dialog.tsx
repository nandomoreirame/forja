import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function CreateWorkspaceDialog() {
  const open = useAppDialogsStore((s) => s.createWorkspaceOpen);
  const pendingPath = useAppDialogsStore((s) => s.createWorkspacePendingPath);
  const editingWorkspaceId = useAppDialogsStore((s) => s.createWorkspaceEditId);
  const initialName = useAppDialogsStore((s) => s.createWorkspaceInitialName);
  const setOpen = useAppDialogsStore((s) => s.setCreateWorkspaceOpen);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const renameWorkspace = useWorkspaceStore((s) => s.renameWorkspace);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const isRenameMode = Boolean(editingWorkspaceId);

  useEffect(() => {
    if (open) {
      setName(initialName ?? "");
    }
  }, [open, initialName]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      if (editingWorkspaceId) {
        await renameWorkspace(editingWorkspaceId, name.trim());
      } else {
        await createWorkspace(name.trim(), pendingPath ?? undefined);
      }
      setName("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setName("");
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border-ctp-surface0 bg-overlay-base">
        <DialogHeader>
          <DialogTitle className="text-ctp-text">
            {isRenameMode ? "Rename Workspace" : "Create Workspace"}
          </DialogTitle>
          <DialogDescription className="text-ctp-overlay1">
            {isRenameMode
              ? "Update workspace name"
              : pendingPath
              ? `Create a workspace with "${pendingPath.split("/").pop()}"`
              : "Create a new workspace to group projects"}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label htmlFor="workspace-name" className="mb-2 block text-app text-ctp-subtext0">
            Workspace name
          </label>
          <input
            id="workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="My Workspace"
            autoFocus
            className="w-full rounded-md border border-ctp-surface0 bg-overlay-mantle px-3 py-2 text-app text-ctp-text placeholder:text-ctp-overlay0 focus:border-brand focus:outline-none"
          />
        </div>
        <DialogFooter>
          <button
            onClick={() => handleOpenChange(false)}
            className="rounded-md px-4 py-2 text-app text-ctp-overlay1 transition-colors hover:text-ctp-text"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="rounded-md bg-brand px-4 py-2 text-app font-medium text-ctp-base transition-colors hover:bg-brand/90 disabled:opacity-50"
          >
            {creating ? (isRenameMode ? "Renaming..." : "Creating...") : isRenameMode ? "Rename" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
