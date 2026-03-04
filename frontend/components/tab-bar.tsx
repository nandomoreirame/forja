import { PanelRightClose, X } from "lucide-react";
import { useSessionStateStore } from "@/stores/session-state";
import { useTerminalTabsStore, type TerminalTab } from "@/stores/terminal-tabs";
import type { SessionType } from "@/lib/cli-registry";
import { CliIcon } from "./cli-icon";
import { NewSessionDropdown } from "./new-session-dropdown";

interface TabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onSessionTypeSelect: (type: SessionType) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onSessionTypeSelect,
}: TabBarProps) {
  const sessionStates = useSessionStateStore((s) => s.states);

  return (
    <div className="flex h-9 items-center border-b border-ctp-surface0 bg-ctp-mantle">
      <div role="tablist" className="flex flex-1 items-center overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const sessionState = sessionStates[tab.id] ?? "idle";
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex h-9 items-center gap-2 px-3 text-xs transition-colors ${
                isActive
                  ? "text-ctp-text"
                  : "text-ctp-overlay1 hover:text-ctp-subtext0"
              } ${!tab.isRunning ? "italic opacity-60" : ""}`}
            >
              <span
                aria-label={`Session state: ${sessionState}`}
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                  sessionState === "thinking"
                    ? "animate-pulse bg-brand"
                    : sessionState === "ready"
                      ? "bg-ctp-green"
                      : sessionState === "exited"
                        ? "bg-ctp-red"
                        : "bg-ctp-surface1"
                }`}
              />
              <CliIcon sessionType={tab.sessionType} className="h-3.5 w-3.5" />
              <span>{tab.name}</span>
              <button
                type="button"
                aria-label={`Close ${tab.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                tabIndex={isActive ? 0 : -1}
                className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-ctp-surface0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-brand"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
              )}
            </button>
          );
        })}
      </div>
      <NewSessionDropdown onSessionTypeSelect={onSessionTypeSelect} />
      <button
        onClick={() => useTerminalTabsStore.getState().toggleTerminalPane()}
        className="inline-flex h-9 items-center justify-center px-2 text-ctp-overlay1 transition-colors hover:text-ctp-text"
        aria-label="Hide terminal"
      >
        <PanelRightClose className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
