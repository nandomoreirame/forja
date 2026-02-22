import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { TerminalSession } from "./terminal-session";

export function TerminalPane() {
  const tabs = useTerminalTabsStore((s) => s.tabs);
  const activeTabId = useTerminalTabsStore((s) => s.activeTabId);

  return (
    <div className="flex-1 overflow-hidden">
      {tabs.map((tab) => (
        <TerminalSession
          key={tab.id}
          tabId={tab.id}
          path={tab.path}
          isVisible={tab.id === activeTabId}
        />
      ))}
    </div>
  );
}
