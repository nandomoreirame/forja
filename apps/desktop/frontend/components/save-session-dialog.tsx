import { useEffect } from "react";
import { getSessionDisplayName } from "@/lib/cli-registry";
import { useAppDialogsStore } from "@/stores/app-dialogs";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { CliIcon } from "./cli-icon";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function SaveSessionDialog() {
  const open = useAppDialogsStore((state) => state.saveSessionOpen);
  const tabId = useAppDialogsStore((state) => state.saveSessionTabId);
  const closeSaveSessionDialog = useAppDialogsStore(
    (state) => state.closeSaveSessionDialog,
  );
  const tab = useTerminalTabsStore(
    (state) => state.tabs.find((currentTab) => currentTab.id === tabId) ?? null,
  );

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSaveSessionDialog("cancel");
      }

      if (event.key === "Enter") {
        event.preventDefault();
        closeSaveSessionDialog("save");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSaveSessionDialog, open]);

  const sessionName = tab ? getSessionDisplayName(tab.sessionType) : "AI Session";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && open) {
          closeSaveSessionDialog("cancel");
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="border-ctp-surface1 bg-overlay-mantle sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-ctp-text">
            Save session before closing?
          </DialogTitle>
          <DialogDescription className="text-ctp-subtext0">
            Restore this AI session later from the command palette or keyboard shortcut.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border border-ctp-surface1 bg-ctp-surface0/50 px-4 py-3">
          {tab ? <CliIcon sessionType={tab.sessionType} className="h-5 w-5" /> : null}
          <div className="min-w-0">
            <p className="truncate text-app font-medium text-ctp-text">
              {sessionName}
            </p>
            {tab?.customName ? (
              <p className="truncate text-app-sm text-ctp-subtext0">
                "{tab.customName}"
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => closeSaveSessionDialog("cancel")}
          >
            Cancel
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => closeSaveSessionDialog("close")}
            >
              Close
            </Button>
            <Button onClick={() => closeSaveSessionDialog("save")}>
              Save &amp; Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
