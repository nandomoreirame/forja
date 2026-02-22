import { Plus, X } from "lucide-react";
import type { TerminalTab } from "@/stores/terminal-tabs";

interface TabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}: TabBarProps) {
  return (
    <div className="flex h-9 items-center border-b border-ctp-surface0 bg-ctp-mantle">
      <div role="tablist" className="flex flex-1 items-center overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
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
              <span>{tab.name}</span>
              <span
                role="button"
                aria-label={`Close ${tab.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-ctp-surface0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
              )}
            </button>
          );
        })}
      </div>
      <button
        aria-label="New tab"
        onClick={onNewTab}
        className="flex h-9 w-9 items-center justify-center text-ctp-overlay1 transition-colors hover:text-ctp-text"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
