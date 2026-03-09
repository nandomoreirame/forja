import {
  CircleHelp,
  FolderOpen,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useProjectsStore, type Project } from "@/stores/projects";
import { useFileTreeStore } from "@/stores/file-tree";
import { invoke, open } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useAgentChatStore } from "@/stores/agent-chat";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
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

interface ProjectIconProps {
  project: Project;
  isActive: boolean;
  onSelect: (path: string) => void;
  onEditRequest: (project: Project) => void;
  onRemoveRequest: (project: Project) => void;
  initial: string;
  color: string;
  sessionState?: string;
  isUnread?: boolean;
  shortcutIndex?: number | null;
}

function ProjectIcon({
  project,
  isActive,
  onSelect,
  onEditRequest,
  onRemoveRequest,
  initial,
  color,
  sessionState,
  isUnread,
  shortcutIndex,
}: ProjectIconProps) {
  const showSpinner = !isActive && sessionState === "running";
  const showBadge = !isActive && isUnread && sessionState === "exited";
  const [imgError, setImgError] = useState(false);

  const hasIcon = !!project.iconPath && !imgError;

  const iconButton = (
    <button
      type="button"
      aria-label={`Switch to project: ${project.name}`}
      aria-pressed={isActive}
      onClick={() => onSelect(project.path)}
      className={cn(
        "group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all duration-150",
        isActive
          ? "ring-2 ring-ctp-mauve ring-offset-1 ring-offset-ctp-mantle"
          : "opacity-70 hover:opacity-100"
      )}
      style={{ backgroundColor: `${color}22`, color }}
    >
      {hasIcon && (
        <img
          src={project.iconPath!}
          alt={project.name}
          className="h-6 w-6 rounded object-contain"
          onError={() => setImgError(true)}
        />
      )}
      {!hasIcon && <span>{initial}</span>}
      {isActive && (
        <span
          className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-ctp-mauve"
          aria-hidden="true"
        />
      )}
      {showSpinner && (
        <span
          data-testid={`session-spinner-${project.path}`}
          className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ctp-mantle"
          aria-label={`${project.name} has an active session`}
        >
          <Loader2 className="h-2.5 w-2.5 animate-spin text-ctp-blue" strokeWidth={2.5} />
        </span>
      )}
      {showBadge && (
        <span
          data-testid={`session-badge-${project.path}`}
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-ctp-green ring-1 ring-ctp-mantle"
          aria-label={`${project.name} session finished`}
        />
      )}
      {shortcutIndex != null && (
        <span
          className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ctp-surface0 text-[10px] font-bold text-ctp-mauve ring-1 ring-ctp-mantle"
          aria-hidden="true"
        >
          {shortcutIndex}
        </span>
      )}
    </button>
  );

  return (
    <Tooltip>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>
            {iconButton}
          </TooltipTrigger>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-44 border-ctp-surface1 bg-ctp-mantle">
          <ContextMenuItem
            className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
            onSelect={() => onEditRequest(project)}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            Edit Project...
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-ctp-surface0" />
          <ContextMenuItem
            className="gap-2 text-xs text-ctp-red focus:bg-ctp-surface0 focus:text-ctp-red"
            onSelect={() => onRemoveRequest(project)}
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            Remove Project
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <TooltipContent side="right" className="max-w-xs">
        <p className="font-semibold">{project.name}</p>
        <p className="text-xs text-ctp-overlay1">{project.path}</p>
      </TooltipContent>
    </Tooltip>
  );
}

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface SortableProjectIconProps extends ProjectIconProps {
  id: string;
}

function SortableProjectIcon({ id, ...props }: SortableProjectIconProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="sortable-project"
      {...attributes}
      {...listeners}
    >
      <ProjectIcon {...props} />
    </div>
  );
}

interface ProjectSidebarProps {
  onOpenProject: () => void;
}

