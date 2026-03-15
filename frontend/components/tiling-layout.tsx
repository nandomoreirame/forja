import { useCallback, useRef, useState } from "react";
import {
  Layout,
  Model,
  Actions,
  type Action,
  type TabNode,
  type TabSetNode,
  type BorderNode,
  type ITabSetRenderValues,
  type ITabRenderValues,
} from "flexlayout-react";
import {
  Anvil,
  ChevronsDownUp,
  FileText,
  FolderTree,
  Globe,
  MessageCircle,
  Plus,
  Puzzle,
  RefreshCw,
  Store,
} from "lucide-react";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { useCommandPaletteStore } from "@/stores/command-palette";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useAgentChatStore } from "@/stores/agent-chat";
import { useFileTreeStore } from "@/stores/file-tree";
import { useSessionStateStore } from "@/stores/session-state";
import { blockFactory } from "@/components/block-factory";
import { CliIcon } from "@/components/cli-icon";
import { InlineEdit } from "@/components/inline-edit";
import { TabContextMenu } from "@/components/tab-context-menu";
import { invoke } from "@/lib/ipc";
import { getPluginIcon } from "@/lib/plugin-types";
import type { BlockConfig } from "@/lib/block-registry";
import type { SessionType } from "@/lib/cli-registry";

const LAYOUT_SAVE_DEBOUNCE_MS = 2000;

const LUCIDE_TAB_ICONS: Record<string, React.FC<{ className?: string; strokeWidth?: number }>> = {
  browser: Globe,
  "file-preview": FileText,
  plugin: Puzzle,
  "file-tree": FolderTree,
  "agent-chat": MessageCircle,
  marketplace: Store,
};

const STATE_CLASSES: Record<string, string> = {
  thinking: "animate-pulse bg-brand",
  ready: "bg-ctp-green",
  exited: "bg-ctp-red",
  idle: "bg-ctp-surface1",
};

function TilingEmptyState() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <Anvil className="h-12 w-12 text-brand" strokeWidth={1.5} />
        <p className="text-sm text-ctp-overlay1">
          No open sessions
        </p>
      </div>
      <button
        onClick={() => useCommandPaletteStore.getState().open("sessions")}
        className="flex items-center gap-2 rounded-md border border-ctp-surface0 px-4 py-2 text-sm text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        New Session
      </button>
    </div>
  );
}

