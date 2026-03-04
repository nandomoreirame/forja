import { memo } from "react";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { TerminalSession } from "./terminal-session";

export const TerminalPane = memo(function TerminalPane() {
  const tabs = useTerminalTabsStore((s) => s.tabs);
  const activeTabId = useTerminalTabsStore((s) => s.activeTabId);

  return (
    <div className="flex-1 overflow-hidden">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTabId}
          className={tab.id === activeTabId ? "h-full" : ""}
        >
          <TerminalSession
            tabId={tab.id}
            path={tab.path}
            isVisible={tab.id === activeTabId}
            sessionType={tab.sessionType}
          />
        </div>
      ))}
    </div>
  );
});
