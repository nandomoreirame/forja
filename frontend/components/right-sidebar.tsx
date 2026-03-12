import { CircleHelp, PanelRight, PanelRightClose, Settings } from "lucide-react";
import { useRightPanelStore } from "@/stores/right-panel";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function RightSidebar() {
  const isOpen = useRightPanelStore((s) => s.isOpen);
  const setSettingsOpen = useAppDialogsStore((s) => s.setSettingsOpen);

  return (
    <TooltipProvider delayDuration={500}>
      <div
        data-testid="right-sidebar"
        className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 bg-ctp-mantle py-2"
      >
        <div className="mt-auto flex flex-col items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Toggle panel"
                aria-pressed={isOpen}
                onClick={() =>
                  useRightPanelStore.getState().togglePanel()
                }
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  isOpen
                    ? "bg-ctp-surface0 text-ctp-mauve"
                    : "text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text"
                )}
              >
                {isOpen ? (
                  <PanelRightClose className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <PanelRight className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>
                {isOpen ? "Hide panel" : "Show panel"}{" "}
                <kbd className="ml-1 text-[10px] opacity-70">Ctrl+J</kbd>
              </p>
            </TooltipContent>
          </Tooltip>

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
