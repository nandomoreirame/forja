import { useCallback, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import * as icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { useQuickActionsStore } from "@/stores/quick-actions";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { usePluginsStore, getOrderedEnabledPlugins } from "@/stores/plugins";
import { getPluginIcon } from "@/lib/plugin-types";
import { useFileTreeStore } from "@/stores/file-tree";
import { getAction, getDynamicActions, type ActionRegistryEntry } from "@/lib/action-registry";
import { executeAction } from "@/lib/action-executor";
import { useInstalledClis } from "@/hooks/use-installed-clis";
import { CliIcon } from "./cli-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu";
import type { SessionType } from "@/lib/cli-registry";

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

/**
 * Convert a kebab-case icon name from the action registry to a PascalCase
 * Lucide component reference.
 */
function getIconComponent(iconName: string): LucideIcon {
  const pascalCase = iconName
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return (icons as Record<string, LucideIcon>)[pascalCase] ?? icons.CircleDot;
}

const BUTTON_CLASS =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text";

interface SortableActionProps {
  id: string;
  children: React.ReactNode;
}

function SortableAction({ id, children }: SortableActionProps) {
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
      data-testid="sortable-action"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export function QuickActions() {
  const actions = useQuickActionsStore((s) => s.actions);
  const loaded = useQuickActionsStore((s) => s.loaded);
  const loadActions = useQuickActionsStore((s) => s.loadActions);
  const openPalette = useCommandPaletteStore((s) => s.open);
  const currentPath = useFileTreeStore((s) => s.currentPath);
  const { installedClis } = useInstalledClis();
  const plugins = usePluginsStore((s) => s.plugins);
  const pluginOrder = usePluginsStore((s) => s.pluginOrder);

  const enabledPlugins = useMemo(
    () => getOrderedEnabledPlugins({ plugins, pluginOrder }),
    [plugins, pluginOrder],
  );

  // Build a lookup map for dynamic actions (session:* and plugin:*)
  const dynamicActionMap = useMemo(() => {
    const cliInfos = installedClis.map((c) => ({ id: c.id, displayName: c.displayName }));
    const pluginInfos = enabledPlugins.map((p) => ({
      name: p.manifest.name,
      displayName: p.manifest.displayName,
      icon: p.manifest.icon,
    }));
    const dynamic = getDynamicActions(cliInfos, pluginInfos);
    const map = new Map<string, ActionRegistryEntry>();
    for (const a of dynamic) map.set(a.id, a);
    return map;
  }, [installedClis, enabledPlugins]);

  const actionIds = useMemo(
    () => actions.map((a) => a.actionId),
    [actions],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = actionIds.indexOf(String(active.id));
    const newIndex = actionIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    useQuickActionsStore.getState().moveAction(oldIndex, newIndex);
  }, [actionIds]);

  useEffect(() => {
    if (!loaded) {
      loadActions();
    }
  }, [loaded, loadActions]);

  return (
    <TooltipProvider delayDuration={500}>
    <div className="flex items-center gap-0.5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={actionIds}
          strategy={horizontalListSortingStrategy}
        >
          {actions.map(({ actionId }) => {
            // Resolve from static registry first, then dynamic
            const action = getAction(actionId) ?? dynamicActionMap.get(actionId);
            if (!action) return null;

            // For session actions, use CliIcon for proper branded icons
            const isSession = actionId.startsWith("session:");
            const isPlugin = actionId.startsWith("plugin:");
            const sessionType = isSession ? actionId.slice("session:".length) : null;
            const pluginName = isPlugin ? actionId.slice("plugin:".length) : null;
            const pluginMeta = pluginName
              ? enabledPlugins.find((p) => p.manifest.name === pluginName)
              : null;
            const PluginIconComponent = pluginMeta
              ? getPluginIcon(pluginMeta.manifest.icon)
              : null;

            const disabled = action.requiresProject && !currentPath;
            const tooltipLabel = disabled
              ? `${action.label} — available only with an active project`
              : action.shortcut
                ? `${action.label} (${action.shortcut})`
                : action.label;

            return (
              <SortableAction key={actionId} id={actionId}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            aria-label={action.label}
                            className={cn(BUTTON_CLASS, disabled && "opacity-30 cursor-default")}
                            onClick={() => { if (!disabled) executeAction(actionId); }}
                          >
                            {isSession && sessionType ? (
                              <CliIcon sessionType={sessionType as SessionType} className="h-3.5 w-3.5" />
                            ) : PluginIconComponent ? (
                              <PluginIconComponent className="h-3.5 w-3.5" strokeWidth={1.5} />
                            ) : (
                              (() => {
                                const Icon = getIconComponent(action.icon);
                                return <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />;
                              })()
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {tooltipLabel}
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-48 border-ctp-surface1 bg-overlay-mantle">
                    <ContextMenuItem
                      onSelect={() => useQuickActionsStore.getState().removeAction(actionId)}
                      className="gap-2 text-app-sm text-ctp-red focus:bg-ctp-surface0 focus:text-ctp-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Remove from quick actions
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </SortableAction>
            );
          })}
        </SortableContext>
      </DndContext>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Add quick action"
            className={cn(BUTTON_CLASS, "text-ctp-overlay0")}
            onClick={() => openPalette("quick-actions")}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Add quick action
        </TooltipContent>
      </Tooltip>
    </div>
    </TooltipProvider>
  );
}