export function TilingLayout() {
  const model = useTilingLayoutStore((s) => s.model);
  const tabCount = useTilingLayoutStore((s) => s.tabCount);
  const updateModel = useTilingLayoutStore((s) => s.updateModel);
  const renameBlock = useTilingLayoutStore((s) => s.renameBlock);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingNodeId, _setEditingNodeId] = useState<string | null>(null);
  const editingNodeIdRef = useRef<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);

  // Keep ref in sync so the stable onRenderTab callback can read the latest value
  // without being listed in its dependency array (which would cause FlexLayout to
  // re-render every tab, stealing focus from the inline-edit input).
  editingNodeIdRef.current = editingNodeId;

  function setEditingNodeId(id: string | null) {
    editingNodeIdRef.current = id;
    _setEditingNodeId(id);
  }

  // Subscribe to session state changes to trigger re-renders for tab dots
  const sessionStates = useSessionStateStore((s) => s.states);

  const handleAction = useCallback((action: Action) => {
    // Sync store state when flexlayout closes a tab via its own UI
    if (action.type === Actions.DELETE_TAB) {
      const nodeId = action.data?.node as string | undefined;
      if (nodeId) {
        // If it's a terminal tab, remove from terminal-tabs store
        const tabStore = useTerminalTabsStore.getState();
        if (tabStore.hasTab(nodeId)) {
          // Remove from store without re-triggering removeBlock (which would be redundant)
          const { tabs, activeTabId } = tabStore;
          const index = tabs.findIndex((t) => t.id === nodeId);
          if (index !== -1) {
            const newTabs = tabs.filter((t) => t.id !== nodeId);
            let newActiveTabId = activeTabId;
            if (activeTabId === nodeId) {
              newActiveTabId = newTabs.length > 0
                ? (index > 0 ? newTabs[index - 1].id : newTabs[0].id)
                : null;
            }
            useTerminalTabsStore.setState({ tabs: newTabs, activeTabId: newActiveTabId });
          }
        }

        // If it's the file-preview block, update the file-preview store
        if (nodeId === "block-file-preview") {
          useFilePreviewStore.setState({
            isOpen: false,
            currentFile: null,
            content: null,
            error: null,
            isEditing: false,
            editContent: null,
            editDirty: false,
          });
        }

        // If it's the agent-chat block, sync the agent-chat store
        if (nodeId === "block-agent-chat") {
          useAgentChatStore.setState({ isPanelOpen: false });
        }
      }
    }
    return action;
  }, []);

  const handleModelChange = useCallback(
    (newModel: Model, _action: Action) => {
      updateModel(newModel);

      // Debounced persist to disk
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const json = newModel.toJson();
        invoke("save_ui_preferences", { layoutJson: json }).catch(() => {});
      }, LAYOUT_SAVE_DEBOUNCE_MS);
    },
    [updateModel],
  );

  const factory = useCallback((node: TabNode) => {
    return blockFactory(node);
  }, []);

  const onRenderTabSet = useCallback(
    (
      node: TabSetNode | BorderNode,
      renderValues: ITabSetRenderValues,
    ) => {
      // Check which block types exist in this tabset
      const children = node.getChildren() ?? [];
      const hasFileTree = children.some(
        (child) => (child as TabNode).getComponent?.() === "file-tree",
      );
      // File-tree actions: refresh + collapse-all (next to maximize icon)
      if (hasFileTree) {
        renderValues.buttons.push(
          <button
            key="refresh-tree"
            type="button"
            title="Refresh file tree"
            aria-label="Refresh file tree"
            className="flex h-5 w-5 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              useFileTreeStore.getState().refreshTree();
            }}
          >
            <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
          </button>,
          <button
            key="collapse-all"
            type="button"
            title="Collapse all folders"
            aria-label="Collapse all folders"
            className="flex h-5 w-5 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              useFileTreeStore.getState().collapseAll();
            }}
          >
            <ChevronsDownUp className="h-3 w-3" strokeWidth={1.5} />
          </button>,
        );
      }

    },
    [],
  );

  const onRenderTab = useCallback(
    (node: TabNode, renderValues: ITabRenderValues) => {
      const nodeId = node.getId();
      const config = node.getConfig() as BlockConfig | undefined;
      const component = node.getComponent() ?? "";

      // --- Leading: icon + state dot ---
      if (component === "terminal" && config?.sessionType) {
        const sessionType = config.sessionType as SessionType;
        const state = sessionStates[nodeId] ?? "idle";
        const dotClass = STATE_CLASSES[state] ?? STATE_CLASSES.idle;

        renderValues.leading = (
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <CliIcon sessionType={sessionType} className="h-4 w-4" />
          </div>
        );
      } else if (component === "plugin" && config?.pluginIcon) {
        const PluginIcon = getPluginIcon(config.pluginIcon) ?? Puzzle;
        renderValues.leading = (
          <PluginIcon className="h-4 w-4 text-ctp-overlay1" strokeWidth={1.5} />
        );
      } else {
        const LucideIcon = LUCIDE_TAB_ICONS[component];
        if (LucideIcon) {
          renderValues.leading = (
            <LucideIcon className="h-4 w-4 text-ctp-overlay1" strokeWidth={1.5} />
          );
        }
      }

      // --- Content: editable name ---
      // Read editing state from ref (NOT from state) so this callback stays stable
      // and FlexLayout doesn't re-render all tabs on edit start (which steals focus).
      const isEditing = editingNodeIdRef.current === nodeId;

      renderValues.content = (
        <div
          className="flex min-w-0 items-center"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingNodeId(nodeId);
          }}
          onMouseDown={(e) => {
            // When editing, stop FlexLayout from intercepting mousedown for
            // tab selection / drag, which would steal focus from the input.
            if (editingNodeIdRef.current === nodeId) {
              e.stopPropagation();
            }
          }}
        >
          <InlineEdit
            value={node.getName()}
            isEditing={isEditing}
            onEditingChange={(editing) => setEditingNodeId(editing ? nodeId : null)}
            onSave={(newName) => renameBlock(nodeId, newName)}
            className="truncate text-xs"
          />
        </div>
      );
    },
    // editingNodeId intentionally omitted — read from editingNodeIdRef instead
    // to keep callback stable and prevent FlexLayout from re-rendering all tabs.
    [sessionStates, renameBlock],
  );

  const onContextMenu = useCallback(
    (node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
      if (node.getType() !== "tab") return;
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ nodeId: node.getId(), x: event.clientX, y: event.clientY });
    },
    [],
  );

  if (tabCount === 0) {
    return <TilingEmptyState />;
  }

  return (
    <div className="relative h-full w-full flex-1">
      <Layout
        model={model}
        factory={factory}
        onAction={handleAction}
        onModelChange={handleModelChange}
        onRenderTabSet={onRenderTabSet}
        onRenderTab={onRenderTab}
        onContextMenu={onContextMenu}
      />
      {contextMenu && (
        <TabContextMenu
          nodeId={contextMenu.nodeId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onStartRename={(id) => {
            // Delay so FlexLayout can settle focus after context menu closes;
            // without this the InlineEdit input blurs immediately.
            setTimeout(() => setEditingNodeId(id), 80);
          }}
        />
      )}
    </div>
  );
}
