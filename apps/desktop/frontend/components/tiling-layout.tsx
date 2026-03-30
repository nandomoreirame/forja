import { useCallback, useEffect, useRef, useState } from "react";
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
  FilePlus,
  FileText,
  FolderPlus,
  FolderTree,
  Globe,
  MessageCircle,
  Puzzle,
  RefreshCw,
  Store,
} from "lucide-react";
import { useTilingLayoutStore } from "@/stores/tiling-layout";
import { useTerminalTabsStore } from "@/stores/terminal-tabs";
import { useFilePreviewStore } from "@/stores/file-preview";
import { useAgentChatStore } from "@/stores/agent-chat";
import { useFileTreeStore, findNode } from "@/stores/file-tree";
import { useProjectsStore } from "@/stores/projects";
import { useSessionStateStore } from "@/stores/session-state";
import { blockFactory } from "@/components/block-factory";
import { TabsetEmptyState } from "@/components/tabset-empty-state";
import { CliIcon } from "@/components/cli-icon";
import { TabNameOverlay } from "@/components/tab-name-overlay";
import { TabContextMenu } from "@/components/tab-context-menu";
import { TabsetContextMenu } from "@/components/tabset-context-menu";
import { useModifierHeldStore } from "@/stores/modifier-held";
import { useUserSettingsStore } from "@/stores/user-settings";
import { invoke } from "@/lib/ipc";
import { getPluginIcon } from "@/lib/plugin-types";
import { ShortcutBadge } from "./shortcut-badge";
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
  return <TabsetEmptyState />;
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

  // Subscribe to file-preview state for italic tab rendering
  const isPinned = useFilePreviewStore((s) => s.isPinned);
  const previewTabId = useFilePreviewStore((s) => s.previewTabId);

  // Subscribe to notification state for tabset notification dots
  const notifiedProjects = useProjectsStore((s) => s.notifiedProjects);
  const allTerminalTabs = useTerminalTabsStore((s) => s.tabs);

  // Subscribe to modifier state — forces re-renders when Cmd+Shift is held/released,
  // which causes FlexLayout to re-call onRenderTabSet and show/hide direction badges.
  const modifierVisible = useModifierHeldStore((s) => s.visible);
  const activeModifier = useModifierHeldStore((s) => s.activeModifier);

  // Sync tabSetEnableMaximize from user settings to the live FlexLayout model
  const tabSetEnableMaximize = useUserSettingsStore((s) => s.settings.ui.tabSetEnableMaximize);
  useEffect(() => {
    useTilingLayoutStore.getState().setTabSetEnableMaximize(tabSetEnableMaximize);
  }, [tabSetEnableMaximize]);

  const handleAction = useCallback((action: Action) => {
    // Clear notification when user selects a tab belonging to a notified project
    if (action.type === Actions.SELECT_TAB) {
      const nodeId = action.data?.node as string | undefined;
      if (nodeId) {
        useSessionStateStore.getState().markTabSeen(nodeId);
        const tab = useTerminalTabsStore.getState().tabs.find((t) => t.id === nodeId);
        if (tab && useProjectsStore.getState().notifiedProjects.has(tab.path)) {
          useProjectsStore.getState().clearProjectNotified(tab.path);
        }
      }
    }

    // Sync store state when flexlayout closes a tab via its own UI
    if (action.type === Actions.DELETE_TAB) {
      const nodeId = action.data?.node as string | undefined;
      if (nodeId) {
        // Block closing file-preview tab if there are unsaved changes
        if (nodeId === "block-file-preview") {
          const previewStore = useFilePreviewStore.getState();
          if (previewStore.isEditing && previewStore.editDirty) {
            // Show unsaved dialog and block the close
            previewStore.setShowUnsavedDialog(true);
            return undefined as unknown as Action;
          }
        }

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

        // Clear previewTabId if the deleted tab was the preview tab
        const previewStore = useFilePreviewStore.getState();
        if (nodeId === previewStore.previewTabId) {
          previewStore.clearPreviewTab();
        }

        // If it's the agent-chat block, sync the agent-chat store
        if (nodeId === "block-agent-chat") {
          useAgentChatStore.setState({ isPanelOpen: false });
        }
      }

      // Safety net: reconcile tabCount after FlexLayout processes the action.
      // Covers edge cases where onModelChange might not fire.
      queueMicrotask(() => {
        useTilingLayoutStore.getState().syncTabCount();
      });

      // After closing a tab, focus file-tree if nothing else remains
      requestAnimationFrame(() => {
        const store = useTilingLayoutStore.getState();
        const active = store.model.getActiveTabset();
        const selected = active?.getSelectedNode();
        if (!selected || selected.getId() === "tab-file-tree") {
          const container = document.querySelector<HTMLElement>('[data-testid="file-tree-sidebar"]')?.closest<HTMLElement>('[tabindex="0"]');
          container?.focus();
        }
      });
    }
    return action;
  }, []);

  const currentProjectPath = useFileTreeStore((s) => s.currentPath);

  const handleModelChange = useCallback(
    (newModel: Model, _action: Action) => {
      updateModel(newModel);

      // Debounced persist to disk — only when a project is active.
      // Layout is now managed per-project via saveCurrentProjectToDisk;
      // skip workspace-level saves to avoid stale layout flash on startup.
      if (currentProjectPath) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          const json = newModel.toJson();
          invoke("save_ui_preferences", { layoutJson: json, projectPath: currentProjectPath }).catch(() => {});
        }, LAYOUT_SAVE_DEBOUNCE_MS);
      }
    },
    [updateModel, currentProjectPath],
  );

  const factory = useCallback((node: TabNode) => {
    return blockFactory(node);
  }, []);

  const startFileTreeCreation = useCallback((type: "file" | "dir") => {
    const store = useFileTreeStore.getState();
    const projectPath = store.tree?.root.path;
    if (!projectPath) return;
    let targetDir = projectPath;
    if (store.focusedPath) {
      const node = store.tree ? findNode(store.tree.root, store.focusedPath) : null;
      if (node?.isDir) targetDir = store.focusedPath;
      else if (store.focusedPath) targetDir = store.focusedPath.substring(0, store.focusedPath.lastIndexOf("/"));
    }
    store.startCreating(targetDir, type);
  }, []);

  const onRenderTabSet = useCallback(
    (
      node: TabSetNode | BorderNode,
      renderValues: ITabSetRenderValues,
    ) => {
      // Check which block types exist in this tabset
      const children = node.getChildren() ?? [];

      // Notification dot: check if any terminal tab in this tabset belongs to a notified project
      const hasNotifiedTab = children.some((child) => {
        const tabId = (child as TabNode).getId();
        const tab = allTerminalTabs.find((t) => t.id === tabId);
        return tab && notifiedProjects.has(tab.path);
      });

      if (hasNotifiedTab) {
        renderValues.buttons.unshift(
          <span
            key="notif-dot"
            className="relative mr-1 flex h-2 w-2 shrink-0"
            aria-label="Unread notification"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ctp-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ctp-green" />
          </span>,
        );
      }

      const hasFileTree = children.some(
        (child) => (child as TabNode).getComponent?.() === "file-tree",
      );
      // File-tree: disable maximize and add action buttons
      if (hasFileTree) {
        // Ensure maximize is disabled for this tabset (persists across sessions)
        if ((node as TabSetNode).isEnableMaximize?.()) {
          model.doAction(Actions.updateNodeAttributes(node.getId(), { enableMaximize: false }));
        }
        renderValues.buttons.push(
          <button
            key="new-file"
            type="button"
            title="New File"
            aria-label="New file"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              startFileTreeCreation("file");
            }}
          >
            <FilePlus className="h-3 w-3" strokeWidth={1.5} />
          </button>,
          <button
            key="new-folder"
            type="button"
            title="New Folder"
            aria-label="New folder"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              startFileTreeCreation("dir");
            }}
          >
            <FolderPlus className="h-3 w-3" strokeWidth={1.5} />
          </button>,
          <button
            key="refresh-tree"
            type="button"
            title="Refresh file tree"
            aria-label="Refresh file tree"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            onMouseDown={(e) => e.stopPropagation()}
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
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ctp-overlay1 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              useFileTreeStore.getState().collapseAll();
            }}
          >
            <ChevronsDownUp className="h-3 w-3" strokeWidth={1.5} />
          </button>,
        );
      }

      // Directional arrow badges for the active tabset when Cmd+Shift is held
      const { visible: modVisible, activeModifier: modActive } = useModifierHeldStore.getState();
      const showDirBadges = modVisible && modActive === "cmd-shift";

      if (showDirBadges) {
        const tilingModel = useTilingLayoutStore.getState().model;
        const isActiveTabset = tilingModel.getActiveTabset()?.getId() === node.getId();

        if (isActiveTabset) {
          const dirs = useTilingLayoutStore.getState().getAdjacentDirections();
          const arrowMap = { left: "←", right: "→", up: "↑", down: "↓" } as const;

          const arrowBadges = (["left", "right", "up", "down"] as const)
            .filter((dir) => dirs[dir])
            .map((dir) => (
              <ShortcutBadge
                key={dir}
                label={arrowMap[dir]}
                variant="direction-active"
                visible
                className="mx-0.5"
              />
            ));

          if (arrowBadges.length > 0) {
            renderValues.buttons.push(
              <div key="dir-badges" className="flex items-center gap-0.5 px-1">
                {arrowBadges}
              </div>
            );
          }
        }
      }
    },
    [notifiedProjects, allTerminalTabs, modifierVisible, activeModifier],
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

      // --- Tab number badge: show when Cmd or Ctrl is held (Cmd+N or Ctrl+Tab) ---
      const { visible: ctrlVisible, activeModifier: ctrlMod } = useModifierHeldStore.getState();
      if (ctrlVisible && (ctrlMod === "cmd" || ctrlMod === "ctrl")) {
        const allTabIds: string[] = [];
        useTilingLayoutStore.getState().model.visitNodes((n) => {
          if (n.getType() === "tab") allTabIds.push(n.getId());
        });
        const tabIndex = allTabIds.indexOf(nodeId);
        if (tabIndex >= 0) {
          const isSelected = node.getParent()?.getSelectedNode()?.getId() === nodeId;
          renderValues.leading = (
            <div className="flex shrink-0 items-center gap-1.5">
              {renderValues.leading}
              <ShortcutBadge
                label={String(tabIndex + 1)}
                variant={isSelected ? "active" : "inactive"}
                visible
                className="shrink-0"
              />
            </div>
          );
        }
      }

      // --- Content: name label with double-click handling ---
      const isRenamable = RENAMABLE_BLOCK_TYPES.has(component);

      const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (isRenamable) {
          useTilingLayoutStore.getState().setEditingTabId(nodeId);
        }
      };

      // For file-preview tabs in preview (unpinned) mode, show italic content
      const isPreviewTab = component === "file-preview" && !isPinned && nodeId === previewTabId;

      renderValues.content = (
        <span
          data-tab-node-id={isRenamable ? nodeId : undefined}
          className={`truncate text-app-sm${isPreviewTab ? " italic opacity-80" : ""}`}
          onDoubleClick={handleDoubleClick}
        >
          {node.getName()}
        </span>
      );
    },
    [sessionStates, isPinned, previewTabId, modifierVisible, activeModifier],
  );

  const onTabSetPlaceHolder = useCallback(
    () => <TabsetEmptyState />,
    [],
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
        onTabSetPlaceHolder={onTabSetPlaceHolder}
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
