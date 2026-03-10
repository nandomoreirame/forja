import { memo, useCallback, useMemo, useRef } from "react";
import { X } from "lucide-react";
import { useTerminalSplitLayoutStore } from "@/stores/terminal-split-layout";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { computeTabDisplayNames, getSessionDisplayName } from "@/lib/cli-registry";
import { TerminalSession } from "./terminal-session";

interface TerminalPaneProps {
  projectPath: string | null;
}

const MIN_RATIO = 15;
const MAX_RATIO = 85;
const KEYBOARD_STEP = 5;

interface SplitResizeHandleProps {
  orientation: "horizontal" | "vertical";
  ratio: number;
  onRatioChange: (ratio: number) => void;
}

function SplitResizeHandle({ orientation, ratio, onRatioChange }: SplitResizeHandleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const container = containerRef.current?.parentElement;
      if (!container) return;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        let newRatio: number;
        if (orientation === "vertical") {
          newRatio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        } else {
          newRatio = ((moveEvent.clientY - rect.top) / rect.height) * 100;
        }
        onRatioChange(Math.max(MIN_RATIO, Math.min(MAX_RATIO, newRatio)));
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = orientation === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [orientation, onRatioChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isVertical = orientation === "vertical";
      let delta = 0;

      if (isVertical && e.key === "ArrowLeft") delta = -KEYBOARD_STEP;
      else if (isVertical && e.key === "ArrowRight") delta = KEYBOARD_STEP;
      else if (!isVertical && e.key === "ArrowUp") delta = -KEYBOARD_STEP;
      else if (!isVertical && e.key === "ArrowDown") delta = KEYBOARD_STEP;
      else if (e.key === "Home") {
        onRatioChange(MIN_RATIO);
        return;
      } else if (e.key === "End") {
        onRatioChange(MAX_RATIO);
        return;
      }

      if (delta !== 0) {
        e.preventDefault();
        onRatioChange(Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio + delta)));
      }
    },
    [orientation, ratio, onRatioChange],
  );

  const isVertical = orientation === "vertical";

  return (
    <div
      ref={containerRef}
      role="separator"
      aria-orientation={isVertical ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(ratio)}
      aria-valuemin={MIN_RATIO}
      aria-valuemax={MAX_RATIO}
      tabIndex={0}
      style={{ order: 1 }}
      className={`
        ${isVertical ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
        bg-ctp-surface0 hover:bg-ctp-surface1 transition-colors flex-shrink-0
      `}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    />
  );
}

interface SplitPaneHeaderProps {
  label?: string;
  onClose: () => void;
}

function SplitPaneHeader({ label = "Split", onClose }: SplitPaneHeaderProps) {
  return (
    <div className="flex h-7 items-center justify-between border-b border-ctp-surface0 bg-ctp-mantle px-2">
      <span className="text-xs text-ctp-overlay1">{label}</span>
      <button
        type="button"
        aria-label="Close split"
        onClick={onClose}
        className="flex h-5 w-5 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
      >
        <X className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export const TerminalPane = memo(function TerminalPane({ projectPath }: TerminalPaneProps) {
  const tabs = useTerminalTabsStore((s) => s.tabs);
  const activeTabId = useTerminalTabsStore((s) => s.activeTabId);
  const splitOrientation = useTerminalSplitLayoutStore((s) => s.orientation);
  const splitRatio = useTerminalSplitLayoutStore((s) => s.ratio);
  const splitTabId = useTerminalSplitLayoutStore((s) => s.splitTabId);
  const secondarySessionType = useTerminalSplitLayoutStore((s) => s.secondarySessionType);
  const setRatio = useTerminalSplitLayoutStore((s) => s.setRatio);
  const closeSplit = useTerminalSplitLayoutStore((s) => s.closeSplit);

  const tabDisplayNames = useMemo(() => computeTabDisplayNames(tabs), [tabs]);

  const splitIsActive =
    splitOrientation !== "none" &&
    splitTabId !== null &&
    activeTabId === splitTabId;

  const containerStyle: React.CSSProperties | undefined = splitIsActive
    ? {
        display: "flex",
        flexDirection: splitOrientation === "vertical" ? "row" : "column",
      }
    : undefined;

  return (
    <div className="flex-1 overflow-hidden" style={containerStyle}>
      {tabs.map((tab) => {
        const belongsToProject = !projectPath || tab.path === projectPath;
        const isTabSplit = splitIsActive && tab.id === splitTabId;
        const isVisible = isTabSplit || (tab.id === activeTabId && belongsToProject);

        const primaryStyle: React.CSSProperties | undefined =
          isTabSplit
            ? {
                flexBasis: `${splitRatio}%`,
                flexGrow: 0,
                flexShrink: 0,
                order: 0,
                overflow: "hidden",
              }
            : undefined;

        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={!isVisible}
            className={isVisible ? (isTabSplit ? "flex h-full flex-col" : "h-full") : ""}
            style={primaryStyle}
          >
            {isTabSplit && (
              <SplitPaneHeader label={tabDisplayNames[tab.id] ?? "Terminal"} onClose={closeSplit} />
            )}
            <div className={isTabSplit ? "flex-1 min-h-0" : "h-full"}>
              <TerminalSession
                tabId={tab.id}
                path={tab.path}
                isVisible={isVisible}
                sessionType={tab.sessionType}
              />
            </div>
          </div>
        );
      })}

      {splitTabId && splitOrientation !== "none" && (() => {
        const splitTab = tabs.find((t) => t.id === splitTabId);
        if (!splitTab) return null;
        const isSecondaryVisible = activeTabId === splitTabId;
        return (
          <div
            hidden={!isSecondaryVisible}
            className={isSecondaryVisible ? "flex h-full flex-col" : ""}
            style={
              isSecondaryVisible
                ? {
                    flexBasis: `${100 - splitRatio}%`,
                    flexGrow: 0,
                    flexShrink: 0,
                    order: 2,
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {isSecondaryVisible && (
              <SplitPaneHeader
                label={secondarySessionType ? getSessionDisplayName(secondarySessionType) : "Split"}
                onClose={closeSplit}
              />
            )}
            <TerminalSession
              tabId={`${splitTabId}:split`}
              path={splitTab.path}
              isVisible={isSecondaryVisible}
              sessionType={secondarySessionType ?? "terminal"}
            />
          </div>
        );
      })()}

      {splitIsActive && (
        <SplitResizeHandle
          orientation={splitOrientation as "horizontal" | "vertical"}
          ratio={splitRatio}
          onRatioChange={setRatio}
        />
      )}
    </div>
  );
});
