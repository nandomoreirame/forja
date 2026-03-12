import { CircleHelp, Puzzle, Settings } from "lucide-react";
import { useRightPanelStore } from "@/stores/right-panel";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { usePluginsStore } from "@/stores/plugins";
import { getPluginIcon } from "@/lib/plugin-types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface RightSidebarProps {
  hasProject?: boolean;
}

export function RightSidebar({ hasProject = false }: RightSidebarProps) {
  const setSettingsOpen = useAppDialogsStore((s) => s.setSettingsOpen);
  const plugins = usePluginsStore((s) => s.plugins);
  const activePluginName = usePluginsStore((s) => s.activePluginName);

  return (
    <TooltipProvider delayDuration={500}>
      <div
        data-testid="right-sidebar"
        className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 bg-ctp-mantle py-2"
      >
        {/* Plugin icons (only when a project is active) */}
        {hasProject && plugins.filter((p) => p.enabled).map((plugin) => {
          const Icon = getPluginIcon(plugin.manifest.icon) ?? Puzzle;
          const isActive = activePluginName === plugin.manifest.name;
          return (
            <Tooltip key={plugin.manifest.name}>
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
                    "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                    isActive
                      ? "bg-ctp-surface0 text-ctp-mauve"
                      : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{plugin.manifest.displayName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

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
