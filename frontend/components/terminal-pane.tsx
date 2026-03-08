import { memo } from "react";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { TerminalSession } from "./terminal-session";

interface TerminalPaneProps {
  projectPath: string | null;
}

export const TerminalPane = memo(function TerminalPane({ projectPath }: TerminalPaneProps) {
  const tabs = useTerminalTabsStore((s) => s.tabs);
  const activeTabId = useTerminalTabsStore((s) => s.activeTabId);

  return (
    <div className="flex-1 overflow-hidden">
      {tabs.map((tab) => {
        const belongsToProject = !projectPath || tab.path === projectPath;
        const isActive = tab.id === activeTabId && belongsToProject;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={!isActive}
            className={isActive ? "h-full" : ""}
          >
            <TerminalSession
              tabId={tab.id}
              path={tab.path}
              isVisible={isActive}
              sessionType={tab.sessionType}
            />
          </div>
        );
      })}
    </div>
  );
});
