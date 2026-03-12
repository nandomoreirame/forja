import { useCallback, useMemo } from "react";
import { CircleHelp, Puzzle, Settings } from "lucide-react";
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
} from "@dnd-kit/sortable";
import { useRightPanelStore } from "@/stores/right-panel";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { usePluginsStore, getOrderedEnabledPlugins } from "@/stores/plugins";
import { getPluginIcon } from "@/lib/plugin-types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface SortablePluginIconProps {
  id: string;
  children: React.ReactNode;
}

function SortablePluginIcon({ id, children }: SortablePluginIconProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

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
      data-testid="sortable-plugin"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

interface RightSidebarProps {
  hasProject?: boolean;
}

export function RightSidebar({ hasProject = false }: RightSidebarProps) {
  const setSettingsOpen = useAppDialogsStore((s) => s.setSettingsOpen);
  const plugins = usePluginsStore((s) => s.plugins);
  const pluginOrder = usePluginsStore((s) => s.pluginOrder);
  const activePluginName = usePluginsStore((s) => s.activePluginName);
  const pluginBadges = usePluginsStore((s) => s.pluginBadges);

  const orderedPlugins = useMemo(
    () => getOrderedEnabledPlugins({ plugins, pluginOrder }),
    [plugins, pluginOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const pluginIds = useMemo(
    () => orderedPlugins.map((p) => p.manifest.name),
    [orderedPlugins],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    usePluginsStore.getState().reorderPlugins(String(active.id), String(over.id));
  }, []);

  return (
    <TooltipProvider delayDuration={500}>
      <div
        data-testid="right-sidebar"
        className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 bg-ctp-mantle py-2"
      >
        {/* Plugin icons (only when a project is active) */}
        {hasProject && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pluginIds}
              strategy={verticalListSortingStrategy}
            >
              {orderedPlugins.map((plugin) => {
                const Icon = getPluginIcon(plugin.manifest.icon) ?? Puzzle;
                const isActive = activePluginName === plugin.manifest.name;
                const badge = pluginBadges[plugin.manifest.name];
                return (
                  <SortablePluginIcon key={plugin.manifest.name} id={plugin.manifest.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={plugin.manifest.displayName}
                          onClick={() => {
                            if (isActive) {
                              usePluginsStore.getState().setActivePlugin(null);
                              useRightPanelStore.getState().setActiveView("empty");
                              if (useRightPanelStore.getState().isOpen) {
                                useRightPanelStore.getState().togglePanel();
                              }
                            } else {
                              usePluginsStore.getState().setActivePlugin(plugin.manifest.name);
                              useRightPanelStore.getState().setActiveView("plugin");
                              if (!useRightPanelStore.getState().isOpen) {
                                useRightPanelStore.getState().togglePanel();
                              }
                            }
                          }}
                          className={cn(
                            "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                            isActive
                              ? "bg-ctp-surface0 text-ctp-mauve"
                              : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.5} />
                          {badge && (
                            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-ctp-surface1 px-0.5 text-[8px] font-bold leading-tight text-ctp-mauve tabular-nums">
                              {badge}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>{plugin.manifest.displayName}</p>
                      </TooltipContent>
                    </Tooltip>
                  </SortablePluginIcon>
                );
              })}
            </SortableContext>
          </DndContext>
        )}

        {/* Utility buttons */}
        <div className="mt-auto flex flex-col items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Settings"
                onClick={() => setSettingsOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              >
                <Settings className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Help"
                className="flex h-9 w-9 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              >
                <CircleHelp className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Help</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
