import { useState, useEffect } from "react";
import { Check, FolderOpen, Layers, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWorkspaceStore,
  type WorkspaceIcon,
} from "@/stores/workspace";
import { useFileTreeStore } from "@/stores/file-tree";
import {
  getWorkspaceIcon,
  WORKSPACE_ICON_LIST,
  WORKSPACE_ICON_MAP,
} from "@/lib/workspace-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<WorkspaceIcon>("layers");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const activateWorkspace = useWorkspaceStore((s) => s.activateWorkspace);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const updateWorkspaceDetails = useWorkspaceStore(
    (s) => s.updateWorkspaceDetails
  );
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);
  const hasWorkspaces = workspaces.length > 0;

  const activeIcon = activeWorkspace?.icon ?? "layers";
  const ActiveIcon = getWorkspaceIcon(activeIcon);

  function startEdit(wsId: string) {
    const ws = workspaces.find((w) => w.id === wsId);
    if (!ws) return;
    setEditingId(wsId);
    setEditName(ws.name);
    setEditIcon(ws.icon ?? "layers");
    setDeleteConfirmId(null);
  }

  async function confirmEdit(wsId: string) {
    await updateWorkspaceDetails(wsId, {
      name: editName,
      icon: editIcon,
    });
    setEditingId(null);
  }

  async function handleDelete(wsId: string) {
    if (deleteConfirmId === wsId) {
      await deleteWorkspace(wsId);
      setEditingId(null);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(wsId);
    }
  }

  async function handleSaveWorkspace() {
    const name = `New Workspace (${Math.random().toString(16).slice(2, 7)})`;
    const ws = await createWorkspace(name);

    // Add all currently loaded projects to the new workspace
    const trees = useFileTreeStore.getState().trees;
    const projectPaths = Object.keys(trees);
    const addProject = useWorkspaceStore.getState().addProject;
    for (const projectPath of projectPaths) {
      await addProject(ws.id, projectPath);
    }

    // Activate this workspace
    await useWorkspaceStore.getState().setActiveWorkspace(ws.id);
    await useWorkspaceStore.getState().loadWorkspaces();
    setIsOpen(false);
  }

  async function handleCreateNewWorkspace() {
    const name = `New Workspace (${Math.random().toString(16).slice(2, 7)})`;
    const ws = await createWorkspace(name);
    await activateWorkspace(ws.id);
    setIsOpen(false);
  }

  // --- Empty state: no workspaces saved yet ---
  if (!hasWorkspaces) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            aria-label="Workspace"
          >
            <Layers
              className="h-4 w-4"
              strokeWidth={1.5}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-56 border-none p-1 shadow-lg"
        >
          <button
            onClick={() => {
              /* TODO: open workspace from file */
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-app text-ctp-text transition-colors hover:bg-ctp-surface0"
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
            Open workspace
          </button>
          <button
            onClick={handleSaveWorkspace}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-app text-ctp-text transition-colors hover:bg-ctp-surface0"
          >
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            Save workspace
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  // --- Has workspaces: show switcher ---
  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setEditingId(null);
          setDeleteConfirmId(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          aria-label={`Workspace: ${activeWorkspace?.name ?? "None"}`}
        >
          <ActiveIcon
            className="h-4 w-4"
            strokeWidth={1.5}
          />
          {activeWorkspace && (
            <span className="text-app-sm font-medium text-ctp-text">
              {activeWorkspace.name}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-72 border-none p-1 shadow-lg"
      >
        <p className="px-2 py-1.5 text-app-sm font-semibold text-ctp-subtext0">
          Switch workspace
        </p>

        <div className="space-y-0.5">
          {workspaces.map((ws) => {
            const wsIcon = ws.icon ?? "layers";
            const WsIcon = getWorkspaceIcon(wsIcon);
            const isActive = ws.id === activeWorkspaceId;
            const isEditing = editingId === ws.id;

            if (isEditing) {
              return (
                <div
                  key={ws.id}
                  className="rounded-md bg-ctp-surface0/50 px-2 py-2 space-y-2"
                >
                  {/* Header row: icon + name + edit/confirm buttons */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const EditIcon = getWorkspaceIcon(editIcon);
                      return (
                        <EditIcon
                          className="h-3.5 w-3.5 shrink-0 text-ctp-text"
                          strokeWidth={1.5}
                        />
                      );
                    })()}
                    <span className="flex-1 text-app font-medium text-ctp-text truncate">
                      {ws.name}
                    </span>
                    <button
                      onClick={() => startEdit(ws.id)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text"
                      aria-label="Edit workspace"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => confirmEdit(ws.id)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-ctp-green transition-colors hover:bg-ctp-surface1"
                      aria-label="Confirm"
                    >
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Name input */}
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit(ws.id);
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setDeleteConfirmId(null);
                      }
                    }}
                    className="w-full rounded border border-ctp-green bg-ctp-surface0 px-2 py-1 text-app text-ctp-text outline-none"
                    placeholder="Workspace name"
                    autoFocus
                  />

                  {/* Icon picker - 7x2 grid (14 icons) */}
                  <div className="grid grid-cols-7 gap-1">
                    {WORKSPACE_ICON_LIST.map((icon) => {
                      const Icon = WORKSPACE_ICON_MAP[icon];
                      return (
                        <button
                          key={icon}
                          onClick={() => setEditIcon(icon)}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                            editIcon === icon
                              ? "bg-ctp-surface1 text-ctp-text"
                              : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
                          )}
                          aria-label={icon}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Delete */}
                  <div className="flex items-center justify-center pt-1">
                    <button
                      onClick={() => handleDelete(ws.id)}
                      className="inline-flex items-center gap-1 text-app-sm text-ctp-red transition-colors hover:underline"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      {deleteConfirmId === ws.id
                        ? "Click again to confirm"
                        : "Delete workspace"}
                    </button>
                  </div>
                </div>
              );
            }

            // Active workspace (not editing)
            if (isActive) {
              return (
                <div
                  key={ws.id}
                  className="flex items-center gap-2 rounded-md bg-ctp-surface0/50 px-2 py-1.5"
                >
                  <WsIcon
                    className="h-3.5 w-3.5 shrink-0 text-ctp-text"
                    strokeWidth={1.5}
                  />
                  <span className="flex-1 text-app font-medium text-ctp-text truncate">
                    {ws.name}
                  </span>
                  <button
                    onClick={() => startEdit(ws.id)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface1 hover:text-ctp-text"
                    aria-label="Edit workspace"
                  >
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-ctp-green"
                    strokeWidth={1.5}
                  />
                </div>
              );
            }

            // Inactive workspace
            return (
              <button
                key={ws.id}
                onClick={async () => {
                  await activateWorkspace(ws.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-app text-ctp-text transition-colors hover:bg-ctp-surface0"
                aria-label={ws.name}
              >
                <WsIcon
                  className="h-3.5 w-3.5 shrink-0 text-ctp-overlay1"
                  strokeWidth={1.5}
                />
                <span className="flex-1 text-left truncate">{ws.name}</span>
              </button>
            );
          })}
        </div>

        {/* Footer: create new workspace */}
        <div className="mt-1 border-t border-ctp-surface0 pt-1">
          <button
            onClick={handleCreateNewWorkspace}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-app text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Create new workspace
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
