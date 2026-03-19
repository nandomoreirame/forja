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
import { ForjaEmptyState } from "@/components/forja-empty-state";
import { CliIcon } from "@/components/cli-icon";
import { TabNameOverlay } from "@/components/tab-name-overlay";
import { TabContextMenu } from "@/components/tab-context-menu";
import { TabsetContextMenu } from "@/components/tabset-context-menu";
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

/** Block types whose tabs can be renamed by the user (double-click or context menu). */
const RENAMABLE_BLOCK_TYPES = new Set(["terminal", "browser"]);

function TilingEmptyState() {
  const btnClass = "flex items-center gap-2 rounded-md border border-ctp-surface0 px-4 py-2 text-app text-ctp-subtext0 transition-colors hover:bg-ctp-mantle hover:text-ctp-text";
  return (
    <ForjaEmptyState>
      <div className="flex items-center gap-3">
        <button onClick={() => useCommandPaletteStore.getState().open("sessions")} className={btnClass}>
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          New Session
        </button>
        <button
          onClick={() => {
            const tilingStore = useTilingLayoutStore.getState();
            if (!tilingStore.hasBlock("tab-file-tree")) {
              const tree = useFileTreeStore.getState().tree;
              tilingStore.addBlock({ type: "file-tree", projectName: tree?.root.name }, undefined, "tab-file-tree");
            }
          }}
          className={btnClass}
        >
          <FolderTree className="h-4 w-4" strokeWidth={1.5} />
          Open Files
        </button>
        <button
          onClick={() => {
            const tilingStore = useTilingLayoutStore.getState();
            const blockId = `browser-${Date.now().toString(36)}`;
            tilingStore.addBlock({ type: "browser", url: "https://github.com/nandomoreirame/forja" }, undefined, blockId);
          }}
          className={btnClass}
        >
          <Globe className="h-4 w-4" strokeWidth={1.5} />
          Browser
        </button>
      </div>
    </ForjaEmptyState>
  );
}

export function TilingLayout() {
  const model = useTilingLayoutStore((s) => s.model);
  const tabCount = useTilingLayoutStore((s) => s.tabCount);
  const updateModel = useTilingLayoutStore((s) => s.updateModel);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number; canRename: boolean } | null>(null);
  const [tabsetContextMenu, setTabsetContextMenu] = useState<{ tabsetId: string; x: number; y: number } | null>(null);

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

  const currentProjectPath = useFileTreeStore((s) => s.currentPath);

  const handleModelChange = useCallback(
    (newModel: Model, _action: Action) => {
      updateModel(newModel);

      // Debounced persist to disk
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const json = newModel.toJson();
        const args: Record<string, unknown> = { layoutJson: json };
        if (currentProjectPath) args.projectPath = currentProjectPath;
        invoke("save_ui_preferences", args).catch(() => {});
      }, LAYOUT_SAVE_DEBOUNCE_MS);
    },
    [updateModel, currentProjectPath],
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
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
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
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
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
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <CliIcon sessionType={sessionType} className="h-4 w-4 shrink-0" />
          </div>
        );
      } else if (component === "plugin" && config?.pluginIcon) {
        const PluginIcon = getPluginIcon(config.pluginIcon) ?? Puzzle;
        renderValues.leading = (
          <PluginIcon className="h-4 w-4 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
        );
      } else {
        const LucideIcon = LUCIDE_TAB_ICONS[component];
        if (LucideIcon) {
          renderValues.leading = (
            <LucideIcon className="h-4 w-4 shrink-0 text-ctp-overlay1" strokeWidth={1.5} />
          );
        }
      }

      // --- Content: name label with double-click handling ---
      // ALL tabs block double-click propagation to prevent FlexLayout's maximize
      // toggle on double-click. The maximize button in the tabset header still works
      // because it uses onClick, not onDoubleClick.
      const isRenamable = RENAMABLE_BLOCK_TYPES.has(component);

      const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (isRenamable) {
          useTilingLayoutStore.getState().setEditingTabId(nodeId);
        }
      };

      renderValues.content = (
        <span
          data-tab-node-id={isRenamable ? nodeId : undefined}
          className="truncate text-app-sm"
          onDoubleClick={handleDoubleClick}
        >
          {node.getName()}
        </span>
      );
    },
    [sessionStates],
  );

  const onContextMenu = useCallback(
    (node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (node.getType() === "tab") {
        const component = (node as TabNode).getComponent?.() ?? "";
        const canRename = RENAMABLE_BLOCK_TYPES.has(component);
        setTabsetContextMenu(null);
        setContextMenu({ nodeId: node.getId(), x: event.clientX, y: event.clientY, canRename });
        return;
      }

      if (node.getType() === "tabset") {
        setContextMenu(null);
        setTabsetContextMenu({ tabsetId: node.getId(), x: event.clientX, y: event.clientY });
      }
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
      <TabNameOverlay />
      {contextMenu && (
        <TabContextMenu
          nodeId={contextMenu.nodeId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          canRename={contextMenu.canRename}
          onClose={() => setContextMenu(null)}
          onStartRename={(id) => {
            // Delay so FlexLayout can settle focus after context menu closes;
            // without this the InlineEdit input blurs immediately.
            setTimeout(() => useTilingLayoutStore.getState().setEditingTabId(id), 80);
          }}
        />
      )}
      {tabsetContextMenu && (
        <TabsetContextMenu
          tabsetId={tabsetContextMenu.tabsetId}
          position={{ x: tabsetContextMenu.x, y: tabsetContextMenu.y }}
          onClose={() => setTabsetContextMenu(null)}
        />
      )}
    </div>
  );
}
