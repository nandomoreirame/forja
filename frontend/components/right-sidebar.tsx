import { useCallback, useMemo } from "react";
import { CircleHelp, Pin, PinOff, Puzzle, Settings } from "lucide-react";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

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
  const pinnedPluginName = usePluginsStore((s) => s.pinnedPluginName);
  const pluginBadges = usePluginsStore((s) => s.pluginBadges);
  const isRightPanelOpen = useRightPanelStore((s) => s.isOpen);

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

  const handlePluginIconClick = useCallback(
    (pluginName: string) => {
      const isActive =
        isRightPanelOpen && activePluginName === pluginName;
      const isPinned = pinnedPluginName === pluginName;

      // Pinned plugin: cannot be closed by clicking its own icon
      if (isPinned && isActive) {
        return;
      }

      if (isActive) {
        // Non-pinned active plugin: clicking closes or reverts to pinned plugin
        if (pinnedPluginName) {
          // Revert to pinned plugin
          usePluginsStore.getState().setActivePlugin(pinnedPluginName);
          useRightPanelStore.getState().setActiveView("plugin");
        } else {
          // No pinned plugin — close panel
          useRightPanelStore.getState().setActiveView("empty");
          useRightPanelStore.getState().togglePanel();
        }
      } else {
        // Open this plugin (temporarily if there's a pinned one)
        usePluginsStore.getState().setActivePlugin(pluginName);
        useRightPanelStore.getState().setActiveView("plugin");
        if (!useRightPanelStore.getState().isOpen) {
          useRightPanelStore.getState().togglePanel();
        }
      }
    },
    [isRightPanelOpen, activePluginName, pinnedPluginName],
  );

  const handlePinPlugin = useCallback((pluginName: string) => {
    usePluginsStore.getState().pinPlugin(pluginName);
    // Make sure the pinned plugin is active and panel is open
    usePluginsStore.getState().setActivePlugin(pluginName);
    useRightPanelStore.getState().setActiveView("plugin");
    if (!useRightPanelStore.getState().isOpen) {
      useRightPanelStore.getState().togglePanel();
    }
  }, []);

  const handleUnpinPlugin = useCallback(() => {
    usePluginsStore.getState().unpinPlugin();
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
                // Only visually "active" when the panel is open with this plugin.
                // When the panel is closed, the plugin stays mounted (webview keeps
                // running) so background features like badges continue to work.
                const isActive = isRightPanelOpen && activePluginName === plugin.manifest.name;
                const isPinned = pinnedPluginName === plugin.manifest.name;
                const badge = pluginBadges[plugin.manifest.name];
                return (
                  <SortablePluginIcon key={plugin.manifest.name} id={plugin.manifest.name}>
                    <ContextMenu>
                      <Tooltip>
                        <ContextMenuTrigger asChild>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={plugin.manifest.displayName}
                              onClick={() => handlePluginIconClick(plugin.manifest.name)}
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
                              {isPinned && (
                                <span
                                  data-testid={`pin-indicator-${plugin.manifest.name}`}
                                  className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-ctp-mauve"
                                >
                                  <Pin className="h-1.5 w-1.5 fill-ctp-base text-ctp-base" strokeWidth={1.5} />
                                </span>
                              )}
                            </button>
                          </TooltipTrigger>
                        </ContextMenuTrigger>
                        <TooltipContent side="left">
                          <p>
                            {plugin.manifest.displayName}
                            {isPinned && " (pinned)"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <ContextMenuContent className="min-w-48 border-ctp-surface1 bg-ctp-mantle">
                        {isPinned ? (
                          <ContextMenuItem
                            className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
                            onSelect={handleUnpinPlugin}
                          >
                            <PinOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Unpin {plugin.manifest.displayName}
                          </ContextMenuItem>
                        ) : (
                          <ContextMenuItem
                            className="gap-2 text-xs text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
                            onSelect={() => handlePinPlugin(plugin.manifest.name)}
                          >
                            <Pin className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Pin {plugin.manifest.displayName}
                          </ContextMenuItem>
                        )}
                        {pinnedPluginName && !isPinned && (
                          <>
                            <ContextMenuSeparator className="bg-ctp-surface0" />
                            <ContextMenuItem
                              className="gap-2 text-xs text-ctp-overlay1 focus:bg-ctp-surface0 focus:text-ctp-text"
                              disabled
                            >
                              <Pin className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {pinnedPluginName} is pinned
                            </ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
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
