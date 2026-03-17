import { useCallback, useMemo, useRef } from "react";
import { CircleHelp, Globe, Pin, PinOff, Plus, Puzzle, Settings, Trash2 } from "lucide-react";
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
import { DockLocation } from "flexlayout-react";
import { useRightPanelStore } from "@/stores/right-panel";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { usePluginsStore, getOrderedEnabledPlugins } from "@/stores/plugins";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
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
  const pinnedPluginName = usePluginsStore((s) => s.pinnedPluginName);
  const pluginBadges = usePluginsStore((s) => s.pluginBadges);
  const isRightPanelOpen = useRightPanelStore((s) => s.isOpen);

  const orderedPlugins = useMemo(
    () => getOrderedEnabledPlugins({ plugins, pluginOrder }),
    [plugins, pluginOrder],
  );

  const globalPlugins = useMemo(
    () => orderedPlugins.filter((p) => p.manifest.scope === "global"),
    [orderedPlugins],
  );

  const projectPlugins = useMemo(
    () => orderedPlugins.filter((p) => (p.manifest.scope ?? "project") === "project"),
    [orderedPlugins],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const visiblePlugins = useMemo(
    () => [...globalPlugins, ...(hasProject ? projectPlugins : [])],
    [globalPlugins, projectPlugins, hasProject],
  );

  const pluginIds = useMemo(
    () => visiblePlugins.map((p) => p.manifest.name),
    [visiblePlugins],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    usePluginsStore.getState().reorderPlugins(String(active.id), String(over.id));
  }, []);

  const handlePluginIconClick = useCallback(
    (pluginName: string) => {
      const tiling = useTilingLayoutStore.getState();
      const blockId = `block-plugin-${pluginName}`;

      if (tiling.hasBlock(blockId)) {
        // Already open — select/focus the tab
        tiling.selectTab(blockId);
      } else {
        // Open plugin in a RIGHT split
        const pluginMeta = usePluginsStore
          .getState()
          .plugins.find((p) => p.manifest.name === pluginName)?.manifest;
        tiling.addBlock(
          { type: "plugin", pluginName, pluginDisplayName: pluginMeta?.displayName, pluginIcon: pluginMeta?.icon },
          undefined,
          blockId,
          DockLocation.RIGHT,
        );
      }

      usePluginsStore.getState().setActivePlugin(pluginName);
      // Keep right panel store in sync for compatibility
      useRightPanelStore.getState().setActiveView("plugin");
      if (!useRightPanelStore.getState().isOpen) {
        useRightPanelStore.getState().togglePanel();
      }
    },
    [],
  );

  const handlePinPlugin = useCallback((pluginName: string) => {
    usePluginsStore.getState().pinPlugin(pluginName);
    usePluginsStore.getState().setActivePlugin(pluginName);

    // Ensure the plugin block exists in tiling layout
    const tiling = useTilingLayoutStore.getState();
    const blockId = `block-plugin-${pluginName}`;
    if (!tiling.hasBlock(blockId)) {
      const pluginMeta = usePluginsStore
        .getState()
        .plugins.find((p) => p.manifest.name === pluginName)?.manifest;
      tiling.addBlock(
        { type: "plugin", pluginName, pluginDisplayName: pluginMeta?.displayName, pluginIcon: pluginMeta?.icon },
        undefined,
        blockId,
        DockLocation.RIGHT,
      );
    }
  }, []);

  const handleUnpinPlugin = useCallback(() => {
    usePluginsStore.getState().unpinPlugin();
  }, []);

  const handleUninstallPlugin = useCallback((pluginName: string) => {
    usePluginsStore.getState().uninstallPlugin(pluginName);
  }, []);

  const hasBrowserBlock = useTilingLayoutStore((s) => s.hasBlockOfType("browser"));
  const activeView = useRightPanelStore((s) => s.activeView);

  const browserCounterRef = useRef(0);
  const handleBrowserClick = useCallback(() => {
    const tiling = useTilingLayoutStore.getState();
    browserCounterRef.current += 1;
    const blockId = `browser-${Date.now().toString(36)}-${browserCounterRef.current}`;
    tiling.addBlock({ type: "browser", url: "https://github.com/nandomoreirame/forja" }, undefined, blockId);
  }, []);

  const handleMarketplaceClick = useCallback(() => {
    const tiling = useTilingLayoutStore.getState();
    const blockId = "block-marketplace";

    if (tiling.hasBlock(blockId)) {
      tiling.removeBlock(blockId);
    } else {
      tiling.addBlock(
        { type: "marketplace" },
        undefined,
        blockId,
      );
    }

    // Keep right panel store in sync for compatibility
    useRightPanelStore.getState().setActiveView("marketplace");
  }, []);

  return (
    <TooltipProvider delayDuration={500}>
      <div
        data-testid="right-sidebar"
        className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 bg-ctp-mantle py-2"
      >
        {/* Browser icon (built-in, always visible) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Browser"
              onClick={handleBrowserClick}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                hasBrowserBlock
                  ? "bg-ctp-surface0 text-ctp-mauve"
                  : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
              )}
            >
              <Globe className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Browser</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider between built-in icons and installed plugins */}
        {visiblePlugins.length > 0 && (
          <div className="mx-auto h-px w-6 bg-ctp-surface1" />
        )}

        {/* Plugin icons (global always, project only with active project) */}
        {visiblePlugins.length > 0 && (
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
              {visiblePlugins.map((plugin) => {
                const Icon = getPluginIcon(plugin.manifest.icon) ?? Puzzle;
                // Only visually "active" when the panel is open with this plugin.
                // When the panel is closed, the plugin stays mounted (webview keeps
                // running) so background features like badges continue to work.
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
                              className="relative flex h-9 w-9 items-center justify-center rounded-md text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
                            >
                              <Icon className="h-4 w-4" strokeWidth={1.5} />
                              {badge && (
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-ctp-surface1 px-0.5 text-app-2xs font-bold leading-tight text-ctp-mauve tabular-nums">
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
                      <ContextMenuContent className="min-w-48 border-ctp-surface1 bg-overlay-mantle">
                        {isPinned ? (
                          <ContextMenuItem
                            className="gap-2 text-app-sm text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
                            onSelect={handleUnpinPlugin}
                          >
                            <PinOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Unpin {plugin.manifest.displayName}
                          </ContextMenuItem>
                        ) : (
                          <ContextMenuItem
                            className="gap-2 text-app-sm text-ctp-subtext0 focus:bg-ctp-surface0 focus:text-ctp-text"
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
                              className="gap-2 text-app-sm text-ctp-overlay1 focus:bg-ctp-surface0 focus:text-ctp-text"
                              disabled
                            >
                              <Pin className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {pinnedPluginName} is pinned
                            </ContextMenuItem>
                          </>
                        )}
                        <ContextMenuSeparator className="bg-ctp-surface0" />
                        <ContextMenuItem
                          className="gap-2 text-app-sm text-ctp-red focus:bg-ctp-surface0 focus:text-ctp-red"
                          onSelect={() => handleUninstallPlugin(plugin.manifest.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Uninstall plugin
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </SortablePluginIcon>
                );
              })}
            </SortableContext>
          </DndContext>
        )}

        {/* Marketplace button (always visible) */}
        <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Marketplace"
                onClick={handleMarketplaceClick}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  isRightPanelOpen && activeView === "marketplace"
                    ? "bg-ctp-surface0 text-ctp-mauve"
                    : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Marketplace</p>
            </TooltipContent>
        </Tooltip>

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
