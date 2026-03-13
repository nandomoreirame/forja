import { useCallback, useMemo, useRef, useState } from "react";
import { Maximize, Minimize, Pencil, X } from "lucide-react";
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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSessionStateStore } from "@/stores/session-state";
import { useTerminalTabsStore, type TerminalTab } from "@/stores/terminal-tabs";
import { computeTabDisplayNames, type SessionType } from "@/lib/cli-registry";
import { CliIcon } from "./cli-icon";
import { InlineEdit } from "./inline-edit";
import { NewSessionDropdown } from "./new-session-dropdown";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

interface SortableTabProps {
  id: string;
  children: React.ReactNode;
}

function SortableTab({ id, children }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

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
      data-testid="sortable-tab"
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

interface TabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onSessionTypeSelect: (type: SessionType) => void;
  onRenameTab?: (id: string, name: string) => void;
  onReorderTab?: (activeId: string, overId: string) => void;
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onSessionTypeSelect,
  onRenameTab,
  onReorderTab,
}: TabBarProps) {
  const sessionStates = useSessionStateStore((s) => s.states);
  const isFullscreen = useTerminalTabsStore((s) => s.isTerminalFullscreen);
  const displayNames = computeTabDisplayNames(tabs);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  // Track if we're about to start editing (to suppress Radix focus-restore on menu close)
  const pendingEditTabIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      onReorderTab?.(String(active.id), String(over.id));
    },
    [onReorderTab]
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      let next = -1;
      if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (next >= 0) {
        e.preventDefault();
        onSelectTab(tabs[next].id);
        const el = e.currentTarget.parentElement?.parentElement?.querySelectorAll<HTMLElement>("[role='tab']")[next];
        el?.focus();
      }
    },
    [tabs, onSelectTab],
  );

  const handleRenameTab = useCallback(
    (tabId: string, newName: string) => {
      onRenameTab?.(tabId, newName);
      setEditingTabId(null);
    },
    [onRenameTab],
  );

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-9 items-center border-b border-ctp-surface0 bg-ctp-mantle">
        <div role="tablist" className="flex flex-1 items-center overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tabIds}
              strategy={horizontalListSortingStrategy}
            >
              {tabs.map((tab, index) => {
                const isActive = tab.id === activeTabId;
                const sessionState = sessionStates[tab.id] ?? "idle";
                const displayName = displayNames[tab.id] ?? tab.name;
                const isEditingThis = editingTabId === tab.id;

                return (
                  <SortableTab key={tab.id} id={tab.id}>
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div
                          role="tab"
                          id={`tab-${tab.id}`}
                          aria-selected={isActive}
                          aria-controls={`tabpanel-${tab.id}`}
                          tabIndex={isActive ? 0 : -1}
                          onClick={() => onSelectTab(tab.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectTab(tab.id);
                            } else {
                              handleTabKeyDown(e, index);
                            }
                          }}
                          className={`group relative flex h-9 cursor-pointer items-center gap-2 px-3 text-xs transition-colors ${
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
                          <InlineEdit
                            value={displayName}
                            onSave={(newName) => handleRenameTab(tab.id, newName)}
                            isEditing={isEditingThis}
                            onEditingChange={(editing) => {
                              setEditingTabId(editing ? tab.id : null);
                            }}
                            className="max-w-[120px] truncate"
                          />
                          <button
                            type="button"
                            aria-label={`Close ${displayName}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseTab(tab.id);
                            }}
                            tabIndex={isActive ? 0 : -1}
                            className="flex h-4 w-4 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-ctp-surface0 group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <X className="h-3 w-3" strokeWidth={1.5} />
                          </button>
                          {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent
                        className="w-40 bg-overlay-mantle border-ctp-surface0 text-ctp-text"
                        onCloseAutoFocus={(e) => {
                          // When "Edit tab" was selected, prevent Radix from restoring focus to the
                          // trigger so the InlineEdit input can maintain focus without being blurred.
                          if (pendingEditTabIdRef.current !== null) {
                            e.preventDefault();
                            pendingEditTabIdRef.current = null;
                          }
                        }}
                      >
                        <ContextMenuItem
                          className="gap-2 text-xs cursor-pointer focus:bg-ctp-surface0 focus:text-ctp-text"
                          onSelect={() => {
                            pendingEditTabIdRef.current = tab.id;
                            setEditingTabId(tab.id);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-ctp-overlay1" strokeWidth={1.5} />
                          Edit tab
                        </ContextMenuItem>
                        <ContextMenuSeparator className="bg-ctp-surface0" />
                        <ContextMenuItem
                          className="gap-2 text-xs cursor-pointer text-ctp-red focus:bg-ctp-red/10 focus:text-ctp-red"
                          onSelect={() => onCloseTab(tab.id)}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Fechar tab
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </SortableTab>
                );
              })}
            </SortableContext>
          </DndContext>
          <NewSessionDropdown onSessionTypeSelect={onSessionTypeSelect} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => useTerminalTabsStore.getState().toggleTerminalFullscreen()}
              className="inline-flex h-9 items-center justify-center rounded-md px-2 text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Maximize className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isFullscreen ? "Exit fullscreen" : "Fullscreen"} <kbd className="ml-1 text-[10px] opacity-70">Ctrl+Shift+F</kbd></p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