export function ProjectSidebar({ onOpenProject }: ProjectSidebarProps) {
  const store = useProjectsStore();
  const {
    projects,
    activeProjectPath,
    switchToProject,
    getProjectInitial,
    getProjectColor,
    sessionStates,
    unreadProjects,
    removeProject,
    updateProject,
    reorderProjects,
  } = store;

  const toggleChat = useAgentChatStore((s) => s.togglePanel);
  const isChatOpen = useAgentChatStore((s) => s.isPanelOpen);
  const setSettingsOpen = useAppDialogsStore((s) => s.setSettingsOpen);

  const [altPressed, setAltPressed] = useState(false);

  useEffect(() => {
    const sync = (e: KeyboardEvent) => setAltPressed(e.altKey);
    const clear = () => setAltPressed(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", clear);
    };
  }, []);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editIconPath, setEditIconPath] = useState("");
  const [removingProject, setRemovingProject] = useState<Project | null>(null);

  const handleSelect = useCallback(
    (projectPath: string) => {
      switchToProject(projectPath);
      if (isChatOpen) {
        toggleChat();
      }
    },
    [switchToProject, isChatOpen, toggleChat]
  );

  const handleEditRequest = useCallback((project: Project) => {
    setEditName(project.name);
    setEditIconPath(project.iconPath ?? "");
    setEditingProject(project);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingProject) return;
    updateProject(editingProject.path, {
      name: editName.trim() || editingProject.name,
      iconPath: editIconPath.trim() || null,
    });
    setEditingProject(null);
  }, [editingProject, editName, editIconPath, updateProject]);

  const handleBrowseIcon = useCallback(async () => {
    const result = await open({
      title: "Select project icon",
      filters: [
        { name: "Images", extensions: ["svg", "png", "ico", "jpg", "jpeg", "webp"] },
      ],
    });
    if (typeof result === "string") {
      const dataUrl = await invoke<string | null>("read_icon_as_data_url", { path: result });
      setEditIconPath(dataUrl ?? result);
    }
  }, []);

  const handleRemoveRequest = useCallback((project: Project) => {
    setRemovingProject(project);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const projectIds = useMemo(() => projects.map((p) => p.path), [projects]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = projects.findIndex((p) => p.path === active.id);
      const newIndex = projects.findIndex((p) => p.path === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderProjects(oldIndex, newIndex);
      }
    },
    [projects, reorderProjects]
  );

  const handleRemoveConfirm = useCallback(() => {
    if (!removingProject) return;
    removeProject(removingProject.path);
    useFileTreeStore.getState().removeProjectTree(removingProject.path);
    setRemovingProject(null);
  }, [removingProject, removeProject]);

  return (
    <TooltipProvider delayDuration={500}>
      <div
        data-testid="project-sidebar"
        className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 bg-ctp-mantle py-2"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projectIds}
            strategy={verticalListSortingStrategy}
          >
            {projects.map((project, index) => (
              <SortableProjectIcon
                key={project.path}
                id={project.path}
                project={project}
                isActive={project.path === activeProjectPath}
                onSelect={handleSelect}
                onEditRequest={handleEditRequest}
                onRemoveRequest={handleRemoveRequest}
                initial={getProjectInitial(project.name)}
                color={getProjectColor(project.name)}
                sessionState={sessionStates?.[project.path]}
                isUnread={unreadProjects?.has(project.path)}
                shortcutIndex={altPressed && index < 9 ? index + 1 : null}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Add project"
              onClick={onOpenProject}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-ctp-surface1 text-ctp-overlay1 transition-colors hover:border-ctp-surface2 hover:text-ctp-text"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add project</p>
          </TooltipContent>
        </Tooltip>

        <div className="mt-auto flex flex-col items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Settings"
                onClick={() => setSettingsOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              >
                <Settings className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Chat"
                aria-pressed={isChatOpen}
                onClick={toggleChat}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  isChatOpen
                    ? "bg-ctp-surface0 text-ctp-mauve"
                    : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
                )}
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Chat</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Help"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              >
                <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Help</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="border-ctp-surface1 bg-ctp-mantle sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ctp-text">Edit Project</DialogTitle>
            <DialogDescription className="text-ctp-subtext0">
              Change the display name or icon for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {editIconPath && (
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ctp-surface0">
                  <img
                    src={editIconPath}
                    alt="Icon preview"
                    className="h-8 w-8 rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ctp-subtext0">Name</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-1.5 text-sm text-ctp-text outline-none focus:border-ctp-mauve"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ctp-subtext0">Icon path</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={editIconPath}
                  onChange={(e) => setEditIconPath(e.target.value)}
                  placeholder="/path/to/icon.svg"
                  className="min-w-0 flex-1 rounded-md border border-ctp-surface1 bg-ctp-base px-3 py-1.5 text-sm text-ctp-text placeholder:text-ctp-overlay0 outline-none focus:border-ctp-mauve"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBrowseIcon}
                  className="shrink-0 border-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text"
                  aria-label="Browse for icon file"
                >
                  <FolderOpen className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
                  Browse
                </Button>
              </div>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingProject(null)}
              className="border-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEditSave}
              className="bg-ctp-mauve text-ctp-base hover:bg-ctp-mauve/90"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Project Confirmation Dialog */}
      <Dialog open={!!removingProject} onOpenChange={(open) => !open && setRemovingProject(null)}>
        <DialogContent className="border-ctp-surface1 bg-ctp-mantle sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ctp-text">
              Remove project {removingProject?.name}?
            </DialogTitle>
            <DialogDescription className="text-ctp-subtext0">
              This will not delete any files. The project will be removed from the sidebar only.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemovingProject(null)}
              className="border-ctp-surface1 text-ctp-subtext0 hover:bg-ctp-surface0 hover:text-ctp-text"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveConfirm}
              className="bg-ctp-red text-ctp-base hover:bg-ctp-red/90"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
